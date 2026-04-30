/**
 * ============================================================================
 * ONGLET ANOMALIES – DASHBOARD SUPER ADMIN
 * ============================================================================
 * Gestion et traitement des anomalies signalées par les agents
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Clock,
  Eye,
  MapPin,
  User,
  Calendar,
  FileText,
  Camera,
  Zap,
} from 'lucide-react';

interface Anomaly {
  id: string;
  type: string;
  description: string;
  severite: 'FAIBLE' | 'MOYENNE' | 'GRAVE' | 'CRITIQUE';
  statut: 'EN_ATTENTE' | 'EN_COURS' | 'RESOLUE' | 'REJETEE';
  preuvesUrls: string | null;
  createdAt: string;
  dateTraitement: string | null;
  notesResolution: string | null;
  poste: { nom: string; ville: string; region: string };
  agentSignale: { nom: string; prenom: string; matriculeAgent: string };
  trip: { reference: string; vehicle: { plaque: string } } | null;
}

const TYPE_ANOMALY_LABELS: Record<string, string> = {
  PASSAGER_NON_DECLARE: 'Passager non déclaré',
  PLAQUE_INCORRECTE: 'Plaque incorrecte',
  DOCUMENTS_MANQUANTS: 'Documents manquants',
  SURCHARGE: 'Surcharge',
  MARCHANDISE_NON_DECLARE: 'Marchandise non déclarée',
  CONDUITE_DANGEREUSE: 'Conduite dangereuse',
  FAUX_DOCUMENTS: 'Faux documents',
  VEHICULE_VOLE: 'Véhicule volé',
  AUTRE: 'Autre',
};

const SEVERITE_CONFIG = {
  FAIBLE: { label: 'Faible', color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-400' },
  MOYENNE: { label: 'Moyenne', color: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-400' },
  GRAVE: { label: 'Grave', color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-500' },
  CRITIQUE: { label: 'CRITIQUE', color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-600', pulse: true },
};

const STATUT_CONFIG = {
  EN_ATTENTE: { label: 'En attente', color: 'bg-amber-100 text-amber-800', icon: Clock },
  EN_COURS: { label: 'En cours', color: 'bg-blue-100 text-blue-800', icon: Eye },
  RESOLUE: { label: 'Résolue', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  REJETEE: { label: 'Rejetée', color: 'bg-gray-100 text-gray-600', icon: X },
};

const PAGE_SIZE = 15;

export default function AnomaliesTab() {
  const [anomalies, setAnomalies] = useState<Anomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSeverite, setFilterSeverite] = useState('');
  const [filterStatut, setFilterStatut] = useState('EN_ATTENTE');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedAnomaly, setSelectedAnomaly] = useState<Anomaly | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const loadAnomalies = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(searchTerm && { search: searchTerm }),
        ...(filterType && { type: filterType }),
        ...(filterSeverite && { severite: filterSeverite }),
        ...(filterStatut && { statut: filterStatut }),
      });
      const res = await fetch(`/api/admin/anomalies?${params}`);
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setAnomalies(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterType, filterSeverite, filterStatut]);

  useEffect(() => {
    loadAnomalies();
  }, [loadAnomalies]);

  const handleProcess = async (anomalyId: string, statut: 'EN_COURS' | 'RESOLUE' | 'REJETEE') => {
    if (statut === 'RESOLUE' && !resolutionNote.trim()) {
      alert('Veuillez ajouter une note de résolution');
      return;
    }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/anomalies?id=${anomalyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ statut, notesResolution: resolutionNote }),
      });
      if (!res.ok) throw new Error('Erreur');
      await loadAnomalies();
      setSelectedAnomaly(null);
      setResolutionNote('');
    } catch {
      alert('Erreur lors du traitement');
    } finally {
      setIsProcessing(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex gap-6">
      {/* Liste */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Anomalies</h2>
            <p className="text-sm text-gray-500 mt-0.5">{total} anomalie{total > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Plaque, poste, agent..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select value={filterStatut} onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Tous statuts</option>
            {Object.entries(STATUT_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterSeverite} onChange={(e) => { setFilterSeverite(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Toutes sévérités</option>
            {Object.entries(SEVERITE_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500">
            <option value="">Tous types</option>
            {Object.entries(TYPE_ANOMALY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {/* Liste anomalies */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : anomalies.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-gray-200">
            <AlertTriangle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 font-medium">Aucune anomalie trouvée</p>
          </div>
        ) : (
          <div className="space-y-3">
            {anomalies.map((anomaly) => {
              const severiteCfg = SEVERITE_CONFIG[anomaly.severite];
              const statutCfg = STATUT_CONFIG[anomaly.statut];
              const StatutIcon = statutCfg.icon;
              const isSelected = selectedAnomaly?.id === anomaly.id;

              return (
                <div
                  key={anomaly.id}
                  onClick={() => { setSelectedAnomaly(isSelected ? null : anomaly); setResolutionNote(''); }}
                  className={`bg-white rounded-xl border-2 p-4 cursor-pointer transition-all hover:shadow-md ${
                    isSelected ? 'border-blue-500 shadow-md' : 'border-gray-200 hover:border-gray-300'
                  } ${anomaly.severite === 'CRITIQUE' ? 'border-l-4 border-l-red-600' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${severiteCfg.dot} ${(severiteCfg as any).pulse ? 'animate-pulse' : ''}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">
                          {TYPE_ANOMALY_LABELS[anomaly.type] || anomaly.type}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${severiteCfg.color}`}>
                            {severiteCfg.label}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${statutCfg.color}`}>
                            <StatutIcon className="w-3 h-3" />
                            {statutCfg.label}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{anomaly.description}</p>

                      <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {anomaly.poste.nom} – {anomaly.poste.ville}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3" />
                          Agent {anomaly.agentSignale.prenom} {anomaly.agentSignale.nom}
                        </span>
                        {anomaly.trip && (
                          <span className="flex items-center gap-1 font-mono bg-gray-100 px-1.5 py-0.5 rounded">
                            🚗 {anomaly.trip.vehicle.plaque}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(anomaly.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200">
            <p className="text-sm text-gray-500">Page {page} / {totalPages}</p>
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

      {/* Panneau traitement */}
      {selectedAnomaly && (
        <div className="w-80 xl:w-96 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto max-h-[calc(100vh-200px)] sticky top-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              <h3 className="font-semibold text-gray-900 text-sm">Traitement anomalie</h3>
            </div>
            <button onClick={() => setSelectedAnomaly(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Type et sévérité */}
            <div>
              <p className="font-semibold text-gray-900">
                {TYPE_ANOMALY_LABELS[selectedAnomaly.type] || selectedAnomaly.type}
              </p>
              <div className="flex gap-2 mt-1">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${SEVERITE_CONFIG[selectedAnomaly.severite].color}`}>
                  {SEVERITE_CONFIG[selectedAnomaly.severite].label}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${STATUT_CONFIG[selectedAnomaly.statut].color}`}>
                  {STATUT_CONFIG[selectedAnomaly.statut].label}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-gray-700">{selectedAnomaly.description}</p>
            </div>

            {/* Infos */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{selectedAnomaly.poste.nom} – {selectedAnomaly.poste.ville}, {selectedAnomaly.poste.region}</span>
              </div>
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">Agent {selectedAnomaly.agentSignale.prenom} {selectedAnomaly.agentSignale.nom}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700">{new Date(selectedAnomaly.createdAt).toLocaleString('fr-FR')}</span>
              </div>
              {selectedAnomaly.trip && (
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 font-mono">Trajet {selectedAnomaly.trip.reference} – 🚗 {selectedAnomaly.trip.vehicle.plaque}</span>
                </div>
              )}
            </div>

            {/* Preuves */}
            {selectedAnomaly.preuvesUrls && (
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Camera className="w-3 h-3" /> Preuves
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {selectedAnomaly.preuvesUrls.split(',').map((url, i) => (
                    <a key={i} href={url.trim()} target="_blank" rel="noopener noreferrer"
                      className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center text-xs text-blue-600 hover:bg-blue-50 transition-colors overflow-hidden">
                      <Camera className="w-6 h-6 text-gray-400" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Zone de traitement */}
            {selectedAnomaly.statut === 'EN_ATTENTE' || selectedAnomaly.statut === 'EN_COURS' ? (
              <div className="space-y-3 pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Traiter l'anomalie</p>
                <textarea
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  placeholder="Notes de résolution (obligatoire pour clôturer)..."
                  rows={3}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <div className="grid grid-cols-3 gap-2">
                  {selectedAnomaly.statut === 'EN_ATTENTE' && (
                    <button
                      onClick={() => handleProcess(selectedAnomaly.id, 'EN_COURS')}
                      disabled={isProcessing}
                      className="py-2 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors disabled:opacity-50"
                    >
                      En cours
                    </button>
                  )}
                  <button
                    onClick={() => handleProcess(selectedAnomaly.id, 'RESOLUE')}
                    disabled={isProcessing}
                    className="py-2 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors disabled:opacity-50"
                  >
                    Résoudre
                  </button>
                  <button
                    onClick={() => handleProcess(selectedAnomaly.id, 'REJETEE')}
                    disabled={isProcessing}
                    className="py-2 text-xs font-medium bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                </div>
              </div>
            ) : selectedAnomaly.notesResolution ? (
              <div className="pt-3 border-t border-gray-100">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Note de résolution</p>
                <p className="text-sm text-gray-700 bg-green-50 rounded-lg p-3">{selectedAnomaly.notesResolution}</p>
                {selectedAnomaly.dateTraitement && (
                  <p className="text-xs text-gray-400 mt-1">
                    Traité le {new Date(selectedAnomaly.dateTraitement).toLocaleString('fr-FR')}
                  </p>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
