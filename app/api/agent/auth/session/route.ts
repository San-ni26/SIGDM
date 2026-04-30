/**
 * ============================================================================
 * API AGENT – SESSION & DÉCONNEXION
 * GET  /api/agent/auth/session  – Retourne la session active
 * POST /api/agent/auth/session  – Déconnexion (clear cookie)
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function GET(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('agent_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let payload: any;
    try {
      const result = await jwtVerify(token, secretKey, {
        algorithms: ['HS256'],
        audience: 'transport-ml-agent',
        issuer: 'transport-ml-auth',
      });
      payload = result.payload;
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Charger l'agent depuis la DB
    const agent = await prisma.agent.findUnique({
      where: { id: payload.agentId },
      include: {
        user: { select: { status: true, email: true } },
        poste: {
          select: {
            id: true,
            nom: true,
            ville: true,
            region: true,
            type: true,
            statut: true,
            latitude: true,
            longitude: true,
          },
        },
        _count: {
          select: {
            passages: true,
            anomaliesSignalees: true,
            verifications: true,
          },
        },
      },
    });

    if (!agent || agent.user.status !== 'ACTIF') {
      return NextResponse.json({ authenticated: false }, { status: 401 });
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
    });
  } catch (error: any) {
    console.error('Erreur session agent:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function POST(_request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'agent_token',
      value: '',
      ...COOKIE_CONFIG,
      maxAge: 0,
    });
    return NextResponse.json({ success: true, message: 'Déconnecté avec succès' });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}
