/**
 * ============================================================================
 * API ROUTE - SESSION
 * ============================================================================
 * Vérification de session et rafraîchissement
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession, refreshSession } from '@/lib/auth/jwt';
import { SECURITY_HEADERS } from '@/lib/security/config';

/**
 * GET /api/auth/session
 * Vérifier la session active
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession(request);
    
    if (!session) {
      // Essayer de rafraîchir la session
      const refreshedSession = await refreshSession();
      
      if (!refreshedSession) {
        return NextResponse.json(
          { error: 'Session expirée', authenticated: false },
          { status: 401, headers: SECURITY_HEADERS }
        );
      }
      
      return NextResponse.json({
        authenticated: true,
        user: {
          id: refreshedSession.userId,
          email: refreshedSession.email,
          nom: refreshedSession.nom,
          prenom: refreshedSession.prenom,
          niveauAcces: refreshedSession.niveauAcces,
          regionId: refreshedSession.regionId,
        },
      }, { headers: SECURITY_HEADERS });
    }
    
    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        nom: session.nom,
        prenom: session.prenom,
        niveauAcces: session.niveauAcces,
        regionId: session.regionId,
      },
    }, { headers: SECURITY_HEADERS });
    
  } catch (error) {
    console.error('Erreur vérification session:', error);
    
    return NextResponse.json(
      { error: 'Erreur interne', authenticated: false },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
