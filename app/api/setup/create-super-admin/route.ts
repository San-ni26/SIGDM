/**
 * ============================================================================
 * API ROUTE - SETUP SUPER ADMIN
 * ============================================================================
 * Endpoint temporaire pour créer le premier SuperAdmin
 * À supprimer après la première utilisation en production
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { SECURITY_HEADERS } from '@/lib/security/config';

// Configuration du compte SuperAdmin par défaut
const DEFAULT_SUPER_ADMIN = {
  email: 'admin@transport-ml.gov',
  password: 'Admin@2024!Mali',
  nom: 'Administrateur',
  prenom: 'Système',
  telephone: '70000000',
  niveauAcces: 'NATIONAL' as const,
};

/**
 * POST /api/setup/create-super-admin
 * Crée le compte SuperAdmin initial
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier si un SuperAdmin existe déjà
    const existingSuperAdmin = await prisma.superAdmin.findFirst({
      include: { user: true },
    });
    
    if (existingSuperAdmin) {
      return NextResponse.json(
        { 
          error: 'Un SuperAdmin existe déjà',
          email: existingSuperAdmin.user.email,
        },
        { status: 409, headers: SECURITY_HEADERS }
      );
    }
    
    // Hasher le mot de passe
    const passwordHash = await bcrypt.hash(DEFAULT_SUPER_ADMIN.password, 12);
    
    // Créer l'utilisateur et le profil SuperAdmin dans une transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Créer l'utilisateur
      const user = await tx.user.create({
        data: {
          email: DEFAULT_SUPER_ADMIN.email,
          passwordHash: passwordHash,
          userType: 'SUPER_ADMIN',
          status: 'ACTIF',
        },
      });
      
      // 2. Créer le profil SuperAdmin
      const superAdmin = await tx.superAdmin.create({
        data: {
          userId: user.id,
          nom: DEFAULT_SUPER_ADMIN.nom,
          prenom: DEFAULT_SUPER_ADMIN.prenom,
          telephone: DEFAULT_SUPER_ADMIN.telephone,
          niveauAcces: DEFAULT_SUPER_ADMIN.niveauAcces,
        },
      });
      
      return { user, superAdmin };
    });
    
    return NextResponse.json({
      success: true,
      message: 'Compte SuperAdmin créé avec succès',
      credentials: {
        email: DEFAULT_SUPER_ADMIN.email,
        password: DEFAULT_SUPER_ADMIN.password,
        nom: DEFAULT_SUPER_ADMIN.nom,
        prenom: DEFAULT_SUPER_ADMIN.prenom,
      },
      warning: 'Changez le mot de passe après la première connexion !',
    }, { headers: SECURITY_HEADERS });
    
  } catch (error) {
    console.error('Erreur création SuperAdmin:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la création du compte' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * GET /api/setup/create-super-admin
 * Vérifie si un SuperAdmin existe
 */
export async function GET(request: NextRequest) {
  try {
    const existingSuperAdmin = await prisma.superAdmin.findFirst({
      include: { user: true },
    });
    
    if (existingSuperAdmin) {
      return NextResponse.json({
        exists: true,
        email: existingSuperAdmin.user.email,
        nom: existingSuperAdmin.nom,
        prenom: existingSuperAdmin.prenom,
      }, { headers: SECURITY_HEADERS });
    }
    
    return NextResponse.json({
      exists: false,
      message: 'Aucun SuperAdmin trouvé. Utilisez POST pour créer un compte.',
    }, { headers: SECURITY_HEADERS });
    
  } catch (error) {
    console.error('Erreur vérification:', error);
    
    return NextResponse.json(
      { error: 'Erreur lors de la vérification' },
      { status: 500, headers: SECURITY_HEADERS }
    );
  }
}
