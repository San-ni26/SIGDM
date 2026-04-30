'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, LogOut, Car, MapPin, Clock, AlertTriangle,
  BadgeCheck, ChevronRight, Users, RefreshCw, User,
  Phone, Calendar, CheckCircle, XCircle, Loader2,
  Plus, Edit, Trash2,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Citoyen {
  id: string; matricule: string; nom: string; prenom: string;
  telephone: string; email: string | null; genre: string;
  typePersonne: string; ville: string | null; region: string | null;
  photoUrl: string | null; status: string;
  vehicules: { id: string; plaque: string; typeVehicle: string; marque: string | null; modele: string | null; statut: string }[];
  stats: { vehicules: number; trajets: number; passagerTrips: number };
}

interface Trip {
  id: string; reference: string; pointDepart: string; destination: string;
  statut: string; dateDepart: string;
  vehicle: { plaque: string; typeVehicle: string };
  _count: { passages: number; passagers: number; anomalies: number };
}

// ─── Config ──────────────────────────────────────────────────────────────────
const STATUT_TRIP: Record<string, { label: string; cls: string }> = {
  EN_PREPARATION: { label: 'En préparation', cls: 'bg-amber-100 text-amber-700' },
  EN_COURS:       { label: 'En cours',       cls: 'bg-blue-100 text-blue-700' },
  TERMINE:        { label: 'Terminé',        cls: 'bg-green-100 text-green-700' },
  ANNULE:         { label: 'Annulé',         cls: 'bg-red-100 text-red-700' },
  BLOQUE:         { label: 'Bloqué',         cls: 'bg-orange-100 text-orange-700' },
};

const VEHICLE_LABELS: Record<string, string> = {
  VOITURE_PARTICULIERE: 'Voiture', CAMION: 'Camion', BUS: 'Bus',
  CAR: 'Car', MINIBUS: 'Minibus', MOTO: 'Moto', CITERNE: 'Citerne',
};

// ─── Composant principal ─────────────────────────────────────────────────────
export default function CitoyenDashboard() {
  const router = useRouter();
  const [citoyen, setCitoyen] = useState<Citoyen | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [tripsLoading, setTripsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'vehicules' | 'trajets'>('overview');

  // Charger session
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/citoyen/auth/session');
      if (!res.ok) { router.replace('/citoyen/connexion'); return; }
      const data = await res.json();
      if (!data.authenticated) { router.replace('/citoyen/connexion'); return; }
      setCitoyen(data.citoyen);
    } catch { router.replace('/citoyen/connexion'); }
    finally { setLoading(false); }
  }, [router]);

  // Charger trajets
  const loadTrips = useCallback(async () => {
    setTripsLoading(true);
    try {
      const res = await fetch('/api/citoyen/me/trajets?limit=8');
      if (!res.ok) return;
      const data = await res.json();
      setTrips(data.data || []);
    } catch {} finally { setTripsLoading(false); }
  }, []);

  useEffect(() => { loadSession(); }, [loadSession]);
  useEffect(() => { if (citoyen) loadTrips(); }, [citoyen, loadTrips]);

  const handleLogout = async () => {
    await fetch('/api/citoyen/auth/session', { method: 'POST' });
    router.replace('/citoyen/connexion');
  };

  // ── Loading ──
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
    </div>
  );

  if (!citoyen) return null;

  const initials = `${citoyen.prenom[0]}${citoyen.nom[0]}`;

  return (
    <div className="min-h-screen text-white">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white leading-none">SIGDM</p>
              <p className="text-xs text-white/40">Espace Citoyen</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={loadSession} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-sm font-bold">{initials}</div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" /> Déconnexion
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* ── Hero ── */}
        <div className="bg-gradient-to-r from-blue-600/30 to-indigo-600/20 border border-blue-500/30 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg shadow-blue-600/30">
            {initials}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">{citoyen.prenom} {citoyen.nom}</h1>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              <span className="flex items-center gap-1.5 bg-blue-500/20 border border-blue-500/40 rounded-lg px-3 py-1 text-sm font-mono font-semibold text-blue-300">
                <BadgeCheck className="w-4 h-4" /> {citoyen.matricule}
              </span>
              {citoyen.telephone && (
                <span className="flex items-center gap-1 text-white/50 text-sm">
                  <Phone className="w-3.5 h-3.5" /> {citoyen.telephone}
                </span>
              )}
              {citoyen.ville && (
                <span className="flex items-center gap-1 text-white/50 text-sm">
                  <MapPin className="w-3.5 h-3.5" /> {citoyen.ville}{citoyen.region ? `, ${citoyen.region}` : ''}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-500/40 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-green-300 text-sm font-medium">Compte actif</span>
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { icon: Car, label: 'Véhicules', value: citoyen.stats.vehicules, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { icon: MapPin, label: 'Trajets déclarés', value: citoyen.stats.trajets, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            { icon: Users, label: 'Trajets passager', value: citoyen.stats.passagerTrips, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map(({ icon: Icon, label, value, color, bg }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-xl p-5 hover:bg-white/8 transition-colors">
              <div className={`w-10 h-10 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-white">{value}</p>
              <p className="text-sm text-white/50 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div className="flex gap-1 bg-white/5 p-1 rounded-xl">
          {(['overview', 'vehicules', 'trajets'] as const).map((tab) => {
            const labels = { overview: 'Vue d\'ensemble', vehicules: 'Mes véhicules', trajets: 'Mes trajets' };
            return (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow' : 'text-white/50 hover:text-white'}`}>
                {labels[tab]}
              </button>
            );
          })}
        </div>

        {/* ── Tab: Overview ── */}
        {activeTab === 'overview' && (
          <div className="grid sm:grid-cols-2 gap-6">
            {/* Infos profil */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-blue-400" />
                <h2 className="font-semibold text-white">Mon profil</h2>
              </div>
              {[
                { label: 'Matricule', value: citoyen.matricule, mono: true },
                { label: 'Nom complet', value: `${citoyen.prenom} ${citoyen.nom}` },
                { label: 'Téléphone', value: citoyen.telephone },
                { label: 'Email', value: citoyen.email || '—' },
                { label: 'Type', value: citoyen.typePersonne === 'ADULTE' ? 'Adulte' : 'Enfant' },
                { label: 'Genre', value: citoyen.genre === 'MASCULIN' ? 'Homme' : citoyen.genre === 'FEMININ' ? 'Femme' : 'Autre' },
                { label: 'Ville', value: citoyen.ville || '—' },
                { label: 'Région', value: citoyen.region || '—' },
              ].map(({ label, value, mono }) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
                  <span className="text-white/50 text-sm">{label}</span>
                  <span className={`text-sm font-medium text-white ${mono ? 'font-mono tracking-widest bg-white/10 px-2 py-0.5 rounded' : ''}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Véhicules récents */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-400" />
                  <h2 className="font-semibold text-white">Mes véhicules</h2>
                </div>
                <button onClick={() => setActiveTab('vehicules')} className="text-blue-400 text-xs hover:underline">Voir tout</button>
              </div>
              {citoyen.vehicules.length === 0 ? (
                <div className="text-center py-10">
                  <Car className="w-10 h-10 mx-auto text-white/20 mb-2" />
                  <p className="text-white/40 text-sm">Aucun véhicule enregistré</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {citoyen.vehicules.slice(0, 4).map((v) => (
                    <div key={v.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                      <div className="w-9 h-9 bg-blue-600/20 rounded-lg flex items-center justify-center">
                        <Car className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-mono font-semibold text-white text-sm">{v.plaque}</p>
                        <p className="text-white/40 text-xs">{VEHICLE_LABELS[v.typeVehicle] || v.typeVehicle}{v.marque ? ` · ${v.marque}` : ''}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${v.statut === 'ACTIF' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        {v.statut}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Tab: Véhicules ── */}
        {activeTab === 'vehicules' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-white text-lg">Mes véhicules ({citoyen.stats.vehicules})</h2>
              </div>
              <Link 
                href="/citoyen/vehicules/nouveau"
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Ajouter
              </Link>
            </div>
            {citoyen.vehicules.length === 0 ? (
              <div className="text-center py-16">
                <Car className="w-12 h-12 mx-auto text-white/20 mb-3" />
                <p className="text-white/50 font-medium">Aucun véhicule enregistré</p>
                <p className="text-white/30 text-sm mt-1 mb-4">Ajoutez votre premier véhicule</p>
                <Link 
                  href="/citoyen/vehicules/nouveau"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Ajouter un véhicule
                </Link>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {citoyen.vehicules.map((v) => (
                  <div key={v.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-white/20 transition-colors">
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-10 h-10 bg-blue-600/20 rounded-xl flex items-center justify-center">
                        <Car className="w-5 h-5 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${v.statut === 'ACTIF' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {v.statut}
                        </span>
                      </div>
                    </div>
                    <p className="font-mono font-bold text-white text-lg">{v.plaque}</p>
                    <p className="text-white/50 text-sm mt-1">{VEHICLE_LABELS[v.typeVehicle] || v.typeVehicle}</p>
                    {(v.marque || v.modele) && (
                      <p className="text-white/30 text-xs mt-0.5">{[v.marque, v.modele].filter(Boolean).join(' ')}</p>
                    )}
                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-4 pt-3 border-t border-white/10">
                      <button 
                        onClick={() => router.push(`/citoyen/vehicules/${v.id}/modifier`)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/10 hover:bg-white/15 text-white/80 text-xs rounded-lg transition-colors"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Modifier
                      </button>
                      <button 
                        onClick={() => {/* TODO: implémenter suppression */}}
                        className="flex items-center justify-center p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                        title="Supprimer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Tab: Trajets ── */}
        {activeTab === 'trajets' && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-400" />
                <h2 className="font-semibold text-white text-lg">Mes trajets ({citoyen.stats.trajets})</h2>
              </div>
              <div className="flex items-center gap-2">
                <Link 
                  href="/citoyen/trajets/nouveau"
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Déclarer un trajet
                </Link>
                <button onClick={loadTrips} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                  <RefreshCw className={`w-4 h-4 text-white/50 ${tripsLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
            {tripsLoading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-blue-400" />
              </div>
            ) : trips.length === 0 ? (
              <div className="text-center py-16">
                <MapPin className="w-12 h-12 mx-auto text-white/20 mb-3" />
                <p className="text-white/50 font-medium">Aucun trajet déclaré</p>
                <p className="text-white/30 text-sm mt-1 mb-4">Déclarez votre premier trajet</p>
                <Link 
                  href="/citoyen/trajets/nouveau"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Déclarer un trajet
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => {
                  const st = STATUT_TRIP[trip.statut] || { label: trip.statut, cls: 'bg-gray-100 text-gray-600' };
                  return (
                    <div key={trip.id} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/8 transition-colors">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs text-blue-300 bg-blue-500/20 px-2 py-0.5 rounded">{trip.reference}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.cls}`}>{st.label}</span>
                          </div>
                          <p className="text-white font-medium text-sm">
                            {trip.pointDepart} <span className="text-white/40">→</span> {trip.destination}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-white/40 text-xs">
                            <span className="flex items-center gap-1">
                              <Car className="w-3 h-3" /> {trip.vehicle.plaque}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              {new Date(trip.dateDepart).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {trip._count.passages} poste{trip._count.passages > 1 ? 's' : ''}
                            </span>
                            {trip._count.anomalies > 0 && (
                              <span className="flex items-center gap-1 text-amber-400">
                                <AlertTriangle className="w-3 h-3" /> {trip._count.anomalies} anomalie{trip._count.anomalies > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Info banner ── */}
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-amber-300 font-semibold text-sm">Rappel important</p>
            <p className="text-amber-200/70 text-sm mt-0.5">
              Votre matricule <span className="font-mono font-bold text-white">{citoyen.matricule}</span> doit être présenté à chaque poste de contrôle.
              Conservez-le précieusement et signalez tout problème aux autorités compétentes.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
