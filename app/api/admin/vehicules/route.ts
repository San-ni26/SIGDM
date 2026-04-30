/**
 * ============================================================================
 * API ADMIN – GESTION DES VÉHICULES
 * GET  /api/admin/vehicules         – Liste paginée avec filtres
 * POST /api/admin/vehicules         – Déclarer un véhicule (admin)
 * PUT  /api/admin/vehicules?id=...  – Modifier statut / infos
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';

// Génère un code PIN à 4 chiffres unique pour ce véhicule
function generatePin(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '15'));
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const statut = searchParams.get('statut') || '';

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { plaque: { contains: search, mode: 'insensitive' } },
        { marque: { contains: search, mode: 'insensitive' } },
        { modele: { contains: search, mode: 'insensitive' } },
        { proprietaireCitoyen: { OR: [
          { nom: { contains: search, mode: 'insensitive' } },
          { matricule: { contains: search, mode: 'insensitive' } },
        ]}},
      ];
    }

    if (type) where.typeVehicle = type;
    if (statut) where.statut = statut;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          proprietaireCitoyen: {
            select: { id: true, matricule: true, nom: true, prenom: true, telephone: true },
          },
          proprietaireEntreprise: {
            select: { id: true, raisonSociale: true },
          },
          proprietaireCompagnie: {
            select: { id: true, raisonSociale: true },
          },
          _count: { select: { trajets: true } },
        },
      }),
      prisma.vehicle.count({ where }),
    ]);

    // Masquer le codePin dans la liste
    const safeVehicles = vehicles.map(({ codePin, ...v }) => v);

    return NextResponse.json({
      data: safeVehicles,
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

    const {
      plaque,
      typeVehicle,
      marque,
      modele,
      anneeFabrication,
      couleur,
      nombrePlaces,
      carteGriseNumero,
      proprietaireCitoyenId,
      proprietaireEntrepriseId,
      proprietaireCompagnieId,
    } = body;

    if (!plaque || !typeVehicle) {
      return NextResponse.json({ error: 'Plaque et type de véhicule requis' }, { status: 400 });
    }

    // Vérifier plaque unique
    const existing = await prisma.vehicle.findUnique({ where: { plaque } });
    if (existing) {
      return NextResponse.json({ error: 'Cette plaque est déjà enregistrée' }, { status: 409 });
    }

    const codePin = generatePin();

    const vehicle = await prisma.vehicle.create({
      data: {
        plaque: plaque.trim().toUpperCase(),
        typeVehicle,
        marque: marque?.trim() || null,
        modele: modele?.trim() || null,
        anneeFabrication: anneeFabrication ? parseInt(anneeFabrication) : null,
        couleur: couleur?.trim() || null,
        nombrePlaces: nombrePlaces ? parseInt(nombrePlaces) : null,
        carteGriseNumero: carteGriseNumero?.trim() || null,
        codePin,
        proprietaireCitoyenId: proprietaireCitoyenId || null,
        proprietaireEntrepriseId: proprietaireEntrepriseId || null,
        proprietaireCompagnieId: proprietaireCompagnieId || null,
        statut: 'ACTIF',
      },
      include: {
        proprietaireCitoyen: { select: { matricule: true, nom: true, prenom: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'CREATION',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        description: `Enregistrement véhicule ${plaque} – type ${typeVehicle}`,
      },
    });

    return NextResponse.json({
      data: { ...vehicle, codePin: undefined },
      codePin, // Retourné une seule fois lors de la création
    }, { status: 201 });
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
    const { statut, nombrePlaces, marque, modele, couleur } = body;

    const vehicle = await prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (statut) updateData.statut = statut;
    if (nombrePlaces !== undefined) updateData.nombrePlaces = parseInt(nombrePlaces);
    if (marque !== undefined) updateData.marque = marque?.trim() || null;
    if (modele !== undefined) updateData.modele = modele?.trim() || null;
    if (couleur !== undefined) updateData.couleur = couleur?.trim() || null;

    const updated = await prisma.vehicle.update({
      where: { id },
      data: updateData,
      include: {
        proprietaireCitoyen: { select: { matricule: true, nom: true, prenom: true } },
        _count: { select: { trajets: true } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'MODIFICATION',
        entityType: 'Vehicle',
        entityId: id,
        description: `Modification véhicule ${vehicle.plaque}${statut ? ` → statut ${statut}` : ''}`,
      },
    });

    const { codePin, ...safeVehicle } = updated;
    return NextResponse.json({ data: safeVehicle });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}
