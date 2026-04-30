/**
 * ============================================================================
 * API CITOYEN – DÉCLARER UN TRAJET
 * POST /api/citoyen/trajets/declarer
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getCitoyenId(request: NextRequest): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('citoyen_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-citoyen',
      issuer: 'transport-ml-auth',
    });
    return (payload as any).citoyenId || null;
  } catch {
    return null;
  }
}

// Génère une référence unique
function generateReference(): string {
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

export async function POST(request: NextRequest) {
  try {
    const citoyenId = await getCitoyenId(request);
    if (!citoyenId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const {
      vehicleId,
      pointDepart,
      destination,
      dateDepart,
      passagerMatricules,
      notes,
    } = body;

    // Validation
    if (!vehicleId || !pointDepart || !destination || !dateDepart) {
      return NextResponse.json(
        { error: 'Véhicule, départ, destination et date obligatoires' },
        { status: 400 }
      );
    }

    // Vérifier que le véhicule appartient au citoyen
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        proprietaireCitoyenId: citoyenId,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Véhicule non trouvé ou non autorisé' },
        { status: 403 }
      );
    }

    // Générer une référence unique
    let reference = generateReference();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await prisma.trip.findUnique({ where: { reference } });
      if (!exists) break;
      reference = generateReference();
      attempts++;
    }

    // Récupérer les infos des passagers par matricule - VERSION OPTIMISÉE
    let passagers: any[] = [];
    if (passagerMatricules && passagerMatricules.length > 0) {
      // Requête unique avec findMany au lieu de boucle N+1
      const citoyens = await prisma.citoyen.findMany({
        where: {
          matricule: {
            in: passagerMatricules.map((m: string) => m.toUpperCase()),
          },
        },
        select: {
          id: true,
          matricule: true,
          nom: true,
          prenom: true,
          telephone: true,
          typePersonne: true,
        },
      });
      
      passagers = citoyens.map((citoyen) => ({
        citoyenId: citoyen.id,
        matricule: citoyen.matricule,
        nom: citoyen.nom,
        prenom: citoyen.prenom,
        telephone: citoyen.telephone,
        typePersonne: citoyen.typePersonne,
      }));
    }

    // Créer le trajet
    const trip = await prisma.trip.create({
      data: {
        reference,
        vehicleId,
        declareParType: 'CITOYEN',
        declareParCitoyenId: citoyenId,
        driverId: citoyenId,
        pointDepart: pointDepart.trim(),
        destination: destination.trim(),
        dateDepart: new Date(dateDepart),
        statut: 'EN_PREPARATION',
        notes: notes?.trim() || null,
        passagers: {
          create: passagers.map(p => ({
            citoyenId: p.citoyenId,
            matricule: p.matricule,
            nom: p.nom,
            prenom: p.prenom,
            telephone: p.telephone,
            typePersonne: p.typePersonne,
          })),
        },
      },
      include: {
        vehicle: {
          select: { plaque: true, typeVehicle: true },
        },
        passagers: true,
      },
    });

    // Logger
    await prisma.auditLog.create({
      data: {
        userId: (await prisma.citoyen.findUnique({ where: { id: citoyenId }, select: { userId: true } }))!.userId,
        actionType: 'DECLARATION',
        entityType: 'Trip',
        entityId: trip.id,
        description: `Déclaration trajet ${reference}`,
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
        vehicle: trip.vehicle,
        passagers: trip.passagers,
      },
      message: 'Trajet déclaré avec succès!',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur déclaration trajet:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
