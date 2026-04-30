/**
 * ============================================================================
 * DASHBOARD ENTREPRISE
 * ============================================================================
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Building2, LogOut, Car, MapPin, Users, Package,
  TrendingUp, AlertTriangle, RefreshCw, Loader2,
  Plus, ArrowRight, Clock, CheckCircle,
} from 'lucide-react';

interface Entreprise {
  id: string;
  raisonSociale: string;
  nif: string | null;
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

export default function EntrepriseDashboard() {
  const router = useRouter();
  const [entreprise, setEntreprise] = useState<Entreprise | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/entreprise/auth/session');
      if (!res.ok) {
        router.replace('/entreprise/connexion');
        return;
      }
      const data = await res.json();
      if (!data.authenticated) {
        router.replace('/entreprise/connexion');
        return;
      }
      setEntreprise(data.entreprise);
    } catch {
      router.replace('/entreprise/connexion');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleLogout = async () => {
    await fetch('/api/entreprise/auth/session', { method: 'POST' });
    router.replace('/entreprise/connexion');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  if (!entreprise) return null;

  return (
    <div className="min-h-screen text-white">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm">{entreprise.raisonSociale}</p>
              <p className="text-xs text-white/40">Espace Entreprise</p>
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
        <div className="bg-gradient-to-r from-purple-600/30 to-blue-600/20 border border-purple-500/30 rounded-2xl p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">{entreprise.raisonSociale}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-white/50">
                <MapPin className="w-4 h-4" />
                <span>{entreprise.ville}, {entreprise.region}</span>
                {entreprise.nif && (
                  <>
                    <span className="text-white/20">|</span>
                    <span>NIF: {entreprise.nif}</span>
                  </>
                )}
              </div>            </div>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm font-medium">Compte actif</span>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm">Véhicules</p>
                <p className="text-3xl font-bold">{entreprise.stats.vehicules}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <Car className="w-6 h-6 text-blue-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm">Trajets déclarés</p>
                <p className="text-3xl font-bold">{entreprise.stats.trajets}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Actions rapides */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { icon: Car, label: 'Flotte', desc: 'Gérer les véhicules', href: '/entreprise/flotte', color: 'text-blue-400', bg: 'bg-blue-500/10' },
            { icon: Users, label: 'Chauffeurs', desc: 'Gérer les chauffeurs', href: '/entreprise/chauffeurs', color: 'text-amber-400', bg: 'bg-amber-500/10' },
            { icon: MapPin, label: 'Trajets', desc: 'Déclarer un trajet', href: '/entreprise/trajets', color: 'text-green-400', bg: 'bg-green-500/10' },
            { icon: Package, label: 'Marchandises', desc: 'Suivi des marchandises', href: '/entreprise/marchandises', color: 'text-purple-400', bg: 'bg-purple-500/10' },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all"
            >
              <div className={`w-12 h-12 ${action.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <p className="font-semibold">{action.label}</p>
              <p className="text-sm text-white/50 mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>

        {/* Représentant */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h3 className="font-semibold mb-4">Représentant légal</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-white/50">Nom</p>
              <p className="font-medium">{entreprise.nomRepresentant}</p>
            </div>
            <div>
              <p className="text-sm text-white/50">Téléphone</p>
              <p className="font-medium">{entreprise.telephone}</p>
            </div>
            <div>
              <p className="text-sm text-white/50">Email</p>
              <p className="font-medium">{entreprise.email}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
