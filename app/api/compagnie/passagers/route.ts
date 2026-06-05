import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyUnifiedSession } from '@/lib/auth/unified-session';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('COMPAGNIE');
    if (!session || !session.compagnieId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50')));
    const skip = (page - 1) * limit;

    const whereClause: any = {
      trip: { declareParCompagnieId: session.compagnieId }
    };
    
    if (tripId) {
      whereClause.tripId = tripId;
    }

    const [passagers, total] = await Promise.all([
      prisma.passagerTrip.findMany({
        where: whereClause,
        include: {
          citoyen: {
            select: { id: true, matricule: true, nom: true, prenom: true, telephone: true, numeroPiece: true }
          },
          trip: {
            select: { id: true, reference: true, dateDepart: true, destination: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.passagerTrip.count({
        where: whereClause,
      }),
    ]);

    return NextResponse.json({
      data: passagers,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Erreur liste passagers compagnie:', error);
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
    const { tripId, matricule, typePersonne } = body;

    if (!tripId || !matricule) {
      return NextResponse.json({ error: 'TripId et Matricule requis' }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId }
    });

    if (!trip || trip.declareParCompagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Trajet introuvable ou non autorisé' }, { status: 404 });
    }

    const citoyen = await prisma.citoyen.findUnique({
      where: { matricule: matricule.toUpperCase() }
    });

    if (!citoyen) {
      return NextResponse.json({ error: 'Aucun citoyen trouvé avec ce matricule' }, { status: 404 });
    }

    // Vérifier s'il n'est pas déjà dans le trajet
    const existing = await prisma.passagerTrip.findUnique({
      where: {
        tripId_citoyenId: {
          tripId,
          citoyenId: citoyen.id
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ce passager est déjà enregistré pour ce trajet' }, { status: 400 });
    }

    const passagerTrip = await prisma.passagerTrip.create({
      data: {
        tripId,
        citoyenId: citoyen.id,
        matricule: citoyen.matricule,
        nom: citoyen.nom,
        prenom: citoyen.prenom,
        telephone: citoyen.telephone || '',
        typePersonne: typePersonne || 'ADULTE'
      }
    });

    return NextResponse.json({ success: true, data: passagerTrip }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur ajout passager compagnie:', error);
    return NextResponse.json({ error: "Erreur lors de l'ajout du passager" }, { status: 500 });
  }
}
