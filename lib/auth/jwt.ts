/**
 * ============================================================================
 * UTILITAIRES D'AUTHENTIFICATION JWT
 * ============================================================================
 * Gestion des tokens, sessions et vérification des permissions
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { JWT_SECRET, TOKEN_CONFIG, COOKIE_CONFIG } from '../security/config';
import { UserType, AccountStatus } from '../../app/generated/prisma/enums';

// Encodage de la clé secrète
const secretKey = new TextEncoder().encode(JWT_SECRET);

// Types
export interface TokenPayload extends JWTPayload {
  userId: string;
  email: string;
  userType: UserType;
  sessionId: string;
}

export interface SessionData {
  userId: string;
  email: string;
  userType: UserType;
  sessionId: string;
  status: AccountStatus;
  nom: string;
  prenom: string;
  niveauAcces?: 'NATIONAL' | 'REGIONAL';
  regionId?: string;
}

// Nom des cookies
const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_COOKIE = 'refresh_token';

/**
 * Génère un access token JWT
 */
export async function generateAccessToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_CONFIG.accessTokenExpiry)
    .setAudience('transport-ml-api')
    .setIssuer('transport-ml-auth')
    .sign(secretKey);
}

/**
 * Génère un refresh token JWT
 */
export async function generateRefreshToken(payload: Omit<TokenPayload, 'iat' | 'exp'>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_CONFIG.refreshTokenExpiry)
    .setAudience('transport-ml-refresh')
    .setIssuer('transport-ml-auth')
    .sign(secretKey);
}

/**
 * Vérifie et décode un token JWT
 */
export async function verifyToken(token: string): Promise<TokenPayload> {
  try {
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: ['transport-ml-api', 'transport-ml-refresh'],
      issuer: 'transport-ml-auth',
    });
    
    return payload as TokenPayload;
  } catch (error) {
    throw new Error('Token invalide ou expiré');
  }
}

/**
 * Définit les cookies d'authentification
 */
export async function setAuthCookies(
  accessToken: string,
  refreshToken: string
): Promise<void> {
  const cookieStore = await cookies();
  
  // Access token (httpOnly pour la sécurité)
  cookieStore.set({
    name: ACCESS_TOKEN_COOKIE,
    value: accessToken,
    ...COOKIE_CONFIG,
    maxAge: 15 * 60, // 15 minutes
  });
  
  // Refresh token (httpOnly)
  cookieStore.set({
    name: REFRESH_TOKEN_COOKIE,
    value: refreshToken,
    ...COOKIE_CONFIG,
    maxAge: 7 * 24 * 60 * 60, // 7 jours
  });
}

/**
 * Supprime les cookies d'authentification (déconnexion)
 */
export async function clearAuthCookies(): Promise<void> {
  const cookieStore = await cookies();
  
  cookieStore.set({
    name: ACCESS_TOKEN_COOKIE,
    value: '',
    ...COOKIE_CONFIG,
    maxAge: 0,
  });
  
  cookieStore.set({
    name: REFRESH_TOKEN_COOKIE,
    value: '',
    ...COOKIE_CONFIG,
    maxAge: 0,
  });
}

/**
 * Récupère le token d'accès depuis les cookies
 */
export async function getAccessToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(ACCESS_TOKEN_COOKIE)?.value;
}

/**
 * Récupère le refresh token depuis les cookies
 */
export async function getRefreshToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(REFRESH_TOKEN_COOKIE)?.value;
}

/**
 * Extrait le token du header Authorization
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

/**
 * Récupère et vérifie la session depuis les cookies ou le header
 */
export async function getSession(
  request?: NextRequest
): Promise<SessionData | null> {
  try {
    let token: string | undefined;
    
    if (request) {
      // Priorité au header Authorization pour les API
      token = extractBearerToken(request) || undefined;
    }
    
    // Sinon, chercher dans les cookies
    if (!token) {
      token = await getAccessToken();
    }
    
    if (!token) return null;
    
    const payload = await verifyToken(token);
    
    // Récupérer les informations complètes depuis la base de données
    const { prisma } = await import('../prisma');
    
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { superAdmin: true },
    });
    
    if (!user || user.status !== 'ACTIF') {
      return null;
    }
    
    // Vérifier que c'est bien un SuperAdmin
    if (user.userType !== 'SUPER_ADMIN' || !user.superAdmin) {
      return null;
    }
    
    return {
      userId: user.id,
      email: user.email || '',
      userType: user.userType,
      sessionId: payload.sessionId,
      status: user.status,
      nom: user.superAdmin.nom,
      prenom: user.superAdmin.prenom,
      niveauAcces: user.superAdmin.niveauAcces as 'NATIONAL' | 'REGIONAL',
      regionId: user.superAdmin.regionId || undefined,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Vérifie si l'utilisateur a les permissions requises
 */
export function hasPermission(
  session: SessionData,
  requiredType: UserType,
  requiredLevel?: 'NATIONAL' | 'REGIONAL'
): boolean {
  // Vérifier le type d'utilisateur
  if (session.userType !== requiredType) {
    return false;
  }
  
  // Vérifier le niveau d'accès pour les SuperAdmins
  if (requiredType === 'SUPER_ADMIN' && requiredLevel) {
    // NATIONAL a accès à tout
    if (session.niveauAcces === 'NATIONAL') return true;
    // REGIONAL nécessite une correspondance
    return session.niveauAcces === requiredLevel;
  }
  
  return true;
}

/**
 * Vérifie si la session est active et valide
 */
export async function requireAuth(
  request?: NextRequest
): Promise<SessionData> {
  const session = await getSession(request);
  
  if (!session) {
    const error = new Error('Authentification requise');
    (error as Error & { statusCode: number }).statusCode = 401;
    throw error;
  }
  
  return session;
}

/**
 * Vérifie que l'utilisateur est un SuperAdmin
 */
export async function requireSuperAdmin(
  request?: NextRequest,
  level?: 'NATIONAL' | 'REGIONAL'
): Promise<SessionData> {
  const session = await requireAuth(request);
  
  if (!hasPermission(session, 'SUPER_ADMIN', level)) {
    const error = new Error('Accès non autorisé');
    (error as Error & { statusCode: number }).statusCode = 403;
    throw error;
  }
  
  return session;
}

/**
 * Rafraîchit les tokens si nécessaire
 */
export async function refreshSession(): Promise<SessionData | null> {
  try {
    const refreshToken = await getRefreshToken();
    if (!refreshToken) return null;
    
    const payload = await verifyToken(refreshToken);
    
    // Générer de nouveaux tokens
    const newAccessToken = await generateAccessToken({
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      sessionId: payload.sessionId,
    });
    
    const newRefreshToken = await generateRefreshToken({
      userId: payload.userId,
      email: payload.email,
      userType: payload.userType,
      sessionId: payload.sessionId,
    });
    
    await setAuthCookies(newAccessToken, newRefreshToken);
    
    return getSession();
  } catch (error) {
    await clearAuthCookies();
    return null;
  }
}
