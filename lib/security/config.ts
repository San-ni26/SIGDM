/**
 * ============================================================================
 * CONFIGURATION DE SÉCURITÉ GLOBALE
 * ============================================================================
 * Ce fichier centralise tous les paramètres de sécurité de la plateforme
 */

// Clé secrète pour JWT - DOIT être définie dans les variables d'environnement
export const JWT_SECRET = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET ou NEXTAUTH_SECRET doit être défini dans les variables d\'environnement');
}

// Configuration des tokens
export const TOKEN_CONFIG = {
  accessTokenExpiry: '15m',        // 15 minutes pour l'access token
  refreshTokenExpiry: '7d',        // 7 jours pour le refresh token
  sessionExpiry: 24 * 60 * 60 * 1000, // 24 heures en millisecondes
} as const;

// Configuration du rate limiting
export const RATE_LIMIT_CONFIG = {
  // Limite pour les tentatives de connexion (anti brute-force)
  login: {
    points: 5,              // 5 tentatives
    duration: 60 * 15,      // par 15 minutes
    blockDuration: 60 * 60, // blocage d'1 heure après dépassement
  },
  // Limite pour les API générales
  api: {
    points: 100,            // 100 requêtes
    duration: 60,           // par minute
  },
  // Limite stricte pour les mutations sensibles
  sensitive: {
    points: 10,             // 10 requêtes
    duration: 60,           // par minute
  },
} as const;

// Configuration des mots de passe
export const PASSWORD_CONFIG = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  // Nombre de rounds pour bcrypt (plus élevé = plus sécurisé mais plus lent)
  bcryptRounds: 12,
} as const;

// Configuration CORS
export const CORS_CONFIG = {
  allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || [
    'http://localhost:3000',
    'https://transport-ml.vercel.app',
  ],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 heures
} as const;

// Configuration des cookies sécurisés
export const COOKIE_CONFIG = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 24 * 60 * 60, // 24 heures en secondes
  path: '/',
};

// En-têtes de sécurité HTTP
export const SECURITY_HEADERS = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' blob: data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://*.prisma.io https://*.googleapis.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

// Durée de verrouillage de session (en secondes)
export const SESSION_LOCKOUT_DURATION = 30 * 60; // 30 minutes

// Nombre maximum de sessions actives par utilisateur
export const MAX_ACTIVE_SESSIONS = 3;

// Timeout d'inactivité (en millisecondes)
export const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
