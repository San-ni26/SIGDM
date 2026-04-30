/**
 * ============================================================================
 * API ENTREPRISE – CONNEXION
 * POST /api/entreprise/auth/connexion
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Trouver l'entreprise
    const entreprise = await prisma.entreprise.findFirst({
      where: {
        OR: [
          { email: email.trim().toLowerCase() },
          { user: { email: email.trim().toLowerCase() } },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            passwordHash: true,
            status: true,
          },
        },
      },
    });

    if (!entreprise || !entreprise.user.passwordHash) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    if (entreprise.user.status !== 'ACTIF') {
      return NextResponse.json(
        { error: 'Compte non actif' },
        { status: 403 }
      );
    }

    // Vérifier le mot de passe
    const valid = await bcrypt.compare(password, entreprise.user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    // Générer le token JWT
    const token = await new SignJWT({
      entrepriseId: entreprise.id,
      userId: entreprise.user.id,
      type: 'ENTREPRISE',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .setAudience('transport-ml-entreprise')
      .setIssuer('transport-ml-auth')
      .sign(secretKey);

    // Définir le cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'entreprise_token',
      value: token,
      ...COOKIE_CONFIG,
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      entreprise: {
        id: entreprise.id,
        raisonSociale: entreprise.raisonSociale,
        email: entreprise.email,
      },
    });
  } catch (error: any) {
    console.error('Erreur connexion entreprise:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
