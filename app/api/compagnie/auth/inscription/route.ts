/**
 * ============================================================================
 * API COMPAGNIE – INSCRIPTION
 * POST /api/compagnie/auth/inscription
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      raisonSociale,
      nif,
      licenceTransport,
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
      const existingNif = await prisma.compagnie.findFirst({
        where: { nif: nif.trim() },
      });
      if (existingNif) {
        return NextResponse.json(
          { error: 'Ce numéro NIF est déjà enregistré' },
          { status: 409 }
        );
      }
    }

    // Vérifier la licence de transport (si fournie)
    if (licenceTransport) {
      const existingLicence = await prisma.compagnie.findUnique({
        where: { licenceTransport: licenceTransport.trim() },
      });
      if (existingLicence) {
        return NextResponse.json(
          { error: 'Cette licence de transport est déjà enregistrée' },
          { status: 409 }
        );
      }
    }

    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(password, 12);

    // Créer l'utilisateur et la compagnie dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // Créer l'utilisateur
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          userType: 'COMPAGNIE',
          status: 'EN_ATTENTE', // Nécessite validation par un admin
        },
      });

      // Créer la compagnie
      const compagnie = await tx.compagnie.create({
        data: {
          raisonSociale: raisonSociale.trim(),
          nif: nif?.trim() || undefined,
          licenceTransport: licenceTransport?.trim() || undefined,
          email: email.trim().toLowerCase(),
          telephone: telephone.trim(),
          ville: ville.trim(),
          region: region.trim(),
          nomRepresentant: nomRepresentant.trim(),
          adresse: '',
          telephoneRep: telephone.trim(), // On met le téléphone principal par défaut
          user: {
            connect: { id: user.id }
          }
        },
      });

      return { user, compagnie };
    }, {
      timeout: 15000, // Augmenter le timeout pour éviter l'erreur d'expiration
    });

    // Logger l'inscription
    await prisma.auditLog.create({
      data: {
        userId: result.user.id,
        actionType: 'CREATION',
        entityType: 'Compagnie',
        entityId: result.compagnie.id,
        description: `Inscription compagnie ${raisonSociale}`,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Inscription réussie. Votre compte est en attente de validation.',
      compagnie: {
        id: result.compagnie.id,
        raisonSociale: result.compagnie.raisonSociale,
        email: result.compagnie.email,
        statut: result.user.status,
      },
    }, { status: 201 });

  } catch (error: any) {
    console.error('Erreur inscription compagnie:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
