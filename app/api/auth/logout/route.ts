/**
 * ============================================================================
 * API ROUTE - LOGOUT SUPERADMIN
 * ============================================================================
 * Déconnexion sécurisée et révocation de session
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearAuthCookies, getAccessToken, verifyToken } from '@/lib/auth/jwt';
import { SECURITY_HEADERS } from '@/lib/security/config';
import { getClientIP } from '@/lib/security/rate-limit';

/**
 * POST /api/auth/logout
 * Déconnexion d'un SuperAdmin
 */
export async function POST(request: NextRequest) {
  try {
    const token = await getAccessToken();
    const clientIP = getClientIP(request);
    
    if (token) {
      try {
        // Vérifier le token et récupérer la session
        const payload = await verifyToken(token);
        
        // Révoquer la session dans la base de données
        await prisma.userSession.updateMany({
          where: {
            id: payload.sessionId,
            userId: payload.userId,
          },
          data: {
            revokedAt: new Date(),
          },
        });
        
        // Logger la déconnexion
        await prisma.auditLog.create({
          data: {
            userId: payload.userId,
            actionType: 'DECONNEXION',
            entityType: 'User',
            entityId: payload.userId,
            description: 'Déconnexion SuperAdmin',
            ipAddress: clientIP,
            userAgent: request.headers.get('user-agent') || undefined,
            sessionId: payload.sessionId,
          },
        });
      } catch (error) {
        // Token invalide, on continue quand même pour nettoyer les cookies
        console.warn('Token invalide lors de la déconnexion:', error);
      }
    }
    
    // Supprimer les cookies
    await clearAuthCookies();
    
    return NextResponse.json(
      { success: true, message: 'Déconnexion réussie' },
      { headers: SECURITY_HEADERS }
    );
    
  } catch (error) {
    console.error('Erreur logout:', error);
    
    // Même en cas d'erreur, on essaie de supprimer les cookies
    await clearAuthCookies();
    
    return NextResponse.json(
      { success: true, message: 'Déconnexion réussie' },
      { headers: SECURITY_HEADERS }
    );
  }
}
