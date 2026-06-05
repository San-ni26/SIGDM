import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/jwt';

/**
 * GET /api/admin/trajets/[id]/audit
 * Retourne l'historique complet d'audit d'un trajet spécifique
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireSuperAdmin(request);
    const { id } = await params;

    // Récupérer le trajet avec ses relations pour obtenir les IDs des entités associées
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        passagers: { select: { id: true } },
        passages: { select: { id: true } },
        anomalies: { select: { id: true } },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trajet non trouvé' }, { status: 404 });
    }

    const passagerIds = trip.passagers.map((p) => p.id);
    const passageIds = trip.passages.map((p) => p.id);
    const anomalieIds = trip.anomalies.map((a) => a.id);

    // Récupérer tous les logs d'audit associés au trajet et à ses entités liées
    const conditions: any[] = [
      { entityType: 'Trip', entityId: id },
    ];

    if (passagerIds.length > 0) {
      conditions.push(
        { entityType: 'Passager', entityId: { in: passagerIds } },
        { entityType: 'PassagerMontee', entityId: { in: passagerIds } },
        { entityType: 'PassagerDescente', entityId: { in: passagerIds } }
      );
    }

    if (passageIds.length > 0) {
      conditions.push({ entityType: 'Passage', entityId: { in: passageIds } });
    }

    if (anomalieIds.length > 0) {
      conditions.push({ entityType: 'Anomalie', entityId: { in: anomalieIds } });
    }

    const auditLogs = await prisma.auditLog.findMany({
      where: {
        OR: conditions,
      },
      include: {
        user: {
          select: {
            id: true,
            userType: true,
            email: true,
            citoyen: { select: { nom: true, prenom: true, matricule: true } },
            agent: { select: { nom: true, prenom: true, matriculeAgent: true } },
            superAdmin: { select: { nom: true, prenom: true } },
          },
        },
      },
      orderBy: {
        createdAt: 'asc', // Ordre chronologique pour l'audit du trajet
      },
    });

    return NextResponse.json({
      trip,
      auditLogs,
    });
  } catch (error) {
    console.error('Erreur API admin audit trajet:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
