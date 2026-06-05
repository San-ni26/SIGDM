/**
 * ============================================================================
 * PAGE DASHBOARD CENTRAL
 * ============================================================================
 * Interface principale de supervision pour le SuperAdmin avec onglets
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  MapPin,
  Users,
  Car,
  AlertTriangle,
  LogOut,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Map,
  Settings,
  Shield,
  Bell,
  Menu,
  X,
  Activity,
  Clock,
  CheckCircle,
  Building2,
  Bus,
} from 'lucide-react';

// Import des composants d'onglets
import OverviewTab from './tabs/OverviewTab';
import type { DashboardStats } from './tabs/OverviewTab';
import TrajetsTab from './tabs/TrajetsTab';
import PostesTab from './tabs/PostesTab';
import AgentsTab from './tabs/AgentsTab';
import CitoyensTab from './tabs/CitoyensTab';
import EntreprisesTab from './tabs/EntreprisesTab';
import CompagniesTab from './tabs/CompagniesTab';
import VehiculesTab from './tabs/VehiculesTab';
import AnomaliesTab from './tabs/AnomaliesTab';
import AuditTab from './tabs/AuditTab';
import SettingsTab from './tabs/SettingsTab';

// Types pour les données du dashboard (importées depuis OverviewTab)
// DashboardStats est importé depuis './tabs/OverviewTab'

interface User {
  id: string;
  email: string;
  nom: string;
  prenom: string;
  niveauAcces: string;
}

// Configuration des onglets
const TABS = [
  { id: 'overview', label: 'Vue d\'ensemble', icon: LayoutDashboard },
  { id: 'trajets', label: 'Trajets', icon: Map },
  { id: 'postes', label: 'Postes de contrôle', icon: MapPin },
  { id: 'agents', label: 'Agents', icon: Shield },
  { id: 'citoyens', label: 'Citoyens', icon: Users },
  { id: 'entreprises', label: 'Entreprises', icon: Building2 },
  { id: 'compagnies', label: 'Compagnies', icon: Bus },
  { id: 'vehicules', label: 'Véhicules', icon: Car },
  { id: 'anomalies', label: 'Anomalies', icon: AlertTriangle },
  { id: 'audit', label: 'Journal d\'audit', icon: Clock },
  { id: 'settings', label: 'Paramètres', icon: Settings },
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState('24h');
  const [activeTab, setActiveTab] = useState('overview');

  // Vérifier la session au chargement
  useEffect(() => {
    checkAuth();
    loadDashboardData();
  }, [timeRange]);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/session');
      if (!response.ok) {
        router.replace('/login');
        return;
      }
      const data = await response.json();
      if (data.authenticated) {
        setUser(data.user);
      } else {
        router.replace('/login');
      }
    } catch {
      router.replace('/login');
    }
  };

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard/stats?range=${timeRange}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        throw new Error('Erreur de chargement');
      }
      const data = await response.json();
      setStats(data.data);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [timeRange, router]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.replace('/login');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
    }
  };

  // Rendu du contenu selon l'onglet actif
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return <OverviewTab stats={stats} loading={loading} />;
      case 'trajets':
        return <TrajetsTab />;
      case 'postes':
        return <PostesTab />;
      case 'agents':
        return <AgentsTab />;
      case 'citoyens':
        return <CitoyensTab />;
      case 'entreprises':
        return <EntreprisesTab />;
      case 'compagnies':
        return <CompagniesTab />;
      case 'vehicules':
        return <VehiculesTab />;
      case 'anomalies':
        return <AnomaliesTab />;
      case 'audit':
        return <AuditTab />;
      case 'settings':
        return <SettingsTab />;
      default:
        return <OverviewTab stats={stats} loading={loading} />;
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static`}>
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-800">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-semibold text-white">Transport ML</p>
            <p className="text-xs text-slate-400">Administration</p>
          </div>
        </div>

        <nav className="p-4 space-y-1">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setSidebarOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800'
                }`}
            >
              <tab.icon className="w-5 h-5" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Overlay pour mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between px-6 py-4">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-6 h-6" />
              </button>

              <h1 className="text-xl font-semibold text-gray-900">
                {TABS.find(t => t.id === activeTab)?.label || 'Tableau de bord'}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Sélecteur de période (uniquement pour overview) */}
              {activeTab === 'overview' && (
                <div className="hidden sm:flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                  {['24h', '7d', '30d'].map((range) => (
                    <button
                      key={range}
                      onClick={() => setTimeRange(range)}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${timeRange === range
                          ? 'bg-white text-gray-900 shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                        }`}
                    >
                      {range === '24h' ? '24 heures' : range === '7d' ? '7 jours' : '30 jours'}
                    </button>
                  ))}
                </div>
              )}

              {/* Bouton refresh */}
              <button
                onClick={loadDashboardData}
                disabled={loading}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              </button>

              {/* Notifications */}
              <button className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profil utilisateur */}
              <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.nom} {user?.prenom}
                  </p>
                  <p className="text-xs text-gray-500">
                    {user?.niveauAcces === 'NATIONAL' ? 'Admin National' : 'Admin Régional'}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-semibold">
                    {user?.nom?.[0]}{user?.prenom?.[0]}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Contenu de l'onglet */}
        <div className="p-6">
          {renderTabContent()}
        </div>
      </main>
    </div>
  );
}
