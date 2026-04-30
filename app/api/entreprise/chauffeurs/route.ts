/**
 * ============================================================================
 * API ENTREPRISE – CHAUFFEURS (EMPLOYÉS)
 * GET /api/entreprise/chauffeurs - Liste les chauffeurs employés
 * POST /api/entreprise/chauffeurs - Ajoute un chauffeur via son matricule
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

export async function GET(request: NextRequest) {
  try {
    const session = await getEntrepriseSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Récupérer les chauffeurs selon le type d'entreprise
    const employes = await prisma.employeChauffeur.findMany({
      where: session.type === 'ENTREPRISE' 
        ? { entrepriseId: session.entrepriseId as string }
        : { compagnieId: session.entrepriseId as string },
      include: {
        citoyen: {
          select: {
            id: true,
            matricule: true,
            nom: true,
            prenom: true,
            telephone: true,
            photoUrl: true,
            numeroPiece: true,
            _count: {
              select: { chauffeurTrips: true }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ data: employes });
  } catch (error: any) {
    console.error('Erreur liste chauffeurs:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getEntrepriseSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await request.json();
    const { matricule } = body;

    if (!matricule) {
      return NextResponse.json({ error: 'Le matricule est obligatoire' }, { status: 400 });
    }

    // 1. Chercher le citoyen
    const citoyen = await prisma.citoyen.findUnique({
      where: { matricule: matricule.toUpperCase() }
    });

    if (!citoyen) {
      return NextResponse.json({ error: 'Aucun citoyen trouvé avec ce matricule' }, { status: 404 });
    }

    // 2. Vérifier s'il est déjà employé par cette entreprise
    const existing = await prisma.employeChauffeur.findFirst({
      where: {
        citoyenId: citoyen.id,
        OR: [
          { entrepriseId: session.type === 'ENTREPRISE' ? session.entrepriseId as string : undefined },
          { compagnieId: session.type === 'COMPAGNIE' ? session.entrepriseId as string : undefined }
        ]
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Ce chauffeur fait déjà partie de vos employés' }, { status: 400 });
    }

    // 3. Créer la relation
    const newEmploye = await prisma.employeChauffeur.create({
      data: {
        citoyenId: citoyen.id,
        entrepriseId: session.type === 'ENTREPRISE' ? session.entrepriseId as string : null,
        compagnieId: session.type === 'COMPAGNIE' ? session.entrepriseId as string : null,
        statut: 'ACTIF',
      },
      include: {
        citoyen: {
          select: {
            id: true,
            matricule: true,
            nom: true,
            prenom: true,
            telephone: true,
          }
        }
      }
    });

    return NextResponse.json({ success: true, data: newEmploye }, { status: 201 });
  } catch (error: any) {
    console.error('Erreur ajout chauffeur:', error);
    return NextResponse.json({ error: 'Erreur lors de l\'ajout du chauffeur' }, { status: 500 });
  }
}
