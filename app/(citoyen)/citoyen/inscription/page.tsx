/**
 * ============================================================================
 * PAGE INSCRIPTION – PORTAIL CITOYEN
 * ============================================================================
 * Création de compte voyageur individuel avec génération automatique du matricule
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield,
  ChevronLeft,
  User,
  Phone,
  Calendar,
  MapPin,
  CheckCircle,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react';

interface FormData {
  nom: string;
  prenom: string;
  dateNaissance: string;
  lieuNaissance: string;
  genre: 'MASCULIN' | 'FEMININ' | 'AUTRE';
  typePersonne: 'ADULTE' | 'ENFANT';
  telephone: string;
  email: string;
  ville: string;
  region: string;
}

const REGIONS_MALI = [
  'Kayes', 'Koulikoro', 'Sikasso', 'Ségou', 'Mopti',
  'Tombouctou', 'Gao', 'Kidal', 'Ménaka', 'Taoudénit',
  'Bamako (District)',
];

export default function CitoyenInscriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [matricule, setMatricule] = useState('');

  const [form, setForm] = useState<FormData>({
    nom: '',
    prenom: '',
    dateNaissance: '',
    lieuNaissance: '',
    genre: 'MASCULIN',
    typePersonne: 'ADULTE',
    telephone: '',
    email: '',
    ville: '',
    region: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  const validateStep1 = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.nom.trim()) e.nom = 'Nom requis';
    if (!form.prenom.trim()) e.prenom = 'Prénom requis';
    if (!form.dateNaissance) e.dateNaissance = 'Date de naissance requise';
    if (!form.lieuNaissance.trim()) e.lieuNaissance = 'Lieu de naissance requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.telephone.trim()) e.telephone = 'Téléphone requis';
    if (!form.ville.trim()) e.ville = 'Ville requise';
    if (!form.region) e.region = 'Région requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) handleSubmit();
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/citoyen/auth/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'inscription');
        return;
      }

      setMatricule(data.matricule);
      setStep(3);
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const update = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      {/* Header */}
      <div className="mb-8 text-center">
        <Link href="/citoyen/connexion" className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm mb-6">
          <ChevronLeft className="w-4 h-4" />
          Retour à la connexion
        </Link>
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Créer un compte citoyen</h1>
        <p className="text-white/50 text-sm mt-1">Inscription obligatoire pour voyager</p>
      </div>

      {/* Barre de progression */}
      {step < 3 && (
        <div className="w-full max-w-md mb-6">
          <div className="flex items-center gap-2">
            {[1, 2].map((s) => (
              <div key={s} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all ${s <= step ? 'bg-blue-500' : 'bg-white/15'}`} />
                <p className={`text-xs mt-1.5 text-center ${s === step ? 'text-white/80' : 'text-white/30'}`}>
                  {s === 1 ? 'Identité' : 'Contact'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Card */}
      <div className="w-full max-w-md bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl p-8 shadow-2xl">
        {/* ÉTAPE 3 – SUCCÈS */}
        {step === 3 && (
          <div className="text-center py-4">
            <div className="w-20 h-20 bg-green-500/20 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Compte créé avec succès !</h2>
            <p className="text-white/60 text-sm mb-6">
              Votre compte citoyen a été enregistré dans le système SIGDM.
            </p>

            <div className="bg-blue-600/20 border border-blue-500/40 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 text-blue-300 text-xs uppercase tracking-wider font-semibold mb-3">
                <BadgeCheck className="w-4 h-4" />
                Votre matricule unique
              </div>
              <p className="text-white font-mono text-4xl font-bold tracking-[0.3em]">
                {matricule}
              </p>
              <p className="text-white/50 text-xs mt-3">
                ⚠️ Conservez ce matricule précieusement. Il vous sera demandé à chaque contrôle.
              </p>
            </div>

            <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 mb-6 text-left">
              <p className="text-amber-300 text-sm font-semibold mb-2">À retenir :</p>
              <ul className="text-amber-200/70 text-xs space-y-1.5">
                <li>• Nom : <span className="text-white font-medium">{form.prenom} {form.nom.toUpperCase()}</span></li>
                <li>• Téléphone : <span className="text-white font-medium">{form.telephone}</span></li>
                <li>• Matricule : <span className="text-white font-mono font-bold">{matricule}</span></li>
              </ul>
            </div>

            <button
              onClick={() => router.replace('/citoyen/dashboard')}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30"
            >
              Accéder à mon espace
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ÉTAPE 1 – IDENTITÉ */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold">Informations d'identité</h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom *" error={errors.prenom}>
                <input
                  type="text"
                  value={form.prenom}
                  onChange={(e) => update('prenom', e.target.value)}
                  className={inputClass}
                  placeholder="Amadou"
                />
              </Field>
              <Field label="Nom *" error={errors.nom}>
                <input
                  type="text"
                  value={form.nom}
                  onChange={(e) => update('nom', e.target.value.toUpperCase())}
                  className={inputClass}
                  placeholder="COULIBALY"
                />
              </Field>
            </div>

            <Field label="Date de naissance *" error={errors.dateNaissance}>
              <input
                type="date"
                value={form.dateNaissance}
                onChange={(e) => update('dateNaissance', e.target.value)}
                className={inputClass}
              />
            </Field>

            <Field label="Lieu de naissance *" error={errors.lieuNaissance}>
              <input
                type="text"
                value={form.lieuNaissance}
                onChange={(e) => update('lieuNaissance', e.target.value)}
                className={inputClass}
                placeholder="Bamako, Mali"
              />
            </Field>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Genre *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['MASCULIN', 'FEMININ', 'AUTRE'] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => update('genre', g)}
                    className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                      form.genre === g
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {g === 'MASCULIN' ? 'Homme' : g === 'FEMININ' ? 'Femme' : 'Autre'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ADULTE', 'ENFANT'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => update('typePersonne', t)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form.typePersonne === t
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {t === 'ADULTE' ? '🧑 Adulte' : '👶 Enfant'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ÉTAPE 2 – CONTACT */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <Phone className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold">Coordonnées</h2>
            </div>

            <Field label="Numéro de téléphone *" error={errors.telephone}>
              <input
                type="tel"
                value={form.telephone}
                onChange={(e) => update('telephone', e.target.value)}
                className={inputClass}
                placeholder="+223 70 00 00 00"
              />
            </Field>

            <Field label="Email (optionnel)" error={undefined}>
              <input
                type="email"
                value={form.email}
                onChange={(e) => update('email', e.target.value)}
                className={inputClass}
                placeholder="votre@email.com"
              />
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Ville *" error={errors.ville}>
                <input
                  type="text"
                  value={form.ville}
                  onChange={(e) => update('ville', e.target.value)}
                  className={inputClass}
                  placeholder="Bamako"
                />
              </Field>
              <Field label="Région *" error={errors.region}>
                <select
                  value={form.region}
                  onChange={(e) => update('region', e.target.value)}
                  className={inputClass}
                >
                  <option value="" className="bg-slate-800">Choisir...</option>
                  {REGIONS_MALI.map((r) => (
                    <option key={r} value={r} className="bg-slate-800">{r}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* Error */}
        {error && step < 3 && (
          <div className="mt-4 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        {step < 3 && (
          <div className="mt-6 flex gap-3">
            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded-xl transition-all text-sm font-medium"
              >
                Retour
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  {step === 2 ? 'Créer mon compte' : 'Continuer'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass =
  'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
