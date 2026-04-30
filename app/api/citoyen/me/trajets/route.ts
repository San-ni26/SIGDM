/**
 * ============================================================================
 * API CITOYEN – DÉCLARER UN TRAJET
 * POST /api/citoyen/me/trajets  (s'ajoute au GET existant)
 * ============================================================================
 * Le citoyen déclare un trajet avec son véhicule, ses passagers et sa destination
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getCitoyenAuth(request: NextRequest): Promise<{ citoyenId: string; userId: string } | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('citoyen_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-citoyen',
      issuer: 'transport-ml-auth',
    });
    return { citoyenId: (payload as any).citoyenId, userId: (payload as any).userId };
  } catch {
    return null;
  }
}

/** Génère une référence de trajet unique (ex: TRP-2024-XXXXX) */
async function generateTripReference(): Promise<string> {
  const year = new Date().getFullYear();
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let ref: string;
  let attempts = 0;
  do {
    const suffix = Array.from({ length: 5 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    ref = `TRP-${year}-${suffix}`;
    const exists = await prisma.trip.findUnique({ where: { reference: ref } });
    if (!exists) break;
    attempts++;
  } while (attempts < 20);
  return ref!;
}

/** GET – Liste des trajets du citoyen */
export async function GET(request: NextRequest) {
  try {
    const auth = await getCitoyenAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, parseInt(searchParams.get('limit') || '10'));
    const skip = (page - 1) * limit;

    const [trajets, total] = await Promise.all([
      prisma.trip.findMany({
        where: {
          OR: [
            { declareParCitoyenId: auth.citoyenId },
            { driverId: auth.citoyenId },
          ],
        },
        skip,
        take: limit,
        orderBy: { dateDepart: 'desc' },
        include: {
          vehicle: { select: { plaque: true, typeVehicle: true, marque: true, modele: true } },
          passagers: { select: { id: true, nom: true, prenom: true, typePersonne: true, matricule: true } },
          passages: {
            orderBy: { timestampPassage: 'asc' },
            select: {
              id: true,
              timestampPassage: true,
              statut: true,
              poste: { select: { nom: true, ville: true, type: true } },
            },
          },
          _count: { select: { passages: true, passagers: true, anomalies: true } },
        },
      }),
      prisma.trip.count({
        where: {
          OR: [
            { declareParCitoyenId: auth.citoyenId },
            { driverId: auth.citoyenId },
          ],
        },
      }),
    ]);

    const passagerTrips = await prisma.passagerTrip.findMany({
      where: { citoyenId: auth.citoyenId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        trip: {
          select: {
            reference: true, pointDepart: true, destination: true,
            dateDepart: true, statut: true,
            vehicle: { select: { plaque: true, typeVehicle: true } },
          },
        },
      },
    });

    return NextResponse.json({ data: trajets, passagerTrips, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

/** POST – Déclarer un nouveau trajet */
export async function POST(request: NextRequest) {
  try {
    const auth = await getCitoyenAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const {
      vehicleId,
      pointDepart,
      destination,
      dateDepart,
      dateArriveeEstimee,
      passagerIds,     // array of citoyenId for passengers
      notes,
    } = body;

    if (!vehicleId || !pointDepart || !destination || !dateDepart) {
      return NextResponse.json(
        { error: 'vehicleId, pointDepart, destination et dateDepart sont requis' },
        { status: 400 }
      );
    }

    // Vérifier que le véhicule appartient au citoyen
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, plaque: true, statut: true, proprietaireCitoyenId: true },
    });

    if (!vehicle || vehicle.proprietaireCitoyenId !== auth.citoyenId) {
      return NextResponse.json(
        { error: 'Véhicule introuvable ou non autorisé' },
        { status: 403 }
      );
    }

    if (vehicle.statut !== 'ACTIF') {
      return NextResponse.json(
        { error: 'Ce véhicule est suspendu ou inactif' },
        { status: 400 }
      );
    }

    // Récupérer les infos des passagers si fournis
    let passagers: { citoyenId: string; matricule: string; nom: string; prenom: string; telephone: string; typePersonne: string }[] = [];
    if (Array.isArray(passagerIds) && passagerIds.length > 0) {
      const citoyens = await prisma.citoyen.findMany({
        where: { id: { in: passagerIds } },
        select: { id: true, matricule: true, nom: true, prenom: true, telephone: true, typePersonne: true },
      });
      passagers = citoyens.map(c => ({
        citoyenId: c.id,
        matricule: c.matricule,
        nom: c.nom,
        prenom: c.prenom,
        telephone: c.telephone,
        typePersonne: c.typePersonne,
      }));
    }

    const reference = await generateTripReference();

    // Créer le trajet en transaction
    const trip = await prisma.$transaction(async (tx) => {
      const newTrip = await tx.trip.create({
        data: {
          reference,
          vehicleId,
          declareParType: 'CITOYEN',
          declareParCitoyenId: auth.citoyenId,
          driverId: auth.citoyenId,
          pointDepart: pointDepart.trim(),
          destination: destination.trim(),
          dateDepart: new Date(dateDepart),
          dateArriveeEstimee: dateArriveeEstimee ? new Date(dateArriveeEstimee) : null,
          notes: notes?.trim() || null,
          statut: 'EN_PREPARATION',
        },
      });

      // Ajouter les passagers
      if (passagers.length > 0) {
        await tx.passagerTrip.createMany({
          data: passagers.map(p => ({
            tripId: newTrip.id,
            citoyenId: p.citoyenId,
            matricule: p.matricule,
            nom: p.nom,
            prenom: p.prenom,
            telephone: p.telephone,
            typePersonne: p.typePersonne as any,
          })),
          skipDuplicates: true,
        });
      }

      return newTrip;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: auth.userId,
        actionType: 'DECLARATION',
        entityType: 'Trip',
        entityId: trip.id,
        description: `Déclaration trajet ${reference} – ${pointDepart} → ${destination}`,
      },
    });

    return NextResponse.json({
      success: true,
      trip: {
        id: trip.id,
        reference: trip.reference,
        pointDepart: trip.pointDepart,
        destination: trip.destination,
        dateDepart: trip.dateDepart,
        statut: trip.statut,
        passagersCount: passagers.length,
      },
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur déclaration trajet:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
