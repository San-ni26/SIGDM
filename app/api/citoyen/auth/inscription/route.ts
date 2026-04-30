/**
 * ============================================================================
 * API CITOYEN – INSCRIPTION
 * POST /api/citoyen/auth/inscription
 * ============================================================================
 * Crée un compte voyageur individuel avec matricule auto-généré.
 * Aucun mot de passe requis : connexion via téléphone+matricule ou plaque+PIN.
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

// Génère un matricule unique de 5 caractères alphanumériques
async function generateMatricule(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let matricule: string;
  let attempts = 0;
  do {
    matricule = Array.from({ length: 5 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    const exists = await prisma.citoyen.findUnique({ where: { matricule } });
    if (!exists) break;
    attempts++;
  } while (attempts < 20);
  return matricule!;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      nom,
      prenom,
      dateNaissance,
      lieuNaissance,
      genre,
      typePersonne,
      telephone,
      email,
      ville,
      region,
      adresse,
    } = body;

    // Validation des champs obligatoires
    if (!nom || !prenom || !dateNaissance || !lieuNaissance || !genre || !typePersonne || !telephone) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants (nom, prénom, date naissance, lieu, genre, type, téléphone)' },
        { status: 400 }
      );
    }

    // Vérifier que le téléphone n'est pas déjà utilisé
    const existingTel = await prisma.citoyen.findUnique({ where: { telephone: telephone.trim() } });
    if (existingTel) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà enregistré' },
        { status: 409 }
      );
    }

    // Vérifier l'email si fourni
    if (email) {
      const existingEmail = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
      if (existingEmail) {
        return NextResponse.json(
          { error: 'Cet email est déjà utilisé' },
          { status: 409 }
        );
      }
    }

    const matricule = await generateMatricule();

    // Créer le compte en transaction
    const citoyen = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userType: 'CITOYEN',
          status: 'ACTIF',
          email: email ? email.trim().toLowerCase() : null,
        },
      });

      return tx.citoyen.create({
        data: {
          userId: user.id,
          matricule,
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          dateNaissance: new Date(dateNaissance),
          lieuNaissance: lieuNaissance.trim(),
          genre,
          typePersonne,
          telephone: telephone.trim(),
          email: email ? email.trim().toLowerCase() : null,
          ville: ville?.trim() || null,
          region: region?.trim() || null,
          adresse: adresse?.trim() || null,
        },
        include: {
          user: { select: { id: true, status: true } },
        },
      });
    });

    // Générer un token JWT citoyen et connecter automatiquement
    const token = await new SignJWT({
      citoyenId: citoyen.id,
      userId: citoyen.userId,
      matricule: citoyen.matricule,
      type: 'CITOYEN',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .setAudience('transport-ml-citoyen')
      .setIssuer('transport-ml-auth')
      .sign(secretKey);

    // Enregistrer le log d'audit
    await prisma.auditLog.create({
      data: {
        userId: citoyen.userId,
        actionType: 'CREATION',
        entityType: 'Citoyen',
        entityId: citoyen.id,
        description: `Inscription citoyen ${citoyen.matricule} – ${citoyen.prenom} ${citoyen.nom}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    });

    // Définir le cookie citoyen
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'citoyen_token',
      value: token,
      ...COOKIE_CONFIG,
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json(
      {
        success: true,
        matricule: citoyen.matricule,
        citoyen: {
          id: citoyen.id,
          matricule: citoyen.matricule,
          nom: citoyen.nom,
          prenom: citoyen.prenom,
          telephone: citoyen.telephone,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Erreur inscription citoyen:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur lors de l\'inscription' },
      { status: 500 }
    );
  }
}
