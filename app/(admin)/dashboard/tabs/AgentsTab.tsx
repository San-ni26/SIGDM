/**
 * ============================================================================
 * ONGLET AGENTS – DASHBOARD SUPER ADMIN
 * ============================================================================
 * Gestion complète des agents terrain (police, douane, péage)
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Shield,
  Plus,
  Search,
  Edit2,
  X,
  UserCheck,
  Phone,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BadgeCheck,
} from 'lucide-react';

interface Agent {
  id: string;
  matriculeAgent: string;
  nom: string;
  prenom: string;
  telephone: string;
  typeAgent: 'AGENT_CONTROLE' | 'AGENT_DOUANE' | 'AGENT_PEAGE';
  grade: string | null;
  posteId: string | null;
  poste: { nom: string; ville: string; type: string } | null;
  photoUrl: string | null;
  dateRecrutement: string;
  user: { status: string };
  _count?: { passages: number; anomaliesSignalees: number };
}

interface Poste {
  id: string;
  nom: string;
  ville: string;
  type: string;
}

interface AgentFormData {
  nom: string;
  prenom: string;
  telephone: string;
  typeAgent: 'AGENT_CONTROLE' | 'AGENT_DOUANE' | 'AGENT_PEAGE';
  grade: string;
  posteId: string;
  dateRecrutement: string;
  email: string;
  password: string;
}

const TYPE_AGENT_CONFIG = {
  AGENT_CONTROLE: {
    label: 'Contrôle / Police',
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    dot: 'bg-blue-500',
  },
  AGENT_DOUANE: {
    label: 'Douane',
    color: 'bg-amber-100 text-amber-800 border-amber-200',
    dot: 'bg-amber-500',
  },
  AGENT_PEAGE: {
    label: 'Péage',
    color: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500',
  },
};

const STATUS_CONFIG = {
  ACTIF: { label: 'Actif', color: 'text-green-600', icon: CheckCircle },
  INACTIF: { label: 'Inactif', color: 'text-gray-500', icon: XCircle },
  SUSPENDU: { label: 'Suspendu', color: 'text-red-600', icon: AlertTriangle },
  EN_ATTENTE: { label: 'En attente', color: 'text-amber-600', icon: AlertTriangle },
};

const PAGE_SIZE = 12;

export default function AgentsTab() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [postes, setPostes] = useState<Poste[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<AgentFormData>({
    nom: '',
    prenom: '',
    telephone: '',
    typeAgent: 'AGENT_CONTROLE',
    grade: '',
    posteId: '',
    dateRecrutement: '',
    email: '',
    password: '',
  });

  const loadAgents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
        ...(searchTerm && { search: searchTerm }),
        ...(filterType && { type: filterType }),
        ...(filterStatut && { statut: filterStatut }),
      });
      const res = await fetch(`/api/admin/agents?${params}`);
      if (!res.ok) throw new Error('Erreur chargement');
      const data = await res.json();
      setAgents(data.data || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, searchTerm, filterType, filterStatut]);

  const loadPostes = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/postes?limit=100');
      if (!res.ok) return;
      const data = await res.json();
      setPostes(data.data || []);
    } catch {}
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  useEffect(() => {
    loadPostes();
  }, [loadPostes]);

  const openCreate = () => {
    setIsEditing(false);
    setSelectedAgent(null);
    setFormData({
      nom: '', prenom: '', telephone: '',
      typeAgent: 'AGENT_CONTROLE', grade: '',
      posteId: '', dateRecrutement: '',
      email: '', password: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const openEdit = (agent: Agent) => {
    setIsEditing(true);
    setSelectedAgent(agent);
    setFormData({
      nom: agent.nom,
      prenom: agent.prenom,
      telephone: agent.telephone,
      typeAgent: agent.typeAgent,
      grade: agent.grade || '',
      posteId: agent.posteId || '',
      dateRecrutement: agent.dateRecrutement.split('T')[0],
      email: '',
      password: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formData.nom.trim()) errors.nom = 'Nom requis';
    if (!formData.prenom.trim()) errors.prenom = 'Prénom requis';
    if (!formData.telephone.trim()) errors.telephone = 'Téléphone requis';
    if (!formData.dateRecrutement) errors.dateRecrutement = 'Date de recrutement requise';
    if (!isEditing) {
      if (!formData.email.trim()) errors.email = 'Email requis';
      if (!formData.password || formData.password.length < 8)
        errors.password = 'Mot de passe minimum 8 caractères';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      const url = isEditing ? `/api/admin/agents?id=${selectedAgent!.id}` : '/api/admin/agents';
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      await loadAgents();
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (agent: Agent) => {
    const newStatus = agent.user.status === 'ACTIF' ? 'INACTIF' : 'ACTIF';
    if (!confirm(`${newStatus === 'ACTIF' ? 'Activer' : 'Désactiver'} l'agent ${agent.prenom} ${agent.nom} ?`)) return;
    try {
      const res = await fetch(`/api/admin/agents?id=${agent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error('Erreur');
      await loadAgents();
    } catch {
      alert('Erreur lors du changement de statut');
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Agents terrain</h2>
          <p className="text-sm text-gray-500 mt-0.5">{total} agent{total > 1 ? 's' : ''} enregistré{total > 1 ? 's' : ''}</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition-colors font-medium shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Ajouter un agent
        </button>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, matricule..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les types</option>
          {Object.entries(TYPE_AGENT_CONFIG).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <select
          value={filterStatut}
          onChange={(e) => { setFilterStatut(e.target.value); setPage(1); }}
          className="px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Tous les statuts</option>
          <option value="ACTIF">Actif</option>
          <option value="INACTIF">Inactif</option>
          <option value="SUSPENDU">Suspendu</option>
        </select>
      </div>

      {/* Grille agents */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : agents.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <Shield className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">Aucun agent trouvé</p>
          <p className="text-gray-400 text-sm mt-1">Ajoutez votre premier agent terrain</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {agents.map((agent) => {
            const typeConfig = TYPE_AGENT_CONFIG[agent.typeAgent];
            const statusCfg = STATUS_CONFIG[agent.user.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.EN_ATTENTE;
            const StatusIcon = statusCfg.icon;
            return (
              <div
                key={agent.id}
                className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-bold text-lg">
                    {agent.prenom[0]}{agent.nom[0]}
                  </div>
                  <span className={`flex items-center gap-1 text-xs font-medium ${statusCfg.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {statusCfg.label}
                  </span>
                </div>

                <p className="font-semibold text-gray-900 text-sm">{agent.prenom} {agent.nom}</p>
                <p className="text-xs text-gray-500 font-mono mt-0.5">{agent.matriculeAgent}</p>

                <div className="mt-2 space-y-1">
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${typeConfig.color}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dot}`} />
                    {typeConfig.label}
                  </span>
                </div>

                {agent.poste && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                    <MapPin className="w-3 h-3" />
                    {agent.poste.nom} – {agent.poste.ville}
                  </div>
                )}

                <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                  <Phone className="w-3 h-3" />
                  {agent.telephone}
                </div>

                {agent._count && (
                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <UserCheck className="w-3 h-3 text-blue-500" />
                      {agent._count.passages} passages
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3 text-amber-500" />
                      {agent._count.anomaliesSignalees} anomalies
                    </span>
                  </div>
                )}

                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => openEdit(agent)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors font-medium"
                  >
                    <Edit2 className="w-3 h-3" /> Modifier
                  </button>
                  <button
                    onClick={() => handleToggleStatus(agent)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs rounded-lg transition-colors font-medium ${
                      agent.user.status === 'ACTIF'
                        ? 'text-red-600 bg-red-50 hover:bg-red-100'
                        : 'text-green-600 bg-green-50 hover:bg-green-100'
                    }`}
                  >
                    {agent.user.status === 'ACTIF' ? (
                      <><XCircle className="w-3 h-3" /> Désactiver</>
                    ) : (
                      <><CheckCircle className="w-3 h-3" /> Activer</>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-gray-200">
          <p className="text-sm text-gray-500">
            Page {page} sur {totalPages} ({total} agent{total > 1 ? 's' : ''})
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Modal Création/Édition */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <BadgeCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {isEditing ? 'Modifier l\'agent' : 'Nouvel agent'}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isEditing ? selectedAgent?.matriculeAgent : 'Matricule généré automatiquement'}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    value={formData.prenom}
                    onChange={(e) => setFormData({ ...formData, prenom: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Amadou"
                  />
                  {formErrors.prenom && <p className="text-red-500 text-xs mt-1">{formErrors.prenom}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                    placeholder="Coulibaly"
                  />
                  {formErrors.nom && <p className="text-red-500 text-xs mt-1">{formErrors.nom}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone *</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="+223 70 00 00 00"
                />
                {formErrors.telephone && <p className="text-red-500 text-xs mt-1">{formErrors.telephone}</p>}
              </div>

              {!isEditing && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="agent@exemple.ml"
                    />
                    {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe *</label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="Minimum 8 caractères"
                    />
                    {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Type d'agent *</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TYPE_AGENT_CONFIG).map(([k, v]) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setFormData({ ...formData, typeAgent: k as any })}
                      className={`py-2 px-3 text-xs font-medium rounded-lg border-2 transition-all ${
                        formData.typeAgent === k
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Grade / Fonction</label>
                  <input
                    type="text"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Sergent, Inspecteur..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de recrutement *</label>
                  <input
                    type="date"
                    value={formData.dateRecrutement}
                    onChange={(e) => setFormData({ ...formData, dateRecrutement: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  {formErrors.dateRecrutement && <p className="text-red-500 text-xs mt-1">{formErrors.dateRecrutement}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Poste assigné</label>
                <select
                  value={formData.posteId}
                  onChange={(e) => setFormData({ ...formData, posteId: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">Aucun poste assigné</option>
                  {postes.map((p) => (
                    <option key={p.id} value={p.id}>{p.nom} – {p.ville}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium transition-colors text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium transition-colors text-sm"
                >
                  {isSubmitting ? 'Enregistrement...' : isEditing ? 'Mettre à jour' : 'Créer l\'agent'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
