/**
 * ============================================================================
 * API AGENT – CONSULTATION D'UN TRAJET
 * GET /api/agent/trajet/[reference]
 * ============================================================================
 * Permet à un agent terrain de consulter les données déclarées d'un trajet
 * via sa référence (scannée ou saisie manuellement)
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getAgentFromToken(): Promise<{ agentId: string; userId: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('agent_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-agent',
      issuer: 'transport-ml-auth',
    });
    return { agentId: (payload as any).agentId, userId: (payload as any).userId };
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  try {
    const auth = await getAgentFromToken();
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { reference } = await params;
    if (!reference) {
      return NextResponse.json({ error: 'Référence requise' }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({
      where: { reference: reference.toUpperCase() },
      include: {
        vehicle: {
          select: {
            id: true,
            plaque: true,
            typeVehicle: true,
            marque: true,
            modele: true,
            couleur: true,
            nombrePlaces: true,
            statut: true,
            carteGriseNumero: true,
          },
        },
        passagers: {
          select: {
            id: true,
            matricule: true,
            nom: true,
            prenom: true,
            telephone: true,
            typePersonne: true,
            siegeNumero: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        passages: {
          orderBy: { timestampPassage: 'asc' },
          include: {
            poste: { select: { nom: true, ville: true, type: true } },
            agent: { select: { nom: true, prenom: true, matriculeAgent: true } },
          },
        },
        declareParCitoyen: {
          select: { nom: true, prenom: true, matricule: true, telephone: true },
        },
        declareParEntreprise: {
          select: { raisonSociale: true, telephone: true },
        },
        declareParCompagnie: {
          select: { raisonSociale: true, telephone: true },
        },
        conducteur: {
          select: { nom: true, prenom: true, matricule: true, telephone: true },
        },
        anomalies: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: {
            id: true,
            type: true,
            severite: true,
            statut: true,
            description: true,
            createdAt: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json(
        { error: 'Trajet introuvable. Vérifiez la référence.' },
        { status: 404 }
      );
    }

    // Log de consultation
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        actionType: 'CONSULTATION',
        entityType: 'Trip',
        entityId: trip.id,
        description: `Consultation trajet ${reference} par agent`,
      },
    });

    return NextResponse.json({ data: trip });
  } catch (error: any) {
    console.error('Erreur consultation trajet:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
