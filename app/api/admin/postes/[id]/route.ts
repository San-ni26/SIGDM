/**
 * ============================================================================
 * API ROUTE - DÉTAILS D'UN POSTE
 * ============================================================================
 * Récupération des informations détaillées d'un poste (agents, contrôles, anomalies)
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import { SECURITY_HEADERS } from '@/lib/security/config';
import { checkRateLimit, sensitiveRateLimiter, getClientIP } from '@/lib/security/rate-limit';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireSuperAdmin(request);
    
    // Rate limiting
    const clientIP = getClientIP(request);
    const rateLimitResult = await checkRateLimit(sensitiveRateLimiter, `postes-detail:get:${clientIP}`);
    
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Trop de requêtes' },
        { status: 429, headers: SECURITY_HEADERS }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { error: 'ID du poste manquant' },
        { status: 400, headers: SECURITY_HEADERS }
      );
    }

    // Récupérer le poste avec toutes ses relations utiles
    const poste = await prisma.poste.findUnique({
      where: { id },
      include: {
        // Agents actuellement assignés
        agents: {
          select: {
            id: true,
            nom: true,
            prenom: true,
            matriculeAgent: true,
            typeAgent: true,
            telephone: true,
            photoUrl: true,
            grade: true,
          },
          orderBy: { nom: 'asc' }
        },
        // 50 derniers contrôles (passages)
        passages: {
          take: 50,
          orderBy: { timestampPassage: 'desc' },
          include: {
            agent: {
              select: { nom: true, prenom: true }
            },
            trip: {
              select: {
                reference: true,
                pointDepart: true,
                destination: true,
                vehicle: {
                  select: { plaque: true, typeVehicle: true }
                }
              }
            }
          }
        },
        anomalies: {
          take: 50,
          orderBy: { createdAt: 'desc' },
          include: {
            agentSignale: {
              select: { nom: true, prenom: true }
            },
            trip: {
              select: {
                reference: true,
                vehicle: { select: { plaque: true } }
              }
            }
          }
        },
        _count: {
          select: {
            agents: true,
            passages: true,
            anomalies: true
          }
        }
      }
    });

    if (!poste) {
      return NextResponse.json(
        { error: 'Poste non trouvé' },
        { status: 404, headers: SECURITY_HEADERS }
      );
    }

    // Sécurité: vérifier si le super admin a accès à cette région (s'il est régional)
    if (session.niveauAcces === 'REGIONAL' && session.regionId && !poste.region.includes(session.regionId)) {
      return NextResponse.json(
        { error: 'Accès non autorisé à ce poste' },
        { status: 403, headers: SECURITY_HEADERS }
      );
    }

    return NextResponse.json({
      success: true,
      data: poste
    }, { headers: SECURITY_HEADERS });

  } catch (error) {
    console.error('Erreur GET poste détails:', error);
    
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
