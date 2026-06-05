import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/jwt';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    const entreprise = await prisma.entreprise.findUnique({
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

    if (!entreprise) {
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: entreprise });
  } catch (error) {
    console.error('Erreur API entreprise:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authSession = await requireSuperAdmin(request);
    const { id } = await params;

    console.log('PUT /api/admin/entreprises/[id] - ID:', id);

    const adminUser = await prisma.user.findUnique({
      where: { id: authSession.userId },
      include: { superAdmin: true }
    });

    if (!adminUser || !adminUser.superAdmin) {
      console.log('Admin non autorisé:', authSession.userId);
      return NextResponse.json({ error: `ERREUR_ADMIN_INTROUVABLE: user=${!!adminUser}, superAdmin=${!!adminUser?.superAdmin}` }, { status: 401 });
    }

    const { status, action } = await request.json();
    console.log('Request body:', { status, action });

    const entreprise = await prisma.entreprise.findUnique({ where: { id } });
    if (!entreprise) {
      console.log('Entreprise introuvable:', id);
      return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 });
    }

    // Gestion de l'état du compte utilisateur
    if (status) {
      console.log('Mise à jour statut utilisateur:', entreprise.userId, 'nouveau statut:', status);
      await prisma.user.update({
        where: { id: entreprise.userId },
        data: { status },
      });
    }

    // Validation du dossier par le super admin
    if (action === 'VALIDER') {
      console.log('Validation dossier entreprise:', id);
      await prisma.entreprise.update({
        where: { id },
        data: {
          validePar: adminUser.superAdmin.id,
          dateValidation: new Date(),
        },
      });
      
      // Passer le compte en actif si validé
      await prisma.user.update({
        where: { id: entreprise.userId },
        data: { status: 'ACTIF' },
      });
    } else if (action === 'INVALIDER') {
      console.log('Invalidation dossier entreprise:', id);
      await prisma.entreprise.update({
        where: { id },
        data: {
          validePar: null,
          dateValidation: null,
        },
      });
      
      // Revenir à l'état en attente
      await prisma.user.update({
        where: { id: entreprise.userId },
        data: { status: 'EN_ATTENTE' },
      });
    }

    console.log('Mise à jour réussie pour:', id);
    return NextResponse.json({ success: true, message: 'Entreprise mise à jour' });
  } catch (error: any) {
    console.error('Erreur MAJ entreprise:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: error.statusCode || 500 });
  }
}
