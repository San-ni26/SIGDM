/**
 * ============================================================================
 * API ROUTE - LOGIN SUPERADMIN
 * ============================================================================
 * Authentification sécurisée avec protection brute-force
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '@/lib/prisma';
import { 
  generateAccessToken, 
  generateRefreshToken, 
  setAuthCookies 
} from '@/lib/auth/jwt';
import { 
  loginRateLimiter, 
  checkRateLimit, 
  resetRateLimit,
  getClientIP 
} from '@/lib/security/rate-limit';
import { superAdminLoginSchema } from '@/lib/security/validation';
import { SECURITY_HEADERS } from '@/lib/security/config';

/**
 * POST /api/auth/login
 * Authentification d'un SuperAdmin
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Vérifier le rate limiting (anti brute-force)
    const clientIP = getClientIP(request);
    const rateLimitKey = `login:${clientIP}`;
    const rateLimitResult = await checkRateLimit(loginRateLimiter, rateLimitKey);
    
    if (!rateLimitResult.success) {
      const retryAfter = Math.ceil((rateLimitResult.msBeforeNext || 60000) / 1000);
      return NextResponse.json(
        { 
          error: 'Trop de tentatives de connexion',
          message: `Veuillez réessayer dans ${retryAfter} secondes.` 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            ...SECURITY_HEADERS,
          }
        }
      );
    }
    
    // 2. Parser et valider le body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Corps de requête invalide' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    // 3. Validation avec Zod
    const validationResult = superAdminLoginSchema.safeParse(body);
    if (!validationResult.success) {
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: validationResult.error.issues.map(issue => ({
            field: issue.path.join('.'),
            message: issue.message
          }))
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    const { email, password, rememberMe } = validationResult.data;
    
    // 4. Rechercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      include: { superAdmin: true },
    });
    
    // Vérifier si l'utilisateur existe et est un SuperAdmin
    if (!user || user.userType !== 'SUPER_ADMIN' || !user.superAdmin) {
      // Ne pas révéler si l'email existe ou non
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }
    
    // 5. Vérifier le statut du compte
    if (user.status !== 'ACTIF') {
      let message = 'Compte inactif';
      if (user.status === 'SUSPENDU') message = 'Compte suspendu. Contactez l\'administrateur.';
      if (user.status === 'EN_ATTENTE') message = 'Compte en attente de validation.';
      
      return NextResponse.json(
        { error: message },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }
    
    // 6. Vérifier le mot de passe
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Configuration de compte invalide' },
        { status: 500, headers: SECURITY_HEADERS }
      );
    }
    
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    
    if (!isPasswordValid) {
      // Échec de connexion - le rate limiter a déjà consommé un point
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }
    
    // 7. Succès - Réinitialiser le compteur de tentatives
    await resetRateLimit(loginRateLimiter, rateLimitKey);
    
    // 8. Créer une session
    const sessionId = uuidv4();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (rememberMe ? 7 : 1) * 24 * 60 * 60 * 1000);
    
    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        token: sessionId, // On utilise l'ID comme token pour le traçage
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        deviceInfo: extractDeviceInfo(request.headers.get('user-agent')),
        createdAt: now,
        expiresAt,
      },
    });
    
    // 9. Mettre à jour la date de dernière connexion
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: now },
    });
    
    // 10. Créer et définir les tokens
    const tokenPayload = {
      userId: user.id,
      email: user.email || '',
      userType: user.userType,
      sessionId,
    };
    
    const accessToken = await generateAccessToken(tokenPayload);
    const refreshToken = await generateRefreshToken(tokenPayload);
    
    await setAuthCookies(accessToken, refreshToken);
    
    // 11. Logger l'action (audit)
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: 'CONNEXION',
        entityType: 'User',
        entityId: user.id,
        description: `Connexion SuperAdmin réussie - ${user.superAdmin.nom} ${user.superAdmin.prenom}`,
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
        sessionId,
      },
    });
    
    // 12. Répondre avec les infos utilisateur (sans données sensibles)
    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        nom: user.superAdmin.nom,
        prenom: user.superAdmin.prenom,
        niveauAcces: user.superAdmin.niveauAcces,
        regionId: user.superAdmin.regionId,
      },
    }, {
      headers: {
        ...SECURITY_HEADERS,
        'X-RateLimit-Limit': rateLimitResult.limit.toString(),
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      }
    });
    
  } catch (error) {
    console.error('Erreur login:', error);
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * Extrait les informations de l'appareil depuis le User-Agent
 */
function extractDeviceInfo(userAgent: string | null): string {
  if (!userAgent) return 'Unknown';
  
  const isMobile = /Mobile|Android|iPhone|iPad|iPod/i.test(userAgent);
  const isTablet = /iPad|Tablet/i.test(userAgent);
  
  if (isTablet) return 'Tablet';
  if (isMobile) return 'Mobile';
  return 'Desktop';
}
