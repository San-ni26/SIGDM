/**
 * ============================================================================
 * API ENTREPRISE – GESTION D'UN VÉHICULE
 * PUT /api/entreprise/vehicules/[id] - Modifier un véhicule
 * DELETE /api/entreprise/vehicules/[id] - Supprimer un véhicule
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getEntrepriseSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get('entreprise_token')?.value;

  if (!token) return null;

  try {
    const result = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-entreprise',
      issuer: 'transport-ml-auth',
    });
    return result.payload;
  } catch {
    return null;
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEntrepriseSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { plaque, marque, modele, type, nombrePlaces } = body;

    const existingVehicle = await prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle || existingVehicle.proprietaireEntrepriseId !== session.entrepriseId) {
      return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 });
    }

    // Si la plaque change, vérifier qu'elle n'est pas déjà prise
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
    const session = await getEntrepriseSession();
    if (!session) {
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

    if (!existingVehicle || existingVehicle.proprietaireEntrepriseId !== session.entrepriseId) {
      return NextResponse.json({ error: 'Véhicule introuvable' }, { status: 404 });
    }

    // On ne supprime pas un véhicule qui a déjà des trajets pour garder l'historique
    if (existingVehicle._count.trajets > 0) {
      // Au lieu de supprimer, on le désactive (INACTIF)
      await prisma.vehicle.update({
        where: { id },
        data: { statut: 'INACTIF' }
      });
      return NextResponse.json({ success: true, message: 'Véhicule désactivé (historique conservé)' });
    }

    // Si pas de trajets, on peut le supprimer physiquement
    await prisma.vehicle.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: 'Véhicule supprimé' });
  } catch (error: any) {
    console.error('Erreur suppr véhicule:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
