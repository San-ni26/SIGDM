import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyUnifiedSession } from '@/lib/auth/unified-session';

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

    const existingTrip = await prisma.trip.findUnique({
      where: { id },
      include: {
        _count: {
          select: { passages: true }
        }
      }
    });

    if (!existingTrip || existingTrip.declareParCompagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Trajet introuvable' }, { status: 404 });
    }

    if (existingTrip._count.passages > 0) {
      await prisma.trip.update({
        where: { id },
        data: { statut: 'TERMINE' } // ou ANNULE
      });
      return NextResponse.json({ success: true, message: 'Le trajet a des passages, son statut a été modifié' });
    }

    await prisma.trip.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Trajet supprimé' });
  } catch (error: any) {
    console.error('Erreur suppr trajet:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

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
    const { statut } = body;

    if (!statut) {
      return NextResponse.json({ error: 'Statut manquant' }, { status: 400 });
    }

    const existingTrip = await prisma.trip.findUnique({
      where: { id }
    });

    if (!existingTrip || existingTrip.declareParCompagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Trajet introuvable' }, { status: 404 });
    }

    const updated = await prisma.trip.update({
      where: { id },
      data: { statut }
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Erreur modif trajet:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
