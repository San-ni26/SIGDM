/**
 * ============================================================================
 * API ENTREPRISE – VÉHICULES DE LA FLOTTE
 * GET /api/entreprise/vehicules - Liste les véhicules de la flotte
 * POST /api/entreprise/vehicules - Ajoute un véhicule
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

export async function GET(request: NextRequest) {
  try {
    const session = await getEntrepriseSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const vehicules = await prisma.vehicle.findMany({
      where: { proprietaireEntrepriseId: session.entrepriseId as string },
      include: {
        _count: {
          select: { trajets: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: vehicules });
  } catch (error: any) {
    console.error('Erreur liste véhicules:', error);
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
    const { plaque, marque, modele, type, nombrePlaces } = body;

    if (!plaque || !type) {
      return NextResponse.json({ error: 'Plaque et type sont obligatoires' }, { status: 400 });
    }

    // Vérifier si la plaque existe déjà
    const existing = await prisma.vehicle.findUnique({
      where: { plaque: plaque.toUpperCase() }
    });

    if (existing) {
      return NextResponse.json({ error: 'Un véhicule avec cette plaque existe déjà' }, { status: 400 });
    }

    const newVehicle = await prisma.vehicle.create({
      data: {
        plaque: plaque.toUpperCase(),
        marque,
        modele,
        typeVehicle: type,
        nombrePlaces: nombrePlaces ? parseInt(nombrePlaces) : null,
        proprietaireEntrepriseId: session.entrepriseId as string,
        statut: 'ACTIF',
      }
    });

    return NextResponse.json({ success: true, data: newVehicle }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur création véhicule:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du véhicule' }, { status: 500 });
  }
}
