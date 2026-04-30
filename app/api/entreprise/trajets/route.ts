/**
 * ============================================================================
 * API ENTREPRISE – TRAJETS (VERSION OPTIMISÉE)
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getEntrepriseSession() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('entreprise_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey);
    return payload as { entrepriseId: string; type: 'ENTREPRISE' | 'COMPAGNIE' };
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

export async function GET(request: NextRequest) {
  try {
    const session = await getEntrepriseSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const isEntreprise = session.type === 'ENTREPRISE';

    // Requêtes parallèles pour pagination
    const [trajets, total] = await Promise.all([
      prisma.trip.findMany({
        where: isEntreprise
          ? { declareParEntrepriseId: session.entrepriseId }
          : { declareParCompagnieId: session.entrepriseId },
        select: {
          id: true,
          reference: true,
          pointDepart: true,
          destination: true,
          dateDepart: true,
          statut: true,
          createdAt: true,
          vehicle: {
            select: { 
              id: true,
              plaque: true, 
              marque: true, 
              modele: true, 
              typeVehicle: true 
            },
          },
          conducteur: {
            select: { 
              id: true,
              nom: true, 
              prenom: true, 
              matricule: true 
            },
          },
          _count: {
            select: { 
              passages: true,
              passagers: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trip.count({
        where: isEntreprise
          ? { declareParEntrepriseId: session.entrepriseId }
          : { declareParCompagnieId: session.entrepriseId },
      }),
    ]);

    return NextResponse.json({
      data: trajets,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Erreur liste trajets:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getEntrepriseSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const {
      vehicleId,
      conducteurId,
      pointDepart,
      destination,
      dateDepart,
      typeMarchandise,
      poidsMarchandise,
      valeurMarchandise,
    } = body;

    if (!vehicleId || !conducteurId || !pointDepart || !destination || !dateDepart) {
      return NextResponse.json(
        { error: 'Veuillez remplir tous les champs obligatoires' },
        { status: 400 }
      );
    }

    const isEntreprise = session.type === 'ENTREPRISE';
    const reference = generateTripReference();

    const newTrip = await prisma.trip.create({
      data: {
        reference,
        vehicleId,
        declareParType: isEntreprise ? 'ENTREPRISE' : 'COMPAGNIE',
        declareParEntrepriseId: isEntreprise ? session.entrepriseId : null,
        declareParCompagnieId: !isEntreprise ? session.entrepriseId : null,
        conducteurId,
        pointDepart: pointDepart.trim(),
        destination: destination.trim(),
        dateDepart: new Date(dateDepart),
        typeMarchandise: typeMarchandise || null,
        poidsMarchandise: poidsMarchandise ? parseFloat(poidsMarchandise) : null,
        valeurMarchandise: valeurMarchandise ? parseFloat(valeurMarchandise) : null,
        statut: 'EN_PREPARATION',
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

    return NextResponse.json({ success: true, data: newTrip }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur création trajet:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du trajet' },
      { status: 500 }
    );
  }
}
