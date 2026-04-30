/**
 * ============================================================================
 * API ADMIN – CITOYEN PAR ID
 * GET /api/admin/citoyens/[id]  – Fiche complète
 * PUT /api/admin/citoyens/[id]  – Modifier statut / infos
 * DELETE /api/admin/citoyens/[id] – Désactiver (soft delete)
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    const citoyen = await prisma.citoyen.findUnique({
      where: { id },
      include: {
        user: { select: { status: true, email: true, createdAt: true } },
        vehicules: {
          select: { id: true, plaque: true, typeVehicle: true, statut: true, marque: true, modele: true },
          orderBy: { createdAt: 'desc' },
        },
        trajetsDeclares: {
          take: 10,
          orderBy: { dateDepart: 'desc' },
          select: {
            id: true,
            reference: true,
            pointDepart: true,
            destination: true,
            statut: true,
            dateDepart: true,
            vehicle: { select: { plaque: true } },
          },
        },
        passagerTrips: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            trip: {
              select: {
                reference: true,
                pointDepart: true,
                destination: true,
                dateDepart: true,
                statut: true,
              },
            },
          },
        },
        _count: {
          select: { vehicules: true, trajetsDeclares: true, passagerTrips: true },
        },
      },
    });

    if (!citoyen) {
      return NextResponse.json({ error: 'Citoyen introuvable' }, { status: 404 });
    }

    return NextResponse.json({ data: citoyen });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin(request);
    const { id } = await params;
    const body = await request.json();

    const citoyen = await prisma.citoyen.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!citoyen) {
      return NextResponse.json({ error: 'Citoyen introuvable' }, { status: 404 });
    }

    // Mise à jour du statut sur le user
    if (body.status) {
      await prisma.user.update({
        where: { id: citoyen.userId },
        data: { status: body.status },
      });
    }

    // Mise à jour des infos du citoyen
    const updateData: Record<string, unknown> = {};
    if (body.telephone) updateData.telephone = body.telephone;
    if (body.ville !== undefined) updateData.ville = body.ville;
    if (body.region !== undefined) updateData.region = body.region;
    if (body.adresse !== undefined) updateData.adresse = body.adresse;

    const updated = Object.keys(updateData).length > 0
      ? await prisma.citoyen.update({ where: { id }, data: updateData, include: { user: { select: { status: true } } } })
      : { ...citoyen, user: { status: body.status || citoyen.user.status } };

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'MODIFICATION',
        entityType: 'Citoyen',
        entityId: id,
        description: `Modification citoyen ${citoyen.matricule} – ${body.status ? `statut → ${body.status}` : 'infos mises à jour'}`,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}
