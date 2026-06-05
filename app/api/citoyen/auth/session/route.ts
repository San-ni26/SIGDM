/**
 * ============================================================================
 * API CITOYEN – SESSION & DÉCONNEXION
 * GET  /api/citoyen/auth/session  – Retourne la session active
 * POST /api/citoyen/auth/session  – Déconnexion (révocation DB + cookie)
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { SECURITY_HEADERS } from '@/lib/security/config';
import { verifyUnifiedSession, revokeUnifiedSession } from '@/lib/auth/unified-session';

export async function GET(_request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('CITOYEN');

    if (!session || !session.citoyenId) {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: SECURITY_HEADERS });
    }

    const citoyen = await prisma.citoyen.findUnique({
      where: { id: session.citoyenId },
      include: {
        user: { select: { status: true, email: true } },
        vehicules: {
          where: { statut: 'ACTIF' },
          select: { id: true, plaque: true, typeVehicle: true, marque: true, modele: true, statut: true },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { vehicules: true, trajetsDeclares: true, passagerTrips: true },
        },
      },
    });

    if (!citoyen || citoyen.user.status !== 'ACTIF') {
      return NextResponse.json({ authenticated: false }, { status: 401, headers: SECURITY_HEADERS });
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
    }, { headers: SECURITY_HEADERS });
  } catch (error) {
    console.error('Erreur session citoyen:', error);
    return NextResponse.json({ authenticated: false }, { status: 500, headers: SECURITY_HEADERS });
  }
}

export async function POST(_request: NextRequest) {
  try {
    await revokeUnifiedSession('CITOYEN');
    return NextResponse.json({ success: true, message: 'Déconnecté avec succès' }, { headers: SECURITY_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Erreur lors de la déconnexion' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
