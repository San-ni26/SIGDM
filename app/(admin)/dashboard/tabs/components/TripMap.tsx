'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import { Icon } from 'leaflet';

interface PassageDetail {
  id: string;
  poste: { nom: string; latitude: number; longitude: number; };
  timestampPassage: string;
  segmentSuivant: { vitesseKmh: number; excesVitesse: boolean; } | null;
}

interface TripMapProps {
  passages: PassageDetail[];
}

export default function TripMap({ passages }: TripMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center">Chargement de la carte...</div>;

  const validPassages = passages.filter(p => p.poste.latitude && p.poste.longitude);

  if (validPassages.length === 0) {
    return <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500">Données GPS insuffisantes pour afficher la carte.</div>;
  }

  // Calculer le centre de la carte (moyenne des coordonnées)
  const centerLat = validPassages.reduce((sum, p) => sum + p.poste.latitude, 0) / validPassages.length;
  const centerLng = validPassages.reduce((sum, p) => sum + p.poste.longitude, 0) / validPassages.length;

  // Ligne de tracé du trajet
  const positions: [number, number][] = validPassages.map(p => [p.poste.latitude, p.poste.longitude]);

  // Icône personnalisée pour les postes (optionnelle, leaflet-defaulticon-compatibility s'occupe de base)
  
  return (
    <div className="w-full h-full relative z-0">
      <MapContainer 
        center={[centerLat, centerLng]} 
        zoom={validPassages.length > 1 ? 6 : 10} 
        scrollWheelZoom={true} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Tracer les lignes entre les postes */}
        {validPassages.length > 1 && (
          <Polyline 
            positions={positions} 
            color="#2563EB" 
            weight={4} 
            opacity={0.7} 
            dashArray="10, 10" 
          />
        )}

        {/* Marqueurs pour chaque poste */}
        {validPassages.map((passage, index) => (
          <Marker 
            key={passage.id} 
            position={[passage.poste.latitude, passage.poste.longitude]}
          >
            <Popup>
              <div className="text-sm font-sans">
                <p className="font-bold text-gray-900">{passage.poste.nom}</p>
                <p className="text-gray-600 mt-1">Passage à {new Date(passage.timestampPassage).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
                {passage.segmentSuivant && (
                  <div className={`mt-2 p-2 rounded text-xs ${passage.segmentSuivant.excesVitesse ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-700'}`}>
                    Vers poste suivant : <br />
                    <strong>{passage.segmentSuivant.vitesseKmh} km/h</strong>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
