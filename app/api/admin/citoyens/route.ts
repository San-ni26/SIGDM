/**
 * ============================================================================
 * API ADMIN – GESTION DES CITOYENS
 * GET /api/admin/citoyens  – Liste avec pagination et filtres
 * POST /api/admin/citoyens – Créer un citoyen
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';

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
  } while (attempts < 10);
  return matricule!;
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '15'));
    const search = searchParams.get('search') || '';
    const statut = searchParams.get('statut') || '';

    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { nom: { contains: search, mode: 'insensitive' } },
        { prenom: { contains: search, mode: 'insensitive' } },
        { matricule: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search } },
      ];
    }

    if (statut) {
      where.user = { status: statut };
    }

    const [citoyens, total] = await Promise.all([
      prisma.citoyen.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { status: true, email: true } },
          _count: {
            select: {
              vehicules: true,
              trajetsDeclares: true,
              passagerTrips: true,
            },
          },
        },
      }),
      prisma.citoyen.count({ where }),
    ]);

    return NextResponse.json({
      data: citoyens,
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
    await requireSuperAdmin(request);

    const body = await request.json();
    const { nom, prenom, dateNaissance, lieuNaissance, genre, typePersonne, telephone, email, ville, region, adresse } = body;

    if (!nom || !prenom || !dateNaissance || !lieuNaissance || !genre || !typePersonne || !telephone) {
      return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
    }

    // Vérifier téléphone unique
    const existingTel = await prisma.citoyen.findUnique({ where: { telephone } });
    if (existingTel) {
      return NextResponse.json({ error: 'Ce numéro de téléphone est déjà enregistré' }, { status: 409 });
    }

    const matricule = await generateMatricule();

    const citoyen = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userType: 'CITOYEN',
          status: 'ACTIF',
          email: email || null,
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
          email: email?.trim() || null,
          ville: ville?.trim() || null,
          region: region?.trim() || null,
          adresse: adresse?.trim() || null,
        },
        include: { user: { select: { status: true, email: true } } },
      });
    });

    return NextResponse.json({ data: citoyen, matricule }, { status: 201 });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}
