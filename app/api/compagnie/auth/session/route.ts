/**
 * ============================================================================
 * API COMPAGNIE – SESSION
 * GET /api/compagnie/auth/session
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('compagnie_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let payload: any;
    try {
      const result = await jwtVerify(token, secretKey, {
        algorithms: ['HS256'],
        audience: 'transport-ml-compagnie',
        issuer: 'transport-ml-auth',
      });
      payload = result.payload;
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const compagnie = await prisma.compagnie.findUnique({
      where: { id: payload.compagnieId },
      include: {
        user: { select: { status: true } },
        _count: {
          select: {
            vehicules: true,
            trajets: true,
          },
        },
      },
    });

    if (!compagnie || compagnie.user.status !== 'ACTIF') {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      compagnie: {
        id: compagnie.id,
        raisonSociale: compagnie.raisonSociale,
        licenceTransport: compagnie.licenceTransport,
        telephone: compagnie.telephone,
        email: compagnie.email,
        ville: compagnie.ville,
        region: compagnie.region,
        nomRepresentant: compagnie.nomRepresentant,
        stats: {
          vehicules: compagnie._count.vehicules,
          trajets: compagnie._count.trajets,
        },
      },
    });
  } catch (error: any) {
    console.error('Erreur session compagnie:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('compagnie_token');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}
