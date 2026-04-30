/**
 * ============================================================================
 * API AGENT – RECHERCHE DE TRAJETS
 * GET /api/agent/trajets/recherche?query=ABC123
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getAgentId(request: NextRequest): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('agent_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-agent',
      issuer: 'transport-ml-auth',
    });
    return (payload as any).agentId || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const agentId = await getAgentId(request);
    if (!agentId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query')?.trim();

    if (!query) {
      return NextResponse.json({ error: 'Requête requise' }, { status: 400 });
    }

    // Recherche par plaque ou référence
    const isPlaque = /^[A-Z]{2}-\d{4}-[A-Z]{2}$/i.test(query) || query.length < 10;
    
    let trips;
    
    if (isPlaque) {
      // Recherche par plaque de véhicule
      trips = await prisma.trip.findMany({
        where: {
          vehicle: {
            plaque: {
              contains: query.toUpperCase(),
              mode: 'insensitive',
            },
          },
          statut: {
            in: ['EN_PREPARATION', 'EN_COURS'],
          },
        },
        include: {
          vehicle: {
            select: {
              id: true,
              plaque: true,
              typeVehicle: true,
              marque: true,
              modele: true,
              nombrePlaces: true,
            },
          },
          driver: {
            select: {
              id: true,
              matricule: true,
              nom: true,
              prenom: true,
              telephone: true,
            },
          },
          passagers: {
            select: {
              id: true,
              matricule: true,
              nom: true,
              prenom: true,
              telephone: true,
              typePersonne: true,
            },
          },
          passages: {
            select: {
              id: true,
              posteId: true,
              timestampPassage: true,
              statut: true,
            },
            orderBy: { timestampPassage: 'desc' },
          },
          _count: {
            select: {
              passages: true,
              anomalies: true,
            },
          },
        },
        orderBy: { dateDepart: 'desc' },
        take: 10,
      });
    } else {
      // Recherche par référence
      trips = await prisma.trip.findMany({
        where: {
          reference: {
            contains: query.toUpperCase(),
            mode: 'insensitive',
          },
        },
        include: {
          vehicle: {
            select: {
              id: true,
              plaque: true,
              typeVehicle: true,
              marque: true,
              modele: true,
              nombrePlaces: true,
            },
          },
          driver: {
            select: {
              id: true,
              matricule: true,
              nom: true,
              prenom: true,
              telephone: true,
            },
          },
          passagers: {
            select: {
              id: true,
              matricule: true,
              nom: true,
              prenom: true,
              telephone: true,
              typePersonne: true,
            },
          },
          passages: {
            select: {
              id: true,
              posteId: true,
              timestampPassage: true,
              statut: true,
            },
            orderBy: { timestampPassage: 'desc' },
          },
          _count: {
            select: {
              passages: true,
              anomalies: true,
            },
          },
        },
        take: 5,
      });
    }

    return NextResponse.json({
      data: trips,
      count: trips.length,
      query,
    });
  } catch (error: any) {
    console.error('Erreur recherche trajets:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
