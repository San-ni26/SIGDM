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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const citoyenId = await getCitoyenId(request);
    
    if (!citoyenId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const { statut, lat, lng } = body;

    if (!['EN_COURS', 'TERMINE', 'ANNULE'].includes(statut)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 });
    }

    // Vérifier si le trajet appartient bien au citoyen (soit en tant que déclarant, soit en tant que conducteur)
    const trip = await prisma.trip.findFirst({
      where: {
        id,
        OR: [
          { declareParCitoyenId: citoyenId },
          { driverId: citoyenId }
        ]
      }
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trajet non trouvé ou non autorisé' }, { status: 404 });
    }

    // Préparer les données de mise à jour GPS
    const updateData: any = { statut };
    
    if (statut === 'EN_COURS') {
      if (lat && lng) {
        updateData.departLat = lat;
        updateData.departLng = lng;
      }
    } else if (statut === 'TERMINE') {
      if (!trip.dateArriveeReelle) {
        updateData.dateArriveeReelle = new Date();
      }
      if (lat && lng) {
        updateData.destinationLat = lat;
        updateData.destinationLng = lng;
      }
    }

    // Mettre à jour le statut
    const updatedTrip = await prisma.trip.update({
      where: { id },
      data: updateData
    });

    // Logger l'action
    const citoyen = await prisma.citoyen.findUnique({ where: { id: citoyenId }, select: { userId: true } });
    if (citoyen?.userId) {
      await prisma.auditLog.create({
        data: {
          userId: citoyen.userId,
          actionType: 'MODIFICATION',
          entityType: 'Trip',
          entityId: id,
          description: `Changement de statut du trajet ${trip.reference} vers ${statut}`,
        },
      });
    }

    return NextResponse.json({ success: true, trip: updatedTrip });
  } catch (error: any) {
    console.error('Erreur MAJ statut trajet:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
