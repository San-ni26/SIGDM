/**
 * ============================================================================
 * PAGE DÉCLARER TRAJET – CITOYEN
 * ============================================================================
 * Formulaire de déclaration d'un trajet avec passagers
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, ArrowLeft, MapPin, Car, Users, Calendar,
  Loader2, CheckCircle, AlertTriangle, Plus, X,
} from 'lucide-react';

interface Vehicle {
  id: string;
  plaque: string;
  typeVehicle: string;
  marque: string | null;
  modele: string | null;
}

interface Passenger {
  matricule: string;
  nom: string;
  prenom: string;
  typePersonne: string;
}

export default function DeclarerTrajetPage() {
  const router = useRouter();
  
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(true);
  
  const [formData, setFormData] = useState({
    vehicleId: '',
    pointDepart: '',
    destination: '',
    dateDepart: '',
    notes: '',
  });

  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [newPassengerMatricule, setNewPassengerMatricule] = useState('');
  const [searchingPassenger, setSearchingPassenger] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<{
    reference: string;
    pointDepart: string;
    destination: string;
  } | null>(null);

  // Charger les véhicules
  useEffect(() => {
    fetch('/api/citoyen/me/vehicules')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setVehicles(data.data);
          if (data.data.length > 0) {
            setFormData(prev => ({ ...prev, vehicleId: data.data[0].id }));
          }
        }
      })
      .finally(() => setLoadingVehicles(false));
  }, []);

  // Rechercher un passager par matricule
  const searchPassenger = async () => {
    if (!newPassengerMatricule.trim()) return;
    
    setSearchingPassenger(true);
    try {
      const res = await fetch(`/api/citoyen/recherche/matricule?matricule=${newPassengerMatricule.trim()}`);
      if (res.ok) {
        const data = await res.json();
        if (data.citoyen) {
          // Vérifier si déjà ajouté
          if (!passengers.find(p => p.matricule === data.citoyen.matricule)) {
            setPassengers(prev => [...prev, data.citoyen]);
          }
          setNewPassengerMatricule('');
        } else {
          setError('Matricule non trouvé');
          setTimeout(() => setError(''), 3000);
        }
      }
    } catch {
      setError('Erreur de recherche');
    } finally {
      setSearchingPassenger(false);
    }
  };

  const removePassenger = (matricule: string) => {
    setPassengers(prev => prev.filter(p => p.matricule !== matricule));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/citoyen/trajets/declarer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          passagerMatricules: passengers.map(p => p.matricule),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Erreur lors de la déclaration');
        return;
      }

      setSuccess({
        reference: data.trip.reference,
        pointDepart: data.trip.pointDepart,
        destination: data.trip.destination,
      });
    } catch {
      setError('Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Affichage du succès
  if (success) {
    return (
      <div className="min-h-screen text-white">
        <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
            <Link href="/citoyen/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <span className="ml-3 font-semibold">Trajet déclaré</span>
          </div>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-12">
          <div className="bg-gradient-to-br from-green-600/20 to-emerald-600/20 border border-green-500/30 rounded-2xl p-8 text-center">
            <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-white" />
            </div>

            <h1 className="text-2xl font-bold text-white mb-2">Trajet déclaré avec succès!</h1>
            <p className="text-white/60 mb-6">
              Conservez votre référence pour le suivi du trajet.
            </p>

            <div className="bg-slate-900/50 rounded-xl p-6 mb-8">
              <p className="text-white/50 text-sm mb-2">Référence du trajet</p>
              <p className="text-3xl font-mono font-bold text-white tracking-wider">{success.reference}</p>
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-white">{success.pointDepart} → {success.destination}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Link
                href="/citoyen/dashboard"
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white font-medium rounded-xl transition-colors text-center"
              >
                Retour au dashboard
              </Link>
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
              >
                Nouveau trajet
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center">
          <Link href="/citoyen/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <span className="ml-3 font-semibold">Déclarer un trajet</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {vehicles.length === 0 && !loadingVehicles ? (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-8 text-center">
            <AlertTriangle className="w-12 h-12 mx-auto text-amber-400 mb-4" />
            <h2 className="text-lg font-semibold text-amber-300 mb-2">Aucun véhicule enregistré</h2>
            <p className="text-amber-200/70 mb-6">Vous devez d'abord enregistrer un véhicule pour déclarer un trajet.</p>
            <Link
              href="/citoyen/vehicules/nouveau"
              className="inline-block px-6 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl transition-colors"
            >
              Enregistrer un véhicule
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Véhicule */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-400" />
                Véhicule
              </h2>

              <select
                required
                value={formData.vehicleId}
                onChange={(e) => setFormData(prev => ({ ...prev, vehicleId: e.target.value }))}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="" className="bg-slate-800">Sélectionnez un véhicule...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id} className="bg-slate-800">
                    {v.plaque} - {v.typeVehicle}
                    {v.marque && ` (${v.marque} ${v.modele || ''})`}
                  </option>
                ))}
              </select>
            </div>

            {/* Itinéraire */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-green-400" />
                Itinéraire
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-white/70 mb-2">Point de départ *</label>
                  <input
                    type="text"
                    required
                    value={formData.pointDepart}
                    onChange={(e) => setFormData(prev => ({ ...prev, pointDepart: e.target.value }))}
                    placeholder="Ville de départ"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Destination *</label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={(e) => setFormData(prev => ({ ...prev, destination: e.target.value }))}
                    placeholder="Ville d'arrivée"
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/70 mb-2">Date et heure de départ *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.dateDepart}
                    onChange={(e) => setFormData(prev => ({ ...prev, dateDepart: e.target.value }))}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Passagers */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Passagers ({passengers.length})
              </h2>

              {/* Ajouter un passager */}
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={newPassengerMatricule}
                  onChange={(e) => setNewPassengerMatricule(e.target.value.toUpperCase())}
                  placeholder="Matricule du passager (ex: A3B7K)"
                  className="flex-1 px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchPassenger())}
                />
                <button
                  type="button"
                  onClick={searchPassenger}
                  disabled={searchingPassenger || !newPassengerMatricule.trim()}
                  className="px-4 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-colors"
                >
                  {searchingPassenger ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                </button>
              </div>

              {/* Liste des passagers */}
              <div className="space-y-2">
                {passengers.map((passenger) => (
                  <div key={passenger.matricule} className="flex items-center justify-between p-3 bg-white/5 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-600/20 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-purple-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{passenger.prenom} {passenger.nom}</p>
                        <p className="text-sm text-white/50 font-mono">{passenger.matricule}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePassenger(passenger.matricule)}
                      className="p-2 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>

              {passengers.length === 0 && (
                <p className="text-center text-white/40 py-4">Aucun passager ajouté</p>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-lg font-semibold text-white mb-4">Notes (optionnel)</h2>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Informations complémentaires..."
                rows={3}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
              />
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
                disabled={loading || !formData.vehicleId || !formData.pointDepart || !formData.destination || !formData.dateDepart}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Déclarer le trajet</>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
