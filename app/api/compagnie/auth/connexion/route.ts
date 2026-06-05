/**
 * ============================================================================
 * API COMPAGNIE – CONNEXION
 * POST /api/compagnie/auth/connexion
 * ============================================================================
 * - Rate limiting anti brute-force
 * - Session enregistrée en DB (révocable)
 * - Token réduit à 24h
 * - Erreurs internes masquées
 */

import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { SECURITY_HEADERS } from '@/lib/security/config';
import {
  createUnifiedSession,
  checkLoginRateLimit,
  resetLoginRateLimit,
} from '@/lib/auth/unified-session';
import { getClientIP } from '@/lib/security/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rl = await checkLoginRateLimit(request, 'compagnie_login');
    if (rl.blocked) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter), ...SECURITY_HEADERS } }
      );
    }

    // 2. Parser le body
    let email: string, password: string;
    try {
      ({ email, password } = await request.json());
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400, headers: SECURITY_HEADERS });
    }

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400, headers: SECURITY_HEADERS });
    }

    // 3. Trouver la compagnie
    const compagnie = await prisma.compagnie.findFirst({
      where: {
        OR: [
          { email: email.trim().toLowerCase() },
          { user: { email: email.trim().toLowerCase() } },
        ],
      },
      include: {
        user: {
          select: { id: true, email: true, passwordHash: true, status: true },
        },
      },
    });

    if (!compagnie || !compagnie.user.passwordHash) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401, headers: SECURITY_HEADERS });
    }

    // 4. Vérifier le mot de passe
    const valid = await bcrypt.compare(password, compagnie.user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 401, headers: SECURITY_HEADERS });
    }

    // 5. Vérifier le statut
    if (compagnie.user.status !== 'ACTIF') {
      const msgs: Record<string, string> = {
        INACTIF: 'Votre compte est désactivé.',
        SUSPENDU: 'Votre compte est suspendu. Contactez l\'administrateur.',
        EN_ATTENTE: 'Votre compte est en attente de validation.',
      };
      return NextResponse.json(
        { error: msgs[compagnie.user.status] || 'Compte inactif' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    // 6. Réinitialiser le rate limit
    await resetLoginRateLimit(request, 'compagnie_login');

    // 7. Créer la session en DB + cookie
    await createUnifiedSession('COMPAGNIE', compagnie.user.id, {
      userId: compagnie.user.id,
      role: 'COMPAGNIE',
      compagnieId: compagnie.id,
    }, request);

    // 8. Audit + lastLoginAt
    await Promise.all([
      prisma.auditLog.create({
        data: {
          userId: compagnie.user.id,
          actionType: 'CONNEXION',
          entityType: 'Compagnie',
          entityId: compagnie.id,
          description: `Connexion compagnie – ${compagnie.raisonSociale}`,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || undefined,
        },
      }),
      prisma.user.update({
        where: { id: compagnie.user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      compagnie: {
        id: compagnie.id,
        raisonSociale: compagnie.raisonSociale,
        email: compagnie.email,
      },
    }, { headers: SECURITY_HEADERS });

  } catch (error) {
    console.error('Erreur connexion compagnie:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
