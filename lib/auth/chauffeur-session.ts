/**
 * ============================================================================
 * AUTHENTIFICATION CHAUFFEUR (COMPAGNIE)
 * ============================================================================
 * Système de session JWT pour les chauffeurs employés d'une compagnie.
 * Le chauffeur se connecte avec son matricule + téléphone.
 * Session stockée en cookie httpOnly "chauffeur_token" séparé.
 */

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);
const COOKIE_NAME = 'chauffeur_token';
const AUDIENCE = 'transport-ml-chauffeur';
const DURATION = '12h';
const MAX_AGE = 12 * 3600;

export interface ChauffeurSession {
  citoyenId: string;
  compagnieId: string;
  employeChauffeurId: string;
  matricule: string;
  nom: string;
  prenom: string;
  role: 'CHAUFFEUR';
}

export async function createChauffeurSession(session: ChauffeurSession): Promise<void> {
  const token = await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(DURATION)
    .setAudience(AUDIENCE)
    .setIssuer('transport-ml-auth')
    .sign(secretKey);

  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: token,
    ...COOKIE_CONFIG,
    maxAge: MAX_AGE,
  });
}

export async function verifyChauffeurSession(): Promise<ChauffeurSession | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      issuer: 'transport-ml-auth',
    });

    return payload as unknown as ChauffeurSession;
  } catch {
    return null;
  }
}

export async function revokeChauffeurSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set({
    name: COOKIE_NAME,
    value: '',
    ...COOKIE_CONFIG,
    maxAge: 0,
  });
}
