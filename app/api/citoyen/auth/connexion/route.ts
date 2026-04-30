/**
 * ============================================================================
 * API CITOYEN – CONNEXION
 * POST /api/citoyen/auth/connexion
 * ============================================================================
 * Deux modes :
 *  - "telephone" : vérification téléphone + matricule
 *  - "vehicule"  : vérification plaque + code PIN à 4 chiffres
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function buildCitoyenToken(citoyenId: string, userId: string, matricule: string): Promise<string> {
  return new SignJWT({
    citoyenId,
    userId,
    matricule,
    type: 'CITOYEN',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .setAudience('transport-ml-citoyen')
    .setIssuer('transport-ml-auth')
    .sign(secretKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { mode } = body;

    if (!mode || !['telephone', 'vehicule'].includes(mode)) {
      return NextResponse.json(
        { error: 'Mode de connexion invalide (telephone ou vehicule)' },
        { status: 400 }
      );
    }

    let citoyen: {
      id: string;
      userId: string;
      matricule: string;
      nom: string;
      prenom: string;
      telephone: string;
      user: { status: string };
    } | null = null;

    // ─── Mode 1 : Téléphone + Matricule ───────────────────────────────────
    if (mode === 'telephone') {
      const { telephone, matricule } = body;

      if (!telephone || !matricule) {
        return NextResponse.json(
          { error: 'Téléphone et matricule requis' },
          { status: 400 }
        );
      }

      const found = await prisma.citoyen.findFirst({
        where: {
          telephone: telephone.trim(),
          matricule: matricule.trim().toUpperCase(),
        },
        include: { user: { select: { status: true } } },
      });

      if (!found) {
        return NextResponse.json(
          { error: 'Téléphone ou matricule incorrect' },
          { status: 401 }
        );
      }
      citoyen = found;
    }

    // ─── Mode 2 : Plaque + Code PIN ────────────────────────────────────────
    if (mode === 'vehicule') {
      const { plaque, pin } = body;

      if (!plaque || !pin) {
        return NextResponse.json(
          { error: 'Numéro de plaque et code PIN requis' },
          { status: 400 }
        );
      }

      const vehicle = await prisma.vehicle.findUnique({
        where: { plaque: plaque.trim().toUpperCase() },
        include: {
          proprietaireCitoyen: {
            include: { user: { select: { status: true } } },
          },
        },
      });

      if (!vehicle || vehicle.codePin !== pin.trim()) {
        return NextResponse.json(
          { error: 'Plaque ou code PIN incorrect' },
          { status: 401 }
        );
      }

      if (!vehicle.proprietaireCitoyen) {
        return NextResponse.json(
          { error: 'Ce véhicule n\'a pas de propriétaire enregistré' },
          { status: 403 }
        );
      }

      citoyen = vehicle.proprietaireCitoyen;
    }

    if (!citoyen) {
      return NextResponse.json({ error: 'Connexion impossible' }, { status: 401 });
    }

    // Vérifier le statut du compte
    if (citoyen.user.status !== 'ACTIF') {
      const msgs: Record<string, string> = {
        INACTIF: 'Votre compte est désactivé.',
        SUSPENDU: 'Votre compte est suspendu. Contactez les autorités.',
        EN_ATTENTE: 'Votre compte est en attente de validation.',
      };
      return NextResponse.json(
        { error: msgs[citoyen.user.status] || 'Compte inactif' },
        { status: 403 }
      );
    }

    // Générer le token JWT citoyen
    const token = await buildCitoyenToken(citoyen.id, citoyen.userId, citoyen.matricule);

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: citoyen.userId,
        actionType: 'CONNEXION',
        entityType: 'Citoyen',
        entityId: citoyen.id,
        description: `Connexion citoyen ${citoyen.matricule} via mode ${mode}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    });

    // Mise à jour lastLoginAt
    await prisma.user.update({
      where: { id: citoyen.userId },
      data: { lastLoginAt: new Date() },
    });

    // Définir le cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'citoyen_token',
      value: token,
      ...COOKIE_CONFIG,
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      citoyen: {
        id: citoyen.id,
        matricule: citoyen.matricule,
        nom: citoyen.nom,
        prenom: citoyen.prenom,
        telephone: citoyen.telephone,
      },
    });
  } catch (error: any) {
    console.error('Erreur connexion citoyen:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur lors de la connexion' },
      { status: 500 }
    );
  }
}
