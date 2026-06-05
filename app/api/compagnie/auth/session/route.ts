/**
 * ============================================================================
 * API COMPAGNIE – SESSION & DÉCONNEXION
 * GET  /api/compagnie/auth/session  – Retourne la session active
 * POST /api/compagnie/auth/session  – Déconnexion (révocation DB + cookie)
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SECURITY_HEADERS } from '@/lib/security/config';
import { verifyUnifiedSession, revokeUnifiedSession } from '@/lib/auth/unified-session';

export async function GET(_request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('COMPAGNIE');

    if (!session || !session.compagnieId) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: SECURITY_HEADERS });
    }

    const compagnie = await prisma.compagnie.findUnique({
      where: { id: session.compagnieId },
      include: {
        user: { select: { status: true } },
        _count: { select: { vehicules: true, trajets: true } },
      },
    });

    if (!compagnie || compagnie.user.status !== 'ACTIF') {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: SECURITY_HEADERS });
    }

    return NextResponse.json({
      authenticated: true,
      compagnie: {
        id: compagnie.id,
        raisonSociale: compagnie.raisonSociale,
        licenceTransport: compagnie.licenceTransport,
        telephone: compagnie.telephone,
        email: compagnie.email,
        ville: compagnie.ville,
        region: compagnie.region,
        nomRepresentant: compagnie.nomRepresentant,
        stats: {
          vehicules: compagnie._count.vehicules,
          trajets: compagnie._count.trajets,
        },
      },
    }, { headers: SECURITY_HEADERS });
  } catch (error) {
    console.error('Erreur session compagnie:', error);
    return NextResponse.json({ authenticated: false }, { status: 500, headers: SECURITY_HEADERS });
  }
}

export async function POST() {
  try {
    await revokeUnifiedSession('COMPAGNIE');
    return NextResponse.json({ success: true }, { headers: SECURITY_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
