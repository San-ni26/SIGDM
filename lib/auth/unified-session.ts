/**
 * ============================================================================
 * SESSIONS UNIFIÉES MULTI-RÔLES
 * ============================================================================
 * Centralise la gestion des sessions pour tous les types d'utilisateurs.
 * - Enregistrement en base (UserSession) pour tous les rôles
 * - Vérification revokedAt à chaque appel
 * - Rate limiting sur toutes les routes d'authentification
 */

import { jwtVerify, SignJWT } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';
import { loginRateLimiter, checkRateLimit, resetRateLimit, getClientIP } from '@/lib/security/rate-limit';

const secretKey = new TextEncoder().encode(JWT_SECRET);

// ─── Types ───────────────────────────────────────────────────────────────────

export type SessionRole = 'AGENT' | 'ENTREPRISE' | 'COMPAGNIE' | 'CITOYEN';

export interface UnifiedSession {
  userId: string;
  sessionId: string;
  role: SessionRole;
  // Selon le rôle
  agentId?: string;
  matriculeAgent?: string;
  typeAgent?: string;
  posteId?: string | null;
  entrepriseId?: string;
  compagnieId?: string;
  citoyenId?: string;
  matricule?: string;
}

// ─── Noms de cookies ─────────────────────────────────────────────────────────

const COOKIE_NAMES: Record<SessionRole, string> = {
  AGENT: 'agent_token',
  ENTREPRISE: 'entreprise_token',
  COMPAGNIE: 'compagnie_token',
  CITOYEN: 'citoyen_token',
};

const AUDIENCES: Record<SessionRole, string> = {
  AGENT: 'transport-ml-agent',
  ENTREPRISE: 'transport-ml-entreprise',
  COMPAGNIE: 'transport-ml-compagnie',
  CITOYEN: 'transport-ml-citoyen',
};

// Durées des tokens par rôle (en heures)
const TOKEN_DURATIONS: Record<SessionRole, string> = {
  AGENT: '12h',
  ENTREPRISE: '24h',
  COMPAGNIE: '24h',
  CITOYEN: '24h',
};

const MAX_AGE_SECONDS: Record<SessionRole, number> = {
  AGENT: 12 * 3600,
  ENTREPRISE: 24 * 3600,
  COMPAGNIE: 24 * 3600,
  CITOYEN: 24 * 3600,
};

// ─── Création de session ──────────────────────────────────────────────────────

/**
 * Crée une session en DB et génère le JWT cookie pour un rôle donné.
 */
export async function createUnifiedSession(
  role: SessionRole,
  userId: string,
  payload: Omit<UnifiedSession, 'sessionId'>,
  request: NextRequest,
): Promise<string> {
  const sessionId = uuidv4();
  const now = new Date();
  const maxSeconds = MAX_AGE_SECONDS[role];
  const expiresAt = new Date(now.getTime() + maxSeconds * 1000);
  const clientIP = getClientIP(request);

  // 1. Enregistrer en base
  await prisma.userSession.create({
    data: {
      id: sessionId,
      userId,
      token: sessionId,
      ipAddress: clientIP,
      userAgent: request.headers.get('user-agent') || undefined,
      createdAt: now,
      expiresAt,
    },
  });

  // 2. Générer le JWT
  const token = await new SignJWT({
    ...payload,
    sessionId,
    role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_DURATIONS[role])
    .setAudience(AUDIENCES[role])
    .setIssuer('transport-ml-auth')
    .sign(secretKey);

  // 3. Poser le cookie
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAMES[role],
    value: token,
    ...COOKIE_CONFIG,
    maxAge: maxSeconds,
  });

  return sessionId;
}

// ─── Vérification de session ──────────────────────────────────────────────────

/**
 * Vérifie le JWT cookie d'un rôle ET contrôle que la session est toujours
 * active en base (non révoquée, non expirée).
 */
export async function verifyUnifiedSession(
  role: SessionRole,
): Promise<UnifiedSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES[role])?.value;
    if (!token) return null;

    // 1. Vérifier la signature JWT
    let payload: any;
    try {
      const result = await jwtVerify(token, secretKey, {
        algorithms: ['HS256'],
        audience: AUDIENCES[role],
        issuer: 'transport-ml-auth',
      });
      payload = result.payload;
    } catch {
      return null;
    }

    const sessionId: string = payload.sessionId;
    if (!sessionId) return null;

    // 2. Vérifier la session en base (non révoquée, non expirée)
    const session = await prisma.userSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;
    if (session.revokedAt) return null; // Révoquée
    if (session.expiresAt < new Date()) return null; // Expirée

    // 3. Vérifier statut du compte
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'ACTIF') return null;

    return payload as UnifiedSession;
  } catch {
    return null;
  }
}

// ─── Révocation de session ────────────────────────────────────────────────────

/**
 * Révoque la session active d'un rôle (logout).
 */
export async function revokeUnifiedSession(role: SessionRole): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAMES[role])?.value;

    if (token) {
      try {
        const result = await jwtVerify(token, secretKey, {
          algorithms: ['HS256'],
          audience: AUDIENCES[role],
          issuer: 'transport-ml-auth',
        });
        const payload = result.payload as any;

        if (payload.sessionId) {
          await prisma.userSession.updateMany({
            where: { id: payload.sessionId },
            data: { revokedAt: new Date() },
          });
        }
      } catch {
        // Token invalide, on nettoie quand même le cookie
      }
    }

    // Supprimer le cookie
    cookieStore.set({
      name: COOKIE_NAMES[role],
      value: '',
      ...COOKIE_CONFIG,
      maxAge: 0,
    });
  } catch {
    // Silencieux
  }
}

// ─── Rate limiting login ──────────────────────────────────────────────────────

/**
 * Vérifie le rate limit pour un login, retourne une erreur HTTP ou null si ok.
 */
export async function checkLoginRateLimit(
  request: NextRequest,
  prefix: string,
): Promise<{
  blocked: boolean;
  retryAfter?: number;
  remaining?: number;
  limit?: number;
}> {
  const clientIP = getClientIP(request);
  const key = `${prefix}:${clientIP}`;
  const result = await checkRateLimit(loginRateLimiter, key);

  if (!result.success) {
    return {
      blocked: true,
      retryAfter: Math.ceil((result.msBeforeNext || 60000) / 1000),
    };
  }

  return {
    blocked: false,
    remaining: result.remaining,
    limit: result.limit,
  };
}

export async function resetLoginRateLimit(request: NextRequest, prefix: string): Promise<void> {
  const clientIP = getClientIP(request);
  await resetRateLimit(loginRateLimiter, `${prefix}:${clientIP}`);
}
