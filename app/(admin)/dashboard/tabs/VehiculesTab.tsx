/**
 * ============================================================================
 * ONGLET VÉHICULES – DASHBOARD SUPER ADMIN
 * ============================================================================
 * Gestion des véhicules et affichage détaillé des trajets avec timeline et vitesse.
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Car, Search, X, ChevronLeft, ChevronRight, Truck, Bus, AlertTriangle,
  CheckCircle, XCircle, Route, Calendar, User, Clock, MapPin as MapPinIcon,
  Activity, ArrowRight
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Import dynamique de la carte pour éviter les erreurs SSR
const TripMap = dynamic(() => import('./components/TripMap'), { ssr: false });

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

interface TripDetails {
  id: string;
  reference: string;
  pointDepart: string;
  destination: string;
  dateDepart: string;
  statut: string;
  declarant: string;
  conducteur: string | null;
  passages: PassageDetail[];
  stats: {
    nbPostes: number;
    vitesseMax: number;
    distanceTotaleKm: number;
    dureeTotaleMinutes: number | null;
    alerteExcesVitesse: boolean;
  };
}

interface PassageDetail {
  id: string;
  poste: { id: string; nom: string; type: string; ville: string; latitude: number; longitude: number; };
  agent: { nom: string; prenom: string; matriculeAgent: string; grade?: string | null; typeAgent?: string; } | null;
  timestampPassage: string;
  statut: string;
  segmentSuivant: { dureeMinutes: number; distanceKm: number; vitesseKmh: number; excesVitesse: boolean; } | null;
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
  
  // Nouveaux states pour les trajets
  const [trips, setTrips] = useState<TripDetails[]>([]);
  const [loadingTrips, setLoadingTrips] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TripDetails | null>(null);

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

  // Charger les trajets quand un véhicule est sélectionné
  useEffect(() => {
    if (!selectedVehicle) {
      setTrips([]);
      setSelectedTrip(null);
      return;
    }
    const loadTrips = async () => {
      try {
        setLoadingTrips(true);
        const res = await fetch(`/api/admin/vehicules/${selectedVehicle.id}/trajets`);
        if (!res.ok) throw new Error('Erreur');
        const data = await res.json();
        setTrips(data.data || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingTrips(false);
      }
    };
    loadTrips();
  }, [selectedVehicle]);

  const handleChangeStatut = async (vehicle: Vehicle, newStatut: string) => {
    if (!confirm(`Changer le statut du véhicule ${vehicle.plaque} en ${newStatut} ?`)) return;
    try {
      const res = await fetch(`/api/admin/vehicules?id=${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
      {/* Liste principale (se réduit si on affiche le détail d'un trajet) */}
      <div className={`flex-1 space-y-4 min-w-0 transition-all ${selectedTrip ? 'hidden lg:block lg:w-1/3' : ''}`}>
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
            <option value="">Tous statuts</option>
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
                  {!selectedTrip && <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Type</th>}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wider hidden lg:table-cell">Statut</th>
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
                      onClick={() => {
                        setSelectedVehicle(selectedVehicle?.id === vehicle.id ? null : vehicle);
                        setSelectedTrip(null);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                            <TypeIcon className="w-5 h-5 text-slate-600" />
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm font-mono">{vehicle.plaque}</p>
                            <p className="text-xs text-gray-500 truncate max-w-[150px]">{getProprietaire(vehicle)}</p>
                          </div>
                        </div>
                      </td>
                      {!selectedTrip && (
                        <td className="px-4 py-3 hidden md:table-cell">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium ${typeCfg.color}`}>
                            {typeCfg.label}
                          </span>
                        </td>
                      )}
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${statutCfg.color}`}>
                          {statutCfg.label}
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

      {/* Panneau détail Véhicule / Liste des trajets */}
      {selectedVehicle && !selectedTrip && (
        <div className="w-80 flex-shrink-0 space-y-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 space-y-4">
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
              {selectedVehicle.marque && <InfoRow label="Marque" value={`${selectedVehicle.marque} ${selectedVehicle.modele || ''}`} />}
              {selectedVehicle.couleur && <InfoRow label="Couleur" value={selectedVehicle.couleur} />}
              <InfoRow label="Propriétaire" value={getProprietaire(selectedVehicle)} />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col max-h-[calc(100vh-350px)]">
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-2">
                <Route className="w-4 h-4" /> Historique des trajets
              </h3>
            </div>
            <div className="overflow-y-auto p-2">
              {loadingTrips ? (
                <p className="text-center text-sm text-gray-500 py-4">Chargement...</p>
              ) : trips.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-4">Aucun trajet enregistré</p>
              ) : (
                <div className="space-y-2">
                  {trips.map(trip => (
                    <div 
                      key={trip.id}
                      onClick={() => setSelectedTrip(trip)}
                      className="p-3 border border-gray-100 rounded-lg hover:bg-blue-50 cursor-pointer transition-colors group"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-mono font-medium text-gray-500">{trip.reference}</span>
                        {trip.stats.alerteExcesVitesse && (
                          <span className="flex items-center gap-1 text-xs text-red-600 font-medium bg-red-50 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            Excès vitesse
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
                        <span>{trip.pointDepart}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                        <span>{trip.destination}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {new Date(trip.dateDepart).toLocaleDateString('fr-FR')}</span>
                        <span className="flex items-center gap-1"><MapPinIcon className="w-3.5 h-3.5" /> {trip.stats.nbPostes} postes</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Détail du trajet (Timeline + Carte) */}
      {selectedTrip && (
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-120px)]">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50 shrink-0">
            <div className="flex items-center gap-4">
              <button onClick={() => setSelectedTrip(null)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  {selectedTrip.pointDepart} <ArrowRight className="w-4 h-4 text-gray-400" /> {selectedTrip.destination}
                </h2>
                <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                  <span className="font-mono">{selectedTrip.reference}</span>
                  <span>•</span>
                  <span>{new Date(selectedTrip.dateDepart).toLocaleString('fr-FR')}</span>
                </div>
              </div>
            </div>
            {selectedTrip.stats.alerteExcesVitesse && (
              <div className="bg-red-100 text-red-800 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Infraction détectée
              </div>
            )}
          </div>

          <div className="flex flex-1 overflow-hidden">
            {/* Colonne Timeline */}
            <div className="w-1/2 overflow-y-auto p-6 border-r border-gray-200">
              <h3 className="font-medium text-gray-900 mb-6 flex items-center gap-2">
                <Route className="w-5 h-5 text-blue-600" />
                Timeline des passages
              </h3>

              <div className="relative pl-6 space-y-6">
                {/* Ligne verticale de la timeline */}
                <div className="absolute left-[11px] top-4 bottom-4 w-0.5 bg-gray-200" />

                {selectedTrip.passages.map((passage, idx) => {
                  const seg = passage.segmentSuivant;
                  return (
                    <div key={passage.id} className="relative">
                      {/* Point de passage */}
                      <div className="absolute -left-6 w-6 h-6 bg-blue-100 rounded-full border-4 border-white flex items-center justify-center shadow-sm">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      </div>
                      
                      <div className="bg-white border border-gray-100 shadow-sm rounded-xl p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-gray-900">{passage.poste.nom}</p>
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPinIcon className="w-3 h-3" /> {passage.poste.ville} ({passage.poste.type})
                            </p>
                          </div>
                          <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                            {new Date(passage.timestampPassage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>

                        {passage.agent && (
                          <div className="mt-3 text-xs text-gray-600 flex items-center gap-2 bg-gray-50 p-2 rounded">
                            <User className="w-3.5 h-3.5 text-gray-400" />
                            Validé par {passage.agent.grade} {passage.agent.prenom} {passage.agent.nom} ({passage.agent.matriculeAgent})
                          </div>
                        )}
                      </div>

                      {/* Segment suivant (Vitesse/Distance) */}
                      {seg && (
                        <div className="ml-4 my-4 pl-4 border-l-2 border-dashed border-gray-200 py-2">
                          <div className={`p-3 rounded-lg border ${seg.excesVitesse ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5" />
                                  {seg.dureeMinutes} min
                                </div>
                                <div className="text-xs text-slate-500 flex items-center gap-1.5">
                                  <Route className="w-3.5 h-3.5" />
                                  {seg.distanceKm} km
                                </div>
                              </div>
                              <div className={`font-semibold flex items-center gap-1.5 text-sm ${seg.excesVitesse ? 'text-red-700' : 'text-slate-700'}`}>
                                <Activity className="w-4 h-4" />
                                {seg.vitesseKmh} km/h
                              </div>
                            </div>
                            {seg.excesVitesse && (
                              <p className="text-xs text-red-600 font-medium mt-1.5 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" /> Excès de vitesse suspecté
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Colonne Carte & Stats */}
            <div className="w-1/2 flex flex-col bg-gray-50">
              <div className="p-4 grid grid-cols-2 gap-4 shrink-0">
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Vitesse Max</p>
                  <p className={`text-xl font-bold ${selectedTrip.stats.alerteExcesVitesse ? 'text-red-600' : 'text-gray-900'}`}>
                    {selectedTrip.stats.vitesseMax} km/h
                  </p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1">Distance Totale</p>
                  <p className="text-xl font-bold text-gray-900">{selectedTrip.stats.distanceTotaleKm} km</p>
                </div>
              </div>
              
              <div className="flex-1 bg-gray-200 relative overflow-hidden">
                <TripMap passages={selectedTrip.passages} />
              </div>
            </div>
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
