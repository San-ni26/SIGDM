/**
 * ============================================================================
 * PAGE CONNEXION / INSCRIPTION – COMPAGNIE
 * ============================================================================
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Bus, Mail, Lock, ArrowRight, Eye, EyeOff,
  ChevronLeft, AlertTriangle, Loader2, User, Phone, MapPin,
  CheckCircle, FileText
} from 'lucide-react';

export default function CompagnieConnexionPage() {
  const router = useRouter();
  const [isRegistering, setIsRegistering] = useState(false);
  
  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Register form
  const [formData, setFormData] = useState({
    raisonSociale: '',
    nif: '',
    licenceTransport: '',
    email: '',
    telephone: '',
    ville: '',
    region: '',
    nomRepresentant: '',
    password: '',
    confirmPassword: '',
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/compagnie/auth/connexion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Identifiants incorrects');
        return;
      }

      router.replace('/compagnie/dashboard');
    } catch {
      setError('Erreur de connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (formData.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    setIsLoading(true);

    try {
      const res = await fetch('/api/compagnie/auth/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          raisonSociale: formData.raisonSociale,
          nif: formData.nif || undefined,
          licenceTransport: formData.licenceTransport || undefined,
          email: formData.email.trim().toLowerCase(),
          telephone: formData.telephone,
          ville: formData.ville,
          region: formData.region,
          nomRepresentant: formData.nomRepresentant,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erreur lors de l'inscription");
        return;
      }

      setSuccess('Inscription réussie ! Vous pouvez maintenant vous connecter.');
      setTimeout(() => {
        setIsRegistering(false);
        setEmail(formData.email);
        setFormData({
          raisonSociale: '',
          nif: '',
          licenceTransport: '',
          email: '',
          telephone: '',
          ville: '',
          region: '',
          nomRepresentant: '',
          password: '',
          confirmPassword: '',
        });
      }, 2000);
    } catch {
      setError('Erreur de connexion au serveur');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm mb-6">
          <ChevronLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
        <div className="w-16 h-16 bg-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-teal-600/30">
          <Bus className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">
          {isRegistering ? 'Inscription Compagnie' : 'Espace Compagnie'}
        </h1>
        <p className="text-white/50 text-sm mt-1">
          {isRegistering ? 'Créez votre compte compagnie de transport' : 'SIGDM – Portail Transport Public'}
        </p>
      </div>

      <div className="w-full max-w-md bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl p-8 shadow-2xl">
        {/* Toggle buttons */}
        <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl">
          <button
            onClick={() => setIsRegistering(false)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              !isRegistering ? 'bg-teal-600 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            Connexion
          </button>
          <button
            onClick={() => setIsRegistering(true)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
              isRegistering ? 'bg-teal-600 text-white' : 'text-white/60 hover:text-white'
            }`}
          >
            Inscription
          </button>
        </div>

        {error && (
          <div className="px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div className="px-4 py-3 bg-green-500/15 border border-green-500/30 rounded-xl text-green-300 text-sm flex items-center gap-2 mb-4">
            <CheckCircle className="w-4 h-4 flex-shrink-0" />
            {success}
          </div>
        )}

        {isRegistering ? (
          // Formulaire d'inscription
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Nom de la compagnie *</label>
              <div className="relative">
                <Bus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={formData.raisonSociale}
                  onChange={(e) => setFormData({ ...formData, raisonSociale: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                  placeholder="Raison sociale"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">NIF</label>
                <input
                  type="text"
                  value={formData.nif}
                  onChange={(e) => setFormData({ ...formData, nif: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Numéro NIF"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">Licence Transport</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={formData.licenceTransport}
                    onChange={(e) => setFormData({ ...formData, licenceTransport: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="N° Licence"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-white/80 mb-1.5">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="contact@compagnie.ml"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Téléphone *</label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="70000000"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">Ville *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <input
                    type="text"
                    value={formData.ville}
                    onChange={(e) => setFormData({ ...formData, ville: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                    placeholder="Bamako"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">Région *</label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Bamako"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Nom du représentant *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  value={formData.nomRepresentant}
                  onChange={(e) => setFormData({ ...formData, nomRepresentant: e.target.value })}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Nom et prénom du représentant légal"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Mot de passe *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="8 caractères minimum"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Confirmer le mot de passe *</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 outline-none"
                  placeholder="Confirmez le mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-teal-600/30 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Créer mon compte<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        ) : (
          // Formulaire de connexion
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Adresse email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="contact@compagnie.ml"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-teal-600/30 mt-2"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>Se connecter<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
