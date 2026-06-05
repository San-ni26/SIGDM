import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyChauffeurSession } from '@/lib/auth/chauffeur-session';

/**
 * GET /api/compagnie/chauffeur/trips
 * Retourne les trajets assignés au chauffeur connecté (actifs ou récents)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await verifyChauffeurSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const trips = await prisma.trip.findMany({
      where: {
        conducteurId: session.citoyenId,
        declareParCompagnieId: session.compagnieId,
        statut: { in: ['EN_PREPARATION', 'EN_COURS'] },
      },
      include: {
        vehicle: {
          select: { id: true, plaque: true, typeVehicle: true, marque: true, modele: true, nombrePlaces: true },
        },
        passagers: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            matricule: true,
            typePersonne: true,
            siegeNumero: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: {
          select: { passages: true, passagers: true },
        },
      },
      orderBy: { dateDepart: 'asc' },
    });

    return NextResponse.json({ data: trips });
  } catch (error) {
    console.error('Erreur trajets chauffeur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
