'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Car, Plus, ArrowLeft, RefreshCw, AlertTriangle, 
  Search, Info, CheckCircle, Truck
} from 'lucide-react';

interface Vehicle {
  id: string;
  plaque: string;
  marque: string | null;
  modele: string | null;
  typeVehicle: string;
  nombrePlaces: number | null;
  statut: string;
  createdAt: string;
  _count?: { trajets: number };
}

export default function FlottePage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals and form state
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    plaque: '',
    marque: '',
    modele: '',
    type: 'CAMION',
    nombrePlaces: ''
  });

  const loadVehicles = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/entreprise/vehicules');
      if (res.status === 401) {
        router.replace('/entreprise/connexion');
        return;
      }
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setVehicles(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadVehicles();
  }, [loadVehicles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(editingId ? `/api/entreprise/vehicules/${editingId}` : '/api/entreprise/vehicules', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'enregistrement');
      
      closeModal();
      await loadVehicles();
    } catch (error: any) {
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ou désactiver ce véhicule ?')) return;
    try {
      const res = await fetch(`/api/entreprise/vehicules/${id}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadVehicles();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const openEditModal = (vehicle: Vehicle) => {
    setEditingId(vehicle.id);
    setFormData({
      plaque: vehicle.plaque,
      marque: vehicle.marque || '',
      modele: vehicle.modele || '',
      type: vehicle.typeVehicle,
      nombrePlaces: vehicle.nombrePlaces ? vehicle.nombrePlaces.toString() : ''
    });
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingId(null);
    setFormData({ plaque: '', marque: '', modele: '', type: 'CAMION', nombrePlaces: '' });
  };

  const filteredVehicles = vehicles.filter(v => 
    v.plaque.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.marque && v.marque.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/entreprise/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-500/20 rounded-xl flex items-center justify-center">
                <Car className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Ma Flotte</h1>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Ajouter un véhicule
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-sm font-medium">Total Véhicules</p>
            <p className="text-3xl font-bold mt-1">{vehicles.length}</p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-sm font-medium">Actifs</p>
            <p className="text-3xl font-bold mt-1 text-green-400">
              {vehicles.filter(v => v.statut === 'ACTIF').length}
            </p>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <p className="text-white/50 text-sm font-medium">En Maintenance</p>
            <p className="text-3xl font-bold mt-1 text-amber-400">
              {vehicles.filter(v => v.statut === 'MAINTENANCE').length}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher par plaque d'immatriculation ou marque..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-white placeholder:text-white/40"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredVehicles.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <Truck className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucun véhicule trouvé</h3>
            <p className="text-white/50 text-sm mb-6">Vous n'avez pas encore ajouté de véhicule à votre flotte.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter maintenant
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVehicles.map((vehicle) => (
              <div key={vehicle.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors group">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                      <Truck className="w-5 h-5 text-white/80" />
                    </div>
                    <div>
                      <p className="font-bold text-lg">{vehicle.plaque}</p>
                      <p className="text-xs text-white/50">{vehicle.typeVehicle?.replace('_', ' ') || 'VÉHICULE'}</p>
                    </div>
                  </div>
                  {vehicle.statut === 'ACTIF' ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></span>
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></span>
                  )}
                </div>
                
                <div className="space-y-2 mt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Marque / Modèle</span>
                    <span className="font-medium text-right">{vehicle.marque || '-'} {vehicle.modele || ''}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Capacité (Places)</span>
                    <span className="font-medium text-right">{vehicle.nombrePlaces || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-white/50">Trajets enregistrés</span>
                    <span className="font-medium text-right">{vehicle._count?.trajets || 0}</span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-white/10 flex gap-2">
                  <button 
                    onClick={() => openEditModal(vehicle)}
                    className="flex-1 py-1.5 px-3 bg-white/5 hover:bg-white/10 text-white text-xs font-medium rounded-lg transition-colors"
                  >
                    Modifier
                  </button>
                  <button 
                    onClick={() => handleDelete(vehicle.id)}
                    className="flex-1 py-1.5 px-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Ajout */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-semibold text-lg">{editingId ? 'Modifier le véhicule' : 'Ajouter un véhicule'}</h3>
              <button onClick={closeModal} className="text-white/50 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Plaque d'immatriculation *</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: AB 1234 MD"
                  value={formData.plaque}
                  onChange={(e) => setFormData({...formData, plaque: e.target.value.toUpperCase()})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 text-white uppercase placeholder:normal-case placeholder:text-white/30"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Type de véhicule *</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
                >
                  <option value="CAMION">Camion</option>
                  <option value="REMORQUE">Remorque</option>
                  <option value="SEMI_REMORQUE">Semi-Remorque</option>
                  <option value="CITERNE">Citerne</option>
                  <option value="MINIBUS">Minibus</option>
                  <option value="BUS">Bus</option>
                  <option value="VOITURE">Voiture (Légère)</option>
                </select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Marque</label>
                  <input
                    type="text"
                    value={formData.marque}
                    onChange={(e) => setFormData({...formData, marque: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-1">Modèle</label>
                  <input
                    type="text"
                    value={formData.modele}
                    onChange={(e) => setFormData({...formData, modele: e.target.value})}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1">Nombre de places / Capacité</label>
                <input
                  type="number"
                  min="0"
                  value={formData.nombrePlaces}
                  onChange={(e) => setFormData({...formData, nombrePlaces: e.target.value})}
                  className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg focus:ring-2 focus:ring-purple-500 text-white"
                />
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                  {editingId ? 'Mettre à jour' : 'Enregistrer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
