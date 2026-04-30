/**
 * ============================================================================
 * API CITOYEN – ENREGISTRER UN VÉHICULE
 * POST /api/citoyen/vehicules/enregistrer
 * ============================================================================
 */

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

// Génère un PIN à 4 chiffres
function generatePin(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function POST(request: NextRequest) {
  try {
    const citoyenId = await getCitoyenId(request);
    if (!citoyenId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const body = await request.json();
    const {
      plaque,
      typeVehicle,
      carteGriseNumero,
      marque,
      modele,
      anneeFabrication,
      couleur,
      nombrePlaces,
    } = body;

    // Validation
    if (!plaque || !typeVehicle) {
      return NextResponse.json(
        { error: 'Plaque et type de véhicule obligatoires' },
        { status: 400 }
      );
    }

    // Normaliser la plaque
    const normalizedPlaque = plaque.trim().toUpperCase();

    // Vérifier si la plaque existe déjà
    const existing = await prisma.vehicle.findUnique({
      where: { plaque: normalizedPlaque },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Cette plaque est déjà enregistrée' },
        { status: 409 }
      );
    }

    // Générer le PIN unique
    let pin = generatePin();
    let attempts = 0;
    while (attempts < 10) {
      const exists = await prisma.vehicle.findFirst({
        where: { codePin: pin },
      });
      if (!exists) break;
      pin = generatePin();
      attempts++;
    }

    // Créer le véhicule
    const vehicle = await prisma.vehicle.create({
      data: {
        plaque: normalizedPlaque,
        typeVehicle,
        carteGriseNumero: carteGriseNumero?.trim() || null,
        marque: marque?.trim() || null,
        modele: modele?.trim() || null,
        anneeFabrication: anneeFabrication ? parseInt(anneeFabrication) : null,
        couleur: couleur?.trim() || null,
        nombrePlaces: nombrePlaces ? parseInt(nombrePlaces) : null,
        proprietaireCitoyenId: citoyenId,
        codePin: pin,
        statut: 'ACTIF',
      },
    });

    // Logger l'action
    await prisma.auditLog.create({
      data: {
        userId: (await prisma.citoyen.findUnique({ where: { id: citoyenId }, select: { userId: true } }))!.userId,
        actionType: 'CREATION',
        entityType: 'Vehicle',
        entityId: vehicle.id,
        description: `Enregistrement véhicule ${normalizedPlaque}`,
      },
    });

    return NextResponse.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        plaque: vehicle.plaque,
        typeVehicle: vehicle.typeVehicle,
      },
      codePin: pin, // Affiché une seule fois!
      message: 'Véhicule enregistré avec succès. Notez votre code PIN!',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur enregistrement véhicule:', error);
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status: 500 }
    );
  }
}
