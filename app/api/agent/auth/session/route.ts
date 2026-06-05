/**
 * ============================================================================
 * API AGENT – SESSION & DÉCONNEXION
 * GET  /api/agent/auth/session  – Retourne la session active
 * POST /api/agent/auth/session  – Déconnexion (révocation en DB + clear cookie)
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SECURITY_HEADERS } from '@/lib/security/config';
import { verifyUnifiedSession, revokeUnifiedSession } from '@/lib/auth/unified-session';

export async function GET(_request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('AGENT');

    if (!session || !session.agentId) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: SECURITY_HEADERS });
    }

    const agent = await prisma.agent.findUnique({
      where: { id: session.agentId },
      include: {
        user: { select: { status: true, email: true } },
        poste: {
          select: {
            id: true, nom: true, ville: true, region: true,
            type: true, statut: true, latitude: true, longitude: true,
          },
        },
        _count: {
          select: { passages: true, anomaliesSignalees: true, verifications: true },
        },
      },
    });

    if (!agent || agent.user.status !== 'ACTIF') {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: SECURITY_HEADERS });
    }

    return NextResponse.json({
      authenticated: true,
      agent: {
        id: agent.id,
        matriculeAgent: agent.matriculeAgent,
        nom: agent.nom,
        prenom: agent.prenom,
        telephone: agent.telephone,
        email: agent.user.email,
        typeAgent: agent.typeAgent,
        grade: agent.grade,
        photoUrl: agent.photoUrl,
        status: agent.user.status,
        poste: agent.poste,
        stats: {
          passages: agent._count.passages,
          anomalies: agent._count.anomaliesSignalees,
          verifications: agent._count.verifications,
        },
      },
    }, { headers: SECURITY_HEADERS });
  } catch (error) {
    console.error('Erreur session agent:', error);
    return NextResponse.json({ authenticated: false }, { status: 500, headers: SECURITY_HEADERS });
  }
}

export async function POST(_request: NextRequest) {
  try {
    await revokeUnifiedSession('AGENT');
    return NextResponse.json({ success: true, message: 'Déconnecté avec succès' }, { headers: SECURITY_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
