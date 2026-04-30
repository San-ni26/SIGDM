/**
 * ============================================================================
 * ONGLET CITOYENS – DASHBOARD SUPER ADMIN
 * ============================================================================
 * Recherche, consultation et gestion des profils citoyens
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  X,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Car,
  Route,
  CheckCircle,
  XCircle,
  AlertTriangle,
  User,
  BadgeCheck,
} from 'lucide-react';

interface Citoyen {
  id: string;
  matricule: string;
  nom: string;
  prenom: string;
  telephone: string;
  genre: 'MASCULIN' | 'FEMININ' | 'AUTRE';
  typePersonne: 'ADULTE' | 'ENFANT';
  dateNaissance: string;
  lieuNaissance: string;
  ville: string | null;
  region: string | null;
  photoUrl: string | null;
  createdAt: string;
  user: { status: string; email: string | null };
  _count?: { vehicules: number; trajetsDeclares: number; passagerTrips: number };
}

interface CitoyenDetail extends Citoyen {
  vehicules: Array<{ id: string; plaque: string; typeVehicle: string; statut: string }>;
  trajetsDeclares: Array<{
    id: string;
    reference: string;
    pointDepart: string;
    destination: string;
    statut: string;
    dateDepart: string;
    vehicle: { plaque: string };
  }>;
}

const STATUS_CONFIG = {
  ACTIF: { label: 'Actif', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  INACTIF: { label: 'Inactif', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  SUSPENDU: { label: 'Suspendu', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  EN_ATTENTE: { label: 'En attente', color: 'bg-amber-100 text-amber-800', icon: AlertTriangle },
};

const TRIP_STATUS_COLOR: Record<string, string> = {
  EN_PREPARATION: 'bg-blue-100 text-blue-800',
  EN_COURS: 'bg-amber-100 text-amber-800',
  TERMINE: 'bg-green-100 text-green-800',
  ANNULE: 'bg-gray-100 text-gray-800',
  BLOQUE: 'bg-red-100 text-red-800',
};

const PAGE_SIZE = 15;

export default function CitoyensTab() {
  const [citoyens, setCitoyens] = useState<Citoyen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCitoyen, setSelectedCitoyen] = useState<CitoyenDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCitoyens = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatut && { statut: filterStatut }),
      });
      const res = await fetch(`/api/admin/citoyens?${params}`);
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setCitoyens(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterStatut]);

  useEffect(() => {
    loadCitoyens();
  }, [loadCitoyens]);

  const openDetail = async (citoyen: Citoyen) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/citoyens/${citoyen.id}`);
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setSelectedCitoyen(data.data);
    } catch {
      alert('Impossible de charger les détails');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatus = async (citoyen: Citoyen) => {
    const newStatus = citoyen.user.status === 'ACTIF' ? 'SUSPENDU' : 'ACTIF';
    const label = newStatus === 'ACTIF' ? 'Réactiver' : 'Suspendre';
    if (!confirm(`${label} le compte de ${citoyen.prenom} ${citoyen.nom} ?`)) return;
    try {
      const res = await fetch(`/api/admin/citoyens/${citoyen.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Erreur');
      await loadCitoyens();
      if (selectedCitoyen?.id === citoyen.id) setSelectedCitoyen(null);
    } catch {
      alert('Erreur lors du changement de statut');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex gap-6 h-full">
      {/* Liste */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Citoyens</h2>
            <p className="text-sm text-gray-500 mt-0.5">{total} citoyen{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Nom, matricule, téléphone..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterStatut}
            onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            <option value="ACTIF">Actif</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="SUSPENDU">Suspendu</option>
            <option value="INACTIF">Inactif</option>
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : citoyens.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Aucun citoyen trouvé</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Citoyen</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Matricule</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Activité</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {citoyens.map((citoyen) => {
                  const statusCfg = STATUS_CONFIG[citoyen.user.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.EN_ATTENTE;
                  return (
                    <tr
                      key={citoyen.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedCitoyen?.id === citoyen.id ? 'bg-blue-50' : ''}`}
                      onClick={() => openDetail(citoyen)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {citoyen.prenom[0]}{citoyen.nom[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm">{citoyen.prenom} {citoyen.nom}</p>
                            <p className="text-xs text-gray-500">{citoyen.typePersonne === 'ADULTE' ? 'Adulte' : 'Enfant'} · {citoyen.genre === 'MASCULIN' ? 'M' : citoyen.genre === 'FEMININ' ? 'F' : 'Autre'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="font-mono text-sm text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {citoyen.matricule}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-sm text-gray-600">{citoyen.telephone}</p>
                        {citoyen.ville && <p className="text-xs text-gray-400">{citoyen.ville}, {citoyen.region}</p>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1"><Car className="w-3 h-3" />{citoyen._count?.vehicules || 0}</span>
                          <span className="flex items-center gap-1"><Route className="w-3 h-3" />{citoyen._count?.trajetsDeclares || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(citoyen)}
                          className="text-xs text-gray-400 hover:text-gray-600 py-1 px-2 rounded hover:bg-gray-100 transition-colors"
                        >
                          {citoyen.user.status === 'ACTIF' ? 'Suspendre' : 'Activer'}
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

      {/* Panneau détail */}
      {selectedCitoyen && (
        <div className="w-80 xl:w-96 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto max-h-[calc(100vh-200px)] sticky top-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Fiche citoyen</h3>
            <button onClick={() => setSelectedCitoyen(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Avatar + infos principales */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-xl">
                  {selectedCitoyen.prenom[0]}{selectedCitoyen.nom[0]}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{selectedCitoyen.prenom} {selectedCitoyen.nom}</p>
                  <p className="text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-0.5">{selectedCitoyen.matricule}</p>
                </div>
              </div>

              {/* Détails */}
              <div className="space-y-2 text-sm">
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Téléphone" value={selectedCitoyen.telephone} />
                <InfoRow icon={<Calendar className="w-3.5 h-3.5" />} label="Naissance" value={`${new Date(selectedCitoyen.dateNaissance).toLocaleDateString('fr-FR')} – ${selectedCitoyen.lieuNaissance}`} />
                {selectedCitoyen.ville && <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Ville" value={`${selectedCitoyen.ville}, ${selectedCitoyen.region}`} />}
                <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Type" value={`${selectedCitoyen.typePersonne} · ${selectedCitoyen.genre}`} />
              </div>

              {/* Véhicules */}
              {selectedCitoyen.vehicules?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Véhicules ({selectedCitoyen.vehicules.length})</p>
                  <div className="space-y-2">
                    {selectedCitoyen.vehicules.map((v) => (
                      <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <Car className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-mono text-sm font-medium">{v.plaque}</span>
                        </div>
                        <span className="text-xs text-gray-500">{v.typeVehicle.replace('_', ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trajets récents */}
              {selectedCitoyen.trajetsDeclares?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trajets récents</p>
                  <div className="space-y-2">
                    {selectedCitoyen.trajetsDeclares.slice(0, 5).map((t) => (
                      <div key={t.id} className="bg-gray-50 rounded-lg p-2.5 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-gray-600">{t.reference}</span>
                          <span className={`px-1.5 py-0.5 rounded text-xs ${TRIP_STATUS_COLOR[t.statut] || 'bg-gray-100 text-gray-600'}`}>
                            {t.statut.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-700 font-medium">{t.pointDepart} → {t.destination}</p>
                        <p className="text-gray-400 mt-0.5">{new Date(t.dateDepart).toLocaleDateString('fr-FR')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500 text-xs w-20 flex-shrink-0">{label}</span>
      <span className="text-gray-900 text-xs font-medium flex-1 truncate">{value}</span>
    </div>
  );
}
