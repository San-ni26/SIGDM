/**
 * ============================================================================
 * ONGLET JOURNAL D'AUDIT – DASHBOARD SUPER ADMIN
 * ============================================================================
 * Consultation du journal d'audit immutable (lecture seule pour admin)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Eye,
  Lock,
  Shield,
  Activity,
  FileText,
  User,
  MapPin,
  X,
} from 'lucide-react';

interface AuditLog {
  id: string;
  actionType: string;
  entityType: string;
  entityId: string | null;
  description: string;
  oldData: string | null;
  newData: string | null;
  ipAddress: string | null;
  latitude: string | null;
  longitude: string | null;
  posteId: string | null;
  createdAt: string;
  user: {
    id: string;
    userType: string;
    email: string | null;
    citoyen: { nom: string; prenom: string; matricule: string } | null;
    agent: { nom: string; prenom: string; matriculeAgent: string } | null;
    superAdmin: { nom: string; prenom: string } | null;
  };
}

const ACTION_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  CREATION: { label: 'Création', color: 'bg-green-100 text-green-800', icon: Activity },
  MODIFICATION: { label: 'Modification', color: 'bg-blue-100 text-blue-800', icon: Activity },
  SUPPRESSION: { label: 'Suppression', color: 'bg-red-100 text-red-800', icon: Activity },
  CONNEXION: { label: 'Connexion', color: 'bg-slate-100 text-slate-700', icon: Shield },
  DECONNEXION: { label: 'Déconnexion', color: 'bg-gray-100 text-gray-600', icon: Shield },
  VALIDATION: { label: 'Validation', color: 'bg-emerald-100 text-emerald-800', icon: Activity },
  DECLARATION: { label: 'Déclaration', color: 'bg-purple-100 text-purple-800', icon: FileText },
  VERIFICATION: { label: 'Vérification', color: 'bg-cyan-100 text-cyan-800', icon: Eye },
  SIGNALEMENT: { label: 'Signalement', color: 'bg-amber-100 text-amber-800', icon: Activity },
  EXPORT: { label: 'Export', color: 'bg-indigo-100 text-indigo-800', icon: Download },
  CONSULTATION: { label: 'Consultation', color: 'bg-gray-100 text-gray-600', icon: Eye },
};

const PAGE_SIZE = 20;

function getUserLabel(user: AuditLog['user']): string {
  if (user.superAdmin) return `${user.superAdmin.prenom} ${user.superAdmin.nom} (Admin)`;
  if (user.agent) return `${user.agent.prenom} ${user.agent.nom} [${user.agent.matriculeAgent}]`;
  if (user.citoyen) return `${user.citoyen.prenom} ${user.citoyen.nom} [${user.citoyen.matricule}]`;
  return user.email || user.id;
}

export default function AuditTab() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterEntity, setFilterEntity] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(searchTerm && { search: searchTerm }),
        ...(filterAction && { action: filterAction }),
        ...(filterEntity && { entity: filterEntity }),
        ...(dateFrom && { from: dateFrom }),
        ...(dateTo && { to: dateTo }),
      });
      const res = await fetch(`/api/admin/audit?${params}`);
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setLogs(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterAction, filterEntity, dateFrom, dateTo]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleExport = async () => {
    const params = new URLSearchParams({
      export: 'csv',
      ...(filterAction && { action: filterAction }),
      ...(filterEntity && { entity: filterEntity }),
      ...(dateFrom && { from: dateFrom }),
      ...(dateTo && { to: dateTo }),
    });
    window.open(`/api/admin/audit?${params}`, '_blank');
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex gap-6">
      {/* Liste */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-semibold text-gray-900">Journal d'audit</h2>
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                <Lock className="w-3 h-3" />
                Immutable
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{total} entrée{total > 1 ? 's' : ''} · Lecture seule</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-xl hover:bg-slate-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Exporter CSV
          </button>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Description, utilisateur, entité..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select value={filterAction} onChange={(e) => { setFilterAction(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Toutes actions</option>
            {Object.entries(ACTION_TYPE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterEntity} onChange={(e) => { setFilterEntity(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Toutes entités</option>
            {['User', 'Citoyen', 'Agent', 'Vehicle', 'Trip', 'Passage', 'Anomaly', 'Poste'].map(e => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
          <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Du" />
          <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Au" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-16">
              <Clock className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Aucune entrée trouvée</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Date / Heure</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Utilisateur</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Description</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">IP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log) => {
                  const actionCfg = ACTION_TYPE_CONFIG[log.actionType] || { label: log.actionType, color: 'bg-gray-100 text-gray-700', icon: Activity };
                  const ActionIcon = actionCfg.icon;
                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors text-sm ${selectedLog?.id === log.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedLog(selectedLog?.id === log.id ? null : log)}
                    >
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        <p className="font-mono">{new Date(log.createdAt).toLocaleDateString('fr-FR')}</p>
                        <p className="font-mono text-gray-400">{new Date(log.createdAt).toLocaleTimeString('fr-FR')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${actionCfg.color}`}>
                          <ActionIcon className="w-3 h-3" />
                          {actionCfg.label}
                        </span>
                        {log.entityType && (
                          <p className="text-xs text-gray-400 mt-0.5">{log.entityType}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-gray-700 text-xs">{getUserLabel(log.user)}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell max-w-64">
                        <p className="text-gray-600 text-xs truncate">{log.description}</p>
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="font-mono text-xs text-gray-400">{log.ipAddress || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <button className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-gray-600 transition-colors">
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Page {page} / {totalPages} ({total} entrées)</p>
            <div className="flex gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Détail log */}
      {selectedLog && (
        <div className="w-80 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4 sticky top-0 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Détail de l'action</h3>
            <button onClick={() => setSelectedLog(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-gray-500 mb-1">Action</p>
              <span className={`text-xs px-2 py-0.5 rounded-full ${(ACTION_TYPE_CONFIG[selectedLog.actionType] || { color: 'bg-gray-100 text-gray-700' }).color}`}>
                {selectedLog.actionType}
              </span>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Description</p>
              <p className="text-gray-700 text-xs">{selectedLog.description}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Utilisateur</p>
              <p className="text-gray-700 text-xs font-medium">{getUserLabel(selectedLog.user)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Timestamp</p>
              <p className="text-gray-700 text-xs font-mono">{new Date(selectedLog.createdAt).toLocaleString('fr-FR')}</p>
            </div>
            {selectedLog.ipAddress && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Adresse IP</p>
                <p className="text-gray-700 text-xs font-mono">{selectedLog.ipAddress}</p>
              </div>
            )}
            {selectedLog.latitude && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <MapPin className="w-3 h-3" />
                GPS: {selectedLog.latitude}, {selectedLog.longitude}
              </div>
            )}
            {selectedLog.oldData && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Avant</p>
                <pre className="text-xs bg-red-50 p-2 rounded-lg overflow-x-auto text-red-800 max-h-32">
                  {JSON.stringify(JSON.parse(selectedLog.oldData), null, 2)}
                </pre>
              </div>
            )}
            {selectedLog.newData && (
              <div>
                <p className="text-xs text-gray-500 mb-1">Après</p>
                <pre className="text-xs bg-green-50 p-2 rounded-lg overflow-x-auto text-green-800 max-h-32">
                  {JSON.stringify(JSON.parse(selectedLog.newData), null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
