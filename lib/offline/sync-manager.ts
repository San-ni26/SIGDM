/**
 * ============================================================================
 * SYNC MANAGER
 * ============================================================================
 * Gestionnaire de synchronisation des données offline
 */

import {
  getOfflineDB,
  getPendingSyncItems,
  SyncQueueItem,
  PassageOffline,
  AnomalyOffline,
  VerificationOffline,
} from './db';
import { networkEvents, testConnectivity } from './network-status';

// ============================================================================
// TYPES
// ============================================================================

export interface SyncResult {
  success: boolean;
  processed: number;
  failed: number;
  errors: Array<{ itemId: number; error: string }>;
}

export interface SyncOptions {
  retryFailed?: boolean;
  maxRetries?: number;
  batchSize?: number;
}

// ============================================================================
// SYNC MANAGER CLASS
// ============================================================================

class SyncManager {
  private isProcessing: boolean = false;
  private abortController: AbortController | null = null;

  /**
   * Démarre la synchronisation
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    const { retryFailed = true, maxRetries = 3, batchSize = 10 } = options;

    if (this.isProcessing) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [{ itemId: 0, error: 'Synchronisation déjà en cours' }],
      };
    }

    // Vérifier la connectivité
    const isConnected = await testConnectivity();
    if (!isConnected) {
      return {
        success: false,
        processed: 0,
        failed: 0,
        errors: [{ itemId: 0, error: 'Pas de connexion internet' }],
      };
    }

    this.isProcessing = true;
    this.abortController = new AbortController();
    networkEvents.emit('syncStart');

    const result: SyncResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: [],
    };

    try {
      const db = getOfflineDB();
      const items = await getPendingSyncItems();

      // Traiter par lots
      for (let i = 0; i < items.length; i += batchSize) {
        if (this.abortController.signal.aborted) {
          throw new Error('Synchronisation annulée');
        }

        const batch = items.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch.map(item => this.processItem(item))
        );

        batchResults.forEach((batchResult, index) => {
          const item = batch[index];
          if (batchResult.status === 'fulfilled' && batchResult.value) {
            result.processed++;
          } else {
            result.failed++;
            const error = batchResult.status === 'rejected' 
              ? String(batchResult.reason) 
              : 'Échec de la synchronisation';
            result.errors.push({ itemId: item.id || 0, error });

            // Mettre à jour le compteur de retry
            if (item.id) {
              db.syncQueue.update(item.id, {
                retryCount: item.retryCount + 1,
                lastError: error,
                status: item.retryCount + 1 >= maxRetries ? 'failed' : 'pending',
              });
            }
          }
        });

        // Petite pause entre les lots pour ne pas surcharger
        if (i + batchSize < items.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      result.success = result.failed === 0;

      if (result.success) {
        networkEvents.emit('syncComplete');
      } else {
        networkEvents.emit('syncError');
      }

      return result;
    } catch (error) {
      networkEvents.emit('syncError');
      return {
        success: false,
        processed: result.processed,
        failed: result.failed + 1,
        errors: [...result.errors, { itemId: 0, error: String(error) }],
      };
    } finally {
      this.isProcessing = false;
      this.abortController = null;
    }
  }

  /**
   * Traite un item de la file de synchronisation
   */
  private async processItem(item: SyncQueueItem): Promise<boolean> {
    const db = getOfflineDB();

    // Marquer comme en cours de traitement
    if (item.id) {
      await db.syncQueue.update(item.id, { status: 'processing' });
    }

    try {
      let response: Response;

      switch (item.actionType) {
        case 'PASSAGE': {
          const passage: PassageOffline = JSON.parse(item.payload);
          response = await fetch('/api/agent/passage/valider', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId: passage.tripId,
              posteId: passage.posteId,
              agentLatitude: passage.agentLatitude,
              agentLongitude: passage.agentLongitude,
              gpsPrecision: passage.gpsPrecision,
              observations: passage.observations,
              timestampPassage: passage.timestampPassage.toISOString(),
            }),
          });
          break;
        }

        case 'ANOMALIE': {
          const anomaly: AnomalyOffline = JSON.parse(item.payload);
          response = await fetch('/api/agent/anomalie/signaler', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tripId: anomaly.tripId,
              vehicleId: anomaly.vehicleId,
              posteId: anomaly.posteId,
              type: anomaly.type,
              description: anomaly.description,
              severite: anomaly.severite,
              preuvesUrls: anomaly.preuvesUrls,
              latitude: anomaly.latitude,
              longitude: anomaly.longitude,
            }),
          });
          break;
        }

        case 'VERIFICATION': {
          const verification: VerificationOffline = JSON.parse(item.payload);
          response = await fetch('/api/agent/verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(verification),
          });
          break;
        }

        default:
          throw new Error(`Type d'action inconnu: ${item.actionType}`);
      }

      if (response.ok) {
        // Marquer comme complété
        if (item.id) {
          await db.syncQueue.update(item.id, {
            status: 'completed',
            processedAt: new Date(),
          });
        }
        return true;
      } else {
        const error = await response.text();
        throw new Error(error);
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * Annule la synchronisation en cours
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  /**
   * Vérifie si une synchronisation est en cours
   */
  isSyncing(): boolean {
    return this.isProcessing;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const syncManager = new SyncManager();

// ============================================================================
// AUTO-SYNC
// ============================================================================

let autoSyncInterval: NodeJS.Timeout | null = null;

export function startAutoSync(intervalMs: number = 30000): void {
  stopAutoSync();
  
  autoSyncInterval = setInterval(async () => {
    if (typeof navigator !== 'undefined' && navigator.onLine && !syncManager.isSyncing()) {
      await syncManager.sync();
    }
  }, intervalMs);
}

export function stopAutoSync(): void {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
  }
}

// ============================================================================
// HOOKS
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { getPendingSyncCount } from './db';

export function useSyncStatus() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const count = await getPendingSyncCount();
    setPendingCount(count);
  }, []);

  const sync = useCallback(async (options?: SyncOptions) => {
    setIsSyncing(true);
    const result = await syncManager.sync(options);
    setLastSyncResult(result);
    setIsSyncing(false);
    await refreshPendingCount();
    return result;
  }, [refreshPendingCount]);

  useEffect(() => {
    refreshPendingCount();

    // Rafraîchir le compteur périodiquement
    const interval = setInterval(refreshPendingCount, 5000);

    // Écouter les événements de synchronisation
    const unsubComplete = networkEvents.on('syncComplete', refreshPendingCount);
    const unsubError = networkEvents.on('syncError', refreshPendingCount);

    return () => {
      clearInterval(interval);
      unsubComplete();
      unsubError();
    };
  }, [refreshPendingCount]);

  return {
    pendingCount,
    isSyncing,
    lastSyncResult,
    sync,
    refreshPendingCount,
  };
}

export default syncManager;
