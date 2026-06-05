/**
 * ============================================================================
 * API ENTREPRISE – SESSION & DÉCONNEXION
 * GET  /api/entreprise/auth/session  – Retourne la session active
 * POST /api/entreprise/auth/session  – Déconnexion (révocation DB + cookie)
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SECURITY_HEADERS } from '@/lib/security/config';
import { verifyUnifiedSession, revokeUnifiedSession } from '@/lib/auth/unified-session';

export async function GET(_request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('ENTREPRISE');

    if (!session || !session.entrepriseId) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: SECURITY_HEADERS });
    }

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: session.entrepriseId },
      include: {
        user: { select: { status: true } },
        _count: { select: { vehicules: true, trajets: true } },
      },
    });

    if (!entreprise || entreprise.user.status !== 'ACTIF') {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: SECURITY_HEADERS });
    }

    return NextResponse.json({
      authenticated: true,
      entreprise: {
        id: entreprise.id,
        raisonSociale: entreprise.raisonSociale,
        nif: entreprise.nif,
        telephone: entreprise.telephone,
        email: entreprise.email,
        ville: entreprise.ville,
        region: entreprise.region,
        nomRepresentant: entreprise.nomRepresentant,
        stats: {
          vehicules: entreprise._count.vehicules,
          trajets: entreprise._count.trajets,
        },
      },
    }, { headers: SECURITY_HEADERS });
  } catch (error) {
    console.error('Erreur session entreprise:', error);
    return NextResponse.json({ authenticated: false }, { status: 500, headers: SECURITY_HEADERS });
  }
}

export async function POST() {
  try {
    await revokeUnifiedSession('ENTREPRISE');
    return NextResponse.json({ success: true }, { headers: SECURITY_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
