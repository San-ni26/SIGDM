import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getCitoyenId(request: NextRequest): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('citoyen_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-citoyen',
      issuer: 'transport-ml-auth',
    });
    return (payload as any).citoyenId || null;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const citoyenId = await getCitoyenId(request);
    if (!citoyenId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const vehicle = await prisma.vehicle.findFirst({
      where: {
        id,
        proprietaireCitoyenId: citoyenId,
      },
    });

    if (!vehicle) return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 });

    return NextResponse.json({ success: true, vehicle }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const citoyenId = await getCitoyenId(request);
    if (!citoyenId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const existing = await prisma.vehicle.findFirst({
      where: { id, proprietaireCitoyenId: citoyenId },
    });
    if (!existing) return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 });

    const body = await request.json();
    const { typeVehicle, carteGriseNumero, marque, modele, anneeFabrication, couleur, nombrePlaces, statut } = body;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        typeVehicle,
        carteGriseNumero: carteGriseNumero?.trim() || null,
        marque: marque?.trim() || null,
        modele: modele?.trim() || null,
        anneeFabrication: anneeFabrication ? parseInt(anneeFabrication) : null,
        couleur: couleur?.trim() || null,
        nombrePlaces: nombrePlaces ? parseInt(nombrePlaces) : null,
        statut: statut || existing.statut,
      },
    });

    const citoyen = await prisma.citoyen.findUnique({ where: { id: citoyenId }, select: { userId: true } });
    if (citoyen?.userId) {
      await prisma.auditLog.create({
        data: {
          userId: citoyen.userId,
          actionType: 'MODIFICATION',
          entityType: 'Vehicle',
          entityId: vehicle.id,
          description: `Modification véhicule ${vehicle.plaque}`,
        },
      });
    }

    return NextResponse.json({ success: true, vehicle }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const citoyenId = await getCitoyenId(request);
    if (!citoyenId) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const existing = await prisma.vehicle.findFirst({
      where: { id, proprietaireCitoyenId: citoyenId },
      include: {
        _count: {
          select: { trajets: true }
        }
      }
    });
    
    if (!existing) return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 });

    if (existing._count.trajets > 0) {
      return NextResponse.json({ error: 'Impossible de supprimer un véhicule ayant des trajets.' }, { status: 400 });
    }

    await prisma.vehicle.delete({
      where: { id },
    });

    const citoyen = await prisma.citoyen.findUnique({ where: { id: citoyenId }, select: { userId: true } });
    if (citoyen?.userId) {
      await prisma.auditLog.create({
        data: {
          userId: citoyen.userId,
          actionType: 'SUPPRESSION',
          entityType: 'Vehicle',
          entityId: id,
          description: `Suppression véhicule ${existing.plaque}`,
        },
      });
    }

    return NextResponse.json({ success: true, message: 'Véhicule supprimé avec succès' }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
