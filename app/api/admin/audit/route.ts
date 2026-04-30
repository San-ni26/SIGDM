/**
 * ============================================================================
 * API ADMIN – JOURNAL D'AUDIT (LECTURE SEULE + EXPORT CSV)
 * GET /api/admin/audit – Liste paginée avec filtres et export CSV
 * ============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireSuperAdmin } from '@/lib/auth/jwt';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    await requireSuperAdmin(request);

    const { searchParams } = new URL(request.url);
    const exportMode = searchParams.get('export');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'));
    const limit = exportMode ? 10000 : Math.min(100, parseInt(searchParams.get('limit') || '20'));
    const search = searchParams.get('search') || '';
    const action = searchParams.get('action') || '';
    const entity = searchParams.get('entity') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const skip = exportMode ? 0 : (page - 1) * limit;
    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { entityType: { contains: search, mode: 'insensitive' } },
        { ipAddress: { contains: search } },
      ];
    }

    if (action) where.actionType = action;
    if (entity) where.entityType = entity;

    if (from || to) {
      where.createdAt = {
        ...(from && { gte: new Date(from) }),
        ...(to && { lte: new Date(`${to}T23:59:59.999Z`) }),
      };
    }

    const logs = await prisma.auditLog.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
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
    });

    // Mode export CSV
    if (exportMode === 'csv') {
      const headers = ['ID', 'Date', 'Action', 'Entité', 'Description', 'Utilisateur', 'IP', 'Latitude', 'Longitude'];
      const rows = logs.map((log) => {
        const user = log.user;
        let userName = user.email || user.id;
        if (user.superAdmin) userName = `${user.superAdmin.prenom} ${user.superAdmin.nom} (Admin)`;
        else if (user.agent) userName = `${user.agent.prenom} ${user.agent.nom} [${user.agent.matriculeAgent}]`;
        else if (user.citoyen) userName = `${user.citoyen.prenom} ${user.citoyen.nom} [${user.citoyen.matricule}]`;

        return [
          log.id,
          new Date(log.createdAt).toLocaleString('fr-FR'),
          log.actionType,
          log.entityType,
          `"${log.description.replace(/"/g, '""')}"`,
          userName,
          log.ipAddress || '',
          log.latitude?.toString() || '',
          log.longitude?.toString() || '',
        ].join(';');
      });

      const csv = [headers.join(';'), ...rows].join('\n');
      const filename = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }

    const total = await prisma.auditLog.count({ where });

    return NextResponse.json({
      data: logs,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error: any) {
    const status = error.statusCode || 500;
    return NextResponse.json({ error: error.message || 'Erreur serveur' }, { status });
  }
}
