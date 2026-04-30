/**
 * ============================================================================
 * COMPOSANT CARTE DES POSTES
 * ============================================================================
 * Carte interactive Leaflet avec marqueurs des postes de contrôle
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet dans Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface Poste {
  id: string;
  nom: string;
  type: 'CONTROLE' | 'PEAGE' | 'DOUANE' | 'FRONTIERE';
  latitude: string;
  longitude: string;
  ville: string;
  region: string;
  statut: 'ACTIF' | 'INACTIF' | 'EN_TRAVAUX';
  adresse: string | null;
  telephone: string | null;
  createdAt: string;
}

interface PostesMapProps {
  postes: Poste[];
  selectedPoste: Poste | null;
  center: [number, number];
  zoom: number;
  onMarkerClick: (poste: Poste) => void;
}

// Couleurs par type de poste
const TYPE_COLORS = {
  CONTROLE: '#3b82f6',   // Bleu
  PEAGE: '#10b981',      // Vert
  DOUANE: '#f59e0b',     // Orange
  FRONTIERE: '#ef4444',  // Rouge
};

// Icônes personnalisées
function createCustomIcon(type: string, isSelected: boolean) {
  const color = TYPE_COLORS[type as keyof typeof TYPE_COLORS] || '#6b7280';
  const size = isSelected ? 40 : 30;
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <svg width="${size}" height="${size}" viewBox="0 0 30 40" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M15 0C6.716 0 0 6.716 0 15c0 11.25 15 25 15 25s15-13.75 15-25c0-8.284-6.716-15-15-15z" fill="${color}"/\u003e
        <circle cx="15" cy="15" r="6" fill="white"/\u003e
      </svg\u003e
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
}

export default function PostesMap({
  postes,
  selectedPoste,
  center,
  zoom,
  onMarkerClick,
}: PostesMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const containerRef = useRef<HTMLDivElement>(null);

  // Initialiser la carte
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(center, zoom);
    
    // Ajouter le layer OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    // Ajouter l'échelle
    L.control.scale({ metric: true, imperial: false }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Mettre à jour la vue quand center/zoom changent
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setView(center, zoom, { animate: true });
    }
  }, [center, zoom]);

  // Gérer les marqueurs
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    const currentMarkers = markersRef.current;

    // Ajouter/mettre à jour les marqueurs
    postes.forEach((poste) => {
      const lat = parseFloat(poste.latitude);
      const lng = parseFloat(poste.longitude);
      
      if (isNaN(lat) || isNaN(lng)) return;

      const isSelected = selectedPoste?.id === poste.id;
      const markerId = poste.id;

      let marker = currentMarkers.get(markerId);

      if (!marker) {
        // Créer un nouveau marqueur
        marker = L.marker([lat, lng], {
          icon: createCustomIcon(poste.type, isSelected),
        }).addTo(map);

        // Popup avec les infos
        const popupContent = `
          <div class="p-2 min-w-[200px]">
            <h3 class="font-bold text-lg mb-1">${poste.nom}</h3>
            <p class="text-sm text-gray-600 mb-2">${poste.ville}, ${poste.region}</p>
            <div class="flex items-center gap-2">
              <span class="px-2 py-1 text-xs rounded-full ${
                poste.statut === 'ACTIF' ? 'bg-green-100 text-green-800' :
                poste.statut === 'EN_TRAVAUX' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }">${poste.statut}</span>
              <span class="text-xs text-gray-500">${poste.type}</span>
            </div>
          </div>
        `;

        marker.bindPopup(popupContent);
        
        // Event click
        marker.on('click', () => {
          onMarkerClick(poste);
          marker?.openPopup();
        });

        currentMarkers.set(markerId, marker);
      } else {
        // Mettre à jour l'icône si la sélection change
        marker.setIcon(createCustomIcon(poste.type, isSelected));
        
        // Ouvrir le popup si sélectionné
        if (isSelected) {
          marker.openPopup();
        }
      }
    });

    // Supprimer les marqueurs qui n'existent plus
    currentMarkers.forEach((marker, id) => {
      if (!postes.find(p => p.id === id)) {
        marker.remove();
        currentMarkers.delete(id);
      }
    });

  }, [postes, selectedPoste, onMarkerClick]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full rounded-lg"
      style={{ zIndex: 1 }}
    />
  );
}
