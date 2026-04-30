/**
 * ============================================================================
 * RATE LIMITING ET PROTECTION CONTRE LES ATTAQUES - VERSION OPTIMISÉE
 * ============================================================================
 * Protection brute-force, DDoS, et abus d'API avec cache local
 */

import { RateLimiterMemory, RateLimiterRes } from 'rate-limiter-flexible';
import { RATE_LIMIT_CONFIG } from './config';

// Cache local pour les IPs déjà vérifiées (évite les appels Redis/DB répétés)
const localCache = new Map<string, { allowed: boolean; expiry: number }>();
const LOCAL_CACHE_TTL = 1000; // 1 seconde

// Rate limiter pour les tentatives de connexion (anti brute-force)
export const loginRateLimiter = new RateLimiterMemory({
  keyPrefix: 'login_fail',
  points: RATE_LIMIT_CONFIG.login.points,
  duration: RATE_LIMIT_CONFIG.login.duration,
  blockDuration: RATE_LIMIT_CONFIG.login.blockDuration,
});

// Rate limiter général pour les API
export const apiRateLimiter = new RateLimiterMemory({
  keyPrefix: 'api_general',
  points: RATE_LIMIT_CONFIG.api.points,
  duration: RATE_LIMIT_CONFIG.api.duration,
});

// Rate limiter strict pour les opérations sensibles
export const sensitiveRateLimiter = new RateLimiterMemory({
  keyPrefix: 'api_sensitive',
  points: RATE_LIMIT_CONFIG.sensitive.points,
  duration: RATE_LIMIT_CONFIG.sensitive.duration,
});

// Rate limiter par IP pour éviter les attaques DDoS
export const ipRateLimiter = new RateLimiterMemory({
  keyPrefix: 'ip_limit',
  points: 200, // 200 requêtes
  duration: 60, // par minute
  blockDuration: 300, // blocage de 5 minutes si dépassement
});

/**
 * Vérifie si une requête est autorisée selon le rate limiting - VERSION OPTIMISÉE
 * Utilise un cache local pour éviter les appels répétés
 */
export async function checkRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<{
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
  msBeforeNext?: number;
}> {
  // Vérifier le cache local d'abord
  const cacheKey = `${limiter.keyPrefix}:${key}`;
  const cached = localCache.get(cacheKey);
  if (cached && Date.now() < cached.expiry) {
    return {
      success: cached.allowed,
      limit: limiter.points,
      remaining: cached.allowed ? limiter.points - 1 : 0,
      reset: Math.floor(Date.now() / 1000) + 1,
    };
  }

  try {
    const res = await limiter.consume(key);
    // Mettre en cache le résultat positif
    localCache.set(cacheKey, { allowed: true, expiry: Date.now() + LOCAL_CACHE_TTL });
    return {
      success: true,
      limit: limiter.points,
      remaining: res.remainingPoints,
      reset: Math.floor(Date.now() / 1000) + res.msBeforeNext / 1000,
      msBeforeNext: res.msBeforeNext,
    };
  } catch (rejRes) {
    if (rejRes instanceof RateLimiterRes) {
      // Mettre en cache le résultat négatifa
      localCache.set(cacheKey, { allowed: false, expiry: Date.now() + LOCAL_CACHE_TTL });
      return {
        success: false,
        limit: limiter.points,
        remaining: 0,
        reset: Math.floor(Date.now() / 1000) + rejRes.msBeforeNext / 1000,
        msBeforeNext: rejRes.msBeforeNext,
      };
    }
    throw rejRes;
  }
}

/**
 * Consomme un point du rate limiter (pour les tentatives échouées)
 */
export async function consumeRateLimit(
  limiter: RateLimiterMemory,
  key: string,
  points: number = 1
): Promise<void> {
  await limiter.consume(key, points);
}

/**
 * Réinitialise le compteur pour une clé (après une connexion réussie par exemple)
 */
export async function resetRateLimit(
  limiter: RateLimiterMemory,
  key: string
): Promise<void> {
  await limiter.delete(key);
}

/**
 * Récupère l'IP client d'une requête Next.js
 */
export function getClientIP(request: Request): string {
  // Headers à vérifier (dans l'ordre de priorité)
  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'cf-connecting-ip',
    'x-client-ip',
  ];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      // x-forwarded-for peut contenir plusieurs IPs, on prend la première
      const ip = value.split(',')[0].trim();
      if (isValidIP(ip)) return ip;
    }
  }
  
  return '127.0.0.1';
}

/**
 * Vérifie si une chaîne est une IP valide
 */
function isValidIP(ip: string): boolean {
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/;
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
}

/**
 * Génère une clé de rate limit basée sur l'IP et éventuellement un identifiant
 */
export function generateRateLimitKey(ip: string, identifier?: string): string {
  return identifier ? `${ip}:${identifier}` : ip;
}

/**
 * Décore une fonction avec du rate limiting
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<unknown>>(
  fn: T,
  limiter: RateLimiterMemory,
  keyExtractor: (...args: Parameters<T>) => string
): T {
  return (async (...args: Parameters<T>): Promise<ReturnType<T>> => {
    const key = keyExtractor(...args);
    const result = await checkRateLimit(limiter, key);
    
    if (!result.success) {
      const error = new Error('Trop de requêtes. Veuillez réessayer plus tard.');
      (error as Error & { statusCode: number }).statusCode = 429;
      throw error;
    }
    
    return fn(...args) as ReturnType<T>;
  }) as T;
}

/**
 * En-têtes de rate limit pour les réponses HTTP
 */
export function getRateLimitHeaders(
  limit: number,
  remaining: number,
  reset: number
): Record<string, string> {
  return {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': reset.toString(),
  };
}
