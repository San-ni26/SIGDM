/**
 * ============================================================================
 * PAGE CONNEXION – PORTAIL CITOYEN
 * ============================================================================
 * Connexion par téléphone ou par plaque + code PIN (pour véhicule)
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Phone, Car, ArrowRight, Eye, EyeOff, ChevronLeft } from 'lucide-react';

type LoginMode = 'telephone' | 'vehicule';

export default function CitoyenConnexionPage() {
  const router = useRouter();
  const [mode, setMode] = useState<LoginMode>('telephone');
  const [telephone, setTelephone] = useState('');
  const [matricule, setMatricule] = useState('');
  const [plaque, setPlaque] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload =
        mode === 'telephone'
          ? { mode: 'telephone', telephone: telephone.trim(), matricule: matricule.trim().toUpperCase() }
          : { mode: 'vehicule', plaque: plaque.trim().toUpperCase(), pin: pin.trim() };

      const res = await fetch('/api/citoyen/auth/connexion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Identifiants incorrects');
        return;
      }

      router.replace('/citoyen/dashboard');
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm mb-6">
          <ChevronLeft className="w-4 h-4" />
          Retour à l'accueil
        </Link>
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Espace Citoyen</h1>
        <p className="text-white/50 text-sm mt-1">SIGDM – Système de Gestion des Déplacements</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl p-8 shadow-2xl">
        {/* Onglets de mode */}
        <div className="flex rounded-xl bg-white/8 p-1 mb-6">
          <button
            onClick={() => { setMode('telephone'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'telephone'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Phone className="w-4 h-4" />
            Par téléphone
          </button>
          <button
            onClick={() => { setMode('vehicule'); setError(''); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
              mode === 'vehicule'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Car className="w-4 h-4" />
            Par véhicule
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'telephone' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  Numéro de téléphone
                </label>
                <input
                  type="tel"
                  value={telephone}
                  onChange={(e) => setTelephone(e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="+223 70 00 00 00"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  Matricule (5 caractères)
                </label>
                <input
                  type="text"
                  value={matricule}
                  onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                  maxLength={5}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono tracking-widest text-lg"
                  placeholder="A3B7K"
                  required
                />
                <p className="text-white/40 text-xs mt-1">Votre matricule vous a été attribué lors de l'inscription</p>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  Numéro de plaque
                </label>
                <input
                  type="text"
                  value={plaque}
                  onChange={(e) => setPlaque(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono tracking-widest"
                  placeholder="BA-1234-ML"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">
                  Code PIN (4 chiffres)
                </label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    maxLength={4}
                    className="w-full px-4 py-3 pr-12 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all font-mono text-xl tracking-[0.5em]"
                    placeholder="••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                  >
                    {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <p className="text-white/40 text-xs mt-1">Le PIN vous a été remis lors de l'enregistrement de votre véhicule</p>
              </div>
            </>
          )}

          {error && (
            <div className="px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30 mt-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Se connecter
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-white/10 text-center">
          <p className="text-white/50 text-sm">
            Pas encore de compte ?{' '}
            <Link href="/citoyen/inscription" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">
              S'inscrire
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
