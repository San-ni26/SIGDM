import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/jwt';

/**
 * GET /api/admin/trajets
 * Liste paginée des trajets avec filtres temporels et détails complets
 */
export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;
    const search = searchParams.get('search') || '';
    const statut = searchParams.get('statut') || '';
    const year = searchParams.get('year') || '';
    const month = searchParams.get('month') || '';

    // Calcul de la plage temporelle
    const now = new Date();
    let dateFrom: Date | undefined;

    if (year && month) {
      // Filtre par mois spécifique
      dateFrom = new Date(parseInt(year), parseInt(month) - 1, 1);
      const dateTo = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      // Will be handled below
    } else {
      switch (range) {
        case '24h':
          dateFrom = new Date(now.getTime() - 24 * 3600 * 1000);
          break;
        case '7d':
          dateFrom = new Date(now.getTime() - 7 * 24 * 3600 * 1000);
          break;
        case '30d':
          dateFrom = new Date(now.getTime() - 30 * 24 * 3600 * 1000);
          break;
        case 'all':
          dateFrom = undefined;
          break;
      }
    }

    const where: any = {};

    // Filtre temporel
    if (year && month) {
      const y = parseInt(year), m = parseInt(month);
      where.createdAt = {
        gte: new Date(y, m - 1, 1),
        lte: new Date(y, m, 0, 23, 59, 59),
      };
    } else if (dateFrom) {
      where.createdAt = { gte: dateFrom };
    }

    // Filtre statut
    if (statut) where.statut = statut;

    // Recherche
    if (search) {
      where.OR = [
        { reference: { contains: search, mode: 'insensitive' } },
        { pointDepart: { contains: search, mode: 'insensitive' } },
        { destination: { contains: search, mode: 'insensitive' } },
        { vehicle: { plaque: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        include: {
          vehicle: {
            select: {
              id: true,
              plaque: true,
              typeVehicle: true,
              marque: true,
              modele: true,
              nombrePlaces: true,
              proprietaireCitoyen: { select: { nom: true, prenom: true } },
              proprietaireEntreprise: { select: { raisonSociale: true } },
              proprietaireCompagnie: { select: { raisonSociale: true } },
            },
          },
          conducteur: {
            select: { id: true, nom: true, prenom: true, matricule: true, telephone: true },
          },
          declareParCitoyen: {
            select: { nom: true, prenom: true, matricule: true },
          },
          declareParEntreprise: {
            select: { raisonSociale: true },
          },
          declareParCompagnie: {
            select: { raisonSociale: true },
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
          },
          passages: {
            select: {
              id: true,
              timestampPassage: true,
              statut: true,
              agentLatitude: true,
              agentLongitude: true,
              observations: true,
              poste: { select: { nom: true, type: true } },
              agent: { select: { nom: true, prenom: true, matriculeAgent: true } },
            },
            orderBy: { timestampPassage: 'asc' },
          },
          anomalies: {
            select: {
              id: true,
              type: true,
              statut: true,
              description: true,
              createdAt: true,
            },
          },
          _count: {
            select: { passagers: true, passages: true, anomalies: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trip.count({ where }),
    ]);

    // Stats globales pour la période sélectionnée
    const stats = await prisma.trip.groupBy({
      by: ['statut'],
      where,
      _count: true,
    });

    return NextResponse.json({
      data: trips,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
      stats: stats.reduce((acc: any, s: any) => ({ ...acc, [s.statut]: s._count }), {}),
    });
  } catch (error) {
    console.error('Erreur API admin trajets:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
