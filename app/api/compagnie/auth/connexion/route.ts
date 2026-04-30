/**
 * ============================================================================
 * API COMPAGNIE – CONNEXION
 * POST /api/compagnie/auth/connexion
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

    const compagnie = await prisma.compagnie.findFirst({
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

    if (!compagnie || !compagnie.user.passwordHash) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    if (compagnie.user.status !== 'ACTIF') {
      return NextResponse.json(
        { error: 'Compte non actif' },
        { status: 403 }
      );
    }

    const valid = await bcrypt.compare(password, compagnie.user.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: 'Identifiants incorrects' },
        { status: 401 }
      );
    }

    const token = await new SignJWT({
      compagnieId: compagnie.id,
      userId: compagnie.user.id,
      type: 'COMPAGNIE',
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .setAudience('transport-ml-compagnie')
      .setIssuer('transport-ml-auth')
      .sign(secretKey);

    const cookieStore = await cookies();
    cookieStore.set({
      name: 'compagnie_token',
      value: token,
      ...COOKIE_CONFIG,
      maxAge: 7 * 24 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      compagnie: {
        id: compagnie.id,
        raisonSociale: compagnie.raisonSociale,
        email: compagnie.email,
      },
    });
  } catch (error: any) {
    console.error('Erreur connexion compagnie:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
