import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyUnifiedSession } from '@/lib/auth/unified-session';

export async function GET(request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('COMPAGNIE');
    if (!session || !session.compagnieId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const chauffeurs = await prisma.employeChauffeur.findMany({
      where: { compagnieId: session.compagnieId },
      include: {
        citoyen: {
          select: {
            id: true,
            matricule: true,
            nom: true,
            prenom: true,
            telephone: true,
            photoUrl: true,
            numeroPiece: true,
            _count: {
              select: { chauffeurTrips: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: chauffeurs });
  } catch (error: any) {
    console.error('Erreur liste chauffeurs:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('COMPAGNIE');
    if (!session || !session.compagnieId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { matricule } = body;

    if (!matricule) {
      return NextResponse.json({ error: 'Matricule requis' }, { status: 400 });
    }

    const citoyen = await prisma.citoyen.findUnique({
      where: { matricule: matricule.toUpperCase() }
    });

    if (!citoyen) {
      return NextResponse.json({ error: 'Aucun citoyen trouvé avec ce matricule' }, { status: 404 });
    }

    const existingLink = await prisma.employeChauffeur.findUnique({
      where: {
        citoyenId_compagnieId: {
          citoyenId: citoyen.id,
          compagnieId: session.compagnieId
        }
      }
    });

    if (existingLink) {
      if (existingLink.statut !== 'ACTIF') {
        const reactivated = await prisma.employeChauffeur.update({
          where: { id: existingLink.id },
          data: { statut: 'ACTIF' }
        });
        return NextResponse.json({ success: true, data: reactivated }, { status: 200 });
      }
      return NextResponse.json({ error: 'Ce chauffeur est déjà enregistré et actif' }, { status: 400 });
    }

    const newLink = await prisma.employeChauffeur.create({
      data: {
        citoyenId: citoyen.id,
        compagnieId: session.compagnieId,
        statut: 'ACTIF'
      }
    });

    return NextResponse.json({ success: true, data: newLink }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur ajout chauffeur:', error);
    return NextResponse.json({ error: "Erreur lors de l'ajout du chauffeur" }, { status: 500 });
  }
}
