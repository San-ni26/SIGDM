/**
 * ============================================================================
 * API CITOYEN – MES VÉHICULES
 * GET /api/citoyen/me/vehicules
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

export async function GET(request: NextRequest) {
  try {
    const citoyenId = await getCitoyenId(request);
    if (!citoyenId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const vehicules = await prisma.vehicle.findMany({
      where: { proprietaireCitoyenId: citoyenId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        plaque: true,
        typeVehicle: true,
        marque: true,
        modele: true,
        couleur: true,
        anneeFabrication: true,
        nombrePlaces: true,
        statut: true,
        carteGriseNumero: true,
        createdAt: true,
        _count: { select: { trajets: true } },
      },
    });

    return NextResponse.json({ data: vehicules, total: vehicules.length });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
