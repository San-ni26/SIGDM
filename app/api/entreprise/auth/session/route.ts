/**
 * ============================================================================
 * API ENTREPRISE – SESSION
 * GET /api/entreprise/auth/session
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
    const token = cookieStore.get('entreprise_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let payload: any;
    try {
      const result = await jwtVerify(token, secretKey, {
        algorithms: ['HS256'],
        audience: 'transport-ml-entreprise',
        issuer: 'transport-ml-auth',
      });
      payload = result.payload;
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const entreprise = await prisma.entreprise.findUnique({
      where: { id: payload.entrepriseId },
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

    if (!entreprise || entreprise.user.status !== 'ACTIF') {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      entreprise: {
        id: entreprise.id,
        raisonSociale: entreprise.raisonSociale,
        nif: entreprise.nif,
        telephone: entreprise.telephone,
        email: entreprise.email,
        ville: entreprise.ville,
        region: entreprise.region,
        nomRepresentant: entreprise.nomRepresentant,
        stats: {
          vehicules: entreprise._count.vehicules,
          trajets: entreprise._count.trajets,
        },
      },
    });
  } catch (error: any) {
    console.error('Erreur session entreprise:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

export async function POST() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('entreprise_token');
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}
