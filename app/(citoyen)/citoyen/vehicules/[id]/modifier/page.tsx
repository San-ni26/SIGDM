'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Car, FileText, Loader2, AlertTriangle, CheckCircle, Save
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

export default function ModifierVehiculePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  
  const [formData, setFormData] = useState({
    typeVehicle: 'VOITURE_PARTICULIERE',
    carteGriseNumero: '',
    marque: '',
    modele: '',
    anneeFabrication: '',
    couleur: '',
    nombrePlaces: '',
  });

  const [plaque, setPlaque] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const fetchVehicle = async () => {
      try {
        const res = await fetch(`/api/citoyen/vehicules/${id}`);
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || 'Erreur lors du chargement');
          setLoading(false);
          return;
        }
        
        setPlaque(data.vehicle.plaque);
        setFormData({
          typeVehicle: data.vehicle.typeVehicle || 'VOITURE_PARTICULIERE',
          carteGriseNumero: data.vehicle.carteGriseNumero || '',
          marque: data.vehicle.marque || '',
          modele: data.vehicle.modele || '',
          anneeFabrication: data.vehicle.anneeFabrication?.toString() || '',
          couleur: data.vehicle.couleur || '',
          nombrePlaces: data.vehicle.nombrePlaces?.toString() || '',
        });
      } catch {
        setError('Erreur de connexion');
      } finally {
        setLoading(false);
      }
    };
    
    fetchVehicle();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    setSuccess(false);

    try {
      const res = await fetch(`/api/citoyen/vehicules/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la modification');
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/citoyen/dashboard');
      }, 2000);
    } catch {
      setError('Erreur de connexion');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
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
          <span className="ml-3 font-semibold">Modifier le véhicule</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {success ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-8 text-center mb-8">
            <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Modifications enregistrées</h2>
            <p className="text-white/60">Redirection vers le dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations principales */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-400" />
                Informations du véhicule
              </h2>

              <div className="space-y-4">
                {/* Plaque (Non modifiable) */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">Plaque d'immatriculation</label>
                  <input
                    type="text"
                    disabled
                    value={plaque}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white/50 cursor-not-allowed font-mono"
                  />
                  <p className="text-xs text-amber-400 mt-1">La plaque d'immatriculation ne peut pas être modifiée.</p>
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
                disabled={saving || !plaque}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Enregistrer
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
