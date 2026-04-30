/**
 * ============================================================================
 * API ADMIN – TRAJETS D'UN VÉHICULE AVEC PASSAGES ET CALCUL DE VITESSE
 * GET /api/admin/vehicules/[id]/trajets
 * ============================================================================
 * Retourne la liste des trajets d'un véhicule avec :
 *  - La timeline des passages aux postes (triée chronologiquement)
 *  - Pour chaque segment (poste A → poste B) :
 *      • Durée en minutes
 *      • Distance en km (formule Haversine basée sur GPS des postes)
 *      • Vitesse en km/h
 *      • Flag excès de vitesse (> SPEED_LIMIT_KMH)
 *  - Les informations de l'agent validant chaque passage
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';

// Seuil d'alerte excès de vitesse (km/h)
const SPEED_LIMIT_KMH = 120;

/**
 * Calcule la distance en kilomètres entre deux points GPS
 * Formule Haversine
 */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Rayon de la Terre en km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireSuperAdmin(request);

    const { id } = await params;

    // Vérifier que le véhicule existe
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      select: { id: true, plaque: true, typeVehicle: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        { error: 'Véhicule introuvable' },
        { status: 404 },
      );
    }

    // Récupérer tous les trajets avec leurs passages
    const trips = await prisma.trip.findMany({
      where: { vehicleId: id },
      orderBy: { dateDepart: 'desc' },
      include: {
        passages: {
          orderBy: { timestampPassage: 'asc' },
          include: {
            poste: {
              select: {
                id: true,
                nom: true,
                type: true,
                ville: true,
                region: true,
                latitude: true,
                longitude: true,
              },
            },
            agent: {
              select: {
                id: true,
                nom: true,
                prenom: true,
                matriculeAgent: true,
                typeAgent: true,
                grade: true,
              },
            },
          },
        },
        declareParCitoyen: {
          select: { nom: true, prenom: true, matricule: true },
        },
        declareParEntreprise: { select: { raisonSociale: true } },
        declareParCompagnie: { select: { raisonSociale: true } },
        conducteur: { select: { nom: true, prenom: true, matricule: true } },
        _count: { select: { passagers: true } },
      },
    });

    // Enrichir avec les calculs de vitesse entre postes
    const enrichedTrips = trips.map((trip) => {
      const passages = trip.passages;

      // Construire les segments entre passages consécutifs
      const passagesWithSegments = passages.map((passage, index) => {
        const next = passages[index + 1];

        let segmentSuivant: {
          dureeMinutes: number;
          distanceKm: number;
          vitesseKmh: number;
          excesVitesse: boolean;
        } | null = null;

        if (next) {
          const dureeMs =
            new Date(next.timestampPassage).getTime() -
            new Date(passage.timestampPassage).getTime();
          const dureeMinutes = Math.round(dureeMs / 60_000);
          const dureeHeures = dureeMs / 3_600_000;

          // Distance entre les deux postes via GPS
          const lat1 = Number(passage.poste.latitude);
          const lon1 = Number(passage.poste.longitude);
          const lat2 = Number(next.poste.latitude);
          const lon2 = Number(next.poste.longitude);

          let distanceKm = 0;
          let vitesseKmh = 0;

          // Calcul seulement si les coordonnées sont valides
          if (lat1 && lon1 && lat2 && lon2 && dureeHeures > 0) {
            distanceKm = Math.round(haversineKm(lat1, lon1, lat2, lon2) * 10) / 10;
            vitesseKmh = Math.round((distanceKm / dureeHeures) * 10) / 10;
          }

          segmentSuivant = {
            dureeMinutes,
            distanceKm,
            vitesseKmh,
            excesVitesse: vitesseKmh > SPEED_LIMIT_KMH,
          };
        }

        return {
          id: passage.id,
          poste: {
            id: passage.poste.id,
            nom: passage.poste.nom,
            type: passage.poste.type,
            ville: passage.poste.ville,
            region: passage.poste.region,
            latitude: Number(passage.poste.latitude),
            longitude: Number(passage.poste.longitude),
          },
          agent: passage.agent
            ? {
                nom: passage.agent.nom,
                prenom: passage.agent.prenom,
                matriculeAgent: passage.agent.matriculeAgent,
                typeAgent: passage.agent.typeAgent,
                grade: passage.agent.grade,
              }
            : null,
          timestampPassage: passage.timestampPassage,
          statut: passage.statut,
          observations: passage.observations,
          dureeTraitement: passage.dureeTraitement,
          segmentSuivant,
        };
      });

      // Calculer les stats globales du trajet
      const allSpeeds = passagesWithSegments
        .filter((p) => p.segmentSuivant && p.segmentSuivant.vitesseKmh > 0)
        .map((p) => p.segmentSuivant!.vitesseKmh);

      const vitesseMax = allSpeeds.length > 0 ? Math.max(...allSpeeds) : 0;
      const distanceTotale = passagesWithSegments
        .filter((p) => p.segmentSuivant)
        .reduce((acc, p) => acc + (p.segmentSuivant?.distanceKm || 0), 0);
      const alerteExcesVitesse = passagesWithSegments.some(
        (p) => p.segmentSuivant?.excesVitesse,
      );

      // Durée totale (entre premier et dernier passage)
      let dureeTotaleMinutes: number | null = null;
      if (passages.length >= 2) {
        const debut = new Date(passages[0].timestampPassage).getTime();
        const fin = new Date(passages[passages.length - 1].timestampPassage).getTime();
        dureeTotaleMinutes = Math.round((fin - debut) / 60_000);
      }

      return {
        id: trip.id,
        reference: trip.reference,
        pointDepart: trip.pointDepart,
        destination: trip.destination,
        dateDepart: trip.dateDepart,
        dateArriveeEstimee: trip.dateArriveeEstimee,
        dateArriveeReelle: trip.dateArriveeReelle,
        statut: trip.statut,
        declareParType: trip.declareParType,
        declarant:
          trip.declareParCitoyen
            ? `${trip.declareParCitoyen.prenom} ${trip.declareParCitoyen.nom} (${trip.declareParCitoyen.matricule})`
            : trip.declareParEntreprise?.raisonSociale ||
              trip.declareParCompagnie?.raisonSociale ||
              'Inconnu',
        conducteur: trip.conducteur
          ? `${trip.conducteur.prenom} ${trip.conducteur.nom} (${trip.conducteur.matricule})`
          : null,
        nbPassagers: trip._count.passagers,
        passages: passagesWithSegments,
        stats: {
          nbPostes: passages.length,
          vitesseMax,
          distanceTotaleKm: Math.round(distanceTotale * 10) / 10,
          dureeTotaleMinutes,
          alerteExcesVitesse,
        },
      };
    });

    return NextResponse.json({
      vehicleId: id,
      plaque: vehicle.plaque,
      data: enrichedTrips,
      total: enrichedTrips.length,
      speedLimitKmh: SPEED_LIMIT_KMH,
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json(
      { error: error.message || 'Erreur serveur' },
      { status },
    );
  }
}
