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

    const employe = await prisma.employeChauffeur.findUnique({
      where: { id }
    });

    if (!employe || employe.compagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
    }

    const updated = await prisma.employeChauffeur.update({
      where: { id },
      data: { statut: 'INACTIF' }
    });

    return NextResponse.json({ success: true, message: 'Chauffeur révoqué' });
  } catch (error: any) {
    console.error('Erreur révocation chauffeur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
