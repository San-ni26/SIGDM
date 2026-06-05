import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/jwt';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    const compagnie = await prisma.compagnie.findUnique({
      where: { id },
      include: {
        user: { select: { status: true, email: true } },
        vehicules: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, plaque: true, typeVehicle: true, statut: true },
        },
        trajets: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          select: { id: true, reference: true, pointDepart: true, destination: true, statut: true, dateDepart: true, vehicle: { select: { plaque: true } } },
        },
        chauffeurs: {
          take: 10,
          include: {
            citoyen: { select: { nom: true, prenom: true, telephone: true, matricule: true } },
          },
        },
      },
    });

    if (!compagnie) {
      return NextResponse.json({ error: 'Compagnie introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: compagnie });
  } catch (error) {
    console.error('Erreur API compagnie:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireSuperAdmin(request);
    const { id } = await params;

    const adminUser = await prisma.user.findUnique({
      where: { id: authSession.userId },
      include: { superAdmin: true }
    });

    if (!adminUser || !adminUser.superAdmin) {
      return NextResponse.json({ error: `ERREUR_ADMIN_INTROUVABLE` }, { status: 401 });
    }

    const { status, action } = await request.json();

    const compagnie = await prisma.compagnie.findUnique({ where: { id } });
    if (!compagnie) {
      return NextResponse.json({ error: 'Compagnie introuvable' }, { status: 404 });
    }

    // Gestion de l'état du compte utilisateur
    if (status) {
      await prisma.user.update({
        where: { id: compagnie.userId },
        data: { status },
      });
    }

    // Validation du dossier par le super admin
    if (action === 'VALIDER') {
      await prisma.compagnie.update({
        where: { id },
        data: {
          validePar: adminUser.superAdmin.id,
          dateValidation: new Date(),
        },
      });
      
      // Passer le compte en actif si validé
      await prisma.user.update({
        where: { id: compagnie.userId },
        data: { status: 'ACTIF' },
      });
    } else if (action === 'INVALIDER') {
      await prisma.compagnie.update({
        where: { id },
        data: {
          validePar: null,
          dateValidation: null,
        },
      });
      
      // Revenir à l'état en attente
      await prisma.user.update({
        where: { id: compagnie.userId },
        data: { status: 'EN_ATTENTE' },
      });
    }

    return NextResponse.json({ success: true, message: 'Compagnie mise à jour' });
  } catch (error: any) {
    console.error('Erreur MAJ compagnie:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: error.statusCode || 500 });
  }
}
