/**
 * ============================================================================
 * API CITOYEN – CONNEXION
 * POST /api/citoyen/auth/connexion
 * ============================================================================
 * Deux modes :
 *  - "telephone" : vérification téléphone + matricule
 *  - "vehicule"  : vérification plaque + code PIN (comparaison sécurisée)
 *
 * SÉCURITÉ :
 * - Rate limiting anti brute-force
 * - Session enregistrée en DB (révocable)
 * - PIN comparé via bcrypt si hashé, ou comparaison timing-safe sinon
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
import { timingSafeEqual } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 1. Rate limiting
    const rl = await checkLoginRateLimit(request, 'citoyen_login');
    if (rl.blocked) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfter), ...SECURITY_HEADERS } }
      );
    }

    // 2. Parser le body
    let body: any;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Corps de requête invalide' }, { status: 400, headers: SECURITY_HEADERS });
    }

    const { mode } = body;
    if (!mode || !['telephone', 'vehicule'].includes(mode)) {
      return NextResponse.json(
        { error: 'Mode de connexion invalide (telephone ou vehicule)' },
        { status: 400, headers: SECURITY_HEADERS }
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
        return NextResponse.json({ error: 'Téléphone et matricule requis' }, { status: 400, headers: SECURITY_HEADERS });
      }

      const found = await prisma.citoyen.findFirst({
        where: {
          telephone: telephone.trim(),
          matricule: matricule.trim().toUpperCase(),
        },
        include: { user: { select: { status: true } } },
      });

      if (!found) {
        return NextResponse.json({ error: 'Téléphone ou matricule incorrect' }, { status: 401, headers: SECURITY_HEADERS });
      }
      citoyen = found;
    }

    // ─── Mode 2 : Plaque + Code PIN ────────────────────────────────────────
    if (mode === 'vehicule') {
      const { plaque, pin } = body;

      if (!plaque || !pin) {
        return NextResponse.json({ error: 'Numéro de plaque et code PIN requis' }, { status: 400, headers: SECURITY_HEADERS });
      }

      const vehicle = await prisma.vehicle.findUnique({
        where: { plaque: plaque.trim().toUpperCase() },
        include: {
          proprietaireCitoyen: {
            include: { user: { select: { status: true } } },
          },
        },
      });

      if (!vehicle || !vehicle.proprietaireCitoyen) {
        return NextResponse.json({ error: 'Plaque ou code PIN incorrect' }, { status: 401, headers: SECURITY_HEADERS });
      }

      // Comparaison sécurisée du PIN (timing-safe)
      // Si le PIN est hashé avec bcrypt (commence par $2), on compare avec bcrypt
      // Sinon on utilise timingSafeEqual pour éviter les timing attacks
      const storedPin = vehicle.codePin || '';
      let pinValid = false;

      if (storedPin.startsWith('$2')) {
        // PIN hashé avec bcrypt
        pinValid = await bcrypt.compare(pin.trim(), storedPin);
      } else {
        // PIN en clair — comparaison timing-safe
        try {
          const a = Buffer.from(storedPin.padEnd(64));
          const b = Buffer.from(pin.trim().padEnd(64));
          pinValid = storedPin.length === pin.trim().length && timingSafeEqual(a, b);
        } catch {
          pinValid = false;
        }
      }

      if (!pinValid) {
        return NextResponse.json({ error: 'Plaque ou code PIN incorrect' }, { status: 401, headers: SECURITY_HEADERS });
      }

      citoyen = vehicle.proprietaireCitoyen;
    }

    if (!citoyen) {
      return NextResponse.json({ error: 'Connexion impossible' }, { status: 401, headers: SECURITY_HEADERS });
    }

    // 3. Vérifier le statut du compte
    if (citoyen.user.status !== 'ACTIF') {
      const msgs: Record<string, string> = {
        INACTIF: 'Votre compte est désactivé.',
        SUSPENDU: 'Votre compte est suspendu. Contactez les autorités.',
        EN_ATTENTE: 'Votre compte est en attente de validation.',
      };
      return NextResponse.json(
        { error: msgs[citoyen.user.status] || 'Compte inactif' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    // 4. Réinitialiser le rate limit
    await resetLoginRateLimit(request, 'citoyen_login');

    // 5. Créer la session en DB + cookie
    await createUnifiedSession('CITOYEN', citoyen.userId, {
      userId: citoyen.userId,
      role: 'CITOYEN',
      citoyenId: citoyen.id,
      matricule: citoyen.matricule,
    }, request);

    // 6. Audit + lastLoginAt
    await Promise.all([
      prisma.auditLog.create({
        data: {
          userId: citoyen.userId,
          actionType: 'CONNEXION',
          entityType: 'Citoyen',
          entityId: citoyen.id,
          description: `Connexion citoyen ${citoyen.matricule} via mode ${mode}`,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || undefined,
        },
      }),
      prisma.user.update({
        where: { id: citoyen.userId },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      citoyen: {
        id: citoyen.id,
        matricule: citoyen.matricule,
        nom: citoyen.nom,
        prenom: citoyen.prenom,
        telephone: citoyen.telephone,
      },
    }, { headers: SECURITY_HEADERS });

  } catch (error) {
    console.error('Erreur connexion citoyen:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
