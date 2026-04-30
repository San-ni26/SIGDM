/**
 * ============================================================================
 * PAGE VALIDATION – AGENT
 * ============================================================================
 * Interface de validation des passages aux postes de contrôle
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, ArrowLeft, Search, Car, Users, MapPin, CheckCircle,
  AlertTriangle, Clock, User, Phone, RefreshCw, Loader2,
  Navigation, QrCode, XCircle, Camera, FileText,
} from 'lucide-react';
import { useNetworkStatus } from '@/lib/offline/network-status';
import { addPassageToQueue } from '@/lib/offline/db';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Trip {
  id: string;
  reference: string;
  pointDepart: string;
  destination: string;
  dateDepart: string;
  statut: string;
  vehicle: {
    id: string;
    plaque: string;
    typeVehicle: string;
    marque: string | null;
    modele: string | null;
    nombrePlaces: number | null;
  };
  driver: {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    telephone: string;
  } | null;
  passagers: Array<{
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    telephone: string;
    typePersonne: string;
  }>;
  passages: Array<{
    id: string;
    posteId: string;
    timestampPassage: string;
    statut: string;
  }>;
  _count: {
    passages: number;
    anomalies: number;
  };
}

interface Agent {
  id: string;
  nom: string;
  prenom: string;
  poste: {
    id: string;
    nom: string;
    latitude: number;
    longitude: number;
  } | null;
}

// ─── Composant de recherche ────────────────────────────────────────────────

function ValidationContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const networkStatus = useNetworkStatus();
  const initialSearch = searchParams.get('search') || '';

  const [agent, setAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [isSearching, setIsSearching] = useState(false);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ success: boolean; message: string } | null>(null);
  const [passengersPresent, setPassengersPresent] = useState<Record<string, boolean>>({});
  const [observations, setObservations] = useState('');

  // Charger l'agent
  useEffect(() => {
    fetch('/api/agent/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setAgent({
            id: data.agent.id,
            nom: data.agent.nom,
            prenom: data.agent.prenom,
            poste: data.agent.poste,
          });
        }
      });
  }, []);

  // Obtenir la position GPS
  useEffect(() => {
    setIsClient(true);
    
    if (typeof window !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
          });
        },
        (error) => {
          console.error('Erreur GPS:', error.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  // Recherche de trajets
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    setSelectedTrip(null);
    setValidationResult(null);

    try {
      const res = await fetch(`/api/agent/trajets/recherche?query=${encodeURIComponent(searchQuery.trim())}`);
      if (res.ok) {
        const data = await res.json();
        setTrips(data.data || []);
      }
    } catch (error) {
      console.error('Erreur recherche:', error);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Recherche automatique si query dans l'URL
  useEffect(() => {
    if (initialSearch) {
      handleSearch();
    }
  }, [initialSearch, handleSearch]);

  // Sélectionner un trajet
  const selectTrip = (trip: Trip) => {
    setSelectedTrip(trip);
    // Initialiser tous les passagers comme présents par défaut
    const initialPresent: Record<string, boolean> = {};
    trip.passagers.forEach(p => {
      initialPresent[p.id] = true;
    });
    setPassengersPresent(initialPresent);
  };

  // Valider le passage
  const validatePassage = async () => {
    if (!selectedTrip || !agent?.poste) return;

    setIsValidating(true);
    setValidationResult(null);

    try {
      const passageData = {
        tripId: selectedTrip.id,
        posteId: agent.poste.id,
        agentId: agent.id,
        timestampPassage: new Date(),
        agentLatitude: gpsLocation?.lat || 0,
        agentLongitude: gpsLocation?.lng || 0,
        gpsPrecision: gpsLocation?.accuracy,
        statut: 'VALIDE' as const,
        observations: observations || undefined,
      };

      // En mode offline, stocker dans IndexedDB
      if (!networkStatus.isOnline) {
        await addPassageToQueue(passageData);
        setValidationResult({
          success: true,
          message: 'Passage enregistré en mode hors-ligne. Synchronisation automatique lors de la reconnexion.',
        });
      } else {
        // Mode online: envoyer directement à l'API
        const res = await fetch('/api/agent/passage/valider', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(passageData),
        });

        if (res.ok) {
          setValidationResult({
            success: true,
            message: 'Passage validé avec succès!',
          });
        } else {
          const error = await res.text();
          throw new Error(error);
        }
      }
    } catch (error: any) {
      setValidationResult({
        success: false,
        message: error.message || 'Erreur lors de la validation',
      });
    } finally {
      setIsValidating(false);
    }
  };

  // Calculer la distance entre l'agent et le poste
  const distanceFromPost = () => {
    if (!gpsLocation || !agent?.poste) return null;
    
    const R = 6371e3; // Rayon de la Terre en mètres
    const φ1 = gpsLocation.lat * Math.PI / 180;
    const φ2 = agent.poste.latitude * Math.PI / 180;
    const Δφ = (agent.poste.latitude - gpsLocation.lat) * Math.PI / 180;
    const Δλ = (agent.poste.longitude - gpsLocation.lng) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance en mètres
  };

  const distance = distanceFromPost();
  const isTooFar = distance !== null && distance > 500; // Plus de 500m

  return (
    <div className="min-h-screen text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/agent/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Validation des passages</p>
              {agent?.poste && (
                <p className="text-xs text-white/40">{agent.poste.nom}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isClient && gpsLocation && (
              <span className={`px-3 py-1 rounded-lg text-xs ${
                isTooFar ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'
              }`}>
                GPS {isTooFar ? `(${Math.round(distance!)}m)` : 'OK'}
              </span>
            )}
            {isClient && !networkStatus.isOnline && (
              <span className="px-3 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-400">
                Hors ligne
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* ── Colonne: Recherche ── */}
          <div className="space-y-6">
            {/* Recherche */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Search className="w-5 h-5 text-amber-400" />
                Rechercher un trajet
              </h2>

              <div className="flex gap-3">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Plaque ou référence..."
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-amber-500 outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <button
                  onClick={handleSearch}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-4 py-3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-white/40 text-sm mt-3">
                Exemples: <span className="text-white/60">BZ-1234-AB</span> ou <span className="text-white/60">TRJ-ABC123</span>
              </p>
            </div>

            {/* Résultats */}
            {trips.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-sm font-medium text-white/60 mb-4">Résultats ({trips.length})</h3>
                <div className="space-y-3">
                  {trips.map((trip) => (
                    <button
                      key={trip.id}
                      onClick={() => selectTrip(trip)}
                      className={`w-full text-left p-4 rounded-xl border transition-all ${
                        selectedTrip?.id === trip.id
                          ? 'bg-amber-600/20 border-amber-500/50'
                          : 'bg-white/5 border-white/10 hover:bg-white/8'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                            <Car className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="font-mono font-semibold text-white">{trip.vehicle.plaque}</p>
                            <p className="text-xs text-white/50">{trip.vehicle.typeVehicle}</p>
                          </div>
                        </div>
                        <span className="text-xs px-2 py-1 bg-white/10 rounded">
                          {trip.reference}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-3 text-sm text-white/50">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {trip.pointDepart} → {trip.destination}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {trip.passagers.length + (trip.driver ? 1 : 0)} pers.
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {trips.length === 0 && searchQuery && !isSearching && (
              <div className="text-center py-12 bg-white/5 border border-white/10 rounded-2xl">
                <Search className="w-12 h-12 mx-auto text-white/20 mb-3" />
                <p className="text-white/50">Aucun trajet trouvé</p>
              </div>
            )}
          </div>

          {/* ── Colonne: Validation ── */}
          <div>
            {selectedTrip ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Détails du trajet</h2>
                  <span className={`px-3 py-1 rounded-lg text-xs ${
                    selectedTrip.statut === 'EN_COURS' ? 'bg-green-500/20 text-green-400' :
                    selectedTrip.statut === 'EN_PREPARATION' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {selectedTrip.statut}
                  </span>
                </div>

                {/* Véhicule */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Car className="w-5 h-5 text-amber-400" />
                    <span className="font-medium text-white">Véhicule</span>
                  </div>
                  <p className="font-mono text-xl text-white">{selectedTrip.vehicle.plaque}</p>
                  <p className="text-white/50 text-sm">{selectedTrip.vehicle.typeVehicle}</p>
                  {(selectedTrip.vehicle.marque || selectedTrip.vehicle.modele) && (
                    <p className="text-white/40 text-xs mt-1">
                      {selectedTrip.vehicle.marque} {selectedTrip.vehicle.modele}
                    </p>
                  )}
                </div>

                {/* Conducteur */}
                {selectedTrip.driver && (
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-center gap-3 mb-3">
                      <User className="w-5 h-5 text-blue-400" />
                      <span className="font-medium text-white">Conducteur</span>
                    </div>
                    <p className="text-white">{selectedTrip.driver.prenom} {selectedTrip.driver.nom}</p>
                    <p className="text-white/50 text-sm">Matricule: {selectedTrip.driver.matricule}</p>
                  </div>
                )}

                {/* Passagers */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-5 h-5 text-purple-400" />
                    <span className="font-medium text-white">Passagers ({selectedTrip.passagers.length})</span>
                  </div>
                  <div className="space-y-2">
                    {selectedTrip.passagers.map((passager) => (
                      <label
                        key={passager.id}
                        className="flex items-center gap-3 p-3 bg-white/5 rounded-lg cursor-pointer hover:bg-white/8"
                      >
                        <input
                          type="checkbox"
                          checked={passengersPresent[passager.id] ?? true}
                          onChange={(e) => setPassengersPresent(prev => ({
                            ...prev,
                            [passager.id]: e.target.checked,
                          }))}
                          className="w-5 h-5 rounded border-white/20 bg-white/10 text-amber-600 focus:ring-amber-500"
                        />
                        <div className="flex-1">
                          <p className="text-sm text-white">{passager.prenom} {passager.nom}</p>
                          <p className="text-xs text-white/50">{passager.matricule} • {passager.typePersonne}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Itinéraire */}
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <MapPin className="w-5 h-5 text-green-400" />
                    <span className="font-medium text-white">Itinéraire</span>
                  </div>
                  <div className="flex items-center gap-2 text-white">
                    <span>{selectedTrip.pointDepart}</span>
                    <span className="text-white/40">→</span>
                    <span>{selectedTrip.destination}</span>
                  </div>
                  <p className="text-white/50 text-sm mt-2">
                    Départ: {new Date(selectedTrip.dateDepart).toLocaleString('fr-FR')}
                  </p>
                </div>

                {/* Observations */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">Observations (optionnel)</label>
                  <textarea
                    value={observations}
                    onChange={(e) => setObservations(e.target.value)}
                    placeholder="Notes sur le passage..."
                    rows={3}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
                  />
                </div>

                {/* Alertes */}
                {isTooFar && (
                  <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-red-300">Distance excessive</p>
                        <p className="text-sm text-red-200/70">
                          Vous êtes à {Math.round(distance!)}m du poste. Approchez-vous du poste pour valider.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {validationResult && (
                  <div className={`p-4 rounded-xl ${
                    validationResult.success
                      ? 'bg-green-500/10 border border-green-500/30'
                      : 'bg-red-500/10 border border-red-500/30'
                  }`}>
                    <div className="flex items-start gap-3">
                      {validationResult.success ? (
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                      )}
                      <p className={validationResult.success ? 'text-green-300' : 'text-red-300'}>
                        {validationResult.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                  <Link
                    href={`/agent/anomalie/nouvelle?tripId=${selectedTrip.id}`}
                    className="flex-1 py-3 bg-red-600/20 hover:bg-red-600/30 text-red-400 font-medium rounded-xl transition-colors text-center"
                  >
                    Signaler anomalie
                  </Link>
                  <button
                    onClick={validatePassage}
                    disabled={isValidating || isTooFar || !agent?.poste}
                    className="flex-1 py-3 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    {isValidating ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <><CheckCircle className="w-5 h-5" /> Valider</>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <Car className="w-16 h-16 mx-auto text-white/20 mb-4" />
                <p className="text-white/50 text-lg">Sélectionnez un trajet pour valider le passage</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Export avec Suspense ──────────────────────────────────────────────────

export default function ValidationPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    }>
      <ValidationContent />
    </Suspense>
  );
}
