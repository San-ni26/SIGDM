import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireSuperAdmin } from '@/lib/auth/jwt';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '15');
    const search = searchParams.get('search') || '';
    const statut = searchParams.get('statut') || '';

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { raisonSociale: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { telephone: { contains: search, mode: 'insensitive' } },
        { nif: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (statut) {
      if (statut === 'VALIDE') {
        where.validePar = { not: null };
      } else if (statut === 'NON_VALIDE') {
        where.validePar = null;
      } else {
        where.user = { status: statut };
      }
    }

    const [entreprises, total] = await Promise.all([
      prisma.entreprise.findMany({
        where,
        include: {
          user: { select: { status: true, email: true } },
          _count: { select: { vehicules: true, trajets: true, chauffeurs: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.entreprise.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: entreprises,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error('Erreur API entreprises:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
