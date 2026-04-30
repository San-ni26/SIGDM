/**
 * ============================================================================
 * API ADMIN – GESTION DES AGENTS
 * GET    /api/admin/agents         – Liste paginée avec filtres
 * POST   /api/admin/agents         – Créer un agent
 * PUT    /api/admin/agents?id=...  – Modifier l'agent
 * DELETE /api/admin/agents?id=...  – Désactiver l'agent
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Génère un matricule agent (ex: AGT-XXXXX)
async function generateMatriculeAgent(): Promise<string> {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
  let matricule: string;
  let attempts = 0;
  do {
    const suffix = Array.from({ length: 5 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    matricule = `AGT-${suffix}`;
    const exists = await prisma.agent.findUnique({ where: { matriculeAgent: matricule } });
    if (!exists) break;
    attempts++;
  } while (attempts < 20);
  return matricule!;
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '12'));
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const statut = searchParams.get('statut') || '';

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { matriculeAgent: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ];
    }

    if (type) {
      where.typeAgent = type;
    }

    if (statut) {
      where.user = { status: statut };
    }

    const [agents, total] = await Promise.all([
      prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { status: true } },
          poste: { select: { id: true, nom: true, ville: true, type: true } },
          _count: {
            select: { passages: true, anomaliesSignalees: true },
          },
        },
      }),
      prisma.agent.count({ where }),
    ]);

    return NextResponse.json({
      data: agents,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin(request);
    const body = await request.json();

    const { nom, prenom, telephone, typeAgent, grade, posteId, dateRecrutement, email, password } = body;

    if (!nom || !prenom || !telephone || !typeAgent || !dateRecrutement || !email || !password) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe minimum 8 caractères' }, { status: 400 });
    }

    // Vérifications d'unicité
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    const existingPhone = await prisma.agent.findUnique({ where: { telephone } });
    if (existingPhone) {
      return NextResponse.json({ error: 'Ce téléphone est déjà enregistré' }, { status: 409 });
    }

    const matriculeAgent = await generateMatriculeAgent();
    const passwordHash = await bcrypt.hash(password, 12);

    const agent = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          userType: typeAgent,
          status: 'ACTIF',
        },
      });

      return tx.agent.create({
        data: {
          userId: user.id,
          matriculeAgent,
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          telephone: telephone.trim(),
          typeAgent,
          grade: grade?.trim() || null,
          posteId: posteId || null,
          dateRecrutement: new Date(dateRecrutement),
        },
        include: {
          user: { select: { status: true } },
          poste: { select: { nom: true, ville: true, type: true } },
        },
      });
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'CREATION',
        entityType: 'Agent',
        entityId: agent.id,
        description: `Création agent ${agent.matriculeAgent} – ${agent.prenom} ${agent.nom}`,
      },
    });

    return NextResponse.json({ data: agent, matriculeAgent }, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSuperAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const body = await request.json();
    const { nom, prenom, telephone, typeAgent, grade, posteId, dateRecrutement, status } = body;

    const agent = await prisma.agent.findUnique({ where: { id }, include: { user: true } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    // Mise à jour statut user si demandé
    if (status) {
      await prisma.user.update({ where: { id: agent.userId }, data: { status } });
    }

    const updateData: Record<string, unknown> = {};
    if (nom) updateData.nom = nom.trim().toUpperCase();
    if (prenom) updateData.prenom = prenom.trim();
    if (telephone) updateData.telephone = telephone.trim();
    if (typeAgent) updateData.typeAgent = typeAgent;
    if (grade !== undefined) updateData.grade = grade?.trim() || null;
    if (posteId !== undefined) updateData.posteId = posteId || null;
    if (dateRecrutement) updateData.dateRecrutement = new Date(dateRecrutement);

    const updated = Object.keys(updateData).length > 0
      ? await prisma.agent.update({
          where: { id },
          data: updateData,
          include: {
            user: { select: { status: true } },
            poste: { select: { nom: true, ville: true, type: true } },
          },
        })
      : { ...agent, user: { status: status || agent.user.status } };

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'MODIFICATION',
        entityType: 'Agent',
        entityId: id,
        description: `Modification agent ${agent.matriculeAgent}${status ? ` → statut ${status}` : ''}`,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireSuperAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const agent = await prisma.agent.findUnique({ where: { id } });
    if (!agent) {
      return NextResponse.json({ error: 'Agent introuvable' }, { status: 404 });
    }

    // Soft delete – désactivation du compte
    await prisma.user.update({
      where: { id: agent.userId },
      data: { status: 'INACTIF' },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'SUPPRESSION',
        entityType: 'Agent',
        entityId: id,
        description: `Désactivation agent ${agent.matriculeAgent} – ${agent.prenom} ${agent.nom}`,
      },
    });

    return NextResponse.json({ message: 'Agent désactivé avec succès' });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}
