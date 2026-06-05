/**
 * ============================================================================
 * API AGENT – CONNEXION
 * POST /api/agent/auth/connexion
 * ============================================================================
 * - Rate limiting anti brute-force
 * - Session enregistrée en DB (révocable)
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
    const rl = await checkLoginRateLimit(request, 'agent_login');
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

    // 3. Rechercher l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      include: {
        agent: {
          include: {
            poste: { select: { id: true, nom: true, ville: true, type: true, statut: true } },
          },
        },
      },
    });

    const validAgentTypes = ['AGENT_CONTROLE', 'AGENT_DOUANE', 'AGENT_PEAGE'];

    if (!user || !user.agent || !validAgentTypes.includes(user.userType)) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401, headers: SECURITY_HEADERS });
    }

    // 4. Vérifier le mot de passe
    if (!user.passwordHash) {
      return NextResponse.json({ error: 'Compte non configuré. Contactez l\'administrateur.' }, { status: 403, headers: SECURITY_HEADERS });
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401, headers: SECURITY_HEADERS });
    }

    // 5. Vérifier le statut du compte
    if (user.status !== 'ACTIF') {
      const msgs: Record<string, string> = {
        INACTIF: 'Votre compte est désactivé. Contactez l\'administrateur.',
        SUSPENDU: 'Votre compte est suspendu.',
        EN_ATTENTE: 'Votre compte est en attente de validation.',
      };
      return NextResponse.json({ error: msgs[user.status] || 'Compte inactif' }, { status: 403, headers: SECURITY_HEADERS });
    }

    const agent = user.agent;

    // 6. Réinitialiser le rate limit après succès
    await resetLoginRateLimit(request, 'agent_login');

    // 7. Créer la session en DB + générer le cookie JWT
    await createUnifiedSession('AGENT', user.id, {
      userId: user.id,
      role: 'AGENT',
      agentId: agent.id,
      matriculeAgent: agent.matriculeAgent,
      typeAgent: agent.typeAgent,
      posteId: agent.posteId,
    }, request);

    // 8. Audit log + lastLoginAt
    await Promise.all([
      prisma.auditLog.create({
        data: {
          userId: user.id,
          actionType: 'CONNEXION',
          entityType: 'Agent',
          entityId: agent.id,
          description: `Connexion agent ${agent.matriculeAgent} – ${agent.prenom} ${agent.nom}`,
          ipAddress: getClientIP(request),
          userAgent: request.headers.get('user-agent') || undefined,
        },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { lastLoginAt: new Date() },
      }),
    ]);

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        matriculeAgent: agent.matriculeAgent,
        nom: agent.nom,
        prenom: agent.prenom,
        typeAgent: agent.typeAgent,
        grade: agent.grade,
        poste: agent.poste,
      },
    }, { headers: SECURITY_HEADERS });

  } catch (error) {
    console.error('Erreur connexion agent:', error);
    return NextResponse.json({ error: 'Erreur interne du serveur' }, { status: 500, headers: SECURITY_HEADERS });
  }
}
