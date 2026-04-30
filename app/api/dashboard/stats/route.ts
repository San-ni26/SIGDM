/**
 * ============================================================================
 * API ROUTE - DASHBOARD STATISTIQUES
 * ============================================================================
 * Données agrégées pour le tableau de bord central
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import { SECURITY_HEADERS } from '@/lib/security/config';
import { checkRateLimit, apiRateLimiter, getClientIP } from '@/lib/security/rate-limit';
import { paginationSchema } from '@/lib/security/validation';

/**
 * GET /api/dashboard/stats
 * Récupérer les statistiques globales du dashboard
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Vérifier l'authentification
    const session = await requireSuperAdmin(request);
    
    // 2. Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(apiRateLimiter, `dashboard:${clientIP}`);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }
    
    // 3. Récupérer les paramètres de requête
    const { searchParams } = new URL(request.url);
    const range = searchParams.get('range') || '24h'; // 24h, 7d, 30d
    const regionFilter = session.niveauAcces === 'REGIONAL' ? session.regionId : searchParams.get('region');
    
    // 4. Calculer les dates
    const now = new Date();
    let startDate: Date;
    
    switch (range) {
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default: // 24h
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
    
    // 5. Récupérer les statistiques en parallèle
    const [
      totalStats,
      todayStats,
      recentTrips,
      activePostes,
      recentAnomalies,
      topAgents,
      vehiculesByType,
      passagesByHour,
    ] = await Promise.all([
      // Statistiques globales
      getGlobalStats(startDate, regionFilter),
      // Statistiques du jour
      getTodayStats(regionFilter),
      // Trajets récents
      getRecentTrips(10, regionFilter),
      // Postes actifs
      getActivePostes(regionFilter),
      // Anomalies récentes
      getRecentAnomalies(5, regionFilter),
      // Top agents
      getTopAgents(5, startDate, regionFilter),
      // Véhicules par type
      getVehiculesByType(regionFilter),
      // Passages par heure
      getPassagesByHour(startDate, regionFilter),
    ]);
    
    return NextResponse.json({
      success: true,
      data: {
        range,
        stats: totalStats,
        today: todayStats,
        recentTrips,
        activePostes,
        recentAnomalies,
        topAgents,
        vehiculesByType,
        passagesByHour,
      },
    }, {
      headers: {
        ...SECURITY_HEADERS,
        'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
      }
    });
    
  } catch (error) {
    console.error('Erreur dashboard stats:', error);
    
    if ((error as Error & { statusCode: number }).statusCode === 401) {
      return NextResponse.json(
        { error: 'Authentification requise' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }
    
    if ((error as Error & { statusCode: number }).statusCode === 403) {
      return NextResponse.json(
        { error: 'Accès non autorisé' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }
    
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * Récupère les statistiques globales
 */
async function getGlobalStats(startDate: Date, regionFilter?: string | null) {
  const where = regionFilter ? {
    createdAt: { gte: startDate },
    OR: [
      { pointDepart: { contains: regionFilter } },
      { destination: { contains: regionFilter } },
    ],
  } : { createdAt: { gte: startDate } };
  
  const [
    totalCitoyens,
    totalVehicules,
    totalEntreprises,
    totalTrips,
    totalPassages,
    totalAnomalies,
  ] = await Promise.all([
    prisma.citoyen.count(),
    prisma.vehicle.count(),
    prisma.entreprise.count({ 
      where: { 
        user: { status: 'ACTIF' } 
      } 
    }),
    prisma.trip.count({ where }),
    prisma.passage.count({ where: { timestampPassage: { gte: startDate } } }),
    prisma.anomaly.count({ where: { createdAt: { gte: startDate } } }),
  ]);
  
  return {
    totalCitoyens,
    totalVehicules,
    totalEntreprises,
    totalTrips,
    totalPassages,
    totalAnomalies,
    activeTrips: await prisma.trip.count({ 
      where: { 
        ...where,
        statut: 'EN_COURS' 
      } 
    }),
  };
}

/**
 * Récupère les statistiques du jour
 */
async function getTodayStats(regionFilter?: string | null) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const where = regionFilter ? {
    createdAt: { gte: today },
    OR: [
      { pointDepart: { contains: regionFilter } },
      { destination: { contains: regionFilter } },
    ],
  } : { createdAt: { gte: today } };
  
  const [
    tripsToday,
    passagesToday,
    anomaliesToday,
    newCitoyens,
    newVehicules,
  ] = await Promise.all([
    prisma.trip.count({ where }),
    prisma.passage.count({ 
      where: { 
        timestampPassage: { gte: today } 
      } 
    }),
    prisma.anomaly.count({ 
      where: { 
        createdAt: { gte: today } 
      } 
    }),
    prisma.citoyen.count({ 
      where: { 
        createdAt: { gte: today } 
      } 
    }),
    prisma.vehicle.count({ 
      where: { 
        createdAt: { gte: today } 
      } 
    }),
  ]);
  
  return {
    tripsToday,
    passagesToday,
    anomaliesToday,
    newCitoyens,
    newVehicules,
  };
}

/**
 * Récupère les trajets récents
 */
async function getRecentTrips(limit: number, regionFilter?: string | null) {
  const where = regionFilter ? {
    OR: [
      { pointDepart: { contains: regionFilter } },
      { destination: { contains: regionFilter } },
    ],
  } : {};
  
  return prisma.trip.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      vehicle: {
        select: { plaque: true, typeVehicle: true },
      },
      declareParCitoyen: {
        select: { nom: true, prenom: true },
      },
      declareParEntreprise: {
        select: { raisonSociale: true },
      },
    },
  });
}

/**
 * Récupère les postes actifs avec activité récente
 */
async function getActivePostes(regionFilter?: string | null) {
  const where = regionFilter ? {
    region: { contains: regionFilter },
    statut: 'ACTIF' as const,
  } : { statut: 'ACTIF' as const };
  
  const postes = await prisma.poste.findMany({
    where,
    include: {
      _count: {
        select: {
          passages: {
            where: {
              timestampPassage: {
                gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
              },
            },
          },
        },
      },
    },
  });
  
  return (postes as any[]).map(p => ({
    id: p.id,
    nom: p.nom,
    type: p.type,
    ville: p.ville,
    region: p.region,
    latitude: p.latitude,
    longitude: p.longitude,
    passages24h: p._count?.passages || 0,
  }));
}

/**
 * Récupère les anomalies récentes
 */
async function getRecentAnomalies(limit: number, regionFilter?: string | null) {
  const where = regionFilter ? {
    poste: { region: { contains: regionFilter } },
  } : {};
  
  return prisma.anomaly.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      poste: {
        select: { nom: true, ville: true },
      },
      agentSignale: {
        select: { nom: true, prenom: true },
      },
    },
  });
}

/**
 * Récupère les meilleurs agents
 */
async function getTopAgents(limit: number, startDate: Date, regionFilter?: string | null) {
  const where = regionFilter ? {
    timestampPassage: { gte: startDate },
    poste: { region: { contains: regionFilter } },
  } : {
    timestampPassage: { gte: startDate },
  };
  
  const agents = await prisma.passage.groupBy({
    by: ['agentId'],
    where,
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: 'desc',
      },
    },
    take: limit,
  });
  
  const agentDetails = await Promise.all(
    agents.map(async (a) => {
      const agent = await prisma.agent.findUnique({
        where: { id: a.agentId },
        select: { nom: true, prenom: true, typeAgent: true },
      });
      return {
        ...agent,
        passagesCount: a._count.id,
      };
    })
  );
  
  return agentDetails;
}

/**
 * Récupère la répartition des véhicules par type
 */
async function getVehiculesByType(regionFilter?: string | null) {
  // Agréger par type de véhicule
  const counts = await prisma.vehicle.groupBy({
    by: ['typeVehicle'],
    _count: {
      id: true,
    },
  });
  
  return counts.map(c => ({
    type: c.typeVehicle,
    count: c._count.id,
  }));
}

/**
 * Récupère les passages par heure pour les graphiques
 */
async function getPassagesByHour(startDate: Date, regionFilter?: string | null) {
  const where = regionFilter ? {
    timestampPassage: { gte: startDate },
    poste: { region: { contains: regionFilter } },
  } : {
    timestampPassage: { gte: startDate },
  };
  
  const passages = await prisma.passage.findMany({
    where,
    select: {
      timestampPassage: true,
      statut: true,
    },
  });
  
  // Agréger par heure
  const hourlyStats: Record<string, { total: number; valides: number; anomalies: number }> = {};
  
  passages.forEach(p => {
    const hour = p.timestampPassage.toISOString().slice(0, 13); // YYYY-MM-DDTHH
    if (!hourlyStats[hour]) {
      hourlyStats[hour] = { total: 0, valides: 0, anomalies: 0 };
    }
    hourlyStats[hour].total++;
    if (p.statut === 'VALIDE') hourlyStats[hour].valides++;
    if (p.statut === 'ANOMALIE') hourlyStats[hour].anomalies++;
  });
  
  return Object.entries(hourlyStats).map(([hour, stats]) => ({
    hour,
    ...stats,
  })).sort((a, b) => a.hour.localeCompare(b.hour));
}
