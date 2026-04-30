/**
 * ============================================================================
 * CARTE INTERACTIVE – ADMIN
 * ============================================================================
 * Affichage des postes de contrôle sur une carte interactive
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Activity, AlertTriangle, Shield, DollarSign } from 'lucide-react';

// Types
interface Poste {
  id: string;
  nom: string;
  type: 'CONTROLE' | 'PEAGE' | 'DOUANE' | 'FRONTIERE';
  latitude: number;
  longitude: number;
  ville: string;
  region: string;
  statut: 'ACTIF' | 'INACTIF' | 'EN_TRAVAUX';
  passages24h?: number;
}

interface InteractiveMapProps {
  postes: Poste[];
  height?: string;
  showFilters?: boolean;
  onPosteSelect?: (poste: Poste) => void;
}

// Icônes personnalisées
const createIcon = (type: string, statut: string) => {
  const color = statut === 'ACTIF' 
    ? type === 'CONTROLE' ? '#3b82f6' : type === 'PEAGE' ? '#f59e0b' : type === 'DOUANE' ? '#10b981' : '#8b5cf6'
    : '#6b7280';
  
  return new Icon({
    iconUrl: `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}" width="30" height="30">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5" fill="white"/>
      </svg>
    `)}`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });
};

// Composant pour centrer la carte sur les postes
function MapBounds({ postes }: { postes: Poste[] }) {
  const map = useMap();
  
  useEffect(() => {
    if (postes.length > 0) {
      const bounds = postes.map(p => [p.latitude, p.longitude]);
      map.fitBounds(bounds as any, { padding: [50, 50] });
    }
  }, [postes, map]);
  
  return null;
}

// Filtres
const TYPE_FILTERS = [
  { value: 'all', label: 'Tous', icon: MapPin },
  { value: 'CONTROLE', label: 'Contrôle', icon: Shield },
  { value: 'PEAGE', label: 'Péage', icon: DollarSign },
  { value: 'DOUANE', label: 'Douane', icon: Activity },
  { value: 'FRONTIERE', label: 'Frontière', icon: AlertTriangle },
];

export default function InteractiveMap({ 
  postes, 
  height = '500px', 
  showFilters = true,
  onPosteSelect 
}: InteractiveMapProps) {
  const [selectedType, setSelectedType] = useState('all');
  const [selectedStatut, setSelectedStatut] = useState('all');

  const filteredPostes = useMemo(() => {
    return postes.filter(poste => {
      const typeMatch = selectedType === 'all' || poste.type === selectedType;
      const statutMatch = selectedStatut === 'all' || poste.statut === selectedStatut;
      return typeMatch && statutMatch;
    });
  }, [postes, selectedType, selectedStatut]);

  // Centre par défaut (Mali)
  const defaultCenter: [number, number] = [17.5707, -3.9962];

  return (
    <div className="relative">
      {/* Filtres */}
      {showFilters && (
        <div className="absolute top-4 left-4 right-4 z-[1000] bg-slate-900/90 backdrop-blur-md rounded-xl p-4 border border-white/10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Type:</span>
              <div className="flex gap-1">
                {TYPE_FILTERS.map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedType(filter.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      selectedType === filter.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white/5 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <filter.icon className="w-3.5 h-3.5" />
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-6 w-px bg-white/20 hidden sm:block" />

            <div className="flex items-center gap-2">
              <span className="text-sm text-white/60">Statut:</span>
              <select
                value={selectedStatut}
                onChange={(e) => setSelectedStatut(e.target.value)}
                className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-sm text-white"
              >
                <option value="all">Tous</option>
                <option value="ACTIF">Actif</option>
                <option value="INACTIF">Inactif</option>
                <option value="EN_TRAVAUX">En travaux</option>
              </select>
            </div>

            <div className="ml-auto text-sm text-white/50">
              {filteredPostes.length} poste{filteredPostes.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Légende */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-md rounded-xl p-3 border border-white/10">
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-500"></span>
            <span className="text-white/70">Contrôle</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-amber-500"></span>
            <span className="text-white/70">Péage</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span className="text-white/70">Douane</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-purple-500"></span>
            <span className="text-white/70">Frontière</span>
          </div>
        </div>
      </div>

      {/* Carte */}
      <MapContainer
        center={defaultCenter}
        zoom={6}
        style={{ height, width: '100%', borderRadius: '1rem' }}
        className="z-0"
      >
        <TileLayer
          attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBounds postes={filteredPostes} />
        
        {filteredPostes.map((poste) => (
          <Marker
            key={poste.id}
            position={[poste.latitude, poste.longitude]}
            icon={createIcon(poste.type, poste.statut)}
            eventHandlers={{
              click: () => onPosteSelect?.(poste),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <p className="font-semibold text-gray-900">{poste.nom}</p>
                <p className="text-sm text-gray-600">{poste.ville}, {poste.region}</p>
                <div className="flex items-center gap-2 mt-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${
                    poste.statut === 'ACTIF' ? 'bg-green-100 text-green-800' :
                    poste.statut === 'INACTIF' ? 'bg-red-100 text-red-800' :
                    'bg-amber-100 text-amber-800'
                  }`}>
                    {poste.statut}
                  </span>
                  <span className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-700">
                    {poste.type}
                  </span>
                </div>
                {poste.passages24h !== undefined && (
                  <p className="text-sm text-gray-600 mt-2">
                    {poste.passages24h} passages (24h)
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
