/**
 * ============================================================================
 * API ROUTE - GESTION DES POSTES (CRUD)
 * ============================================================================
 * Opérations CRUD sécurisées pour les postes de contrôle
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import { SECURITY_HEADERS } from '@/lib/security/config';
import { 
  checkRateLimit, 
  sensitiveRateLimiter, 
  getClientIP 
} from '@/lib/security/rate-limit';
import { createPosteSchema, paginationSchema, sanitizeObject } from '@/lib/security/validation';

/**
 * GET /api/admin/postes
 * Lister les postes avec pagination et filtres
 */
export async function GET(request: NextRequest) {
  try {
    const session = await requireSuperAdmin(request);
    
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(sensitiveRateLimiter, `postes:get:${clientIP}`);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }
    
    // Pagination et filtres
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const type = searchParams.get('type');
    const region = searchParams.get('region');
    const statut = searchParams.get('statut');
    
    // Construire le where
    const where: any = {};
    
    if (type) where.type = type;
    if (statut) where.statut = statut;
    
    // Filtre régional pour les admins régionaux
    if (session.niveauAcces === 'REGIONAL' && session.regionId) {
      where.region = { contains: session.regionId };
    } else if (region) {
      where.region = { contains: region };
    }
    
    // Récupérer les postes
    const [postes, total] = await Promise.all([
      prisma.poste.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: {
            select: {
              agents: true,
              passages: {
                where: {
                  timestampPassage: {
                    gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
                  },
                },
              },
            },
          },
        },
      }),
      prisma.poste.count({ where }),
    ]);
    
    return NextResponse.json({
      success: true,
      data: postes,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }, { headers: SECURITY_HEADERS });
    
  } catch (error) {
    console.error('Erreur GET postes:', error);
    
    const statusCode = (error as Error & { statusCode: number }).statusCode || 500;
    const message = statusCode === 401 
      ? 'Authentification requise' 
      : statusCode === 403 
      ? 'Accès non autorisé'
      : 'Erreur interne';
    
    return NextResponse.json(
      { error: message },
      { status: statusCode, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * POST /api/admin/postes
 * Créer un nouveau poste
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📝 POST /api/admin/postes - Début');
    
    const session = await requireSuperAdmin(request);
    console.log('✅ Session:', session);
    
    // Vérifier le niveau d'accès
    if (session.niveauAcces !== 'NATIONAL') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs nationaux peuvent créer des postes' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }
    
    // Rate limiting strict
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(sensitiveRateLimiter, `postes:create:${clientIP}`);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }
    
    // Parser et valider le body
    let body: unknown;
    try {
      body = await request.json();
      console.log('📦 Body reçu:', body);
    } catch (e) {
      console.error('❌ Erreur parsing JSON:', e);
      return NextResponse.json(
        { error: 'Corps de requête invalide - JSON attendu' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    // Validation Zod
    const validationResult = createPosteSchema.safeParse(body);
    if (!validationResult.success) {
      console.error('❌ Validation Zod échouée:', validationResult.error.issues);
      return NextResponse.json(
        { 
          error: 'Données invalides',
          details: validationResult.error.issues.map(issue => ({
            path: issue.path,
            message: issue.message
          }))
        },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    const data = validationResult.data;
    console.log('✅ Données validées:', data);
    
    // Vérifier si un poste existe déjà à proximité (moins de 100m)
    const existingPoste = await prisma.poste.findFirst({
      where: {
        AND: [
          {
            latitude: {
              gte: String(parseFloat(data.latitude.toString()) - 0.001),
              lte: String(parseFloat(data.latitude.toString()) + 0.001),
            },
          },
          {
            longitude: {
              gte: String(parseFloat(data.longitude.toString()) - 0.001),
              lte: String(parseFloat(data.longitude.toString()) + 0.001),
            },
          },
        ],
      },
    });
    
    if (existingPoste) {
      return NextResponse.json(
        { error: 'Un poste existe déjà à proximité de cette localisation' },
        { status: 409, headers: SECURITY_HEADERS }
      );
    }
    
    // Créer le poste
    const poste = await prisma.poste.create({
      data: {
        nom: data.nom,
        type: data.type,
        latitude: data.latitude,
        longitude: data.longitude,
        adresse: data.adresse,
        ville: data.ville,
        region: data.region,
        telephone: data.telephone,
        createdBy: session.userId,
      },
    });
    
    // Logger l'action
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'CREATION',
        entityType: 'Poste',
        entityId: poste.id,
        description: `Création du poste ${poste.nom}`,
        newData: JSON.stringify(poste),
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: poste,
    }, { 
      status: 201,
      headers: SECURITY_HEADERS 
    });
    
  } catch (error) {
    console.error('Erreur POST poste:', error);
    
    const statusCode = (error as Error & { statusCode: number }).statusCode || 500;
    const message = statusCode === 401 
      ? 'Authentification requise' 
      : statusCode === 403 
      ? 'Accès non autorisé'
      : 'Erreur interne';
    
    return NextResponse.json(
      { error: message },
      { status: statusCode, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * PUT /api/admin/postes
 * Mettre à jour un poste
 */
export async function PUT(request: NextRequest) {
  try {
    console.log('📝 PUT /api/admin/postes - Début');
    
    const session = await requireSuperAdmin(request);
    console.log('✅ Session:', session.userId);
    
    // Vérifier le niveau d'accès
    if (session.niveauAcces !== 'NATIONAL') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs nationaux peuvent modifier des postes' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }
    
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(sensitiveRateLimiter, `postes:update:${clientIP}`);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }
    
    const body = await request.json();
    console.log('📦 Body reçu:', body);
    
    const { id, ...data } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID du poste requis' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    // Validation des données
    if (data.latitude) {
      data.latitude = parseFloat(data.latitude);
    }
    if (data.longitude) {
      data.longitude = parseFloat(data.longitude);
    }
    
    // Récupérer l'ancienne version pour l'audit
    const oldPoste = await prisma.poste.findUnique({ where: { id } });
    
    if (!oldPoste) {
      return NextResponse.json(
        { error: 'Poste non trouvé' },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }
    
    // Mettre à jour
    const updatedPoste = await prisma.poste.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
    
    console.log('✅ Poste mis à jour:', updatedPoste.id);
    
    // Logger
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'MODIFICATION',
        entityType: 'Poste',
        entityId: id,
        description: `Modification du poste ${updatedPoste.nom}`,
        oldData: JSON.stringify(oldPoste),
        newData: JSON.stringify(updatedPoste),
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });
    
    return NextResponse.json({
      success: true,
      data: updatedPoste,
    }, { headers: SECURITY_HEADERS });
    
  } catch (error) {
    console.error('❌ Erreur PUT poste:', error);
    
    const statusCode = (error as Error & { statusCode: number }).statusCode || 500;
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: statusCode, headers: SECURITY_HEADERS }
    );
  }
}

/**
 * DELETE /api/admin/postes?id=xxx
 * Supprimer (désactiver) un poste
 */
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ DELETE /api/admin/postes - Début');
    
    const session = await requireSuperAdmin(request);
    console.log('✅ Session:', session.userId);
    
    // Vérifier le niveau d'accès
    if (session.niveauAcces !== 'NATIONAL') {
      return NextResponse.json(
        { error: 'Seuls les administrateurs nationaux peuvent supprimer des postes' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }
    
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(sensitiveRateLimiter, `postes:delete:${clientIP}`);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    console.log('📝 ID à supprimer:', id);
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID du poste requis' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }
    
    const poste = await prisma.poste.findUnique({ where: { id } });
    
    if (!poste) {
      return NextResponse.json(
        { error: 'Poste non trouvé' },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }
    
    // Désactivation logique plutôt que suppression
    await prisma.poste.update({
      where: { id },
      data: { statut: 'INACTIF' },
    });
    
    console.log('✅ Poste désactivé:', id);
    
    // Logger
    await prisma.auditLog.create({
      data: {
        userId: session.userId,
        actionType: 'SUPPRESSION',
        entityType: 'Poste',
        entityId: id,
        description: `Désactivation du poste ${poste.nom}`,
        oldData: JSON.stringify(poste),
        ipAddress: clientIP,
        userAgent: request.headers.get('user-agent') || undefined,
      },
    });
    
    return NextResponse.json({
      success: true,
      message: 'Poste désactivé',
    }, { headers: SECURITY_HEADERS });
    
  } catch (error) {
    console.error('❌ Erreur DELETE poste:', error);
    
    const statusCode = (error as Error & { statusCode: number }).statusCode || 500;
    return NextResponse.json(
      { error: 'Erreur interne' },
      { status: statusCode, headers: SECURITY_HEADERS }
    );
  }
}
