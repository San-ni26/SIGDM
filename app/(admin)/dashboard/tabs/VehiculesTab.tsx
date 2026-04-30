/**
 * ============================================================================
 * ONGLET VÉHICULES – DASHBOARD SUPER ADMIN
 * ============================================================================
 * Gestion de tous les véhicules enregistrés dans le système
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Car,
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  Truck,
  Bus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Route,
  Calendar,
  User,
} from 'lucide-react';

interface Vehicle {
  id: string;
  plaque: string;
  typeVehicle: string;
  marque: string | null;
  modele: string | null;
  couleur: string | null;
  anneeFabrication: number | null;
  nombrePlaces: number | null;
  statut: string;
  createdAt: string;
  proprietaireCitoyen: { matricule: string; nom: string; prenom: string; telephone: string } | null;
  proprietaireEntreprise: { raisonSociale: string } | null;
  proprietaireCompagnie: { raisonSociale: string } | null;
  _count?: { trajets: number };
}

const VEHICLE_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  VOITURE_PARTICULIERE: { label: 'Voiture', icon: Car, color: 'bg-blue-100 text-blue-800' },
  CAMION: { label: 'Camion', icon: Truck, color: 'bg-orange-100 text-orange-800' },
  CITERNE: { label: 'Citerne', icon: Truck, color: 'bg-purple-100 text-purple-800' },
  BUS: { label: 'Bus', icon: Bus, color: 'bg-green-100 text-green-800' },
  CAR: { label: 'Car', icon: Bus, color: 'bg-teal-100 text-teal-800' },
  MINIBUS: { label: 'Minibus', icon: Bus, color: 'bg-cyan-100 text-cyan-800' },
  MOTO: { label: 'Moto', icon: Car, color: 'bg-gray-100 text-gray-800' },
};

const STATUT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ACTIF: { label: 'Actif', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  INACTIF: { label: 'Inactif', color: 'bg-gray-100 text-gray-800', icon: XCircle },
  SUSPENDU: { label: 'Suspendu', color: 'bg-red-100 text-red-800', icon: AlertTriangle },
  VOLE: { label: 'Volé', color: 'bg-red-200 text-red-900', icon: AlertTriangle },
};

const PAGE_SIZE = 15;

export default function VehiculesTab() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(searchTerm && { search: searchTerm }),
        ...(filterType && { type: filterType }),
        ...(filterStatut && { statut: filterStatut }),
      });
      const res = await fetch(`/api/admin/vehicules?${params}`);
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setVehicles(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterType, filterStatut]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleChangeStatut = async (vehicle: Vehicle, newStatut: string) => {
    if (!confirm(`Changer le statut du véhicule ${vehicle.plaque} en ${newStatut} ?`)) return;
    try {
      const res = await fetch(`/api/admin/vehicules?id=${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ statut: newStatut }),
      });
      if (!res.ok) throw new Error('Erreur');
      await loadVehicles();
      if (selectedVehicle?.id === vehicle.id) setSelectedVehicle(null);
    } catch {
      alert('Erreur lors de la mise à jour');
    }
  };

  const getProprietaire = (v: Vehicle): string => {
    if (v.proprietaireCitoyen) return `${v.proprietaireCitoyen.prenom} ${v.proprietaireCitoyen.nom}`;
    if (v.proprietaireEntreprise) return v.proprietaireEntreprise.raisonSociale;
    if (v.proprietaireCompagnie) return v.proprietaireCompagnie.raisonSociale;
    return 'Inconnu';
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex gap-6">
      {/* Liste */}
      <div className="flex-1 space-y-4 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Véhicules</h2>
            <p className="text-sm text-gray-500 mt-0.5">{total} véhicule{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Filtres */}
        <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Plaque, marque, propriétaire..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les types</option>
            {Object.entries(VEHICLE_TYPE_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
          <select
            value={filterStatut}
            onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
            className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous les statuts</option>
            {Object.entries(STATUT_CONFIG).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>

        {/* Tableau */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : vehicles.length === 0 ? (
            <div className="text-center py-16">
              <Car className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500 font-medium">Aucun véhicule trouvé</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Véhicule</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Propriétaire</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden xl:table-cell">Trajets</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vehicles.map((vehicle) => {
                  const typeCfg = VEHICLE_TYPE_CONFIG[vehicle.typeVehicle] || { label: vehicle.typeVehicle, icon: Car, color: 'bg-gray-100 text-gray-800' };
                  const TypeIcon = typeCfg.icon;
                  const statutCfg = STATUT_CONFIG[vehicle.statut] || STATUT_CONFIG.ACTIF;
                  return (
                    <tr
                      key={vehicle.id}
                      className={`hover:bg-gray-50 cursor-pointer transition-colors ${selectedVehicle?.id === vehicle.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setSelectedVehicle(selectedVehicle?.id === vehicle.id ? null : vehicle)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm font-mono">{vehicle.plaque}</p>
                            {vehicle.marque && (
                              <p className="text-xs text-gray-500">{vehicle.marque} {vehicle.modele}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeCfg.color}`}>
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <p className="text-sm text-gray-700">{getProprietaire(vehicle)}</p>
                        {vehicle.proprietaireCitoyen && (
                          <p className="text-xs text-gray-400 font-mono">{vehicle.proprietaireCitoyen.matricule}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden xl:table-cell">
                        <span className="flex items-center gap-1 text-sm text-gray-600">
                          <Route className="w-3.5 h-3.5" />
                          {vehicle._count?.trajets || 0}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statutCfg.color}`}>
                          {statutCfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={vehicle.statut}
                          onChange={(e) => handleChangeStatut(vehicle, e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-1 focus:ring-blue-500"
                        >
                          {Object.entries(STATUT_CONFIG).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
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
      {selectedVehicle && (
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4 sticky top-0 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Détails véhicule</h3>
            <button onClick={() => setSelectedVehicle(null)} className="p-1.5 hover:bg-gray-100 rounded-lg">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 bg-slate-200 rounded-xl flex items-center justify-center">
              {(() => {
                const Ic = (VEHICLE_TYPE_CONFIG[selectedVehicle.typeVehicle] || { icon: Car }).icon;
                return <Ic className="w-6 h-6 text-slate-700" />;
              })()}
            </div>
            <div>
              <p className="font-bold text-gray-900 font-mono text-lg">{selectedVehicle.plaque}</p>
              <p className="text-sm text-gray-500">{(VEHICLE_TYPE_CONFIG[selectedVehicle.typeVehicle] || { label: selectedVehicle.typeVehicle }).label}</p>
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {selectedVehicle.marque && (
              <InfoRow label="Marque" value={`${selectedVehicle.marque} ${selectedVehicle.modele || ''}`} />
            )}
            {selectedVehicle.couleur && <InfoRow label="Couleur" value={selectedVehicle.couleur} />}
            {selectedVehicle.anneeFabrication && <InfoRow label="Année" value={String(selectedVehicle.anneeFabrication)} />}
            {selectedVehicle.nombrePlaces && <InfoRow label="Places" value={`${selectedVehicle.nombrePlaces} places`} />}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Propriétaire</p>
            {selectedVehicle.proprietaireCitoyen && (
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    {selectedVehicle.proprietaireCitoyen.prenom} {selectedVehicle.proprietaireCitoyen.nom}
                  </p>
                  <p className="text-xs text-gray-500 font-mono">{selectedVehicle.proprietaireCitoyen.matricule}</p>
                </div>
              </div>
            )}
            {selectedVehicle.proprietaireEntreprise && (
              <p className="text-sm font-medium text-gray-800">{selectedVehicle.proprietaireEntreprise.raisonSociale}</p>
            )}
            {selectedVehicle.proprietaireCompagnie && (
              <p className="text-sm font-medium text-gray-800">{selectedVehicle.proprietaireCompagnie.raisonSociale}</p>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
            <Route className="w-4 h-4 text-blue-500" />
            <span>{selectedVehicle._count?.trajets || 0} trajet{(selectedVehicle._count?.trajets || 0) > 1 ? 's' : ''} effectué{(selectedVehicle._count?.trajets || 0) > 1 ? 's' : ''}</span>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center gap-2 text-xs text-gray-400">
            <Calendar className="w-3.5 h-3.5" />
            Enregistré le {new Date(selectedVehicle.createdAt).toLocaleDateString('fr-FR')}
          </div>
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-50">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className="text-gray-900 text-xs font-medium">{value}</span>
    </div>
  );
}
