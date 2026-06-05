'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bus, Shield, Phone, AlertTriangle, Eye, EyeOff, Building2, ArrowRight } from 'lucide-react';

export default function ChauffeurLoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ matricule: '', telephone: '', compagnieEmail: '' });
  const [showPhone, setShowPhone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/compagnie/chauffeur/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur de connexion');

      router.replace('/compagnie/chauffeur/trajet');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md space-y-8">
        {/* Logo/Title */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-2xl shadow-blue-500/30 mb-6">
            <Bus className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Espace Chauffeur</h1>
          <p className="text-white/50 mt-2 text-sm">Connectez-vous pour gérer vos voyages</p>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl mb-6">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Compagnie */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Email de votre compagnie *
              </label>
              <div className="relative">
                <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  required
                  type="email"
                  placeholder="compagnie@exemple.com"
                  value={form.compagnieEmail}
                  onChange={(e) => setForm({ ...form, compagnieEmail: e.target.value })}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-white/25 transition-all"
                />
              </div>
              <p className="text-xs text-white/35 mt-1.5">L'email de connexion de votre compagnie de transport</p>
            </div>

            {/* Matricule */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Votre Matricule Citoyen *
              </label>
              <div className="relative">
                <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  required
                  type="text"
                  maxLength={5}
                  placeholder="Ex: A3B7K"
                  value={form.matricule}
                  onChange={(e) => setForm({ ...form, matricule: e.target.value.toUpperCase() })}
                  className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white font-mono text-xl tracking-[0.3em] uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-white/25 transition-all"
                />
              </div>
              <p className="text-xs text-white/35 mt-1.5">Votre code à 5 caractères de l'application citoyen</p>
            </div>

            {/* Téléphone */}
            <div>
              <label className="block text-sm font-medium text-white/70 mb-2">
                Numéro de téléphone *
              </label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                <input
                  required
                  type={showPhone ? 'text' : 'password'}
                  placeholder="+223 XX XX XX XX"
                  value={form.telephone}
                  onChange={(e) => setForm({ ...form, telephone: e.target.value })}
                  className="w-full pl-11 pr-12 py-3.5 bg-white/5 border border-white/10 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder:text-white/25 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPhone(!showPhone)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                >
                  {showPhone ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-white/35 mt-1.5">Le numéro associé à votre compte citoyen</p>
            </div>

            <button
              type="submit"
              disabled={loading || form.matricule.length < 5 || !form.telephone || !form.compagnieEmail}
              className="w-full flex items-center justify-center gap-3 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold rounded-2xl transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Accéder à mon espace
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Security note */}
        <p className="text-center text-xs text-white/30 flex items-center justify-center gap-2">
          <Shield className="w-3.5 h-3.5" />
          Session sécurisée — Expire automatiquement après 12h d'inactivité
        </p>
      </div>
    </div>
  );
}
