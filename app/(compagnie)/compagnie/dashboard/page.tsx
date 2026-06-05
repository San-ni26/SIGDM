/**
 * ============================================================================
 * DASHBOARD COMPAGNIE
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bus, LogOut, MapPin, Users, Ticket,
  TrendingUp, AlertTriangle, RefreshCw, Loader2,
  Plus, ArrowRight, Clock, CheckCircle, FileText
} from 'lucide-react';

interface Compagnie {
  id: string;
  raisonSociale: string;
  nif: string | null;
  licenceTransport: string | null;
  telephone: string;
  email: string;
  ville: string;
  region: string;
  nomRepresentant: string;
  stats: {
    vehicules: number;
    trajets: number;
  };
}

export default function CompagnieDashboard() {
  const router = useRouter();
  const [compagnie, setCompagnie] = useState<Compagnie | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/compagnie/auth/session');
      if (!res.ok) {
        router.replace('/compagnie/connexion');
        return;
      }
      const data = await res.json();
      if (!data.authenticated) {
        router.replace('/compagnie/connexion');
        return;
      }
      setCompagnie(data.compagnie);
    } catch {
      router.replace('/compagnie/connexion');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleLogout = async () => {
    await fetch('/api/compagnie/auth/session', { method: 'POST' });
    router.replace('/compagnie/connexion');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-teal-400" />
      </div>
    );
  }

  if (!compagnie) return null;

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center">
              <Bus className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">{compagnie.raisonSociale}</p>
              <p className="text-xs text-white/40">Espace Compagnie</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={loadSession} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="bg-gradient-to-r from-teal-600/30 to-emerald-600/20 border border-teal-500/30 rounded-2xl p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{compagnie.raisonSociale}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-white/50">
                <MapPin className="w-4 h-4" />
                <span>{compagnie.ville}, {compagnie.region}</span>
                {compagnie.nif && (
                  <>
                    <span className="text-white/20">|</span>
                    <span>NIF: {compagnie.nif}</span>
                  </>
                )}
                {compagnie.licenceTransport && (
                  <>
                    <span className="text-white/20">|</span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      Licence: {compagnie.licenceTransport}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg border border-green-500/30">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Compte actif</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm">Flotte de Bus</p>
                <p className="text-3xl font-bold text-teal-300">{compagnie.stats?.vehicules || 0}</p>
              </div>
              <div className="w-12 h-12 bg-teal-500/20 rounded-xl flex items-center justify-center border border-teal-500/30">
                <Bus className="w-6 h-6 text-teal-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm">Voyages en cours/déclarés</p>
                <p className="text-3xl font-bold text-emerald-300">{compagnie.stats?.trajets || 0}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center border border-emerald-500/30">
                <MapPin className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Bus, label: 'Flotte', desc: 'Gérer les bus/cars', href: '/compagnie/flotte', color: 'text-teal-400', bg: 'bg-teal-500/20', border: 'border-teal-500/30' },
            { icon: Users, label: 'Chauffeurs', desc: 'Gérer les chauffeurs', href: '/compagnie/chauffeurs', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30' },
            { icon: MapPin, label: 'Voyages', desc: 'Déclarer un départ', href: '/compagnie/trajets', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30' },
            { icon: Ticket, label: 'Passagers', desc: 'Manifeste voyageurs', href: '/compagnie/passagers', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className={`group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all ${action.border}`}
            >
              <div className={`w-12 h-12 ${action.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform shadow-lg`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <p className="font-semibold text-white group-hover:text-teal-300 transition-colors">{action.label}</p>
              <p className="text-sm text-white/50 mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>

        {/* Espace Chauffeur */}
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/30 border border-blue-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0 border border-blue-500/20">
              <Bus className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Interface Chauffeur</h3>
              <p className="text-sm text-white/50 mt-0.5">Vos chauffeurs peuvent gérer leurs voyages, valider le départ/arrivée et suivre les passagers en temps réel.</p>
            </div>
          </div>
          <Link
            href="/compagnie/chauffeur"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-lg shadow-blue-500/20"
          >
            Accès Chauffeur
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Représentant */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-teal-100 flex items-center gap-2">
            <Users className="w-5 h-5 text-teal-400" />
            Représentant légal
          </h3>
          <div className="grid sm:grid-cols-2 gap-4 bg-black/20 p-4 rounded-xl">
            <div>
              <p className="text-sm text-white/50 mb-1">Nom</p>
              <p className="font-medium text-lg">{compagnie.nomRepresentant}</p>
            </div>
            <div>
              <p className="text-sm text-white/50 mb-1">Téléphone</p>
              <p className="font-medium text-lg">{compagnie.telephone}</p>
            </div>
            <div className="sm:col-span-2 mt-2 pt-4 border-t border-white/10">
              <p className="text-sm text-white/50 mb-1">Email de contact</p>
              <p className="font-medium">{compagnie.email}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
