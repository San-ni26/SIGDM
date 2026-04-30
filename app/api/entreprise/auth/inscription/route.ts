/**
 * ============================================================================
 * API ENTREPRISE – INSCRIPTION
 * POST /api/entreprise/auth/inscription
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/lib/prisma';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      raisonSociale,
      nif,
      email,
      telephone,
      ville,
      region,
      nomRepresentant,
      password,
    } = body;

    // Validation
    if (!raisonSociale || !email || !telephone || !ville || !region || !nomRepresentant || !password) {
      return NextResponse.json(
        { error: 'Tous les champs obligatoires doivent être remplis' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Le mot de passe doit contenir au moins 8 caractères' },
        { status: 400 }
      );
    }

    // Vérifier si l'email existe déjà
    const existingUser = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'Cette adresse email est déjà utilisée' },
        { status: 409 }
      );
    }

    // Vérifier si le NIF existe déjà (s'il est fourni)
    if (nif) {
      const existingNif = await prisma.entreprise.findFirst({
        where: { nif: nif.trim() },
      });
      if (existingNif) {
        return NextResponse.json(
          { error: 'Ce numéro NIF est déjà enregistré' },
          { status: 409 }
        );
      }
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur et l'entreprise dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer l'utilisateur
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          userType: 'ENTREPRISE',
          status: 'EN_ATTENTE', // Nécessite validation par un admin
        },
      });

      // Créer l'entreprise
      const entreprise = await tx.entreprise.create({
        data: {
          raisonSociale: raisonSociale.trim(),
          nif: nif?.trim() || undefined,
          email: email.trim().toLowerCase(),
          telephone: telephone.trim(),
          ville: ville.trim(),
          region: region.trim(),
          nomRepresentant: nomRepresentant.trim(),
          adresse: '',
          telephoneRep: '',
          user: {
            connect: { id: user.id }
          }
        },
      });

      return { user, entreprise };
    });

    // Logger l'inscription
    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        actionType: 'CREATION',
        entityType: 'Entreprise',
        entityId: result.entreprise.id,
        description: `Inscription entreprise ${raisonSociale}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Inscription réussie. Votre compte est en attente de validation.',
      entreprise: {
        id: result.entreprise.id,
        raisonSociale: result.entreprise.raisonSociale,
        email: result.entreprise.email,
        statut: result.user.status,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erreur inscription entreprise:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
