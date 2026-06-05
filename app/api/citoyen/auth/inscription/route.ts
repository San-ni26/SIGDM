/**
 * ============================================================================
 * API CITOYEN – INSCRIPTION
 * POST /api/citoyen/auth/inscription
 * ============================================================================
 * Crée un compte voyageur individuel avec matricule auto-généré.
 * La photo de profil est reçue en base64 (compressée côté client via Canvas)
 * et stockée directement en base de données dans le champ photoUrl.
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
      photoBase64,   // ← base64 compressé envoyé par le client
    } = body;

    // ── Validation des champs obligatoires ───────────────────────────────────
    if (!nom || !prenom || !dateNaissance || !lieuNaissance || !genre || !typePersonne || !telephone) {
      return NextResponse.json(
        { error: 'Champs obligatoires manquants (nom, prénom, date naissance, lieu, genre, type, téléphone)' },
        { status: 400 }
      );
    }

    // ── Validation de la photo base64 ────────────────────────────────────────
    if (
      !photoBase64 ||
      typeof photoBase64 !== 'string' ||
      !photoBase64.startsWith('data:image/')
    ) {
      return NextResponse.json(
        { error: 'La photo de profil est obligatoire et doit être une image base64 valide.' },
        { status: 400 }
      );
    }

    // Vérification de la taille (base64 → ~75% de la taille réelle)
    // On limite à ~800 Ko en base64 (≈ 600 Ko image compressée)
    const MAX_BASE64_LENGTH = 800 * 1024; // 800 Ko
    if (photoBase64.length > MAX_BASE64_LENGTH) {
      return NextResponse.json(
        { error: 'La photo est trop volumineuse après compression. Veuillez choisir une image plus petite.' },
        { status: 400 }
      );
    }

    // ── Unicité téléphone ────────────────────────────────────────────────────
    const existingTel = await prisma.citoyen.findUnique({ where: { telephone: telephone.trim() } });
    if (existingTel) {
      return NextResponse.json(
        { error: 'Ce numéro de téléphone est déjà enregistré' },
        { status: 409 }
      );
    }

    // ── Unicité email ────────────────────────────────────────────────────────
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

    // ── Création en transaction ──────────────────────────────────────────────
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
          // Stockage direct du base64 compressé dans la colonne photo_url
          photoUrl: photoBase64,
        },
        include: {
          user: { select: { id: true, status: true } },
        },
      });
    });

    // ── Génération JWT ───────────────────────────────────────────────────────
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

    // ── Log d'audit ──────────────────────────────────────────────────────────
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

    // ── Cookie de session ────────────────────────────────────────────────────
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
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Erreur serveur lors de l\'inscription';
    console.error('Erreur inscription citoyen:', error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
