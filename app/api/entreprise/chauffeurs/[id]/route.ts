/**
 * ============================================================================
 * API ENTREPRISE – GESTION D'UN CHAUFFEUR
 * DELETE /api/entreprise/chauffeurs/[id] - Révoquer un chauffeur (Inactif)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getEntrepriseSession();
    if (!session) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const { id } = await params;
    const isEntreprise = session.type === 'ENTREPRISE';

    const existingEmploye = await prisma.employeChauffeur.findUnique({
      where: { id },
    });

    if (!existingEmploye) {
      return NextResponse.json({ error: 'Employé introuvable' }, { status: 404 });
    }

    // Vérifier l'appartenance
    if (isEntreprise && existingEmploye.entrepriseId !== session.entrepriseId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }
    if (!isEntreprise && existingEmploye.compagnieId !== session.entrepriseId) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Au lieu de supprimer physiquement, on le passe en INACTIF
    await prisma.employeChauffeur.update({
      where: { id },
      data: { statut: 'INACTIF' }
    });

    return NextResponse.json({ success: true, message: 'Chauffeur révoqué' });
  } catch (error: any) {
    console.error('Erreur révocation chauffeur:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
