/**
 * ============================================================================
 * API ADMIN – CRÉATION DE SUPER ADMINISTRATEURS
 * POST /api/admin/super-admins
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await requireSuperAdmin(request, 'NATIONAL');
    const body = await request.json();

    const { nom, prenom, telephone, email, password, niveauAcces, regionId } = body;

    if (!nom || !prenom || !telephone || !email || !password) {
      return NextResponse.json({ error: 'Tous les champs sont requis' }, { status: 400 });
    }

    if (password.length < 10) {
      return NextResponse.json({ error: 'Mot de passe minimum 10 caractères' }, { status: 400 });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json({ error: 'Cet email est déjà utilisé' }, { status: 409 });
    }

    const existingPhone = await prisma.superAdmin.findUnique({ where: { telephone: telephone.trim() } });
    if (existingPhone) {
      return NextResponse.json({ error: 'Ce numéro de téléphone est déjà enregistré' }, { status: 409 });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const superAdmin = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: email.trim().toLowerCase(),
          passwordHash,
          userType: 'SUPER_ADMIN',
          status: 'ACTIF',
        },
      });

      return tx.superAdmin.create({
        data: {
          userId: user.id,
          nom: nom.trim().toUpperCase(),
          prenom: prenom.trim(),
          telephone: telephone.trim(),
          niveauAcces: niveauAcces || 'NATIONAL',
          regionId: niveauAcces === 'REGIONAL' ? regionId?.trim() || null : null,
        },
        include: { user: { select: { status: true, email: true } } },
      });
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'CREATION',
        entityType: 'SuperAdmin',
        entityId: superAdmin.id,
        description: `Création Super Admin ${superAdmin.prenom} ${superAdmin.nom} – niveau ${niveauAcces || 'NATIONAL'}`,
      },
    });

    return NextResponse.json({ data: { ...superAdmin } }, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}
