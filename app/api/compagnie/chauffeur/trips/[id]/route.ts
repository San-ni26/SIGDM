import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyChauffeurSession } from '@/lib/auth/chauffeur-session';

/**
 * PUT /api/compagnie/chauffeur/trips/[id]
 * Actions du chauffeur sur un trajet:
 * - body.action = 'DEPART'  → valide le départ avec GPS
 * - body.action = 'ARRIVEE' → valide l'arrivée avec GPS
 * - body.action = 'ANNULER' → annule (si encore en préparation)
 */
export async function PUT(
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
    const { action, lat, lng } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action requise' }, { status: 400 });
    }

    // Vérifier que le trajet appartient bien à ce chauffeur et cette compagnie
    const trip = await prisma.trip.findUnique({
      where: { id },
      select: { id: true, statut: true, conducteurId: true, declareParCompagnieId: true },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trajet introuvable' }, { status: 404 });
    }

    if (trip.conducteurId !== session.citoyenId || trip.declareParCompagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Ce trajet ne vous est pas assigné' }, { status: 403 });
    }

    if (action === 'DEPART') {
      if (trip.statut !== 'EN_PREPARATION') {
        return NextResponse.json({ error: 'Le trajet ne peut pas être démarré dans son état actuel' }, { status: 400 });
      }

      const updated = await prisma.trip.update({
        where: { id },
        data: {
          statut: 'EN_COURS',
          dateDepart: new Date(),
          ...(lat !== null && lat !== undefined ? { departLat: lat } : {}),
          ...(lng !== null && lng !== undefined ? { departLng: lng } : {}),
        },
      });

      return NextResponse.json({ success: true, statut: updated.statut, message: 'Départ validé !' });
    }

    if (action === 'ARRIVEE') {
      if (trip.statut !== 'EN_COURS') {
        return NextResponse.json({ error: 'Le trajet doit être en cours pour valider l\'arrivée' }, { status: 400 });
      }

      const updated = await prisma.trip.update({
        where: { id },
        data: {
          statut: 'TERMINE',
          dateArriveeReelle: new Date(),
          ...(lat !== null && lat !== undefined ? { destinationLat: lat } : {}),
          ...(lng !== null && lng !== undefined ? { destinationLng: lng } : {}),
        },
      });

      return NextResponse.json({ success: true, statut: updated.statut, message: 'Arrivée validée. Trajet terminé !' });
    }

    if (action === 'ANNULER') {
      if (trip.statut !== 'EN_PREPARATION') {
        return NextResponse.json({ error: 'Seul un trajet en préparation peut être annulé' }, { status: 400 });
      }

      await prisma.trip.update({
        where: { id },
        data: { statut: 'ANNULE' },
      });

      return NextResponse.json({ success: true, statut: 'ANNULE', message: 'Trajet annulé.' });
    }

    return NextResponse.json({ error: 'Action non reconnue' }, { status: 400 });
  } catch (error) {
    console.error('Erreur action chauffeur sur trajet:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

/**
 * POST /api/compagnie/chauffeur/trips/[id]
 * Ajouter un passager en cours de trajet via son matricule
 * body: { matricule: string, typePersonne?: string }
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
    const { matricule, typePersonne, lat, lng } = body;

    if (!matricule) {
      return NextResponse.json({ error: 'Matricule requis' }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        vehicle: { select: { nombrePlaces: true } },
        _count: { select: { passagers: true } },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trajet introuvable' }, { status: 404 });
    }

    if (trip.conducteurId !== session.citoyenId || trip.declareParCompagnieId !== session.compagnieId) {
      return NextResponse.json({ error: 'Ce trajet ne vous est pas assigné' }, { status: 403 });
    }

    if (trip.statut !== 'EN_COURS' && trip.statut !== 'EN_PREPARATION') {
      return NextResponse.json({ error: 'Impossible d\'ajouter des passagers à ce trajet' }, { status: 400 });
    }

    // Vérifier la capacité
    if (trip.vehicle.nombrePlaces && trip._count.passagers >= trip.vehicle.nombrePlaces) {
      return NextResponse.json({ error: 'Le véhicule est complet. Aucune place disponible.' }, { status: 400 });
    }

    // Retrouver le citoyen
    const citoyen = await prisma.citoyen.findUnique({
      where: { matricule: matricule.toUpperCase() },
    });

    if (!citoyen) {
      return NextResponse.json({ error: 'Aucun citoyen trouvé avec ce matricule' }, { status: 404 });
    }

    // Vérifier doublon
    const existing = await prisma.passagerTrip.findUnique({
      where: { tripId_citoyenId: { tripId: id, citoyenId: citoyen.id } },
    });

    if (existing) {
      return NextResponse.json({ error: 'Ce passager est déjà enregistré sur ce trajet' }, { status: 400 });
    }

    const passager = await prisma.passagerTrip.create({
      data: {
        tripId: id,
        citoyenId: citoyen.id,
        matricule: citoyen.matricule,
        nom: citoyen.nom,
        prenom: citoyen.prenom,
        telephone: citoyen.telephone || '',
        typePersonne: (typePersonne || 'ADULTE') as any,
      },
    });

    // Log GPS de la montée si fourni
    if (lat && lng) {
      await prisma.auditLog.create({
        data: {
          userId: citoyen.userId,
          actionType: 'DECLARATION',
          entityType: 'PassagerMontee',
          entityId: passager.id,
          description: `Passager ${citoyen.matricule} monté à bord (trajet ${id})`,
          latitude: lat,
          longitude: lng,
          newData: JSON.stringify({ tripId: id, chauffeurMatricule: session.matricule }),
        },
      }).catch(() => {}); // Non-bloquant
    }

    return NextResponse.json({
      success: true,
      passager: { nom: citoyen.nom, prenom: citoyen.prenom, matricule: citoyen.matricule },
      message: `${citoyen.prenom} ${citoyen.nom} ajouté au trajet`,
    }, { status: 201 });

  } catch (error) {
    console.error('Erreur ajout passager en cours de trajet:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
