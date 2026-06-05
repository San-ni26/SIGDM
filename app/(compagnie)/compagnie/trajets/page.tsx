'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  MapPin, Plus, ArrowLeft, Search, Calendar, 
  Bus, User, Navigation, CheckCircle, Users
} from 'lucide-react';

interface Trip {
  id: string;
  reference: string;
  pointDepart: string;
  destination: string;
  dateDepart: string;
  dateArriveeEstimee: string | null;
  statut: string;
  vehicle: { plaque: string; typeVehicle: string; marque: string | null; modele: string | null };
  conducteur: { prenom: string; nom: string; matricule: string } | null;
  _count: { passages: number; passagers: number };
}

interface VehicleOption { id: string; plaque: string; typeVehicle: string }
interface ChauffeurOption { citoyen: { id: string; nom: string; prenom: string; matricule: string } }

export default function TrajetsPage() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Options for form
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [chauffeurs, setChauffeurs] = useState<ChauffeurOption[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    vehicleId: '',
    conducteurId: '',
    pointDepart: '',
    destination: '',
    dateDepart: '',
    passagersIds: [] as string[]
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/compagnie/trajets');
      if (res.status === 401) {
        router.replace('/compagnie/connexion');
        return;
      }
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setTrips(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  const loadOptions = async () => {
    try {
      const [vehRes, chaufRes] = await Promise.all([
        fetch('/api/compagnie/vehicules'),
        fetch('/api/compagnie/chauffeurs')
      ]);
      const vehData = await vehRes.json();
      const chaufData = await chaufRes.json();
      setVehicles(vehData.data || []);
      setChauffeurs(chaufData.data || []);
    } catch (error) {
      console.error("Erreur chargement options", error);
    }
  };

  useEffect(() => {
    loadData();
    loadOptions();
  }, [loadData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      const res = await fetch('/api/compagnie/trajets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de l'ajout");
      
      setShowAddModal(false);
      setFormData({
        vehicleId: '', conducteurId: '', pointDepart: '', destination: '',
        dateDepart: '', passagersIds: []
      });
      await loadData();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (tripId: string, newStatus: string) => {
    try {
      setUpdatingId(tripId);

      const res = await fetch(`/api/compagnie/trajets/${tripId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ statut: newStatus })
      });

      if (!res.ok) throw new Error('Erreur lors de la mise à jour du statut');
      
      setTrips(trips.map(t => t.id === tripId ? { ...t, statut: newStatus } : t));
    } catch (error: any) {
      alert(error.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredTrips = trips.filter(t => 
    t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.pointDepart.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.vehicle.plaque.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'EN_PREPARATION': return 'text-blue-400 bg-blue-500/20 border-blue-500/20';
      case 'EN_COURS': return 'text-amber-400 bg-amber-500/20 border-amber-500/20';
      case 'TERMINE': return 'text-green-400 bg-green-500/20 border-green-500/20';
      case 'ANNULE': return 'text-red-400 bg-red-500/20 border-red-500/20';
      default: return 'text-white/60 bg-white/10 border-white/10';
    }
  };

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/compagnie/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Navigation className="w-5 h-5 text-blue-400" />
              </div>
              <h1 className="font-semibold text-lg">Suivi des Voyages</h1>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-blue-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Nouveau Voyage</span>
            <span className="sm:hidden">Nouveau</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/50 text-xs font-medium">Total Voyages</p>
            <p className="text-2xl font-bold mt-1">{trips.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/50 text-xs font-medium">En cours</p>
            <p className="text-2xl font-bold mt-1 text-amber-400">
              {trips.filter(t => t.statut === 'EN_COURS').length}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/50 text-xs font-medium">Préparation</p>
            <p className="text-2xl font-bold mt-1 text-blue-400">
              {trips.filter(t => t.statut === 'EN_PREPARATION').length}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <p className="text-white/50 text-xs font-medium">Terminés</p>
            <p className="text-2xl font-bold mt-1 text-green-400">
              {trips.filter(t => t.statut === 'TERMINE').length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher une référence, une ville, une plaque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-white/40"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <Navigation className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucun voyage trouvé</h3>
            <p className="text-white/50 text-sm mb-6">Vous n'avez pas encore déclaré de voyage ou la recherche n'a rien donné.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrips.map((trip) => (
              <div key={trip.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${getStatusColor(trip.statut)}`}>
                      {trip.statut.replace('_', ' ')}
                    </span>
                    <span className="font-mono text-white/60 text-sm">{trip.reference}</span>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-white/60">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {new Date(trip.dateDepart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Itinéraire */}
                  <div className="flex flex-col justify-center space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/50 uppercase">Départ</p>
                        <p className="font-semibold truncate">{trip.pointDepart}</p>
                      </div>
                    </div>
                    <div className="w-0.5 h-6 bg-white/10 ml-4"></div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-green-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/50 uppercase">Arrivée</p>
                        <p className="font-semibold truncate">{trip.destination}</p>
                      </div>
                    </div>
                  </div>

                  {/* Acteurs */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <Bus className="w-4 h-4 text-white/60" />
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Véhicule</p>
                        <p className="font-medium text-sm">{trip.vehicle.plaque} <span className="text-white/40 text-xs">({trip.vehicle.typeVehicle.replace('_', ' ')})</span></p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-white/60" />
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Chauffeur</p>
                        <p className="font-medium text-sm">
                          {trip.conducteur ? `${trip.conducteur.prenom} ${trip.conducteur.nom}` : 'Non assigné'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Passagers & Stat */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4 text-indigo-400" />
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Passagers</p>
                        <p className="font-medium text-sm text-indigo-100">
                          {trip._count.passagers} enregistrés au manifeste
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center shrink-0">
                        <CheckCircle className="w-4 h-4 text-blue-400" />
                      </div>
                      <div>
                        <p className="text-xs text-white/50">Contrôles routiers</p>
                        <p className="font-medium text-sm">{trip._count.passages} passages validés</p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 mt-3 border-t border-white/10 flex gap-2">
                      {trip.statut === 'EN_PREPARATION' && (
                        <>
                          <button
                            onClick={() => handleUpdateStatus(trip.id, 'EN_COURS')}
                            disabled={updatingId === trip.id}
                            className="flex-1 px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-xs font-medium rounded-lg transition-colors border border-amber-500/30 disabled:opacity-50"
                          >
                            Démarrer le voyage
                          </button>
                          <button
                            onClick={() => handleUpdateStatus(trip.id, 'ANNULE')}
                            disabled={updatingId === trip.id}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors border border-red-500/20 disabled:opacity-50"
                          >
                            Annuler
                          </button>
                        </>
                      )}
                      {trip.statut === 'EN_COURS' && (
                        <button
                          onClick={() => handleUpdateStatus(trip.id, 'TERMINE')}
                          disabled={updatingId === trip.id}
                          className="flex-1 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 text-xs font-medium rounded-lg transition-colors border border-green-500/30 disabled:opacity-50"
                        >
                          Marquer Terminé
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Création Trajet */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8">
            <div className="p-5 border-b border-white/10 flex justify-between items-center sticky top-0 bg-slate-900 z-10">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-400" />
                Déclarer un nouveau voyage
              </h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Véhicule & Chauffeur */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-blue-400 uppercase tracking-wider">Moyens de transport</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Véhicule *</label>
                    <select
                      required
                      value={formData.vehicleId}
                      onChange={(e) => setFormData({...formData, vehicleId: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="">-- Sélectionner un véhicule --</option>
                      {vehicles.map(v => (
                        <option key={v.id} value={v.id}>{v.plaque} ({v.typeVehicle.replace('_', ' ')})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Chauffeur principal *</label>
                    <select
                      required
                      value={formData.conducteurId}
                      onChange={(e) => setFormData({...formData, conducteurId: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                    >
                      <option value="">-- Sélectionner un chauffeur --</option>
                      {chauffeurs.map((c: any) => (
                        <option key={c.citoyen.id} value={c.citoyen.id}>
                          {c.citoyen.nom} {c.citoyen.prenom} ({c.citoyen.matricule})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Co-pilotes */}
                  {formData.conducteurId && chauffeurs.length > 1 && (
                    <div className="pt-2">
                      <label className="block text-sm font-medium text-white/70 mb-2">Co-pilotes (Optionnel)</label>
                      <div className="space-y-2 max-h-32 overflow-y-auto bg-white/5 p-3 rounded-xl border border-white/10">
                        {chauffeurs
                          .filter((c: any) => c.citoyen.id !== formData.conducteurId)
                          .map((c: any) => (
                            <label key={c.citoyen.id} className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={formData.passagersIds.includes(c.citoyen.id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFormData({
                                      ...formData,
                                      passagersIds: [...formData.passagersIds, c.citoyen.id]
                                    });
                                  } else {
                                    setFormData({
                                      ...formData,
                                      passagersIds: formData.passagersIds.filter(id => id !== c.citoyen.id)
                                    });
                                  }
                                }}
                                className="w-4 h-4 rounded border-white/20 bg-white/10 text-blue-600 focus:ring-blue-500"
                              />
                              <span className="text-sm text-white/90">
                                {c.citoyen.nom} {c.citoyen.prenom} <span className="text-white/50 text-xs">({c.citoyen.matricule})</span>
                              </span>
                            </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Itinéraire */}
                <div className="space-y-4">
                  <h4 className="text-sm font-medium text-blue-400 uppercase tracking-wider">Itinéraire</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Ville de départ *</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Bamako"
                      value={formData.pointDepart}
                      onChange={(e) => setFormData({...formData, pointDepart: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Ville de destination *</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Dakar"
                      value={formData.destination}
                      onChange={(e) => setFormData({...formData, destination: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1">Date et heure de départ *</label>
                    <input
                      required
                      type="datetime-local"
                      value={formData.dateDepart}
                      onChange={(e) => setFormData({...formData, dateDepart: e.target.value})}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-blue-500 text-white [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 border-t border-white/10 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="w-5 h-5" />
                  )}
                  Valider le voyage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
