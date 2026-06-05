import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyUnifiedSession } from '@/lib/auth/unified-session';

function generateTripReference(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const date = new Date();
  const dateStr = date.getFullYear().toString().slice(-2) +
    String(date.getMonth() + 1).padStart(2, '0') +
    String(date.getDate()).padStart(2, '0');
  const random = Array.from({ length: 4 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
  return `TRJ-C${dateStr}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await verifyUnifiedSession('COMPAGNIE');
    if (!session || !session.compagnieId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20')));
    const skip = (page - 1) * limit;

    const [trajets, total] = await Promise.all([
      prisma.trip.findMany({
        where: { declareParCompagnieId: session.compagnieId },
        select: {
          id: true,
          reference: true,
          pointDepart: true,
          destination: true,
          dateDepart: true,
          statut: true,
          createdAt: true,
          vehicle: {
            select: { id: true, plaque: true, marque: true, modele: true, typeVehicle: true, nombrePlaces: true },
          },
          conducteur: {
            select: { id: true, nom: true, prenom: true, matricule: true },
          },
          passagers: {
            select: { id: true, nom: true, prenom: true, typePersonne: true },
          },
          _count: {
            select: { passages: true, passagers: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.trip.count({
        where: { declareParCompagnieId: session.compagnieId },
      }),
    ]);

    return NextResponse.json({
      data: trajets,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    console.error('Erreur liste trajets compagnie:', error);
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
    const { vehicleId, conducteurId, pointDepart, destination, dateDepart, passagersIds } = body;

    if (!vehicleId || !conducteurId || !pointDepart || !destination || !dateDepart) {
      return NextResponse.json(
        { error: 'Veuillez remplir tous les champs obligatoires' },
        { status: 400 }
      );
    }

    const reference = generateTripReference();

    let passagersData: any[] = [];
    if (passagersIds && Array.isArray(passagersIds) && passagersIds.length > 0) {
      const citoyensToAccompaniment = await prisma.citoyen.findMany({
        where: { id: { in: passagersIds } },
        select: { id: true, matricule: true, nom: true, prenom: true, telephone: true }
      });
      
      passagersData = citoyensToAccompaniment.map(c => ({
        citoyenId: c.id,
        matricule: c.matricule,
        nom: c.nom,
        prenom: c.prenom,
        telephone: c.telephone || '',
        typePersonne: 'ADULTE'
      }));
    }

    const newTrip = await prisma.trip.create({
      data: {
        reference,
        vehicleId,
        declareParType: 'COMPAGNIE',
        declareParCompagnieId: session.compagnieId,
        conducteurId,
        pointDepart: pointDepart.trim(),
        destination: destination.trim(),
        dateDepart: new Date(dateDepart),
        statut: 'EN_PREPARATION',
        passagers: passagersData.length > 0 ? { create: passagersData } : undefined,
      },
      select: {
        id: true,
        reference: true,
        pointDepart: true,
        destination: true,
        dateDepart: true,
        statut: true,
      },
    });

    return NextResponse.json({ success: true, data: newTrip }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur création trajet compagnie:', error);
    return NextResponse.json(
      { error: 'Erreur lors de la création du trajet' },
      { status: 500 }
    );
  }
}
