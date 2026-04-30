/**
 * ============================================================================
 * API AGENT – STATS DU JOUR
 * GET /api/agent/stats/today
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { startOfDay } from 'date-fns';
import { JWT_SECRET } from '@/lib/security/config';

const secretKey = new TextEncoder().encode(JWT_SECRET);

async function getAgentId(request: NextRequest): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('agent_token')?.value;
    if (!token) return null;
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ['HS256'],
      audience: 'transport-ml-agent',
      issuer: 'transport-ml-auth',
    });
    return (payload as any).agentId || null;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const agentId = await getAgentId(request);
    if (!agentId) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const today = startOfDay(new Date());

    // Compter les passages validés aujourd'hui
    const passagesToday = await prisma.passage.count({
      where: {
        agentId,
        timestampPassage: {
          gte: today,
        },
      },
    });

    // Compter les anomalies signalées aujourd'hui
    const anomaliesToday = await prisma.anomaly.count({
      where: {
        agentId,
        createdAt: {
          gte: today,
        },
      },
    });

    // Dernière validation
    const lastPassage = await prisma.passage.findFirst({
      where: { agentId },
      orderBy: { timestampPassage: 'desc' },
      select: { timestampPassage: true },
    });

    return NextResponse.json({
      passagesToday,
      anomaliesToday,
      lastValidationAt: lastPassage?.timestampPassage || null,
    });
  } catch (error: any) {
    console.error('Erreur stats agent:', error);
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
}
