/**
 * ============================================================================
 * API CITOYEN – RECHERCHE PAR MATRICULE
 * GET /api/citoyen/recherche/matricule?matricule=A3B7K
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

    const { searchParams } = new URL(request.url);
    const matricule = searchParams.get('matricule')?.trim().toUpperCase();

    if (!matricule) {
      return NextResponse.json({ error: 'Matricule requis' }, { status: 400 });
    }

    // Rechercher le citoyen par matricule
    const citoyen = await prisma.citoyen.findUnique({
      where: { matricule },
      select: {
        id: true,
        matricule: true,
        nom: true,
        prenom: true,
        telephone: true,
        typePersonne: true,
        genre: true,
      },
    });

    if (!citoyen) {
      return NextResponse.json({ error: 'Matricule non trouvé' }, { status: 404 });
    }

    return NextResponse.json({ citoyen });
  } catch (error: any) {
    console.error('Erreur recherche matricule:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
