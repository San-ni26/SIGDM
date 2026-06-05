'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Users, Plus, ArrowLeft, Search, Navigation, AlertTriangle,
  Shield, CheckCircle, MapPin, Bus, User, ChevronDown, ChevronUp,
  Filter, UserCheck, Clock
} from 'lucide-react';

interface PassagerInTrip {
  id: string;
  nom: string;
  prenom: string;
  typePersonne: string;
}

interface ActiveTrip {
  id: string;
  reference: string;
  pointDepart: string;
  destination: string;
  dateDepart: string;
  statut: string;
  vehicle: {
    plaque: string;
    typeVehicle: string;
    marque: string | null;
    nombrePlaces: number | null;
  };
  conducteur: { nom: string; prenom: string } | null;
  passagers: PassagerInTrip[];
  _count: { passagers: number; passages: number };
}

export default function PassagersPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<ActiveTrip[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatut, setFilterStatut] = useState<'all' | 'EN_PREPARATION' | 'EN_COURS'>('all');

  // Which trip is expanded
  const [expandedTripId, setExpandedTripId] = useState<string | null>(null);

  // Modal state
  const [addingToTripId, setAddingToTripId] = useState<string | null>(null);
  const [matricule, setMatricule] = useState('');
  const [typePersonne, setTypePersonne] = useState('ADULTE');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const loadTrips = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/compagnie/trajets?limit=50');
      if (res.status === 401) {
        router.replace('/compagnie/connexion');
        return;
      }
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      // Only keep active trips
      const activeTrips = (data.data || []).filter(
        (t: ActiveTrip) => t.statut === 'EN_PREPARATION' || t.statut === 'EN_COURS'
      );
      setTrips(activeTrips);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const handleAddPassager = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingToTripId) return;
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await fetch('/api/compagnie/passagers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({ tripId: addingToTripId, matricule, typePersonne }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'ajout");

      setSuccessMsg(`Passager ajouté avec succès !`);
      setMatricule('');
      setTypePersonne('ADULTE');
      await loadTrips();

      // Auto-close after success
      setTimeout(() => {
        setAddingToTripId(null);
        setSuccessMsg('');
      }, 1500);
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = (tripId: string) => {
    setAddingToTripId(tripId);
    setMatricule('');
    setTypePersonne('ADULTE');
    setErrorMsg('');
    setSuccessMsg('');
  };

  const closeModal = () => {
    setAddingToTripId(null);
    setErrorMsg('');
    setSuccessMsg('');
  };

  // Masker les infos contact (téléphone, email…)
  const maskContact = (value: string) => {
    if (!value) return '••••••••';
    const visible = 2;
    return value.substring(0, visible) + '•'.repeat(Math.max(0, value.length - visible));
  };

  const filteredTrips = trips.filter((t) => {
    const matchSearch =
      t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.pointDepart.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.vehicle.plaque.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatut = filterStatut === 'all' || t.statut === filterStatut;
    return matchSearch && matchStatut;
  });

  const getSeatsLeft = (trip: ActiveTrip) => {
    const capacity = trip.vehicle.nombrePlaces;
    if (!capacity) return null;
    return capacity - trip._count.passagers;
  };

  const getStatusConfig = (statut: string) => {
    if (statut === 'EN_COURS') return { label: 'En cours', classes: 'text-amber-400 bg-amber-500/20 border-amber-500/30' };
    return { label: 'En préparation', classes: 'text-blue-400 bg-blue-500/20 border-blue-500/30' };
  };

  const totalPassagers = trips.reduce((acc, t) => acc + t._count.passagers, 0);

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/compagnie/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Manifestes Passagers</h1>
                <p className="text-xs text-white/40 hidden sm:block">Voyages actifs uniquement</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Voyages actifs</p>
            <p className="text-3xl font-bold mt-1">{trips.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">En préparation</p>
            <p className="text-3xl font-bold mt-1 text-blue-400">
              {trips.filter((t) => t.statut === 'EN_PREPARATION').length}
            </p>
          </div>
          <div className="col-span-2 sm:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-xs font-medium uppercase tracking-wider">Total Passagers</p>
            <p className="text-3xl font-bold mt-1 text-indigo-400">{totalPassagers}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Rechercher un voyage (référence, ville, plaque)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-white placeholder:text-white/40 text-sm"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-white/40" />
            <select
              value={filterStatut}
              onChange={(e) => setFilterStatut(e.target.value as any)}
              className="px-3 py-2.5 bg-slate-800 border border-white/10 rounded-xl text-sm text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="EN_PREPARATION">En préparation</option>
              <option value="EN_COURS">En cours</option>
            </select>
          </div>
        </div>

        {/* Trip list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <Navigation className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucun voyage actif</h3>
            <p className="text-white/50 text-sm">
              {trips.length === 0
                ? 'Aucun voyage en préparation ou en cours. Déclarez un voyage depuis la section Voyages.'
                : 'Aucun voyage ne correspond à vos filtres.'}
            </p>
            {trips.length === 0 && (
              <Link
                href="/compagnie/trajets"
                className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Navigation className="w-4 h-4" />
                Déclarer un voyage
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip) => {
              const seatsLeft = getSeatsLeft(trip);
              const statusConfig = getStatusConfig(trip.statut);
              const isExpanded = expandedTripId === trip.id;
              const isFull = seatsLeft !== null && seatsLeft <= 0;

              return (
                <div
                  key={trip.id}
                  className={`border rounded-2xl overflow-hidden transition-all ${
                    isFull ? 'border-red-500/20 bg-red-500/5' : 'border-white/10 bg-white/5'
                  }`}
                >
                  {/* Trip Header */}
                  <div className="p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${statusConfig.classes}`}>
                          {statusConfig.label}
                        </span>
                        <span className="font-mono text-white/50 text-sm">{trip.reference}</span>
                        <span className="text-white/30 hidden sm:inline">·</span>
                        <div className="flex items-center gap-1.5 text-white/60 text-sm">
                          <Clock className="w-3.5 h-3.5" />
                          {new Date(trip.dateDepart).toLocaleDateString('fr-FR', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                          })}
                        </div>
                      </div>

                      {/* Seats indicator */}
                      {trip.vehicle.nombrePlaces ? (
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-semibold ${
                          isFull
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : seatsLeft! <= 3
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-green-500/15 text-green-400 border border-green-500/20'
                        }`}>
                          <Users className="w-4 h-4" />
                          <span>
                            {isFull ? 'Complet' : `${seatsLeft} place${seatsLeft! > 1 ? 's' : ''} libre${seatsLeft! > 1 ? 's' : ''}`}
                          </span>
                          <span className="text-white/40 text-xs font-normal">/ {trip.vehicle.nombrePlaces}</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm text-white/50 border border-white/10">
                          <Users className="w-4 h-4" />
                          <span>{trip._count.passagers} passager{trip._count.passagers > 1 ? 's' : ''}</span>
                        </div>
                      )}
                    </div>

                    {/* Route */}
                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-blue-400" />
                        </div>
                        <span className="font-semibold truncate">{trip.pointDepart}</span>
                      </div>
                      <div className="w-8 h-0.5 bg-white/20 shrink-0" />
                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 bg-green-500/20 rounded-full flex items-center justify-center shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-green-400" />
                        </div>
                        <span className="font-semibold truncate">{trip.destination}</span>
                      </div>
                    </div>

                    {/* Vehicle & Driver info */}
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-white/60">
                      <div className="flex items-center gap-1.5">
                        <Bus className="w-4 h-4" />
                        <span>{trip.vehicle.plaque}</span>
                        <span className="text-white/30">({trip.vehicle.typeVehicle.replace('_', ' ')})</span>
                      </div>
                      {trip.conducteur && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-4 h-4" />
                          <span>{trip.conducteur.prenom} {trip.conducteur.nom}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex items-center gap-3">
                      {!isFull && (
                        <button
                          onClick={() => openAddModal(trip.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20"
                        >
                          <Plus className="w-4 h-4" />
                          Ajouter un passager
                        </button>
                      )}
                      {isFull && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 text-sm font-medium rounded-xl border border-red-500/20">
                          <AlertTriangle className="w-4 h-4" />
                          Voyage complet
                        </div>
                      )}
                      {trip._count.passagers > 0 && (
                        <button
                          onClick={() => setExpandedTripId(isExpanded ? null : trip.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-sm font-medium rounded-xl transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          {isExpanded ? 'Masquer' : `Voir les ${trip._count.passagers} passager${trip._count.passagers > 1 ? 's' : ''}`}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Seat progress bar */}
                  {trip.vehicle.nombrePlaces && (
                    <div className="px-5 pb-4">
                      <div className="flex justify-between text-xs text-white/40 mb-1.5">
                        <span>Occupation</span>
                        <span>{trip._count.passagers}/{trip.vehicle.nombrePlaces}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isFull ? 'bg-red-500' : seatsLeft! <= 3 ? 'bg-amber-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${Math.min(100, (trip._count.passagers / trip.vehicle.nombrePlaces) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Expanded passenger list */}
                  {isExpanded && trip.passagers.length > 0 && (
                    <div className="border-t border-white/10 bg-black/20">
                      <div className="px-5 py-3 flex items-center justify-between">
                        <p className="text-xs font-semibold text-white/50 uppercase tracking-wider">
                          Liste des passagers ({trip.passagers.length})
                        </p>
                        <div className="flex items-center gap-1.5 text-xs text-white/30">
                          <Shield className="w-3 h-3" />
                          Contacts masqués
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 px-5 pb-5">
                        {trip.passagers.map((p, index) => (
                          <div
                            key={p.id}
                            className="flex items-center gap-3 bg-white/5 rounded-xl p-3 border border-white/5"
                          >
                            <div className="w-8 h-8 bg-indigo-500/20 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-indigo-300">
                              {p.prenom[0]}{p.nom[0]}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm truncate">{p.prenom} {p.nom}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-white/40 font-mono tracking-wider">
                                  {maskContact(`CITOYEN_${index + 1}`)}
                                </span>
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                                  p.typePersonne === 'ADULTE' ? 'bg-white/10 text-white/60' :
                                  p.typePersonne === 'ENFANT' ? 'bg-amber-500/20 text-amber-400' :
                                  'bg-pink-500/20 text-pink-400'
                                }`}>
                                  {p.typePersonne}
                                </span>
                              </div>
                            </div>
                            <div className="shrink-0">
                              <CheckCircle className="w-4 h-4 text-green-500" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Modal Ajout Passager */}
      {addingToTripId && (() => {
        const trip = trips.find((t) => t.id === addingToTripId);
        if (!trip) return null;
        const seatsLeft = getSeatsLeft(trip);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
              {/* Modal Header */}
              <div className="p-5 border-b border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-lg">Ajouter un passager</h3>
                  <button onClick={closeModal} className="p-1.5 hover:bg-white/10 rounded-lg text-white/50 hover:text-white transition-colors">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                </div>
                {/* Trip summary */}
                <div className="bg-black/20 rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Navigation className="w-4 h-4 text-blue-400 shrink-0" />
                    <span className="font-medium">{trip.pointDepart} → {trip.destination}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-white/50">
                    <span className="font-mono">{trip.reference}</span>
                    {seatsLeft !== null && (
                      <span className={seatsLeft <= 3 ? 'text-amber-400 font-semibold' : 'text-green-400'}>
                        {seatsLeft} place{seatsLeft > 1 ? 's' : ''} disponible{seatsLeft > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <form onSubmit={handleAddPassager} className="p-5 space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-400">{errorMsg}</p>
                  </div>
                )}
                {successMsg && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <p className="text-sm text-green-400">{successMsg}</p>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Matricule Citoyen *
                  </label>
                  <div className="relative">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                    <input
                      required
                      type="text"
                      maxLength={5}
                      placeholder="Ex: A3B7K"
                      value={matricule}
                      onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                      className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-white font-mono text-xl tracking-[0.3em] uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-white/30"
                    />
                  </div>
                  <p className="text-xs text-white/40 mt-1.5">
                    Matricule à 5 caractères de l'application citoyen.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">Catégorie</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['ADULTE', 'ENFANT', 'BEBE'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setTypePersonne(type)}
                        className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                          typePersonne === type
                            ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                            : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        {type === 'ADULTE' ? '🧑 Adulte' : type === 'ENFANT' ? '🧒 Enfant' : '👶 Bébé'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || matricule.length < 5}
                    className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <UserCheck className="w-4 h-4" />
                    )}
                    Valider
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
