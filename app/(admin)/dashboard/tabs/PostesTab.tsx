/**
 * ============================================================================
 * ONGLET POSTES DE CONTRÔLE - VERSION RESPONSIVE
 * ============================================================================
 * Gestion complète des postes avec carte interactive optimisée
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  MapPin,
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Crosshair,
  Shield,
  DollarSign,
  Building2,
  Flag,
  ChevronLeft,
  ChevronRight,
  Menu,
} from 'lucide-react';

// Import dynamique de la carte
const MapComponent = dynamic(
  () => import('../../../../components/map/PostesMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-full w-full bg-gray-100 rounded-xl flex items-center justify-center">
        <div className="text-gray-500 flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          Chargement de la carte...
        </div>
      </div>
    ),
  }
);

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

const POSTE_TYPES = {
  CONTROLE: { label: 'Contrôle', color: 'bg-blue-500', icon: Shield, textColor: 'text-blue-600' },
  PEAGE: { label: 'Péage', color: 'bg-green-500', icon: DollarSign, textColor: 'text-green-600' },
  DOUANE: { label: 'Douane', color: 'bg-amber-500', icon: Building2, textColor: 'text-amber-600' },
  FRONTIERE: { label: 'Frontière', color: 'bg-red-500', icon: Flag, textColor: 'text-red-600' },
};

const STATUT_COLORS = {
  ACTIF: 'bg-green-100 text-green-800 border-green-200',
  INACTIF: 'bg-gray-100 text-gray-800 border-gray-200',
  EN_TRAVAUX: 'bg-yellow-100 text-yellow-800 border-yellow-200',
};

export default function PostesTab() {
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [selectedPoste, setSelectedPoste] = useState<Poste | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>([12.6392, -8.0029]);
  const [mapZoom, setMapZoom] = useState(6);
  const [showSidebar, setShowSidebar] = useState(true);

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

  const loadPostes = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterType) params.append('type', filterType);
      
      const response = await fetch(`/api/admin/postes?${params}`);
      
      if (response.status === 401) {
        // Rediriger vers la page de login si non authentifié
        window.location.href = '/login';
        return;
      }
      
      if (response.status === 403) {
        alert('Accès non autorisé. Vous devez être administrateur national.');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur de chargement' }));
        throw new Error(errorData.error || `Erreur ${response.status}`);
      }
      
      const data = await response.json();
      setPostes(data.data || []);
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors du chargement des postes');
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  useEffect(() => {
    loadPostes();
  }, [loadPostes]);

  const filteredPostes = postes.filter(poste => {
    const matchesSearch = 
      poste.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poste.ville.toLowerCase().includes(searchTerm.toLowerCase()) ||
      poste.region.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || poste.type === filterType;
    return matchesSearch && matchesType;
  });

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
    setMapCenter([parseFloat(poste.latitude), parseFloat(poste.longitude)]);
    setMapZoom(15);
  };

  const handleDelete = async (poste: Poste) => {
    if (!confirm(`Êtes-vous sûr de vouloir supprimer le poste "${poste.nom}" ?`)) return;
    
    try {
      const response = await fetch(`/api/admin/postes?id=${poste.id}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur de suppression');
      }
      
      await loadPostes();
      if (selectedPoste?.id === poste.id) setSelectedPoste(null);
    } catch (error: any) {
      console.error('Erreur:', error);
      alert(error.message || 'Erreur lors de la suppression');
    }
  };

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
    if (!formData.ville.trim()) errors.ville = 'La ville est requise';
    if (!formData.region.trim()) errors.region = 'La région est requise';
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const url = isEditing && selectedPoste 
        ? `/api/admin/postes?id=${selectedPoste.id}` 
        : '/api/admin/postes';
      
      const response = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify({
          ...formData,
          id: isEditing ? selectedPoste?.id : undefined,
        }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur de sauvegarde');
      }
      
      await loadPostes();
      setIsModalOpen(false);
      setMapCenter([parseFloat(formData.latitude), parseFloat(formData.longitude)]);
      
    } catch (error: any) {
      alert(error.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      alert('La géolocalisation n\'est pas supportée');
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
      (error) => alert('Erreur de géolocalisation: ' + error.message)
    );
  };

  const handleMapMarkerClick = (poste: Poste) => {
    setSelectedPoste(poste);
    const element = document.getElementById(`poste-${poste.id}`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border-b border-gray-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg"
            title={showSidebar ? 'Masquer la liste' : 'Afficher la liste'}
          >
            {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Tous types</option>
            {Object.entries(POSTE_TYPES).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        
        <button
          onClick={handleCreate}
          className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau poste</span>
          <span className="sm:hidden">Ajouter</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <div className={`${showSidebar ? 'w-80' : 'w-0'} transition-all duration-300 bg-white border-r border-gray-200 flex flex-col overflow-hidden`}>
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <p className="text-sm font-medium text-gray-700">
              {filteredPostes.length} poste{filteredPostes.length > 1 ? 's' : ''}
            </p>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-gray-500 mt-2 text-sm">Chargement...</p>
              </div>
            ) : filteredPostes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <MapPin className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>Aucun poste trouvé</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filteredPostes.map((poste) => {
                  const TypeIcon = POSTE_TYPES[poste.type].icon;
                  const typeColor = POSTE_TYPES[poste.type].color;
                  const isSelected = selectedPoste?.id === poste.id;
                  
                  return (
                    <div
                      key={poste.id}
                      id={`poste-${poste.id}`}
                      onClick={() => {
                        setSelectedPoste(poste);
                        setMapCenter([parseFloat(poste.latitude), parseFloat(poste.longitude)]);
                        setMapZoom(15);
                      }}
                      className={`p-3 cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-l-4 border-blue-500' 
                          : 'hover:bg-gray-50 border-l-4 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-lg ${typeColor} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                          <TypeIcon className="w-5 h-5 text-white" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm truncate ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                            {poste.nom}
                          </p>
                          <p className="text-xs text-gray-500">{poste.ville}, {poste.region}</p>
                          
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${STATUT_COLORS[poste.statut]}`}>
                              {poste.statut}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleEdit(poste); }}
                            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Modifier"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(poste); }}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                            title="Supprimer"
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

        {/* Map */}
        <div className="flex-1 relative bg-gray-100">
          <MapComponent
            postes={filteredPostes}
            selectedPoste={selectedPoste}
            center={mapCenter}
            zoom={mapZoom}
            onMarkerClick={handleMapMarkerClick}
          />
          
          {/* Overlay info */}
          {selectedPoste && (
            <div className="absolute bottom-4 left-4 right-4 sm:right-auto sm:max-w-md bg-white rounded-xl shadow-lg p-4 z-[1000] border border-gray-200">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`w-3 h-3 rounded-full ${POSTE_TYPES[selectedPoste.type].color}`} />
                    <h3 className="font-semibold text-gray-900 truncate">{selectedPoste.nom}</h3>
                  </div>
                  <p className="text-sm text-gray-600">
                    {selectedPoste.adresse || selectedPoste.ville}, {selectedPoste.region}
                  </p>
                  <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {parseFloat(selectedPoste.latitude).toFixed(5)}, {parseFloat(selectedPoste.longitude).toFixed(5)}
                    </span>
                    {selectedPoste.telephone && (
                      <span>📞 {selectedPoste.telephone}</span>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={() => setSelectedPoste(null)} 
                  className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>
            </div>
          )}
          
          {/* Bouton toggle sidebar (mobile) */}
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="absolute top-4 left-4 z-[1000] lg:hidden bg-white p-2 rounded-lg shadow-md border border-gray-200"
          >
            {showSidebar ? <ChevronLeft className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white">
              <h2 className="text-xl font-semibold text-gray-900">
                {isEditing ? 'Modifier le poste' : 'Nouveau poste'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Nom */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom du poste *
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="Ex: Poste de contrôle Bamako-Ségou"
                />
                {formErrors.nom && <p className="text-red-500 text-sm mt-1">{formErrors.nom}</p>}
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type *</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(POSTE_TYPES).map(([key, { label, color, icon: Icon }]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: key as any })}
                      className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                        formData.type === key 
                          ? `border-blue-500 bg-blue-50` 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg ${color} flex items-center justify-center`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Coordonnées GPS */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Latitude *</label>
                  <input
                    type="text"
                    value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="12.6392"
                  />
                  {formErrors.latitude && <p className="text-red-500 text-sm mt-1">{formErrors.latitude}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Longitude *</label>
                  <input
                    type="text"
                    value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="-8.0029"
                  />
                  {formErrors.longitude && <p className="text-red-500 text-sm mt-1">{formErrors.longitude}</p>}
                </div>
              </div>

              <button
                type="button"
                onClick={handleGeolocate}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <Crosshair className="w-4 h-4" />
                Utiliser ma position actuelle
              </button>

              {/* Ville et Région */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Ville *</label>
                  <input
                    type="text"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Bamako"
                  />
                  {formErrors.ville && <p className="text-red-500 text-sm mt-1">{formErrors.ville}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Région *</label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Bamako"
                  />
                  {formErrors.region && <p className="text-red-500 text-sm mt-1">{formErrors.region}</p>}
                </div>
              </div>

              {/* Adresse */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Adresse</label>
                <input
                  type="text"
                  value={formData.adresse}
                  onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Adresse complète (optionnel)"
                />
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="70000000"
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors"
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
