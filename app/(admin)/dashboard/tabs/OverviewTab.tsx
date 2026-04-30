/**
 * ============================================================================
 * ONGLET VUE D'ENSEMBLE - VERSION AVEC CARTE INTERACTIVE
 * ============================================================================
 * Affiche les statistiques et la carte interactive du dashboard admin
 */

import dynamic from 'next/dynamic';
import {
  Activity,
  CheckCircle,
  AlertTriangle,
  Car,
  TrendingUp,
  TrendingDown,
  Map,
  Users,
  Shield,
} from 'lucide-react';

// Import dynamique de la carte (pour éviter les erreurs SSR avec Leaflet)
const InteractiveMap = dynamic(() => import('@/components/map/InteractiveMap'), {
  ssr: false,
  loading: () => (
    <div className="h-64 sm:h-96 bg-gray-100 rounded-lg flex items-center justify-center">
      <div className="text-center">
        <Map className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600">Chargement de la carte...</p>
      </div>
    </div>
  ),
});

export interface DashboardStats {
  range: string;
  stats: {
    totalCitoyens: number;
    totalVehicules: number;
    totalEntreprises: number;
    totalTrips: number;
    totalPassages: number;
    totalAnomalies: number;
    activeTrips: number;
  };
  today: {
    tripsToday: number;
    passagesToday: number;
    anomaliesToday: number;
    newCitoyens: number;
    newVehicules: number;
  };
  activePostes: Array<{
    id: string;
    nom: string;
    type: 'CONTROLE' | 'PEAGE' | 'DOUANE' | 'FRONTIERE';
    ville: string;
    region: string;
    latitude: number;
    longitude: number;
    passages24h: number;
    statut: 'ACTIF' | 'INACTIF' | 'EN_TRAVAUX';
  }>;
  recentAnomalies: Array<{
    id: string;
    type: string;
    severite: string;
    statut: string;
    createdAt: string;
    poste: { nom: string; ville: string };
    agentSignale: { nom: string; prenom: string };
  }>;
  recentTrips: Array<{
    id: string;
    reference: string;
    pointDepart: string;
    destination: string;
    statut: string;
    createdAt: string;
    vehicle: { plaque: string; typeVehicle: string };
  }>;
  topAgents: Array<{
    nom: string;
    prenom: string;
    typeAgent: string;
    passagesCount: number;
  } | null>;
  vehiculesByType: Array<{ type: string; count: number }>;
}

interface OverviewTabProps {
  stats: DashboardStats | null;
  loading: boolean;
}

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp,
  color 
}: { 
  title: string; 
  value: number; 
  icon: any; 
  trend?: string;
  trendUp?: boolean;
  color: string;
}) => (
  <div className="bg-white rounded-xl p-4 sm:p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-xs sm:text-sm text-gray-500 mb-1 truncate">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-gray-900">{value.toLocaleString()}</p>
        {trend && (
          <div className={`flex items-center gap-1 mt-1 sm:mt-2 text-xs sm:text-sm ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
            {trendUp ? <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" /> : <TrendingDown className="w-3 h-3 sm:w-4 sm:h-4" />}
            <span>{trend}</span>
          </div>
        )}
      </div>
      
      <div className={`p-2 sm:p-3 rounded-lg ${color} flex-shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
      </div>
    </div>
  </div>
);

export default function OverviewTab({ stats, loading }: OverviewTabProps) {
  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
        <StatCard
          title="Trajets aujourd'hui"
          value={stats.today.tripsToday}
          icon={Activity}
          trend="+12%"
          trendUp={true}
          color="bg-blue-500"
        />
        
        <StatCard
          title="Passages 24h"
          value={stats.today.passagesToday}
          icon={CheckCircle}
          trend="+8%"
          trendUp={true}
          color="bg-green-500"
        />
        
        <StatCard
          title="Anomalies"
          value={stats.today.anomaliesToday}
          icon={AlertTriangle}
          trend="-5%"
          trendUp={false}
          color="bg-orange-500"
        />
        
        <StatCard
          title="Trajets actifs"
          value={stats.stats.activeTrips}
          icon={Car}
          color="bg-purple-500"
        />
      </div>

      {/* Section carte et anomalies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Carte des postes */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Carte des postes de contrôle
            </h2>
            <span className="text-xs sm:text-sm text-gray-500">{stats.activePostes.length} postes</span>
          </div>
          
          <InteractiveMap 
            postes={stats.activePostes} 
            height="400px"
            showFilters={true}
          />
        </div>

        {/* Anomalies récentes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Anomalies récentes
            </h2>
          </div>
          
          <div className="space-y-3">
            {stats.recentAnomalies.slice(0, 5).map((anomaly) => (
              <div 
                key={anomaly.id}
                className="p-3 sm:p-4 bg-red-50 border border-red-100 rounded-lg"
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-red-900 truncate">
                      {anomaly.type.replace(/_/g, ' ')}
                    </p>
                    <p className="text-xs text-red-700 mt-0.5">
                      {anomaly.poste?.ville} • {anomaly.agentSignale?.nom} {anomaly.agentSignale?.prenom?.[0]}.
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {new Date(anomaly.createdAt).toLocaleString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                        day: '2-digit',
                        month: 'short',
                      })}
                    </p>
                  </div>
                  
                  <span className={`px-2 py-0.5 text-xs rounded-full flex-shrink-0 ${
                    anomaly.severite === 'CRITIQUE' 
                      ? 'bg-red-600 text-white'
                      : anomaly.severite === 'GRAVE'
                      ? 'bg-orange-500 text-white'
                      : 'bg-yellow-400 text-gray-900'
                  }`}>
                    {anomaly.severite}
                  </span>
                </div>
              </div>
            ))}
            
            {stats.recentAnomalies.length === 0 && (
              <div className="text-center py-6 sm:py-8 text-gray-500">
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-green-500" />
                <p className="text-sm">Aucune anomalie récente</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Trajets récents et Top agents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Trajets récents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Trajets récents
            </h2>
          </div>
          
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <div className="min-w-full px-4 sm:px-0">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Réf.</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Véhicule</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Destination</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.recentTrips.slice(0, 5).map((trip) => (
                    <tr key={trip.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">
                        #{trip.reference.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600 hidden sm:table-cell">
                        {trip.vehicle?.plaque}
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-600 truncate max-w-[100px] sm:max-w-none">
                        {trip.destination}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          trip.statut === 'EN_COURS'
                            ? 'bg-green-100 text-green-800'
                            : trip.statut === 'EN_PREPARATION'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {trip.statut.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top agents */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900">
              Top agents
            </h2>
          </div>
          
          <div className="space-y-3">
            {stats.topAgents.filter(Boolean).slice(0, 5).map((agent, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 sm:gap-4 p-3 bg-gray-50 rounded-lg"
              >
                <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-bold ${
                  index === 0 
                    ? 'bg-yellow-400 text-yellow-900'
                    : index === 1
                    ? 'bg-gray-300 text-gray-800'
                    : index === 2
                    ? 'bg-amber-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {index + 1}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {agent?.nom} {agent?.prenom}
                  </p>
                  <p className="text-xs text-gray-500">
                    {agent?.typeAgent?.replace(/_/g, ' ')}
                  </p>
                </div>
                
                <div className="text-right">
                  <p className="text-lg sm:text-xl font-bold text-blue-600">
                    {agent?.passagesCount}
                  </p>
                  <p className="text-xs text-gray-500">Passages</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
