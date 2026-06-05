import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyChauffeurSession } from '@/lib/auth/chauffeur-session';

/**
 * POST /api/compagnie/chauffeur/trips/[id]/descente
 * Déclare qu'un passager descend avant la destination finale.
 * Enregistre la position GPS du chauffeur au moment de la descente.
 * Body: { passagerId: string, lat?: number, lng?: number, lieuDescente?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await verifyChauffeurSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { passagerId, lat, lng, lieuDescente } = body;

    if (!passagerId) {
      return NextResponse.json({ error: 'ID du passager requis' }, { status: 400 });
    }

    // Vérifier le trajet
    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, statut: true, conducteurId: true, declareParCompagnieId: true, reference: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trajet introuvable' }, { status: 404 });
    }

    if (trip.conducteurId !== session.citoyenId || trip.declareParCompagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Ce trajet ne vous est pas assigné' }, { status: 403 });
    }

    if (trip.statut !== 'EN_COURS') {
      return NextResponse.json({ error: 'Le trajet doit être en cours pour déclarer une descente' }, { status: 400 });
    }

    // Récupérer le passager
    const passager = await prisma.passagerTrip.findUnique({
      where: { id: passagerId },
      include: { citoyen: { select: { userId: true, nom: true, prenom: true, matricule: true } } },
    });

    if (!passager || passager.tripId !== id) {
      return NextResponse.json({ error: 'Passager introuvable sur ce trajet' }, { status: 404 });
    }

    // Enregistrer la descente dans l'audit log avec GPS
    const lieuLabel = lieuDescente || (lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : 'Position non fournie');

    await prisma.auditLog.create({
      data: {
        userId: passager.citoyen.userId,
        actionType: 'DECLARATION',
        entityType: 'PassagerDescente',
        entityId: passager.id,
        description: `Descente avant destination – Passager ${passager.citoyen.matricule} (${passager.citoyen.prenom} ${passager.citoyen.nom}) – Lieu: ${lieuLabel} – Trajet: ${trip.reference}`,
        latitude: lat ?? null,
        longitude: lng ?? null,
        newData: JSON.stringify({
          tripId: id,
          passagerId,
          lieuDescente: lieuLabel,
          chauffeurMatricule: session.matricule,
          timestamp: new Date().toISOString(),
        }),
      },
    });

    return NextResponse.json({
      success: true,
      message: `Descente de ${passager.citoyen.prenom} ${passager.citoyen.nom} enregistrée à ${lieuLabel}`,
    });

  } catch (error) {
    console.error('Erreur déclaration descente:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
