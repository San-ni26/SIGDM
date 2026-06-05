import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createChauffeurSession } from '@/lib/auth/chauffeur-session';
import { SECURITY_HEADERS } from '@/lib/security/config';

/**
 * POST /api/compagnie/chauffeur/auth
 * Connexion d'un chauffeur avec son matricule citoyen + téléphone
 * Body: { matricule: string, telephone: string, compagnieEmail: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matricule, telephone, compagnieEmail } = body;

    if (!matricule || !telephone || !compagnieEmail) {
      return NextResponse.json(
        { error: 'Matricule, téléphone et email de la compagnie sont requis' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // 1. Retrouver la compagnie
    const compagnie = await prisma.compagnie.findFirst({
      where: {
        OR: [
          { email: compagnieEmail.trim().toLowerCase() },
          { user: { email: compagnieEmail.trim().toLowerCase() } },
        ],
        user: { status: 'ACTIF' },
      },
      select: { id: true, raisonSociale: true },
    });

    if (!compagnie) {
      return NextResponse.json(
        { error: 'Compagnie introuvable ou inactive' },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    // 2. Retrouver le citoyen par matricule + téléphone
    const citoyen = await prisma.citoyen.findFirst({
      where: {
        matricule: matricule.trim().toUpperCase(),
        telephone: telephone.trim(),
      },
      include: {
        user: { select: { status: true } },
      },
    });

    if (!citoyen) {
      return NextResponse.json(
        { error: 'Aucun citoyen trouvé avec ce matricule et ce numéro de téléphone' },
        { status: 401, headers: SECURITY_HEADERS }
      );
    }

    if (citoyen.user.status !== 'ACTIF') {
      return NextResponse.json(
        { error: 'Votre compte citoyen est désactivé. Contactez votre compagnie.' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    // 3. Vérifier que ce citoyen est bien chauffeur de cette compagnie
    const emploi = await prisma.employeChauffeur.findUnique({
      where: {
        citoyenId_compagnieId: {
          citoyenId: citoyen.id,
          compagnieId: compagnie.id,
        },
      },
    });

    if (!emploi || emploi.statut !== 'ACTIF') {
      return NextResponse.json(
        { error: "Vous n'êtes pas enregistré comme chauffeur actif dans cette compagnie" },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    // 4. Créer la session chauffeur
    await createChauffeurSession({
      citoyenId: citoyen.id,
      compagnieId: compagnie.id,
      employeChauffeurId: emploi.id,
      matricule: citoyen.matricule,
      nom: citoyen.nom,
      prenom: citoyen.prenom,
      role: 'CHAUFFEUR',
    });

    return NextResponse.json({
      success: true,
      chauffeur: {
        matricule: citoyen.matricule,
        nom: citoyen.nom,
        prenom: citoyen.prenom,
        compagnie: compagnie.raisonSociale,
      },
    }, { headers: SECURITY_HEADERS });

  } catch (error) {
    console.error('Erreur connexion chauffeur:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * GET /api/compagnie/chauffeur/auth — Vérification de session
 */
export async function GET() {
  const { verifyChauffeurSession } = await import('@/lib/auth/chauffeur-session');
  const session = await verifyChauffeurSession();
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }
  return NextResponse.json({ authenticated: true, chauffeur: session });
}

/**
 * DELETE /api/compagnie/chauffeur/auth — Déconnexion
 */
export async function DELETE() {
  const { revokeChauffeurSession } = await import('@/lib/auth/chauffeur-session');
  await revokeChauffeurSession();
  return NextResponse.json({ success: true });
}
