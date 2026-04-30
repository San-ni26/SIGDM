/**
 * ============================================================================
 * API CITOYEN – MES TRAJETS (VERSION OPTIMISÉE)
 * GET /api/citoyen/me/trajets
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getCitoyenAuth(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('citoyen_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-citoyen',
      issuer: 'transport-ml-auth',
    });
    return payload as { citoyenId: string; userId: string };
  } catch {
    return null;
  }
}

function generateTripReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const date = new Date();
  const dateStr = date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const random = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `TRJ-${dateStr}-${random}`;
}

/** GET – Liste paginée des trajets du citoyen */
export async function GET(request: NextRequest) {
  try {
    const auth = await getCitoyenAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') || '10')));
    const skip = (page - 1) * limit;

    // Requêtes parallèles optimisées
    const [trajets, total] = await Promise.all([
      prisma.trip.findMany({
        where: {
          OR: [
            { declareParCitoyenId: auth.citoyenId },
            { driverId: auth.citoyenId },
          ],
        },
        select: {
          id: true,
          reference: true,
          pointDepart: true,
          destination: true,
          dateDepart: true,
          dateArriveeEstimee: true,
          statut: true,
          createdAt: true,
          vehicle: {
            select: {
              id: true,
              plaque: true,
              typeVehicle: true,
              marque: true,
            },
          },
          // Limiter les passagers
          passagers: {
            select: {
              id: true,
              matricule: true,
              nom: true,
              prenom: true,
            },
            take: 5,
          },
          _count: {
            select: {
              passagers: true,
              passages: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
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

    // Trajets où le citoyen est passager (limité à 5)
    const passagerTrips = await prisma.passagerTrip.findMany({
      where: { citoyenId: auth.citoyenId },
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        trip: {
          select: {
            reference: true,
            pointDepart: true,
            destination: true,
            dateDepart: true,
            statut: true,
            vehicle: {
              select: { plaque: true, typeVehicle: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      data: trajets,
      passagerTrips,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
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
      passagerIds,
      notes,
    } = body;

    if (!vehicleId || !pointDepart || !destination || !dateDepart) {
      return NextResponse.json(
        { error: 'vehicleId, pointDepart, destination et dateDepart sont requis' },
        { status: 400 }
      );
    }

    // Vérifier le véhicule
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

    // Récupérer les passagers en une seule requête
    let passagers: any[] = [];
    if (Array.isArray(passagerIds) && passagerIds.length > 0) {
      const citoyens = await prisma.citoyen.findMany({
        where: { id: { in: passagerIds } },
        select: {
          id: true,
          matricule: true,
          nom: true,
          prenom: true,
          telephone: true,
          typePersonne: true,
        },
      });
      passagers = citoyens.map((c) => ({
        citoyenId: c.id,
        matricule: c.matricule,
        nom: c.nom,
        prenom: c.prenom,
        telephone: c.telephone,
        typePersonne: c.typePersonne,
      }));
    }

    const reference = generateTripReference();

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
          statut: 'EN_PREPARATION',
          notes: notes?.trim() || null,
        },
        select: {
          id: true,
          reference: true,
          pointDepart: true,
          destination: true,
          dateDepart: true,
          statut: true,
        },
      });

      // Créer les passagers en batch
      if (passagers.length > 0) {
        await tx.passagerTrip.createMany({
          data: passagers.map((p) => ({
            tripId: newTrip.id,
            citoyenId: p.citoyenId,
            matricule: p.matricule,
            nom: p.nom,
            prenom: p.prenom,
            telephone: p.telephone,
            typePersonne: p.typePersonne,
          })),
        });
      }

      return newTrip;
    });

    // Audit log hors transaction (fire-and-forget)
    prisma.auditLog.create({
      data: {
        userId: auth.userId,
        actionType: 'CREATION',
        entityType: 'Trip',
        entityId: trip.id,
        description: `Déclaration trajet ${reference}`,
      },
    }).catch(console.error);

    return NextResponse.json({ success: true, data: trip }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur création trajet:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
