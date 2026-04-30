/**
 * ============================================================================
 * API AGENT – VALIDATION D'UN PASSAGE
 * POST /api/agent/passage/valider
 * ============================================================================
 * Enregistre le passage d'un véhicule à un poste de contrôle.
 * GPS de l'agent obligatoire pour l'anti-fraude.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getAgentPayload(request: NextRequest): Promise<any | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('agent_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-agent',
      issuer: 'transport-ml-auth',
    });
    return payload;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const agentPayload = await getAgentPayload(request);
    if (!agentPayload) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const {
      tripId,
      posteId,
      statut,           // VALIDE | ANOMALIE | REFUSE
      agentLatitude,
      agentLongitude,
      gpsPrecision,
      observations,
      dureeTraitement,
    } = body;

    if (!tripId || !posteId || !statut || agentLatitude == null || agentLongitude == null) {
      return NextResponse.json(
        { error: 'tripId, posteId, statut, latitude et longitude de l\'agent sont requis' },
        { status: 400 }
      );
    }

    const validStatuts = ['VALIDE', 'ANOMALIE', 'REFUSE'];
    if (!validStatuts.includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    // Vérifier que le trajet existe
    const trip = await prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) {
      return NextResponse.json({ error: 'Trajet introuvable' }, { status: 404 });
    }

    // Vérifier que le poste existe et est actif
    const poste = await prisma.poste.findUnique({ where: { id: posteId } });
    if (!poste || poste.statut !== 'ACTIF') {
      return NextResponse.json({ error: 'Poste introuvable ou inactif' }, { status: 404 });
    }

    // Calculer la distance entre l'agent et le poste (anti-fraude)
    const distancePoste = calculateDistance(
      Number(agentLatitude),
      Number(agentLongitude),
      Number(poste.latitude),
      Number(poste.longitude)
    );

    // Alerte si l'agent est trop loin (> 500 mètres)
    const isSuspicious = distancePoste > 500;

    // Créer le passage
    const passage = await prisma.passage.create({
      data: {
        tripId,
        posteId,
        agentId: agentPayload.agentId,
        statut,
        agentLatitude: agentLatitude,
        agentLongitude: agentLongitude,
        gpsPrecision: gpsPrecision || null,
        distancePoste: Math.round(distancePoste),
        observations: observations?.trim() || null,
        dureeTraitement: dureeTraitement || null,
      },
      include: {
        trip: { select: { reference: true } },
        poste: { select: { nom: true, ville: true } },
      },
    });

    // Mettre à jour le statut du trajet si nécessaire
    if (statut === 'EN_COURS' && trip.statut === 'EN_PREPARATION') {
      await prisma.trip.update({
        where: { id: tripId },
        data: { statut: 'EN_COURS' },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: agentPayload.userId,
        actionType: 'VALIDATION',
        entityType: 'Passage',
        entityId: passage.id,
        description: `Validation passage ${passage.trip.reference} au poste ${passage.poste.nom} → ${statut}${isSuspicious ? ' ⚠️ AGENT LOIN DU POSTE' : ''}`,
        latitude: agentLatitude,
        longitude: agentLongitude,
        posteId,
      },
    });

    return NextResponse.json({
      success: true,
      passage: {
        id: passage.id,
        statut: passage.statut,
        timestampPassage: passage.timestampPassage,
        distancePoste: Math.round(distancePoste),
        suspicionFraude: isSuspicious,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur validation passage:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

/** Calcule la distance en mètres entre deux coordonnées GPS (Haversine) */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // rayon de la Terre en mètres
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
