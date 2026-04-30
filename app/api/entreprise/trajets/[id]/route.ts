/**
 * ============================================================================
 * API ENTREPRISE – GESTION D'UN TRAJET
 * PUT /api/entreprise/trajets/[id] - Modifier le statut d'un trajet
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
    const { statut, lat, lng } = body;

    if (!statut) {
      return NextResponse.json({ error: 'Le statut est requis' }, { status: 400 });
    }

    const isEntreprise = session.type === 'ENTREPRISE';

    // Vérifier que le trajet appartient bien à cette entreprise
    const existingTrip = await prisma.trip.findFirst({
      where: {
        id,
        declareParEntrepriseId: isEntreprise ? session.entrepriseId as string : undefined,
        declareParCompagnieId: !isEntreprise ? session.entrepriseId as string : undefined,
      }
    });

    if (!existingTrip) {
      return NextResponse.json({ error: 'Trajet non trouvé ou non autorisé' }, { status: 404 });
    }

    const dataToUpdate: any = { statut };
    
    if (statut === 'EN_COURS') {
      if (lat && lng) {
        dataToUpdate.departLat = lat;
        dataToUpdate.departLng = lng;
      }
    } else if (statut === 'TERMINE') {
      if (existingTrip.statut !== 'TERMINE') {
        dataToUpdate.dateArriveeReelle = new Date();
      }
      if (lat && lng) {
        dataToUpdate.destinationLat = lat;
        dataToUpdate.destinationLng = lng;
      }
    }

    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: dataToUpdate
    });

    return NextResponse.json({ success: true, data: updatedTrip });
  } catch (error: any) {
    console.error('Erreur mise à jour trajet:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
