/**
 * ============================================================================
 * PAGE ANOMALIE – AGENT
 * ============================================================================
 * Interface de signalement d'anomalies aux postes de contrôle
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, ArrowLeft, AlertTriangle, Camera, FileText,
  Loader2, CheckCircle, XCircle, User, Car, MapPin,
  Users, ChevronDown, Wifi, WifiOff,
} from 'lucide-react';
import { useNetworkStatus } from '@/lib/offline/network-status';
import { addAnomalyToQueue } from '@/lib/offline/db';

// ─── Types ─────────────────────────────────────────────────────────────────

interface Trip {
  id: string;
  reference: string;
  vehicle: {
    plaque: string;
    typeVehicle: string;
  };
  driver: {
    prenom: string;
    nom: string;
  } | null;
}

interface Agent {
  id: string;
  nom: string;
  prenom: string;
  poste: {
    id: string;
    nom: string;
  } | null;
}

const ANOMALY_TYPES = [
  { value: 'PASSAGER_NON_DECLARE', label: 'Passagers non déclarés', severity: 'GRAVE' },
  { value: 'PLAQUE_INCORRECTE', label: 'Plaque incorrecte', severity: 'GRAVE' },
  { value: 'DOCUMENTS_MANQUANTS', label: 'Documents manquants', severity: 'MOYENNE' },
  { value: 'SURCHARGE', label: 'Surcharge du véhicule', severity: 'GRAVE' },
  { value: 'MARCHANDISE_NON_DECLARE', label: 'Marchandise non déclarée', severity: 'CRITIQUE' },
  { value: 'CONDUITE_DANGEREUSE', label: 'Conduite dangereuse', severity: 'CRITIQUE' },
  { value: 'FAUX_DOCUMENTS', label: 'Faux documents', severity: 'CRITIQUE' },
  { value: 'VEHICULE_VOLE', label: 'Véhicule volé', severity: 'CRITIQUE' },
  { value: 'AUTRE', label: 'Autre', severity: 'MOYENNE' },
] as const;

const SEVERITY_LABELS = {
  FAIBLE: { label: 'Faible', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  MOYENNE: { label: 'Moyenne', color: 'text-orange-400', bg: 'bg-orange-500/10' },
  GRAVE: { label: 'Grave', color: 'text-red-400', bg: 'bg-red-500/10' },
  CRITIQUE: { label: 'Critique', color: 'text-red-500', bg: 'bg-red-600/20' },
};

// ─── Composant principal ───────────────────────────────────────────────────

function AnomalieContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const networkStatus = useNetworkStatus();
  const tripId = searchParams.get('tripId');

  const [agent, setAgent] = useState<Agent | null>(null);
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);

  // Formulaire
  const [anomalyType, setAnomalyType] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('MOYENNE');
  const [photos, setPhotos] = useState<string[]>([]);
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  // Charger l'agent
  useEffect(() => {
    fetch('/api/agent/auth/session')
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          setAgent({
            id: data.agent.id,
            nom: data.agent.nom,
            prenom: data.agent.prenom,
            poste: data.agent.poste,
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // Charger le trajet si tripId fourni
  useEffect(() => {
    if (tripId) {
      fetch(`/api/agent/trajet/${tripId}`)
        .then(res => res.json())
        .then(data => {
          if (data.trip) {
            setTrip(data.trip);
          }
        });
    }
  }, [tripId]);

  // Obtenir la position GPS
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setGpsLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  }, []);

  // Mettre à jour la sévérité selon le type
  useEffect(() => {
    const selectedType = ANOMALY_TYPES.find(t => t.value === anomalyType);
    if (selectedType) {
      setSeverity(selectedType.severity);
    }
  }, [anomalyType]);

  // Simuler la capture de photo
  const capturePhoto = () => {
    // Dans une vraie implémentation, utiliser l'API Camera
    // Pour le demo, on ajoute une fausse URL
    const fakePhotoUrl = `data:image/svg+xml;base64,${btoa(`
      <svg xmlns="http://www.w3.org/2000/svg" width="200" height="150" viewBox="0 0 200 150">
        <rect fill="#334155" width="200" height="150"/>
        <text fill="#94a3b8" font-family="sans-serif" font-size="12" x="50%" y="50%" text-anchor="middle" dy=".3em">
          Photo ${photos.length + 1}
        </text>
      </svg>
    `)}`;
    setPhotos(prev => [...prev, fakePhotoUrl]);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Soumettre l'anomalie
  const submitAnomaly = async () => {
    if (!agent?.poste || !anomalyType || !description) return;

    setIsSubmitting(true);
    setResult(null);

    try {
      const anomalyData = {
        tripId: trip?.id || undefined,
        posteId: agent.poste.id,
        agentId: agent.id,
        type: anomalyType as any,
        description,
        severite: severity as any,
        preuvesUrls: photos.join(','),
        latitude: gpsLocation?.lat,
        longitude: gpsLocation?.lng,
      };

      if (!networkStatus.isOnline) {
        await addAnomalyToQueue(anomalyData);
        setResult({
          success: true,
          message: 'Anomalie enregistrée en mode hors-ligne. Synchronisation automatique lors de la reconnexion.',
        });
      } else {
        const res = await fetch('/api/agent/anomalie/signaler', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(anomalyData),
        });

        if (res.ok) {
          setResult({
            success: true,
            message: 'Anomalie signalée avec succès!',
          });
          // Reset form
          setAnomalyType('');
          setDescription('');
          setPhotos([]);
        } else {
          const error = await res.text();
          throw new Error(error);
        }
      }
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Erreur lors du signalement',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    );
  }

  const severityInfo = SEVERITY_LABELS[severity as keyof typeof SEVERITY_LABELS];

  return (
    <div className="min-h-screen text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/agent/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 bg-red-600 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="font-semibold text-sm text-white">Signaler une anomalie</p>
              {agent?.poste && (
                <p className="text-xs text-white/40">{agent.poste.nom}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!networkStatus.isOnline && (
              <span className="px-3 py-1 rounded-lg text-xs bg-amber-500/20 text-amber-400 flex items-center gap-1">
                <WifiOff className="w-3 h-3" />
                Hors ligne
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* ── Trajet associé ── */}
        {trip && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
            <p className="text-sm text-white/50 mb-3">Trajet associé</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="font-mono font-semibold text-white">{trip.vehicle.plaque}</p>
                <p className="text-sm text-white/50">{trip.reference}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Formulaire ── */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-6">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-amber-400" />
            Détails de l'anomalie
          </h2>

          {/* Type d'anomalie */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Type d'anomalie *</label>
            <div className="relative">
              <select
                value={anomalyType}
                onChange={(e) => setAnomalyType(e.target.value)}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white appearance-none focus:ring-2 focus:ring-amber-500 outline-none"
              >
                <option value="" className="bg-slate-800">Sélectionnez un type...</option>
                {ANOMALY_TYPES.map((type) => (
                  <option key={type.value} value={type.value} className="bg-slate-800">
                    {type.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
            </div>
          </div>

          {/* Sévérité */}
          {anomalyType && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-white/70">Sévérité:</span>
              <span className={`px-3 py-1 rounded-lg text-sm font-medium ${severityInfo.bg} ${severityInfo.color}`}>
                {severityInfo.label}
              </span>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Description détaillée *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez l'anomalie constatée..."
              rows={5}
              className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
            />
          </div>

          {/* Photos */}
          <div>
            <label className="block text-sm text-white/70 mb-2">Preuves (photos)</label>
            <div className="flex flex-wrap gap-3">
              {photos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo}
                    alt={`Photo ${index + 1}`}
                    className="w-24 h-20 object-cover rounded-lg border border-white/20"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                onClick={capturePhoto}
                className="w-24 h-20 bg-white/5 border border-dashed border-white/30 rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-white/10 transition-colors"
              >
                <Camera className="w-6 h-6 text-white/40" />
                <span className="text-xs text-white/40">Ajouter</span>
              </button>
            </div>
          </div>

          {/* Résultat */}
          {result && (
            <div className={`p-4 rounded-xl ${
              result.success
                ? 'bg-green-500/10 border border-green-500/30'
                : 'bg-red-500/10 border border-red-500/30'
            }`}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                )}
                <p className={result.success ? 'text-green-300' : 'text-red-300'}>
                  {result.message}
                </p>
              </div>            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Link
              href="/agent/dashboard"
              className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white/70 font-medium rounded-xl transition-colors text-center"
            >
              Annuler
            </Link>
            <button
              onClick={submitAnomaly}
              disabled={isSubmitting || !anomalyType || !description || !agent?.poste}
              className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <><AlertTriangle className="w-5 h-5" /> Signaler</>
              )}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}

// ─── Export avec Suspense ──────────────────────────────────────────────────

export default function AnomaliePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900">
        <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
      </div>
    }>
      <AnomalieContent />
    </Suspense>
  );
}
