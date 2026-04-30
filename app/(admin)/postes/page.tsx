/**
 * ============================================================================
 * PAGE GESTION DES POSTES
 * ============================================================================
 * Interface complète avec carte interactive pour gérer les postes de contrôle
 */

'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Navigation,
  Layers,
  Crosshair,
  Building2,
  Shield,
  DollarSign,
  Flag,
} from 'lucide-react';
import styles from './page.module.css';

// Types
interface Poste {
  id: string;
  nom: string;
  type: 'CONTROLE' | 'PEAGE' | 'DOUANE' | 'FRONTIERE';
  latitude: string;
  longitude: string;
  adresse: string | null;
  ville: string;
  region: string;
  telephone: string | null;
  statut: 'ACTIF' | 'INACTIF' | 'EN_TRAVAUX';
  createdAt: string;
  _count?: {
    agents: number;
    passages: number;
  };
}

interface FormData {
  nom: string;
  type: 'CONTROLE' | 'PEAGE' | 'DOUANE' | 'FRONTIERE';
  latitude: string;
  longitude: string;
  adresse: string;
  ville: string;
  region: string;
  telephone: string;
}

// Import dynamique de la carte pour éviter les erreurs SSR
const MapComponent = dynamic(
  () => import('../../../components/map/PostesMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="text-gray-500">Chargement de la carte...</div>
      </div>
    ),
  }
);

// Configuration des types de postes
const POSTE_TYPES = {
  CONTROLE: { label: 'Contrôle', color: 'bg-blue-500', icon: Shield },
  PEAGE: { label: 'Péage', color: 'bg-green-500', icon: DollarSign },
  DOUANE: { label: 'Douane', color: 'bg-amber-500', icon: Building2 },
  FRONTIERE: { label: 'Frontière', color: 'bg-red-500', icon: Flag },
};

const STATUT_COLORS = {
  ACTIF: 'bg-green-100 text-green-800',
  INACTIF: 'bg-gray-100 text-gray-800',
  EN_TRAVAUX: 'bg-yellow-100 text-yellow-800',
};

export default function PostesPage() {
  const router = useRouter();
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [selectedPoste, setSelectedPoste] = useState<Poste | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.6392, -8.0029]); // Bamako par défaut
  const [mapZoom, setMapZoom] = useState(6);

  // Formulaire
  const [formData, setFormData] = useState<FormData>({
    nom: '',
    type: 'CONTROLE',
    latitude: '',
    longitude: '',
    adresse: '',
    ville: '',
    region: '',
    telephone: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Charger les postes
  const loadPostes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      
      const response = await fetch(`/api/admin/postes?${params}`);
      if (!response.ok) throw new Error('Erreur de chargement');
      
      const data = await response.json();
      setPostes(data.data || []);
    } catch (error) {
      console.error('Erreur:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadPostes();
  }, [loadPostes]);

  // Filtrer les postes
  const filteredPostes = postes.filter(poste => {
    const matchesSearch = 
      poste.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poste.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poste.region.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !filterType || poste.type === filterType;
    
    return matchesSearch && matchesType;
  });

  // Ouvrir le modal de création
  const handleCreate = () => {
    setIsEditing(false);
    setSelectedPoste(null);
    setFormData({
      nom: '',
      type: 'CONTROLE',
      latitude: '',
      longitude: '',
      adresse: '',
      ville: '',
      region: '',
      telephone: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Ouvrir le modal d'édition
  const handleEdit = (poste: Poste) => {
    setIsEditing(true);
    setSelectedPoste(poste);
    setFormData({
      nom: poste.nom,
      type: poste.type,
      latitude: poste.latitude,
      longitude: poste.longitude,
      adresse: poste.adresse || '',
      ville: poste.ville,
      region: poste.region,
      telephone: poste.telephone || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
    
    // Centrer la carte sur le poste
    setMapCenter([parseFloat(poste.latitude), parseFloat(poste.longitude)]);
    setMapZoom(15);
  };

  // Supprimer un poste
  const handleDelete = async (poste: Poste) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le poste "${poste.nom}" ?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/admin/postes?id=${poste.id}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      
      if (!response.ok) throw new Error('Erreur de suppression');
      
      await loadPostes();
      if (selectedPoste?.id === poste.id) {
        setSelectedPoste(null);
      }
    } catch (error) {
      console.error('Erreur:', error);
      alert('Erreur lors de la suppression');
    }
  };

  // Valider le formulaire
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.nom.trim() || formData.nom.length < 3) {
      errors.nom = 'Le nom doit contenir au moins 3 caractères';
    }
    
    if (!formData.latitude || isNaN(parseFloat(formData.latitude))) {
      errors.latitude = 'Latitude invalide';
    }
    
    if (!formData.longitude || isNaN(parseFloat(formData.longitude))) {
      errors.longitude = 'Longitude invalide';
    }
    
    if (!formData.ville.trim()) {
      errors.ville = 'La ville est requise';
    }
    
    if (!formData.region.trim()) {
      errors.region = 'La région est requise';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Soumettre le formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const url = isEditing && selectedPoste 
        ? `/api/admin/postes?id=${selectedPoste.id}` 
        : '/api/admin/postes';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(formData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur de sauvegarde');
      }
      
      await loadPostes();
      setIsModalOpen(false);
      
      // Mettre à jour la carte
      setMapCenter([parseFloat(formData.latitude), parseFloat(formData.longitude)]);
      
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Géolocalisation
  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setFormData(prev => ({
          ...prev,
          latitude: latitude.toString(),
          longitude: longitude.toString(),
        }));
        setMapCenter([latitude, longitude]);
        setMapZoom(15);
      },
      (error) => {
        alert('Erreur de géolocalisation: ' + error.message);
      }
    );
  };

  // Sélectionner un poste sur la carte
  const handleMapMarkerClick = (poste: Poste) => {
    setSelectedPoste(poste);
    // Scroll vers le poste dans la liste
    const element = document.getElementById(`poste-${poste.id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Postes</h1>
            <p className="text-gray-500 mt-1">
              {postes.length} poste{postes.length > 1 ? 's' : ''} enregistré{postes.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nouveau poste
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Liste des postes */}
        <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
          {/* Filtres */}
          <div className="p-4 border-b border-gray-200 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher un poste..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les types</option>
              {Object.entries(POSTE_TYPES).map(([key, { label }]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Liste */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Chargement...</div>
            ) : filteredPostes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                Aucun poste trouvé
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredPostes.map((poste) => {
                  const TypeIcon = POSTE_TYPES[poste.type].icon;
                  const typeColor = POSTE_TYPES[poste.type].color;
                  
                  return (
                    <div
                      key={poste.id}
                      id={`poste-${poste.id}`}
                      onClick={() => {
                        setSelectedPoste(poste);
                        setMapCenter([parseFloat(poste.latitude), parseFloat(poste.longitude)]);
                        setMapZoom(15);
                      }}
                      className={`p-4 cursor-pointer transition-colors ${
                        selectedPoste?.id === poste.id 
                          ? 'bg-blue-50 border-l-4 border-blue-500' 
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${typeColor} flex items-center justify-center flex-shrink-0`}>
                          <TypeIcon className="w-5 h-5 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{poste.nom}</h3>
                          <p className="text-sm text-gray-500">
                            {poste.ville}, {poste.region}
                          </p>
                          
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${STATUT_COLORS[poste.statut]}`}>
                              {poste.statut}
                            </span>
                            <span className="text-xs text-gray-400">
                              {poste._count?.agents || 0} agent(s)
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(poste);
                            }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(poste);
                            }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Carte */}
        <div className="flex-1 relative">
          <MapComponent
            postes={filteredPostes}
            selectedPoste={selectedPoste}
            center={mapCenter}
            zoom={mapZoom}
            onMarkerClick={handleMapMarkerClick}
          />
          
          {/* Overlay info poste sélectionné */}
          {selectedPoste && (
            <div className="absolute bottom-4 left-4 right-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{selectedPoste.nom}</h3>
                  <p className="text-gray-500">
                    {selectedPoste.adresse || selectedPoste.ville}, {selectedPoste.region}
                  </p>
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      {parseFloat(selectedPoste.latitude).toFixed(4)}, {parseFloat(selectedPoste.longitude).toFixed(4)}
                    </span>
                    {selectedPoste.telephone && (
                      <span className="text-gray-500">📞 {selectedPoste.telephone}</span>
                    )}
                  </div>
                </div>
                
                <button
                  onClick={() => setSelectedPoste(null)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Création/Édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  {isEditing ? 'Modifier le poste' : 'Nouveau poste'}
                </h2>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom du poste *
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Ex: Poste de contrôle Bamako-Ségou"
                />
                {formErrors.nom && (
                  <p className="text-red-500 text-sm mt-1">{formErrors.nom}</p>
                )}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Type *
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(POSTE_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Coordonnées GPS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Latitude *
                  </label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="12.6392"
                  />
                  {formErrors.latitude && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.latitude}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Longitude *
                  </label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="-8.0029"
                  />
                  {formErrors.longitude && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.longitude}</p>
                  )}
                </div>
              </div>

              {/* Bouton géolocalisation */}
              <button
                type="button"
                onClick={handleGeolocate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Crosshair className="w-4 h-4" />
                Utiliser ma position actuelle
              </button>

              {/* Ville et Région */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ville *
                  </label>
                  <input
                    type="text"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Bamako"
                  />
                  {formErrors.ville && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.ville}</p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Région *
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Bamako"
                  />
                  {formErrors.region && (
                    <p className="text-red-500 text-sm mt-1">{formErrors.region}</p>
                  )}
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Adresse complète (optionnel)"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Téléphone
                </label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="70000000"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
                
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
