/**
 * ============================================================================
 * API AGENT – CONNEXION
 * POST /api/agent/auth/connexion
 * ============================================================================
 * Connexion agent par email + mot de passe
 * L'agent doit être assigné à un poste actif pour se connecter
 */

import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { JWT_SECRET, COOKIE_CONFIG } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function buildAgentToken(agentId: string, userId: string, matriculeAgent: string, typeAgent: string, posteId: string | null): Promise<string> {
  return new SignJWT({
    agentId,
    userId,
    matriculeAgent,
    typeAgent,
    posteId,
    type: 'AGENT',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('12h')
    .setAudience('transport-ml-agent')
    .setIssuer('transport-ml-auth')
    .sign(secretKey);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email et mot de passe requis' },
        { status: 400 }
      );
    }

    // Trouver l'utilisateur par email
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

    if (!user || !user.agent) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier le type d'utilisateur
    const validAgentTypes = ['AGENT_CONTROLE', 'AGENT_DOUANE', 'AGENT_PEAGE'];
    if (!validAgentTypes.includes(user.userType)) {
      return NextResponse.json(
        { error: 'Accès non autorisé à cet espace' },
        { status: 403 }
      );
    }

    // Vérifier le mot de passe
    if (!user.passwordHash) {
      return NextResponse.json(
        { error: 'Compte non configuré. Contactez l\'administrateur.' },
        { status: 403 }
      );
    }

    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      return NextResponse.json(
        { error: 'Email ou mot de passe incorrect' },
        { status: 401 }
      );
    }

    // Vérifier le statut du compte
    if (user.status !== 'ACTIF') {
      const msgs: Record<string, string> = {
        INACTIF: 'Votre compte est désactivé. Contactez l\'administrateur.',
        SUSPENDU: 'Votre compte est suspendu.',
        EN_ATTENTE: 'Votre compte est en attente de validation.',
      };
      return NextResponse.json(
        { error: msgs[user.status] || 'Compte inactif' },
        { status: 403 }
      );
    }

    const agent = user.agent;

    // Générer le token JWT agent
    const token = await buildAgentToken(
      agent.id,
      user.id,
      agent.matriculeAgent,
      agent.typeAgent,
      agent.posteId
    );

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        actionType: 'CONNEXION',
        entityType: 'Agent',
        entityId: agent.id,
        description: `Connexion agent ${agent.matriculeAgent} – ${agent.prenom} ${agent.nom}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      },
    });

    // Mise à jour lastLoginAt
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // Définir le cookie
    const cookieStore = await cookies();
    cookieStore.set({
      name: 'agent_token',
      value: token,
      ...COOKIE_CONFIG,
      maxAge: 12 * 60 * 60, // 12 heures
    });

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
    });
  } catch (error: any) {
    console.error('Erreur connexion agent:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur lors de la connexion' },
      { status: 500 }
    );
  }
}
