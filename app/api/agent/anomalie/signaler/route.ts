/**
 * ============================================================================
 * API AGENT – SIGNALEMENT D'ANOMALIE
 * POST /api/agent/anomalie/signaler
 * ============================================================================
 * Permet à un agent de signaler une anomalie lors d'un contrôle terrain.
 * Note et preuves obligatoires en cas d'anomalie.
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
      vehicleId,
      posteId,
      type,         // AnomalyType enum
      description,
      severite,     // FAIBLE | MOYENNE | GRAVE | CRITIQUE
      preuvesUrls,  // array of URLs
      latitude,
      longitude,
    } = body;

    if (!posteId || !type || !description) {
      return NextResponse.json(
        { error: 'posteId, type d\'anomalie et description sont requis' },
        { status: 400 }
      );
    }

    const validTypes = [
      'PASSAGER_NON_DECLARE', 'PLAQUE_INCORRECTE', 'DOCUMENTS_MANQUANTS',
      'SURCHARGE', 'MARCHANDISE_NON_DECLARE', 'CONDUITE_DANGEREUSE',
      'FAUX_DOCUMENTS', 'VEHICULE_VOLE', 'AUTRE',
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Type d\'anomalie invalide' }, { status: 400 });
    }

    const validSeverites = ['FAIBLE', 'MOYENNE', 'GRAVE', 'CRITIQUE'];
    const anomalieSeverite = validSeverites.includes(severite) ? severite : 'MOYENNE';

    // Vérifier que le poste existe
    const poste = await prisma.poste.findUnique({ where: { id: posteId } });
    if (!poste) {
      return NextResponse.json({ error: 'Poste introuvable' }, { status: 404 });
    }

    // Créer l'anomalie
    const anomalie = await prisma.anomaly.create({
      data: {
        tripId: tripId || null,
        vehicleId: vehicleId || null,
        posteId,
        agentId: agentPayload.agentId,
        type,
        description: description.trim(),
        severite: anomalieSeverite,
        preuvesUrls: Array.isArray(preuvesUrls) ? preuvesUrls.join(',') : (preuvesUrls || null),
        latitude: latitude || null,
        longitude: longitude || null,
        statut: 'EN_ATTENTE',
      },
      include: {
        poste: { select: { nom: true, ville: true } },
      },
    });

    // Si anomalie critique, bloquer le trajet
    if (anomalieSeverite === 'CRITIQUE' && tripId) {
      await prisma.trip.update({
        where: { id: tripId },
        data: { statut: 'BLOQUE' },
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: agentPayload.userId,
        actionType: 'SIGNALEMENT',
        entityType: 'Anomaly',
        entityId: anomalie.id,
        description: `Signalement anomalie ${type} (${anomalieSeverite}) au poste ${anomalie.poste.nom}${tripId ? ` – trajet associé` : ''}`,
        latitude: latitude || null,
        longitude: longitude || null,
        posteId,
      },
    });

    return NextResponse.json({
      success: true,
      anomalie: {
        id: anomalie.id,
        type: anomalie.type,
        severite: anomalie.severite,
        statut: anomalie.statut,
        createdAt: anomalie.createdAt,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur signalement anomalie:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
