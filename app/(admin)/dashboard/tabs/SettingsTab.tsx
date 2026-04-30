/**
 * ============================================================================
 * ONGLET PARAMÈTRES – DASHBOARD SUPER ADMIN
 * ============================================================================
 * Configuration système et gestion des administrateurs
 */

'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Shield,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  Globe,
  Lock,
  Server,
  Users,
  X,
  Key,
} from 'lucide-react';

interface AdminForm {
  nom: string;
  prenom: string;
  telephone: string;
  email: string;
  password: string;
  confirmPassword: string;
  niveauAcces: 'NATIONAL' | 'REGIONAL';
  regionId: string;
}

const REGIONS_MALI = [
  'Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti',
  'Tombouctou', 'Gao', 'Kidal', 'Ménaka', 'Taoudénit',
  'Bamako (District)'
];

const SYSTEM_INFO = {
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
  dbProvider: 'PostgreSQL (Prisma Postgres)',
  framework: 'Next.js 16 + React 19',
};

export default function SettingsTab() {
  const [activeSection, setActiveSection] = useState<'admins' | 'system' | 'security'>('admins');
  const [isCreateAdminOpen, setIsCreateAdminOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [adminForm, setAdminForm] = useState<AdminForm>({
    nom: '',
    prenom: '',
    telephone: '',
    email: '',
    password: '',
    confirmPassword: '',
    niveauAcces: 'NATIONAL',
    regionId: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const validateAdminForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!adminForm.nom.trim()) errors.nom = 'Nom requis';
    if (!adminForm.prenom.trim()) errors.prenom = 'Prénom requis';
    if (!adminForm.email.includes('@')) errors.email = 'Email invalide';
    if (adminForm.password.length < 10) errors.password = 'Mot de passe minimum 10 caractères';
    if (adminForm.password !== adminForm.confirmPassword) errors.confirmPassword = 'Les mots de passe ne correspondent pas';
    if (!adminForm.telephone.trim()) errors.telephone = 'Téléphone requis';
    if (adminForm.niveauAcces === 'REGIONAL' && !adminForm.regionId) errors.regionId = 'Région requise pour accès régional';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateAdminForm()) return;
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await fetch('/api/admin/super-admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
        body: JSON.stringify(adminForm),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur de création');
      }
      setSuccessMsg('Administrateur créé avec succès');
      setIsCreateAdminOpen(false);
      setAdminForm({ nom: '', prenom: '', telephone: '', email: '', password: '', confirmPassword: '', niveauAcces: 'NATIONAL', regionId: '' });
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = [
    { id: 'admins', label: 'Administrateurs', icon: Users },
    { id: 'system', label: 'Système', icon: Server },
    { id: 'security', label: 'Sécurité', icon: Shield },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Paramètres système</h2>
        <p className="text-sm text-gray-500 mt-0.5">Configuration de la plateforme SIGDM</p>
      </div>

      {/* Messages */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <CheckCircle className="w-4 h-4 flex-shrink-0" />
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {errorMsg}
        </div>
      )}

      <div className="flex gap-6">
        {/* Nav */}
        <div className="w-48 flex-shrink-0">
          <nav className="space-y-1">
            {sections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  activeSection === id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </nav>
        </div>

        {/* Contenu */}
        <div className="flex-1 space-y-4">
          {/* Section Admins */}
          {activeSection === 'admins' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">Super Administrateurs</h3>
                  <p className="text-sm text-gray-500">Gérez les accès administrateurs de la plateforme</p>
                </div>
                <button
                  onClick={() => setIsCreateAdminOpen(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Nouvel admin
                </button>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-700">
                  <p className="font-semibold mb-1">Accès restreint</p>
                  <p>La création de super administrateurs est une action critique. Chaque accès est tracé dans le journal d'audit.</p>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6 text-center text-gray-500">
                <Shield className="w-10 h-10 mx-auto text-gray-300 mb-3" />
                <p className="font-medium">Gestion des administrateurs</p>
                <p className="text-sm text-gray-400 mt-1">Utilisez le bouton "Nouvel admin" pour créer des accès</p>
              </div>
            </div>
          )}

          {/* Section Système */}
          {activeSection === 'system' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Informations système</h3>
                <p className="text-sm text-gray-500">État et configuration de la plateforme</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {Object.entries(SYSTEM_INFO).map(([key, value]) => (
                  <div key={key} className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
                      {key === 'version' ? 'Version' : key === 'environment' ? 'Environnement' : key === 'dbProvider' ? 'Base de données' : 'Framework'}
                    </p>
                    <p className="text-gray-900 font-medium text-sm">{value}</p>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-sm font-semibold text-gray-900">Statut des services</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: 'API Backend', status: 'Opérationnel' },
                    { label: 'Base de données', status: 'Connecté' },
                    { label: 'Authentification JWT', status: 'Actif' },
                    { label: 'Mode offline', status: 'Service Worker actif' },
                  ].map(({ label, status }) => (
                    <div key={label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <span className="text-sm text-gray-600">{label}</span>
                      <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section Sécurité */}
          {activeSection === 'security' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900">Paramètres de sécurité</h3>
                <p className="text-sm text-gray-500">Règles et politiques de sécurité</p>
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Durée session', value: '15 minutes (access) + 7 jours (refresh)', icon: Key },
                  { label: 'Chiffrement', value: 'JWT HS256, bcrypt pour mots de passe', icon: Lock },
                  { label: 'Anti-fraude GPS', value: 'Vérification distance agent ↔ poste', icon: Globe },
                  { label: 'Rate limiting', value: '10 requêtes / 15 min par IP', icon: Shield },
                  { label: 'Audit trail', value: 'Immutable – Toutes actions tracées', icon: Settings },
                ].map(({ label, value, icon: Icon }) => (
                  <div key={label} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Créer Admin */}
      {isCreateAdminOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Nouvel administrateur</h3>
                  <p className="text-xs text-gray-500">Accès Super Admin – Action critique</p>
                </div>
              </div>
              <button onClick={() => setIsCreateAdminOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom *</label>
                  <input
                    type="text"
                    value={adminForm.prenom}
                    onChange={(e) => setAdminForm({ ...adminForm, prenom: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Moussa"
                  />
                  {formErrors.prenom && <p className="text-red-500 text-xs mt-1">{formErrors.prenom}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom *</label>
                  <input
                    type="text"
                    value={adminForm.nom}
                    onChange={(e) => setAdminForm({ ...adminForm, nom: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Diallo"
                  />
                  {formErrors.nom && <p className="text-red-500 text-xs mt-1">{formErrors.nom}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone *</label>
                <input
                  type="tel"
                  value={adminForm.telephone}
                  onChange={(e) => setAdminForm({ ...adminForm, telephone: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="+223 70 00 00 00"
                />
                {formErrors.telephone && <p className="text-red-500 text-xs mt-1">{formErrors.telephone}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email *</label>
                <input
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="admin@sigdm.ml"
                />
                {formErrors.email && <p className="text-red-500 text-xs mt-1">{formErrors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mot de passe *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={adminForm.password}
                    onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                    className="w-full px-3 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Minimum 10 caractères"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formErrors.password && <p className="text-red-500 text-xs mt-1">{formErrors.password}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmer le mot de passe *</label>
                <input
                  type="password"
                  value={adminForm.confirmPassword}
                  onChange={(e) => setAdminForm({ ...adminForm, confirmPassword: e.target.value })}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                />
                {formErrors.confirmPassword && <p className="text-red-500 text-xs mt-1">{formErrors.confirmPassword}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Niveau d'accès *</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: 'NATIONAL', label: '🌍 National', desc: 'Accès complet' },
                    { value: 'REGIONAL', label: '📍 Régional', desc: 'Région spécifique' },
                  ].map(({ value, label, desc }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAdminForm({ ...adminForm, niveauAcces: value as any })}
                      className={`flex flex-col p-3 rounded-xl border-2 transition-all text-left ${
                        adminForm.niveauAcces === value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="font-medium text-sm">{label}</span>
                      <span className="text-xs text-gray-500">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {adminForm.niveauAcces === 'REGIONAL' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Région *</label>
                  <select
                    value={adminForm.regionId}
                    onChange={(e) => setAdminForm({ ...adminForm, regionId: e.target.value })}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">Sélectionner une région</option>
                    {REGIONS_MALI.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                  {formErrors.regionId && <p className="text-red-500 text-xs mt-1">{formErrors.regionId}</p>}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsCreateAdminOpen(false)}
                  className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-medium text-sm"
                >
                  {isSubmitting ? 'Création...' : 'Créer l\'administrateur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
