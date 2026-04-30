/**
 * ============================================================================
 * INDEXEDDB OFFLINE DATABASE - DEXIE.JS
 * ============================================================================
 * Gestion des données hors-ligne pour les agents terrain
 * Synchronisation automatique lors de la reconnexion
 */

import Dexie, { Table } from 'dexie';

// ============================================================================
// TYPES
// ============================================================================

export interface PassageOffline {
  id?: number;
  tripId: string;
  posteId: string;
  agentId: string;
  timestampPassage: Date;
  agentLatitude: number;
  agentLongitude: number;
  gpsPrecision?: number;
  distancePoste?: number;
  statut: 'EN_ATTENTE' | 'VALIDE' | 'ANOMALIE' | 'REFUSE';
  dureeTraitement?: number;
  observations?: string;
  scanDocuments?: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  createdAt: Date;
}

export interface AnomalyOffline {
  id?: number;
  tripId?: string;
  vehicleId?: string;
  posteId: string;
  agentId: string;
  type: 'PASSAGER_NON_DECLARE' | 'PLAQUE_INCORRECTE' | 'DOCUMENTS_MANQUANTS' | 
        'SURCHARGE' | 'MARCHANDISE_NON_DECLARE' | 'CONDUITE_DANGEREUSE' | 
        'FAUX_DOCUMENTS' | 'VEHICULE_VOLE' | 'AUTRE';
  description: string;
  severite: 'FAIBLE' | 'MOYENNE' | 'GRAVE' | 'CRITIQUE';
  preuvesUrls?: string;
  latitude?: number;
  longitude?: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
  createdAt: Date;
}

export interface VerificationOffline {
  id?: number;
  tripId?: string;
  vehicleId?: string;
  posteId: string;
  agentId: string;
  resultat: 'CONFORME' | 'ANOMALIE' | 'REFUS';
  typeAnomalie?: string;
  details?: string;
  passagersDeclares?: number;
  passagersTrouves?: number;
  documentsOk?: boolean;
  plaqueOk?: boolean;
  photosUrls?: string;
  latitude: number;
  longitude: number;
  dateVerification: Date;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error';
  syncError?: string;
}

export interface TripCache {
  id: string;
  reference: string;
  vehicleId: string;
  vehiclePlaque: string;
  vehicleType: string;
  pointDepart: string;
  destination: string;
  dateDepart: Date;
  statut: string;
  passagers: {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    telephone: string;
    typePersonne: string;
  }[];
  cachedAt: Date;
}

export interface PosteCache {
  id: string;
  nom: string;
  type: 'CONTROLE' | 'PEAGE' | 'DOUANE' | 'FRONTIERE';
  latitude: number;
  longitude: number;
  ville: string;
  region: string;
  statut: 'ACTIF' | 'INACTIF' | 'EN_TRAVAUX';
  cachedAt: Date;
}

export interface SyncQueueItem {
  id?: number;
  actionType: 'PASSAGE' | 'ANOMALIE' | 'VERIFICATION';
  payload: string; // JSON stringified
  localTimestamp: Date;
  latitude: number;
  longitude: number;
  retryCount: number;
  lastError?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  processedAt?: Date;
}

// ============================================================================
// DATABASE CLASS
// ============================================================================

export class OfflineDatabase extends Dexie {
  passages!: Table<PassageOffline>;
  anomalies!: Table<AnomalyOffline>;
  verifications!: Table<VerificationOffline>;
  trips!: Table<TripCache>;
  postes!: Table<PosteCache>;
  syncQueue!: Table<SyncQueueItem>;

  constructor() {
    super('SIGDM_Offline');
    
    this.version(1).stores({
      passages: '++id, tripId, posteId, timestamp, syncStatus, createdAt',
      anomalies: '++id, type, posteId, createdAt, syncStatus',
      verifications: '++id, tripId, vehicleId, dateVerification, syncStatus',
      trips: 'id, reference, vehiclePlaque, statut, cachedAt',
      postes: 'id, type, ville, region, statut, cachedAt',
      syncQueue: '++id, actionType, status, retryCount, createdAt',
    });
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let dbInstance: OfflineDatabase | null = null;

export function getOfflineDB(): OfflineDatabase {
  if (typeof window === 'undefined') {
    throw new Error('IndexedDB is only available in browser environment');
  }
  
  if (!dbInstance) {
    dbInstance = new OfflineDatabase();
  }
  
  return dbInstance;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export async function addPassageToQueue(passage: Omit<PassageOffline, 'id' | 'syncStatus' | 'createdAt'>): Promise<number> {
  const db = getOfflineDB();
  
  // Add to passages table
  const passageId = await db.passages.add({
    ...passage,
    syncStatus: 'pending',
    createdAt: new Date(),
  });
  
  // Add to sync queue
  await db.syncQueue.add({
    actionType: 'PASSAGE',
    payload: JSON.stringify({ ...passage, localId: passageId }),
    localTimestamp: passage.timestampPassage,
    latitude: passage.agentLatitude,
    longitude: passage.agentLongitude,
    retryCount: 0,
    status: 'pending',
    createdAt: new Date(),
  });
  
  return passageId;
}

export async function addAnomalyToQueue(anomaly: Omit<AnomalyOffline, 'id' | 'syncStatus' | 'createdAt'>): Promise<number> {
  const db = getOfflineDB();
  
  const anomalyId = await db.anomalies.add({
    ...anomaly,
    syncStatus: 'pending',
    createdAt: new Date(),
  });
  
  await db.syncQueue.add({
    actionType: 'ANOMALIE',
    payload: JSON.stringify({ ...anomaly, localId: anomalyId }),
    localTimestamp: new Date(),
    latitude: anomaly.latitude || 0,
    longitude: anomaly.longitude || 0,
    retryCount: 0,
    status: 'pending',
    createdAt: new Date(),
  });
  
  return anomalyId;
}

export async function addVerificationToQueue(verification: Omit<VerificationOffline, 'id' | 'syncStatus'>): Promise<number> {
  const db = getOfflineDB();
  
  const verificationId = await db.verifications.add({
    ...verification,
    syncStatus: 'pending',
  });
  
  await db.syncQueue.add({
    actionType: 'VERIFICATION',
    payload: JSON.stringify({ ...verification, localId: verificationId }),
    localTimestamp: verification.dateVerification,
    latitude: verification.latitude,
    longitude: verification.longitude,
    retryCount: 0,
    status: 'pending',
    createdAt: new Date(),
  });
  
  return verificationId;
}

export async function cacheTrip(trip: TripCache): Promise<void> {
  const db = getOfflineDB();
  await db.trips.put({
    ...trip,
    cachedAt: new Date(),
  });
}

export async function cachePoste(poste: PosteCache): Promise<void> {
  const db = getOfflineDB();
  await db.postes.put({
    ...poste,
    cachedAt: new Date(),
  });
}

export async function getCachedTripByReference(reference: string): Promise<TripCache | undefined> {
  const db = getOfflineDB();
  return db.trips.where('reference').equals(reference).first();
}

export async function getCachedTripByPlaque(plaque: string): Promise<TripCache | undefined> {
  const db = getOfflineDB();
  return db.trips.where('vehiclePlaque').equals(plaque).first();
}

export async function getPendingSyncCount(): Promise<number> {
  const db = getOfflineDB();
  return db.syncQueue.where('status').anyOf('pending', 'failed').count();
}

export async function getPendingSyncItems(): Promise<SyncQueueItem[]> {
  const db = getOfflineDB();
  return db.syncQueue
    .where('status')
    .anyOf('pending', 'failed')
    .limit(50)
    .toArray();
}

export async function clearSyncedItems(): Promise<void> {
  const db = getOfflineDB();
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  
  await db.syncQueue.where('status').equals('completed').and(item => 
    item.processedAt ? item.processedAt < cutoff : false
  ).delete();
}

export default getOfflineDB;
