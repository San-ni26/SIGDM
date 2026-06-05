import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyUnifiedSession } from '@/lib/auth/unified-session';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyUnifiedSession('COMPAGNIE');
    if (!session || !session.compagnieId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { plaque, marque, modele, type, nombrePlaces } = body;

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle || existingVehicle.proprietaireCompagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 });
    }

    if (plaque && plaque.toUpperCase() !== existingVehicle.plaque) {
      const plaqueExists = await prisma.vehicle.findUnique({
        where: { plaque: plaque.toUpperCase() }
      });
      if (plaqueExists) {
        return NextResponse.json({ error: 'Cette plaque est déjà utilisée' }, { status: 400 });
      }
    }

    const updated = await prisma.vehicle.update({
      where: { id },
      data: {
        plaque: plaque ? plaque.toUpperCase() : undefined,
        marque: marque !== undefined ? marque : undefined,
        modele: modele !== undefined ? modele : undefined,
        typeVehicle: type !== undefined ? type : undefined,
        nombrePlaces: nombrePlaces !== undefined ? (nombrePlaces ? parseInt(nombrePlaces) : null) : undefined,
      }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Erreur modif véhicule:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyUnifiedSession('COMPAGNIE');
    if (!session || !session.compagnieId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        _count: {
          select: { trajets: true }
        }
      }
    });

    if (!existingVehicle || existingVehicle.proprietaireCompagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 });
    }

    if (existingVehicle._count.trajets > 0) {
      await prisma.vehicle.update({
        where: { id },
        data: { statut: 'INACTIF' }
      });
      return NextResponse.json({ success: true, message: 'Véhicule désactivé (historique conservé)' });
    }

    await prisma.vehicle.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Véhicule supprimé' });
  } catch (error: any) {
    console.error('Erreur suppr véhicule:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
