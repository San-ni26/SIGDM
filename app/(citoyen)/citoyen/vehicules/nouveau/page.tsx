/**
 * ============================================================================
 * PAGE ENREGISTRER VÉHICULE – CITOYEN
 * ============================================================================
 * Formulaire d'enregistrement d'un véhicule avec génération de PIN
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, ArrowLeft, Car, FileText, CheckCircle,
  Loader2, AlertTriangle, Copy, Eye, EyeOff,
} from 'lucide-react';

const VEHICLE_TYPES = [
  { value: 'VOITURE_PARTICULIERE', label: 'Voiture particulière' },
  { value: 'CAMION', label: 'Camion' },
  { value: 'CITERNE', label: 'Citerne' },
  { value: 'BUS', label: 'Bus' },
  { value: 'CAR', label: 'Car' },
  { value: 'MINIBUS', label: 'Minibus' },
  { value: 'MOTO', label: 'Moto' },
];

export default function EnregistrerVehiculePage() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    plaque: '',
    typeVehicle: 'VOITURE_PARTICULIERE',
    carteGriseNumero: '',
    marque: '',
    modele: '',
    anneeFabrication: '',
    couleur: '',
    nombrePlaces: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{
    vehicle: { id: string; plaque: string; typeVehicle: string };
    codePin: string;
  } | null>(null);
  const [showPin, setShowPin] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/citoyen/vehicules/enregistrer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'enregistrement');
        return;
      }

      setSuccess(data);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const copyPin = () => {
    if (success?.codePin) {
      navigator.clipboard.writeText(success.codePin);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Affichage du succès avec le PIN
  if (success) {
    return (
      <div className="min-h-screen text-white">
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
            <Link href="/citoyen/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="ml-3 font-semibold">Enregistrement réussi</span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Véhicule enregistré!</h1>
            <p className="text-white/60 mb-8">
              Votre véhicule {success.vehicle.plaque} a été ajouté avec succès.
            </p>

            {/* Code PIN - Section critique */}
            <div className="bg-slate-900/50 border border-amber-500/50 rounded-xl p-6 mb-8">
              <div className="flex items-center gap-2 justify-center mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <span className="text-amber-400 font-semibold">Conservez ce code précieusement!</span>
              </div>

              <p className="text-white/60 text-sm mb-4">
                Ce code PIN à 4 chiffres est nécessaire pour déclarer des trajets avec ce véhicule.
                Il ne sera affiché qu'une seule fois.
              </p>

              <div className="flex items-center justify-center gap-4">
                <div className="bg-white/10 rounded-xl px-8 py-4">
                  <span className="text-4xl font-mono font-bold text-white tracking-widest">
                    {showPin ? success.codePin : '••••'}
                  </span>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => setShowPin(!showPin)}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
                    title={showPin ? 'Masquer' : 'Afficher'}
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={copyPin}
                    className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors relative"
                    title="Copier"
                  >
                    <Copy className="w-5 h-5" />
                    {copied && (
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-green-600 text-xs rounded">
                        Copié!
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/citoyen/dashboard"
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors text-center"
              >
                Retour au dashboard
              </Link>
              <Link
                href="/citoyen/trajets/nouveau"
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-center"
              >
                Déclarer un trajet
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link href="/citoyen/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="ml-3 font-semibold">Enregistrer un véhicule</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations principales */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <Car className="w-5 h-5 text-blue-400" />
              Informations du véhicule
            </h2>

            <div className="space-y-4">
              {/* Plaque */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Plaque d'immatriculation *</label>
                <input
                  type="text"
                  required
                  value={formData.plaque}
                  onChange={(e) => setFormData(prev => ({ ...prev, plaque: e.target.value.toUpperCase() }))}
                  placeholder="XX-XXXX-XX"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Type de véhicule *</label>
                <select
                  required
                  value={formData.typeVehicle}
                  onChange={(e) => setFormData(prev => ({ ...prev, typeVehicle: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {VEHICLE_TYPES.map((type) => (
                    <option key={type.value} value={type.value} className="bg-slate-800">
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Carte grise */}
              <div>
                <label className="block text-sm text-white/70 mb-2">Numéro de carte grise</label>
                <input
                  type="text"
                  value={formData.carteGriseNumero}
                  onChange={(e) => setFormData(prev => ({ ...prev, carteGriseNumero: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Détails optionnels */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              Détails complémentaires
            </h2>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Marque</label>
                <input
                  type="text"
                  value={formData.marque}
                  onChange={(e) => setFormData(prev => ({ ...prev, marque: e.target.value }))}
                  placeholder="Toyota, BMW..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Modèle</label>
                <input
                  type="text"
                  value={formData.modele}
                  onChange={(e) => setFormData(prev => ({ ...prev, modele: e.target.value }))}
                  placeholder="Corolla, X5..."
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Année</label>
                <input
                  type="number"
                  min="1900"
                  max={new Date().getFullYear()}
                  value={formData.anneeFabrication}
                  onChange={(e) => setFormData(prev => ({ ...prev, anneeFabrication: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Couleur</label>
                <input
                  type="text"
                  value={formData.couleur}
                  onChange={(e) => setFormData(prev => ({ ...prev, couleur: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-white/70 mb-2">Nombre de places</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={formData.nombrePlaces}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombrePlaces: e.target.value }))}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Erreur */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/citoyen/dashboard"
              className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors text-center"
            >
              Annuler
            </Link>
            <button
              type="submit"
              disabled={loading || !formData.plaque}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Enregistrer le véhicule</>
              )}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
