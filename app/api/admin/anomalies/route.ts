/**
 * ============================================================================
 * API ADMIN – GESTION DES ANOMALIES
 * GET /api/admin/anomalies         – Liste paginée avec filtres
 * PUT /api/admin/anomalies?id=...  – Traiter une anomalie
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(100, parseInt(searchParams.get('limit') || '15'));
    const search = searchParams.get('search') || '';
    const type = searchParams.get('type') || '';
    const severite = searchParams.get('severite') || '';
    const statut = searchParams.get('statut') || '';

    const skip = (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { poste: { nom: { contains: search, mode: 'insensitive' } } },
        { poste: { ville: { contains: search, mode: 'insensitive' } } },
        { agentSignale: { nom: { contains: search, mode: 'insensitive' } } },
        { trip: { vehicle: { plaque: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (type) where.type = type;
    if (severite) where.severite = severite;
    if (statut) where.statut = statut;

    const [anomalies, total] = await Promise.all([
      prisma.anomaly.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          poste: { select: { nom: true, ville: true, region: true } },
          agentSignale: { select: { nom: true, prenom: true, matriculeAgent: true } },
          trip: {
            select: {
              reference: true,
              vehicle: { select: { plaque: true } },
            },
          },
        },
      }),
      prisma.anomaly.count({ where }),
    ]);

    return NextResponse.json({
      data: anomalies,
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

export async function PUT(request: NextRequest) {
  try {
    const session = await requireSuperAdmin(request);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID requis' }, { status: 400 });
    }

    const body = await request.json();
    const { statut, notesResolution } = body;

    const anomaly = await prisma.anomaly.findUnique({ where: { id } });
    if (!anomaly) {
      return NextResponse.json({ error: 'Anomalie introuvable' }, { status: 404 });
    }

    const updateData: Record<string, unknown> = { statut };
    if (statut === 'RESOLUE' || statut === 'REJETEE') {
      updateData.traitePar = session.userId;
      updateData.dateTraitement = new Date();
      updateData.notesResolution = notesResolution?.trim() || null;
    }

    const updated = await prisma.anomaly.update({
      where: { id },
      data: updateData,
      include: {
        poste: { select: { nom: true, ville: true, region: true } },
        agentSignale: { select: { nom: true, prenom: true, matriculeAgent: true } },
        trip: { select: { reference: true, vehicle: { select: { plaque: true } } } },
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'MODIFICATION',
        entityType: 'Anomaly',
        entityId: id,
        description: `Traitement anomalie ${anomaly.type} → ${statut}${notesResolution ? ` | Note: ${notesResolution.substring(0, 50)}` : ''}`,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}
