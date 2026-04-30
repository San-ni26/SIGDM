/**
 * ============================================================================
 * API CITOYEN – SESSION & DÉCONNEXION
 * GET  /api/citoyen/auth/session      – Retourne la session active
 * POST /api/citoyen/auth/session      – Déconnexion (clear cookie)
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

/**
 * GET – Vérifie et retourne la session citoyen active
 */
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('citoyen_token')?.value;

    if (!token) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Vérifier le JWT
    let payload: any;
    try {
      const result = await jwtVerify(token, secretKey, {
        algorithms: ['HS256'],
        audience: 'transport-ml-citoyen',
        issuer: 'transport-ml-auth',
      });
      payload = result.payload;
    } catch {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Charger le citoyen depuis la DB
    const citoyen = await prisma.citoyen.findUnique({
      where: { id: payload.citoyenId },
      include: {
        user: { select: { status: true, email: true } },
        vehicules: {
          where: { statut: 'ACTIF' },
          select: { id: true, plaque: true, typeVehicle: true, marque: true, modele: true, statut: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: {
            vehicules: true,
            trajetsDeclares: true,
            passagerTrips: true,
          },
        },
      },
    });

    if (!citoyen || citoyen.user.status !== 'ACTIF') {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    return NextResponse.json({
      authenticated: true,
      citoyen: {
        id: citoyen.id,
        matricule: citoyen.matricule,
        nom: citoyen.nom,
        prenom: citoyen.prenom,
        telephone: citoyen.telephone,
        email: citoyen.email || citoyen.user.email,
        genre: citoyen.genre,
        typePersonne: citoyen.typePersonne,
        ville: citoyen.ville,
        region: citoyen.region,
        photoUrl: citoyen.photoUrl,
        status: citoyen.user.status,
        vehicules: citoyen.vehicules,
        stats: {
          vehicules: citoyen._count.vehicules,
          trajets: citoyen._count.trajetsDeclares,
          passagerTrips: citoyen._count.passagerTrips,
        },
      },
    });
  } catch (error: any) {
    console.error('Erreur session citoyen:', error);
    return NextResponse.json({ authenticated: false }, { status: 500 });
  }
}

/**
 * POST – Déconnexion (efface le cookie citoyen)
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'citoyen_token',
      value: '',
      ...COOKIE_CONFIG,
      maxAge: 0,
    });

    return NextResponse.json({ success: true, message: 'Déconnecté avec succès' });
  } catch (error) {
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500 });
  }
}
