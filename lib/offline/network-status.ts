/**
 * ============================================================================
 * NETWORK STATUS DETECTION
 * ============================================================================
 * Détection de la connexion internet pour le mode offline
 */

import { useState, useEffect, useCallback } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface NetworkStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: Date | null;
  connectionType: 'wifi' | 'cellular' | 'ethernet' | 'unknown';
}

// ============================================================================
// EVENT EMITTER
// ============================================================================

type NetworkEventType = 'online' | 'offline' | 'syncStart' | 'syncComplete' | 'syncError';
type NetworkEventHandler = () => void;

class NetworkEventEmitter {
  private listeners: Map<NetworkEventType, Set<NetworkEventHandler>> = new Map();

  on(event: NetworkEventType, handler: NetworkEventHandler): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);

    return () => {
      this.listeners.get(event)?.delete(handler);
    };
  }

  emit(event: NetworkEventType): void {
    this.listeners.get(event)?.forEach(handler => handler());
  }
}

export const networkEvents = new NetworkEventEmitter();

// ============================================================================
// NETWORK STATUS HOOK
// ============================================================================

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    connectionType: 'unknown',
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOnline = () => {
      setStatus(prev => ({ ...prev, isOnline: true }));
      networkEvents.emit('online');
    };

    const handleOffline = () => {
      setStatus(prev => ({ ...prev, isOnline: false }));
      networkEvents.emit('offline');
    };

    // Get connection type if available
    const connection = (navigator as any).connection;
    if (connection) {
      setStatus(prev => ({
        ...prev,
        connectionType: connection.type || 'unknown',
      }));
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Subscribe to sync events
    const unsubSyncStart = networkEvents.on('syncStart', () => {
      setStatus(prev => ({ ...prev, isSyncing: true }));
    });

    const unsubSyncComplete = networkEvents.on('syncComplete', () => {
      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncAt: new Date(),
      }));
    });

    const unsubSyncError = networkEvents.on('syncError', () => {
      setStatus(prev => ({ ...prev, isSyncing: false }));
    });

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      unsubSyncStart();
      unsubSyncComplete();
      unsubSyncError();
    };
  }, []);

  return status;
}

// ============================================================================
// PING TEST
// ============================================================================

export async function testConnectivity(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('/api/health', {
      method: 'HEAD',
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    return false;
  }
}

// ============================================================================
// OFFLINE MODE CHECKER
// ============================================================================

export function isOffline(): boolean {
  return typeof navigator !== 'undefined' && !navigator.onLine;
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine;
}
