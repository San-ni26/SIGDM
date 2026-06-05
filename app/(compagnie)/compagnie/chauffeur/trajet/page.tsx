'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bus, LogOut, MapPin, Users, Navigation, CheckCircle, AlertTriangle,
  Plus, Clock, Shield, ArrowRight, PhoneOff, ChevronDown, ChevronUp,
  Loader2, RefreshCw, UserCheck, Flag
} from 'lucide-react';

interface Passager {
  id: string;
  nom: string;
  prenom: string;
  matricule: string;
  typePersonne: string;
  createdAt: string;
  _descente?: boolean; // UI only
}

interface Trip {
  id: string;
  reference: string;
  pointDepart: string;
  destination: string;
  dateDepart: string;
  statut: 'EN_PREPARATION' | 'EN_COURS' | 'TERMINE' | 'ANNULE';
  vehicle: {
    plaque: string;
    typeVehicle: string;
    marque: string | null;
    modele: string | null;
    nombrePlaces: number | null;
  };
  passagers: Passager[];
  _count: { passages: number; passagers: number };
}

interface ChauffeurSession {
  nom: string;
  prenom: string;
  matricule: string;
  compagnieId: string;
}

type GPS = { lat: number; lng: number } | null;

export default function ChauffeurTrajetPage() {
  const router = useRouter();
  const [chauffeur, setChauffeur] = useState<ChauffeurSession | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [gps, setGps] = useState<GPS>(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showPassengersFor, setShowPassengersFor] = useState<string | null>(null);

  // Add passenger modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addMatricule, setAddMatricule] = useState('');
  const [addType, setAddType] = useState('ADULTE');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');

  // Descente modal
  const [showDescenteModal, setShowDescenteModal] = useState(false);
  const [descentePassager, setDescentePassager] = useState<Passager | null>(null);
  const [descenteLieu, setDescenteLieu] = useState('');
  const [descenteLoading, setDescenteLoading] = useState(false);

  // General feedback
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const toastTimer = useRef<NodeJS.Timeout | null>(null);

  const showToast = (msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3500);
  };

  // ─── GPS ──────────────────────────────────────────────────────────────────
  const getGPS = (): Promise<GPS> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      setGpsLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsLoading(false);
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setGps(coords);
          resolve(coords);
        },
        () => { setGpsLoading(false); resolve(null); },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    });

  // ─── Load session + trips ─────────────────────────────────────────────────
  const loadSession = useCallback(async () => {
    const res = await fetch('/api/compagnie/chauffeur/auth');
    if (!res.ok) { router.replace('/compagnie/chauffeur/connexion'); return; }
    const data = await res.json();
    if (!data.authenticated) { router.replace('/compagnie/chauffeur/connexion'); return; }
    setChauffeur(data.chauffeur);
  }, [router]);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/compagnie/chauffeur/trips');
      if (!res.ok) throw new Error();
      const data = await res.json();
      setTrips(data.data || []);
      // Auto-select if only one trip
      if (data.data?.length === 1) setSelectedTrip(data.data[0]);
    } catch {
      showToast('Impossible de charger vos trajets', 'err');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession().then(() => loadTrips());
    // Try to get GPS on mount
    getGPS();
  }, [loadSession, loadTrips]);

  // ─── Trip actions ─────────────────────────────────────────────────────────
  const tripAction = async (action: 'DEPART' | 'ARRIVEE' | 'ANNULER') => {
    if (!selectedTrip) return;

    const confirmMsgs: Record<string, string> = {
      DEPART: 'Confirmer le départ du voyage ?',
      ARRIVEE: 'Confirmer l\'arrivée et terminer le voyage ?',
      ANNULER: 'Annuler définitivement ce voyage ?',
    };
    if (!confirm(confirmMsgs[action])) return;

    setActionLoading(true);
    try {
      const coords = gps || (await getGPS());
      const res = await fetch(`/api/compagnie/chauffeur/trips/${selectedTrip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ action, lat: coords?.lat ?? null, lng: coords?.lng ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message, 'ok');
      await loadTrips();
      setSelectedTrip(null);
    } catch (err: any) {
      showToast(err.message || 'Erreur', 'err');
    } finally {
      setActionLoading(false);
    }
  };

  // ─── Add passenger ────────────────────────────────────────────────────────
  const handleAddPassenger = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTrip) return;
    setAddLoading(true);
    setAddError('');
    try {
      const coords = gps || (await getGPS());
      const res = await fetch(`/api/compagnie/chauffeur/trips/${selectedTrip.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ matricule: addMatricule, typePersonne: addType, lat: coords?.lat ?? null, lng: coords?.lng ?? null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message, 'ok');
      setShowAddModal(false);
      setAddMatricule('');
      await loadTrips();
    } catch (err: any) {
      setAddError(err.message);
    } finally {
      setAddLoading(false);
    }
  };

  // ─── Descente ─────────────────────────────────────────────────────────────
  const openDescenteModal = async (p: Passager) => {
    const coords = gps || (await getGPS());
    setDescentePassager(p);
    setDescenteLieu(coords ? `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}` : '');
    setShowDescenteModal(true);
  };

  const handleDescente = async () => {
    if (!selectedTrip || !descentePassager) return;
    setDescenteLoading(true);
    try {
      const coords = gps || (await getGPS());
      const res = await fetch(`/api/compagnie/chauffeur/trips/${selectedTrip.id}/descente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({
          passagerId: descentePassager.id,
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          lieuDescente: descenteLieu,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      showToast(data.message, 'ok');
      setShowDescenteModal(false);
      await loadTrips();
    } catch (err: any) {
      showToast(err.message, 'err');
    } finally {
      setDescenteLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/compagnie/chauffeur/auth', { method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
    router.replace('/compagnie/chauffeur/connexion');
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const seatsLeft = (t: Trip) =>
    t.vehicle.nombrePlaces ? t.vehicle.nombrePlaces - t._count.passagers : null;

  const statusBadge = (s: Trip['statut']) => {
    const map = {
      EN_PREPARATION: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      EN_COURS: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
      TERMINE: 'bg-green-500/20 text-green-300 border-green-500/30',
      ANNULE: 'bg-red-500/20 text-red-300 border-red-500/30',
    };
    const labels = { EN_PREPARATION: 'En préparation', EN_COURS: '🟡 En cours', TERMINE: 'Terminé', ANNULE: 'Annulé' };
    return { cls: map[s], label: labels[s] };
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900">
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 pb-12">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl text-sm font-medium transition-all ${
          toast.type === 'ok' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.type === 'ok' ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600/30 rounded-xl flex items-center justify-center">
              <Bus className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="font-semibold text-sm">{chauffeur?.prenom} {chauffeur?.nom}</p>
              <p className="text-xs text-white/40 font-mono">{chauffeur?.matricule}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* GPS indicator */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border ${
              gpsLoading ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
              gps ? 'bg-green-500/10 border-green-500/20 text-green-400' :
              'bg-white/5 border-white/10 text-white/40'
            }`}>
              <MapPin className="w-3 h-3" />
              {gpsLoading ? 'GPS...' : gps ? 'GPS OK' : 'Pas de GPS'}
            </div>
            <button onClick={() => loadTrips()} className="p-2 hover:bg-white/10 rounded-lg text-white/50">
              <RefreshCw className="w-4 h-4" />
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg text-white/50">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 mt-6 space-y-4">

        {/* No trips */}
        {trips.length === 0 && (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-3xl">
            <Bus className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-white mb-2">Aucun voyage assigné</h2>
            <p className="text-sm text-white/50">Votre compagnie ne vous a pas encore assigné de voyage actif.</p>
          </div>
        )}

        {/* Trip selector */}
        {trips.length > 1 && !selectedTrip && (
          <div className="space-y-3">
            <h2 className="text-white/60 text-sm font-medium uppercase tracking-wider px-1">Vos voyages assignés</h2>
            {trips.map((t) => {
              const { cls, label } = statusBadge(t.statut);
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedTrip(t)}
                  className="w-full text-left bg-white/5 border border-white/10 hover:bg-white/10 rounded-2xl p-5 transition-all flex items-center justify-between gap-4"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-lg text-xs font-semibold border ${cls}`}>{label}</span>
                      <span className="font-mono text-white/40 text-xs">{t.reference}</span>
                    </div>
                    <p className="font-semibold">{t.pointDepart} <span className="text-white/40">→</span> {t.destination}</p>
                    <p className="text-sm text-white/50 mt-1">{t.vehicle.plaque} · {new Date(t.dateDepart).toLocaleDateString('fr-FR')}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white/30 shrink-0" />
                </button>
              );
            })}
          </div>
        )}

        {/* Active trip panel */}
        {selectedTrip && (() => {
          const trip = trips.find((t) => t.id === selectedTrip.id) || selectedTrip;
          const left = seatsLeft(trip);
          const { cls, label } = statusBadge(trip.statut);
          const canDepart = trip.statut === 'EN_PREPARATION';
          const canArrive = trip.statut === 'EN_COURS';
          const canAddPassenger = trip.statut === 'EN_COURS' || trip.statut === 'EN_PREPARATION';

          return (
            <div className="space-y-4">
              {trips.length > 1 && (
                <button onClick={() => setSelectedTrip(null)} className="text-sm text-white/40 hover:text-white flex items-center gap-1.5">
                  ← Retour à la liste
                </button>
              )}

              {/* Trip header */}
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <span className={`px-3 py-1 rounded-xl text-xs font-bold border ${cls}`}>{label}</span>
                  <span className="font-mono text-white/40 text-xs">{trip.reference}</span>
                </div>

                {/* Route */}
                <div className="space-y-3 my-5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-blue-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">Départ</p>
                      <p className="font-bold text-lg">{trip.pointDepart}</p>
                    </div>
                  </div>
                  <div className="ml-4.5 w-0.5 h-8 bg-white/10 ml-[18px]" />
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-green-500/20 rounded-full flex items-center justify-center">
                      <Flag className="w-4 h-4 text-green-400" />
                    </div>
                    <div>
                      <p className="text-xs text-white/40 uppercase tracking-wider">Destination finale</p>
                      <p className="font-bold text-lg">{trip.destination}</p>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
                  <div>
                    <p className="text-xs text-white/40">Véhicule</p>
                    <p className="font-semibold text-sm mt-0.5">{trip.vehicle.plaque}</p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Heure prévue</p>
                    <p className="font-semibold text-sm mt-0.5">
                      {new Date(trip.dateDepart).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Passagers</p>
                    <p className="font-semibold text-sm mt-0.5">
                      {trip._count.passagers}
                      {trip.vehicle.nombrePlaces ? ` / ${trip.vehicle.nombrePlaces}` : ''}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-white/40">Places libres</p>
                    <p className={`font-semibold text-sm mt-0.5 ${left !== null && left <= 0 ? 'text-red-400' : left !== null && left <= 3 ? 'text-amber-400' : 'text-green-400'}`}>
                      {left !== null ? left : '∞'}
                    </p>
                  </div>
                </div>

                {/* Seat bar */}
                {trip.vehicle.nombrePlaces && (
                  <div className="mt-4">
                    <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          left === 0 ? 'bg-red-500' : left !== null && left <= 3 ? 'bg-amber-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(100, (trip._count.passagers / trip.vehicle.nombrePlaces) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-white/30 mt-1 text-right">
                      {trip._count.passagers}/{trip.vehicle.nombrePlaces} places occupées
                    </p>
                  </div>
                )}
              </div>

              {/* Actions principales */}
              <div className="grid grid-cols-1 gap-3">
                {canDepart && (
                  <button
                    onClick={() => tripAction('DEPART')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-green-500/20 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
                    Valider le Départ
                  </button>
                )}

                {canArrive && (
                  <button
                    onClick={() => tripAction('ARRIVEE')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-3 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-lg rounded-2xl transition-all shadow-xl shadow-blue-500/20 disabled:opacity-50"
                  >
                    {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle className="w-6 h-6" />}
                    Valider l'Arrivée
                  </button>
                )}

                {canAddPassenger && (left === null || left > 0) && (
                  <button
                    onClick={() => { setShowAddModal(true); setAddError(''); setAddMatricule(''); }}
                    className="flex items-center justify-center gap-3 py-4 bg-white/10 hover:bg-white/15 border border-white/10 text-white font-semibold rounded-2xl transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Ajouter un passager
                  </button>
                )}

                {canDepart && (
                  <button
                    onClick={() => tripAction('ANNULER')}
                    disabled={actionLoading}
                    className="flex items-center justify-center gap-2 py-3 text-red-400/80 hover:text-red-400 text-sm rounded-xl transition-colors"
                  >
                    <PhoneOff className="w-4 h-4" />
                    Annuler ce voyage
                  </button>
                )}
              </div>

              {/* Passenger list */}
              {trip.passagers.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setShowPassengersFor(showPassengersFor === trip.id ? null : trip.id)}
                    className="w-full flex items-center justify-between p-5 text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                        <Users className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <p className="font-semibold">Passagers à bord</p>
                        <p className="text-xs text-white/40">{trip.passagers.length} enregistré{trip.passagers.length > 1 ? 's' : ''}</p>
                      </div>
                    </div>
                    {showPassengersFor === trip.id ? <ChevronUp className="w-5 h-5 text-white/40" /> : <ChevronDown className="w-5 h-5 text-white/40" />}
                  </button>

                  {showPassengersFor === trip.id && (
                    <div className="border-t border-white/10 divide-y divide-white/5">
                      {trip.passagers.map((p) => (
                        <div key={p.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-white/5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-white/10 rounded-full flex items-center justify-center text-sm font-bold text-white/70">
                              {p.prenom[0]}{p.nom[0]}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{p.prenom} {p.nom}</p>
                              <p className="text-xs text-white/40 font-mono">{p.matricule} · {p.typePersonne}</p>
                            </div>
                          </div>
                          {canArrive && (
                            <button
                              onClick={() => openDescenteModal(p)}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium rounded-xl border border-amber-500/20 transition-colors"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                              Descente
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}
      </main>

      {/* ── MODAL: Ajouter passager ─────────────────────────────────────── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-blue-400" />
                Ajouter un passager
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <form onSubmit={handleAddPassenger} className="p-5 space-y-4">
              {addError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-sm text-red-400 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  {addError}
                </div>
              )}
              <div>
                <label className="block text-sm text-white/60 mb-2">Matricule Citoyen *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    required
                    type="text"
                    maxLength={5}
                    placeholder="A3B7K"
                    value={addMatricule}
                    onChange={(e) => setAddMatricule(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-3 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white font-mono text-xl tracking-[0.3em] uppercase placeholder:text-white/20 placeholder:tracking-normal placeholder:normal-case focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-white/60 mb-2">Catégorie</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ADULTE', 'ENFANT', 'BEBE'] as const).map((t) => (
                    <button key={t} type="button" onClick={() => setAddType(t)}
                      className={`py-2.5 rounded-xl text-sm font-medium border transition-all ${
                        addType === t ? 'bg-blue-600 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-white/60'
                      }`}
                    >
                      {t === 'ADULTE' ? '🧑 Adulte' : t === 'ENFANT' ? '🧒 Enfant' : '👶 Bébé'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-white/70 text-sm font-medium transition-colors">
                  Annuler
                </button>
                <button type="submit" disabled={addLoading || addMatricule.length < 5}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {addLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: Déclarer descente ────────────────────────────────────── */}
      {showDescenteModal && descentePassager && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                Descente avant destination
              </h3>
              <button onClick={() => setShowDescenteModal(false)} className="text-white/40 hover:text-white">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {/* Passenger info */}
              <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center font-bold">
                  {descentePassager.prenom[0]}{descentePassager.nom[0]}
                </div>
                <div>
                  <p className="font-semibold">{descentePassager.prenom} {descentePassager.nom}</p>
                  <p className="text-xs text-amber-400 font-mono">{descentePassager.matricule}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Lieu de descente (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Carrefour Médine, km 12..."
                  value={descenteLieu}
                  onChange={(e) => setDescenteLieu(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/25 focus:ring-2 focus:ring-amber-500"
                />
                {gps && (
                  <p className="text-xs text-white/30 mt-1.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    GPS: {gps.lat.toFixed(5)}, {gps.lng.toFixed(5)}
                  </p>
                )}
              </div>

              <p className="text-xs text-white/40 bg-white/5 rounded-xl p-3 border border-white/10">
                ⚠️ La position GPS et l'heure exacte seront enregistrées pour les contrôles de sécurité.
              </p>

              <div className="flex gap-3">
                <button onClick={() => setShowDescenteModal(false)}
                  className="flex-1 py-3 bg-white/5 rounded-2xl text-white/60 text-sm font-medium transition-colors hover:bg-white/10">
                  Annuler
                </button>
                <button onClick={handleDescente} disabled={descenteLoading}
                  className="flex-1 py-3 bg-amber-600 hover:bg-amber-700 rounded-2xl text-white font-semibold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {descenteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  Confirmer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
