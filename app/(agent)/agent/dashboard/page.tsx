/**
 * ============================================================================
 * AGENT DASHBOARD
 * ============================================================================
 * Interface principale pour les agents terrain (police, douane, péage)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, LogOut, MapPin, CheckCircle, AlertTriangle,
  Search, QrCode, History, RefreshCw, Wifi, WifiOff,
  ChevronRight, User, Building2, TrendingUp, Clock,
  Navigation, ScanLine, FileWarning, BarChart3, Loader2,
} from 'lucide-react';
import { useNetworkStatus } from '@/lib/offline/network-status';
import { useSyncStatus } from '@/lib/offline/sync-manager';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  matriculeAgent: string;
  nom: string;
  prenom: string;
  telephone: string;
  email: string | null;
  typeAgent: string;
  grade: string | null;
  photoUrl: string | null;
  status: string;
  poste: {
    id: string;
    nom: string;
    ville: string;
    region: string;
    type: string;
    statut: string;
    latitude: number;
    longitude: number;
  } | null;
  stats: {
    passages: number;
    anomalies: number;
    verifications: number;
  };
}

interface TodayStats {
  passagesToday: number;
  anomaliesToday: number;
  lastValidationAt: string | null;
}

// ─── Composant principal ───────────────────────────────────────────────────

export default function AgentDashboard() {
  const router = useRouter();
  const networkStatus = useNetworkStatus();
  const { pendingCount, isSyncing, sync } = useSyncStatus();
  
  const [agent, setAgent] = useState<Agent | null>(null);
  const [todayStats, setTodayStats] = useState<TodayStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Charger la session agent
  const loadSession = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/auth/session');
      if (!res.ok) {
        router.replace('/agent/connexion');
        return;
      }
      const data = await res.json();
      if (!data.authenticated) {
        router.replace('/agent/connexion');
        return;
      }
      setAgent(data.agent);
    } catch {
      router.replace('/agent/connexion');
    }
  }, [router]);

  // Charger les stats du jour
  const loadTodayStats = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/stats/today');
      if (res.ok) {
        const data = await res.json();
        setTodayStats(data);
      }
    } catch {
      // Ignorer les erreurs
    }
  }, []);

  useEffect(() => {
    loadSession().then(() => {
      setLoading(false);
      loadTodayStats();
    });
  }, [loadSession, loadTodayStats]);

  const handleLogout = async () => {
    await fetch('/api/agent/auth/session', { method: 'POST' });
    router.replace('/agent/connexion');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/agent/validation?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleSync = async () => {
    if (!isSyncing) {
      await sync();
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  if (!agent) return null;

  const initials = `${agent.prenom[0]}${agent.nom[0]}`;
  const agentTypeLabel = {
    AGENT_CONTROLE: 'Police / Gendarmerie',
    AGENT_DOUANE: 'Douane',
    AGENT_PEAGE: 'Péage',
  }[agent.typeAgent] || 'Agent';

  return (
    <div className="min-h-screen text-white">
      {/* ── Topbar ── */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-amber-600 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white leading-none">SIGDM</p>
              <p className="text-xs text-white/40">{agentTypeLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Indicateur réseau */}
            <button
              onClick={handleSync}
              disabled={isSyncing || pendingCount === 0}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                networkStatus.isOnline
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-red-500/20 text-red-400'
              } ${pendingCount > 0 ? 'hover:bg-opacity-30' : ''}`}
            >
              {networkStatus.isOnline ? (
                <>{isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}</>
              ) : (
                <WifiOff className="w-4 h-4" />
              )}
              <span className="hidden sm:inline">
                {networkStatus.isOnline ? (isSyncing ? 'Sync...' : 'En ligne') : 'Hors ligne'}
              </span>
              {pendingCount > 0 && (
                <span className="bg-white/20 px-1.5 py-0.5 rounded-full text-xs">{pendingCount}</span>
              )}
            </button>

            <button onClick={loadSession} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <RefreshCw className="w-4 h-4 text-white/60" />
            </button>

            <div className="w-8 h-8 bg-amber-600 rounded-full flex items-center justify-center text-sm font-bold">
              {initials}
            </div>

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
        {/* ── Section: Poste assigné ── */}
        {agent.poste ? (
          <div className="bg-gradient-to-r from-amber-600/20 to-orange-600/20 border border-amber-500/30 rounded-2xl p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-600/30 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-white/60 text-sm">Poste de contrôle assigné</p>
                  <h1 className="text-xl font-bold text-white">{agent.poste.nom}</h1>
                  <div className="flex items-center gap-2 mt-1 text-sm text-white/50">
                    <MapPin className="w-4 h-4" />
                    <span>{agent.poste.ville}, {agent.poste.region}</span>
                    <span className="px-2 py-0.5 bg-white/10 rounded text-xs">
                      {agent.poste.type}
                    </span>
                  </div>                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                  agent.poste.statut === 'ACTIF'
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-red-500/20 text-red-400'
                }`}>
                  {agent.poste.statut === 'ACTIF' ? 'Poste actif' : 'Poste inactif'}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-400" />
              <div>
                <p className="font-semibold text-red-300">Aucun poste assigné</p>
                <p className="text-red-200/60 text-sm">Contactez votre administrateur pour être assigné à un poste de contrôle.</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Section: Recherche rapide ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-400" />
            Validation d'un véhicule
          </h2>

          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Plaque d'immatriculation ou référence trajet..."
                className="w-full pl-12 pr-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all text-lg"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            </div>
            <button
              type="submit"
              disabled={!searchQuery.trim()}
              className="px-6 py-4 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all flex items-center gap-2"
            >
              <ScanLine className="w-5 h-5" />
              <span className="hidden sm:inline">Rechercher</span>
            </button>
          </form>

          <div className="flex flex-wrap gap-2 mt-4">
            <Link
              href="/agent/validation"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors"
            >
              <QrCode className="w-4 h-4" />
              Scanner QR
            </Link>
            <Link
              href="/agent/recherche"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white/70 hover:text-white transition-colors"
            >
              <Search className="w-4 h-4" />
              Recherche avancée
            </Link>
          </div>
        </div>

        {/* ── Section: Actions rapides ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              icon: CheckCircle,
              label: 'Validation',
              desc: 'Valider un passage',
              href: '/agent/validation',
              color: 'text-green-400',
              bg: 'bg-green-500/10',
            },
            {
              icon: FileWarning,
              label: 'Anomalie',
              desc: 'Signaler un problème',
              href: '/agent/anomalie/nouvelle',
              color: 'text-red-400',
              bg: 'bg-red-500/10',
            },
            {
              icon: History,
              label: 'Historique',
              desc: 'Mes validations',
              href: '/agent/historique',
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
            {
              icon: BarChart3,
              label: 'Statistiques',
              desc: 'Mon activité',
              href: '/agent/statistiques',
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
          ].map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 hover:border-white/20 transition-all"
            >
              <div className={`w-12 h-12 ${action.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className={`w-6 h-6 ${action.color}`} />
              </div>
              <p className="font-semibold text-white">{action.label}</p>
              <p className="text-sm text-white/50 mt-0.5">{action.desc}</p>
            </Link>
          ))}
        </div>

        {/* ── Section: Stats du jour ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm">Validations aujourd'hui</p>
                <p className="text-3xl font-bold text-white mt-1">{todayStats?.passagesToday || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm">Anomalies signalées</p>
                <p className="text-3xl font-bold text-white mt-1">{todayStats?.anomaliesToday || 0}</p>
              </div>
              <div className="w-12 h-12 bg-red-500/10 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white/50 text-sm">Dernière validation</p>
                <p className="text-lg font-semibold text-white mt-1">
                  {todayStats?.lastValidationAt
                    ? new Date(todayStats.lastValidationAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                    : 'Aucune'}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-amber-400" />
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Profil Agent ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-amber-600 rounded-2xl flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <p className="text-lg font-semibold text-white">{agent.prenom} {agent.nom}</p>
                  <p className="text-white/50 text-sm">{agentTypeLabel} • Matricule: {agent.matriculeAgent}</p>
                </div>
                <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium self-start">
                  Actif
                </span>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/10">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{agent.stats.passages}</p>
                  <p className="text-sm text-white/50">Passages validés</p>
                </div>
                <div className="text-center border-l border-white/10">
                  <p className="text-2xl font-bold text-white">{agent.stats.anomalies}</p>
                  <p className="text-sm text-white/50">Anomalies signalées</p>
                </div>
                <div className="text-center border-l border-white/10">
                  <p className="text-2xl font-bold text-white">{agent.stats.verifications}</p>
                  <p className="text-sm text-white/50">Vérifications</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
