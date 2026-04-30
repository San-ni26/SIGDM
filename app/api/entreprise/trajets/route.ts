/**
 * ============================================================================
 * API ENTREPRISE – TRAJETS
 * GET /api/entreprise/trajets - Liste des trajets de l'entreprise
 * POST /api/entreprise/trajets - Déclarer un nouveau trajet
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getEntrepriseSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('entreprise_token')?.value;

  if (!token) return null;

  try {
    const result = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-entreprise',
      issuer: 'transport-ml-auth',
    });
    return result.payload;
  } catch {
    return null;
  }
}

// Fonction utilitaire pour générer une référence unique
function generateTripReference() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let ref = 'TRP-';
  for (let i = 0; i < 8; i++) {
    ref += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return ref;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getEntrepriseSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const isEntreprise = session.type === 'ENTREPRISE';

    const trajets = await prisma.trip.findMany({
      where: isEntreprise 
        ? { declareParEntrepriseId: session.entrepriseId as string }
        : { declareParCompagnieId: session.entrepriseId as string },
      include: {
        vehicle: {
          select: { plaque: true, marque: true, modele: true, typeVehicle: true }
        },
        conducteur: {
          select: { nom: true, prenom: true, matricule: true }
        },
        _count: {
          select: { passages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: trajets });
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
      valeurMarchandise 
    } = body;

    if (!vehicleId || !conducteurId || !pointDepart || !destination || !dateDepart) {
      return NextResponse.json({ error: 'Veuillez remplir tous les champs obligatoires' }, { status: 400 });
    }

    const isEntreprise = session.type === 'ENTREPRISE';
    const reference = generateTripReference();

    const newTrip = await prisma.trip.create({
      data: {
        reference,
        vehicleId,
        declareParType: isEntreprise ? 'ENTREPRISE' : 'COMPAGNIE',
        declareParEntrepriseId: isEntreprise ? session.entrepriseId as string : null,
        declareParCompagnieId: !isEntreprise ? session.entrepriseId as string : null,
        conducteurId,
        pointDepart,
        destination,
        dateDepart: new Date(dateDepart),
        typeMarchandise: typeMarchandise || null,
        poidsMarchandise: poidsMarchandise ? parseFloat(poidsMarchandise) : null,
        valeurMarchandise: valeurMarchandise ? parseFloat(valeurMarchandise) : null,
        statut: 'EN_PREPARATION'
      }
    });

    return NextResponse.json({ success: true, data: newTrip }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur création trajet:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du trajet' }, { status: 500 });
  }
}
