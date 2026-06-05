'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-defaulticon-compatibility/dist/leaflet-defaulticon-compatibility.css';
import 'leaflet-defaulticon-compatibility';
import L from 'leaflet';

interface PassageDetail {
  id: string;
  poste: { nom: string; latitude: number; longitude: number; };
  timestampPassage: string;
  segmentSuivant?: { vitesseKmh: number; excesVitesse: boolean; } | null;
}

interface AuditEvent {
  id: string;
  actionType: string;
  entityType: string;
  description: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

interface TripMapProps {
  passages: PassageDetail[];
  departLat?: number | null;
  departLng?: number | null;
  pointDepart?: string;
  destinationLat?: number | null;
  destinationLng?: number | null;
  destination?: string;
  auditLogs?: AuditEvent[];
}

export default function TripMap({
  passages,
  departLat,
  departLng,
  pointDepart = 'Départ',
  destinationLat,
  destinationLng,
  destination = 'Destination',
  auditLogs = []
}: TripMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-500">
        Chargement de la carte...
      </div>
    );
  }

  // Filtrer les passages valides
  const validPassages = passages.filter(p => p.poste?.latitude && p.poste?.longitude);

  // Déterminer tous les points GPS pour tracer la ligne globale et centrer la carte
  const allCoordinates: [number, number][] = [];

  // 1. Ajouter le départ si dispo
  if (departLat && departLng) {
    allCoordinates.push([Number(departLat), Number(departLng)]);
  }

  // 2. Ajouter les passages
  validPassages.forEach(p => {
    allCoordinates.push([Number(p.poste.latitude), Number(p.poste.longitude)]);
  });

  // 3. Ajouter la destination si dispo
  if (destinationLat && destinationLng) {
    allCoordinates.push([Number(destinationLat), Number(destinationLng)]);
  }

  if (allCoordinates.length === 0) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-500 font-medium p-4 text-center">
        Aucune coordonnée GPS disponible pour ce trajet.
      </div>
    );
  }

  // Centre de la carte
  const centerLat = allCoordinates.reduce((sum, c) => sum + c[0], 0) / allCoordinates.length;
  const centerLng = allCoordinates.reduce((sum, c) => sum + c[1], 0) / allCoordinates.length;

  // Création des icônes colorées standard pour Leaflet
  const getIcon = (color: string) => {
    return new L.Icon({
      iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  };

  const startIcon = getIcon('green');
  const endIcon = getIcon('red');
  const passageIcon = getIcon('blue');
  const auditIcon = getIcon('orange');

  // Filtrer les événements d'audit contenant des coordonnées valides
  const validAuditEvents = auditLogs.filter(
    log => log.latitude !== null && log.longitude !== null &&
           (Number(log.latitude) !== 0 || Number(log.longitude) !== 0)
  );

  return (
    <div className="w-full h-full relative z-0 rounded-xl overflow-hidden shadow-inner border border-slate-100">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={allCoordinates.length > 1 ? 7 : 11}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Tracer les lignes reliant tous les points */}
        {allCoordinates.length > 1 && (
          <Polyline
            positions={allCoordinates}
            color="#3B82F6"
            weight={4}
            opacity={0.8}
            dashArray="8, 8"
          />
        )}

        {/* Marqueur Départ */}
        {departLat && departLng && (
          <Marker position={[Number(departLat), Number(departLng)]} icon={startIcon}>
            <Popup>
              <div className="text-sm font-sans">
                <span className="inline-block px-2 py-0.5 mb-1 bg-green-100 text-green-800 text-xs font-bold rounded">DEPART</span>
                <p className="font-semibold text-gray-900">{pointDepart}</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Marqueurs Passages (checkpoints) */}
        {validPassages.map((passage) => (
          <Marker
            key={passage.id}
            position={[Number(passage.poste.latitude), Number(passage.poste.longitude)]}
            icon={passageIcon}
          >
            <Popup>
              <div className="text-sm font-sans">
                <span className="inline-block px-2 py-0.5 mb-1 bg-blue-100 text-blue-800 text-xs font-bold rounded">CONTROLE</span>
                <p className="font-semibold text-gray-900">{passage.poste.nom}</p>
                <p className="text-gray-600 text-xs mt-1">
                  Passé le {new Date(passage.timestampPassage).toLocaleString('fr-FR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                  })}
                </p>
                {passage.segmentSuivant && (
                  <div className={`mt-2 p-1.5 rounded text-xs ${passage.segmentSuivant.excesVitesse ? 'bg-red-50 text-red-700 font-semibold' : 'bg-slate-50 text-slate-700'}`}>
                    Vitesse vers poste suiv. : <strong>{passage.segmentSuivant.vitesseKmh} km/h</strong>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Marqueurs Événements d'Audit (Montée/Descente etc.) */}
        {validAuditEvents.map((event) => (
          <Marker
            key={event.id}
            position={[Number(event.latitude), Number(event.longitude)]}
            icon={auditIcon}
          >
            <Popup>
              <div className="text-sm font-sans max-w-[200px]">
                <span className="inline-block px-2 py-0.5 mb-1 bg-orange-100 text-orange-800 text-xs font-bold rounded">EVENEMENT</span>
                <p className="font-semibold text-gray-900 text-xs">{event.description}</p>
                <p className="text-slate-500 text-[10px] mt-1">
                  Le {new Date(event.createdAt).toLocaleString('fr-FR')}
                </p>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Marqueur Destination */}
        {destinationLat && destinationLng && (
          <Marker position={[Number(destinationLat), Number(destinationLng)]} icon={endIcon}>
            <Popup>
              <div className="text-sm font-sans">
                <span className="inline-block px-2 py-0.5 mb-1 bg-red-100 text-red-800 text-xs font-bold rounded">DESTINATION</span>
                <p className="font-semibold text-gray-900">{destination}</p>
              </div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </div>
  );
}
