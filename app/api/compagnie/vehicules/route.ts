import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyUnifiedSession } from '@/lib/auth/unified-session';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('COMPAGNIE');
    if (!session || !session.compagnieId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const vehicules = await prisma.vehicle.findMany({
      where: { proprietaireCompagnieId: session.compagnieId },
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
    const session = await verifyUnifiedSession('COMPAGNIE');
    if (!session || !session.compagnieId) {
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
        proprietaireCompagnieId: session.compagnieId,
        statut: 'ACTIF',
      }
    });

    return NextResponse.json({ success: true, data: newVehicle }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur création véhicule:', error);
    return NextResponse.json({ error: 'Erreur lors de la création du véhicule' }, { status: 500 });
  }
}
