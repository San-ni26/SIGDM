'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Bus,
  Search,
  X,
  Phone,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Car,
  Route,
  CheckCircle,
  XCircle,
  AlertTriangle,
  FileText,
  BadgeCheck,
  Shield,
  Users
} from 'lucide-react';

interface Compagnie {
  id: string;
  raisonSociale: string;
  nif: string | null;
  registreCommerce: string | null;
  licenceTransport: string | null;
  telephone: string;
  email: string;
  adresse: string;
  ville: string;
  region: string;
  nomRepresentant: string;
  telephoneRep: string;
  validePar: string | null;
  dateValidation: string | null;
  createdAt: string;
  user: { status: string; email: string | null };
  _count?: { vehicules: number; trajets: number; chauffeurs: number };
}

interface CompagnieDetail extends Compagnie {
  vehicules: Array<{ id: string; plaque: string; typeVehicle: string; statut: string }>;
  trajets: Array<{
    id: string;
    reference: string;
    pointDepart: string;
    destination: string;
    statut: string;
    dateDepart: string;
    vehicle: { plaque: string };
  }>;
  chauffeurs: Array<{
    id: string;
    statut: string;
    citoyen: {
      nom: string;
      prenom: string;
      telephone: string;
      matricule: string;
    };
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

export default function CompagniesTab() {
  const [compagnies, setCompagnies] = useState<Compagnie[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedCompagnie, setSelectedCompagnie] = useState<CompagnieDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const loadCompagnies = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(searchTerm && { search: searchTerm }),
        ...(filterStatut && { statut: filterStatut }),
      });
      const res = await fetch(`/api/admin/compagnies?${params}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setCompagnies(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterStatut]);

  useEffect(() => {
    loadCompagnies();
  }, [loadCompagnies]);

  const openDetail = async (compagnie: Compagnie) => {
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/admin/compagnies/${compagnie.id}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setSelectedCompagnie(data.data);
    } catch {
      alert('Impossible de charger les détails');
    } finally {
      setDetailLoading(false);
    }
  };

  const handleToggleStatus = async (compagnie: Compagnie) => {
    const newStatus = compagnie.user.status === 'ACTIF' ? 'SUSPENDU' : 'ACTIF';
    const label = newStatus === 'ACTIF' ? 'Réactiver' : 'Suspendre';
    if (!confirm(`${label} le compte de ${compagnie.raisonSociale} ?`)) return;
    try {
      const res = await fetch(`/api/admin/compagnies/${compagnie.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur API');
      
      await loadCompagnies();
      if (selectedCompagnie?.id === compagnie.id) {
        setSelectedCompagnie({
          ...selectedCompagnie,
          user: { ...selectedCompagnie.user, status: newStatus }
        });
      }
    } catch (err: any) {
      alert(`Erreur lors du changement de statut: ${err.message}`);
    }
  };

  const handleValidate = async (compagnieId: string, action: 'VALIDER' | 'INVALIDER') => {
    const label = action === 'VALIDER' ? 'Valider' : 'Invalider';
    if (!confirm(`${label} ce dossier d'compagnie ?`)) return;
    try {
      const res = await fetch(`/api/admin/compagnies/${compagnieId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ action }),
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur API');
      
      await loadCompagnies();
      if (selectedCompagnie?.id === compagnieId) {
        // Recharge le détail
        openDetail(selectedCompagnie);
      }
    } catch (err: any) {
      alert(`Erreur lors de la validation: ${err.message}`);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex gap-6 h-full">
      {/* Liste */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Compagnies</h2>
            <p className="text-sm text-gray-500 mt-0.5">{total} compagnie{total > 1 ? 's' : ''} enregistrée{total > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Raison sociale, NIF, téléphone..."
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
            <option value="VALIDE">Dossier Validé</option>
            <option value="NON_VALIDE">Non Validé</option>
            <option value="ACTIF">Compte Actif</option>
            <option value="EN_ATTENTE">En attente</option>
            <option value="SUSPENDU">Suspendu</option>
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : compagnies.length === 0 ? (
            <div className="text-center py-16">
              <Bus className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Aucune compagnie trouvée</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Compagnie</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">NIF / Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Activité</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Validation</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {compagnies.map((ent) => {
                  const statusCfg = STATUS_CONFIG[ent.user.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.EN_ATTENTE;
                  return (
                    <tr
                      key={ent.id}
                      className={`hover:bg-gray-50 transition-colors cursor-pointer ${selectedCompagnie?.id === ent.id ? 'bg-blue-50' : ''}`}
                      onClick={() => openDetail(ent)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-800 flex items-center justify-center text-white flex-shrink-0 shadow-sm">
                            <Bus className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]" title={ent.raisonSociale}>{ent.raisonSociale}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[200px]">{ent.ville}, {ent.region}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        {ent.nif && (
                          <span className="inline-block font-mono text-xs text-gray-700 bg-gray-100 px-2 py-0.5 rounded mb-1">
                            NIF: {ent.nif}
                          </span>
                        )}
                        <p className="text-xs text-gray-600 flex items-center gap-1"><Phone className="w-3 h-3"/>{ent.telephone}</p>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1" title="Véhicules"><Car className="w-3 h-3" />{ent._count?.vehicules || 0}</span>
                          <span className="flex items-center gap-1" title="Trajets"><Route className="w-3 h-3" />{ent._count?.trajets || 0}</span>
                          <span className="flex items-center gap-1" title="Chauffeurs"><Users className="w-3 h-3" />{ent._count?.chauffeurs || 0}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {ent.validePar ? (
                          <div className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium w-fit">
                            <BadgeCheck className="w-3.5 h-3.5" /> Validé
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-full text-xs font-medium w-fit">
                            <AlertTriangle className="w-3.5 h-3.5" /> En attente
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusCfg.color}`}>
                          {statusCfg.label}
                        </span>
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
      {selectedCompagnie && (
        <div className="w-80 xl:w-96 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto max-h-[calc(100vh-200px)] sticky top-0">
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 text-sm">Fiche Compagnie</h3>
            <button onClick={() => setSelectedCompagnie(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          {detailLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="p-4 space-y-5">
              {/* Entête compagnie */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-700 to-indigo-900 flex items-center justify-center text-white shadow-md">
                  <Bus className="w-7 h-7" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 leading-tight">{selectedCompagnie.raisonSociale}</p>
                  {selectedCompagnie.nif && <p className="text-xs font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded mt-1 w-fit">NIF: {selectedCompagnie.nif}</p>}
                </div>
              </div>

              {/* Actions de validation */}
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Validation dossier
                </p>
                {selectedCompagnie.validePar ? (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-green-700 text-sm font-medium">
                      <BadgeCheck className="w-5 h-5 text-green-500" /> Validé
                    </div>
                    <button onClick={() => handleValidate(selectedCompagnie.id, 'INVALIDER')} className="text-xs text-red-600 hover:text-red-700 font-medium px-2 py-1 rounded bg-red-50 hover:bg-red-100 transition-colors">
                      Révoquer
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-700 text-sm font-medium">
                      <AlertTriangle className="w-5 h-5 text-amber-500" /> En attente
                    </div>
                    <button onClick={() => handleValidate(selectedCompagnie.id, 'VALIDER')} className="text-xs text-white font-medium px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-700 transition-colors shadow-sm">
                      Valider le dossier
                    </button>
                  </div>
                )}
              </div>

              {/* Compte utilisateur statut */}
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Statut du compte</p>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_CONFIG[selectedCompagnie.user.status as keyof typeof STATUS_CONFIG]?.color || 'bg-gray-100'}`}>
                    {STATUS_CONFIG[selectedCompagnie.user.status as keyof typeof STATUS_CONFIG]?.label || selectedCompagnie.user.status}
                  </span>
                </div>
                <button
                  onClick={() => handleToggleStatus(selectedCompagnie)}
                  className="text-xs font-medium px-3 py-1.5 rounded border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {selectedCompagnie.user.status === 'ACTIF' ? 'Suspendre le compte' : 'Activer le compte'}
                </button>
              </div>

              {/* Détails contact */}
              <div className="space-y-2 text-sm">
                <InfoRow icon={<Phone className="w-3.5 h-3.5" />} label="Téléphone" value={selectedCompagnie.telephone} />
                <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Adresse" value={`${selectedCompagnie.adresse}, ${selectedCompagnie.ville}`} />
                <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Reg. Commerce" value={selectedCompagnie.registreCommerce || 'Non renseigné'} />
                <InfoRow icon={<BadgeCheck className="w-3.5 h-3.5" />} label="Licence Trans." value={selectedCompagnie.licenceTransport || 'Non renseignée'} />
                
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Représentant Légal</p>
                  <p className="text-sm font-medium text-gray-900">{selectedCompagnie.nomRepresentant}</p>
                  <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-0.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> {selectedCompagnie.telephoneRep}</p>
                </div>
              </div>

              {/* Véhicules */}
              {selectedCompagnie.vehicules?.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                    <span>Véhicules ({selectedCompagnie.vehicules.length})</span>
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedCompagnie.vehicules.map((v) => (
                      <div key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
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

              {/* Chauffeurs */}
              {selectedCompagnie.chauffeurs?.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    Chauffeurs associés ({selectedCompagnie.chauffeurs.length})
                  </p>
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {selectedCompagnie.chauffeurs.map((c) => (
                      <div key={c.id} className="bg-gray-50 rounded-lg p-2.5 text-sm border border-gray-100">
                        <p className="font-medium text-gray-900">{c.citoyen.prenom} {c.citoyen.nom}</p>
                        <div className="flex items-center justify-between mt-1">
                          <p className="text-xs font-mono text-gray-500">{c.citoyen.matricule}</p>
                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-medium ${c.statut === 'ACTIF' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                            {c.statut}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trajets récents */}
              {selectedCompagnie.trajets?.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Trajets récents</p>
                  <div className="space-y-2">
                    {selectedCompagnie.trajets.slice(0, 5).map((t) => (
                      <div key={t.id} className="bg-gray-50 rounded-lg p-2.5 text-xs border border-gray-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="font-mono font-medium text-gray-700">{t.reference}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${TRIP_STATUS_COLOR[t.statut] || 'bg-gray-100 text-gray-600'}`}>
                            {t.statut.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-gray-800 font-medium">{t.pointDepart} → {t.destination}</p>
                        <div className="flex items-center justify-between mt-1.5 text-gray-500">
                          <span className="flex items-center gap-1"><Car className="w-3 h-3"/> {t.vehicle.plaque}</span>
                          <span>{new Date(t.dateDepart).toLocaleDateString('fr-FR')}</span>
                        </div>
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
      <span className="text-gray-500 text-xs w-24 flex-shrink-0">{label}</span>
      <span className="text-gray-900 text-xs font-medium flex-1 truncate" title={value}>{value}</span>
    </div>
  );
}
