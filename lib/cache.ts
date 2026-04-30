/**
 * ============================================================================
 * CACHE MÉMOIRE SIMPLE AVEC TTL
 * ============================================================================
 * Cache in-memory pour réduire les requêtes répétées
 */

interface CacheEntry<T> {
  value: T;
  expiry: number;
}

class MemoryCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private readonly defaultTTL: number;

  constructor(defaultTTLSeconds: number = 300) {
    // 5 minutes par défaut
    this.defaultTTL = defaultTTLSeconds * 1000;
    // Nettoyage périodique des entrées expirées
    setInterval(() => this.cleanup(), 60000); // Toutes les minutes
  }

  /**
   * Récupère une valeur du cache
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Stocke une valeur dans le cache
   */
  set<T>(key: string, value: T, ttlSeconds?: number): void {
    const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTTL;
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttl,
    });
  }

  /**
   * Supprime une entrée du cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Vide le cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Vérifie si une clé existe et n'est pas expirée
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Nettoie les entrées expirées
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Récupère ou calcure une valeur
   */
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttlSeconds?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) {
      return cached;
    }

    const value = await factory();
    this.set(key, value, ttlSeconds);
    return value;
  }
}

// Instance globale du cache
export const cache = new MemoryCache(300); // 5 minutes TTL par défaut

// Clés de cache courantes
export const CACHE_KEYS = {
  VEHICLE_TYPES: 'vehicle:types',
  POSTES_ACTIFS: 'postes:actifs',
  STATS_GLOBALES: 'stats:globales',
  TOP_AGENTS: 'stats:top_agents',
  ANOMALIES_RECENTES: 'anomalies:recentes',
} as const;

export default cache;
