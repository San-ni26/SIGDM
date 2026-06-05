'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Shield, ChevronLeft, User, Phone, CheckCircle,
  ArrowRight, BadgeCheck, Camera, Upload, ImageIcon,
  X, RotateCcw,
} from 'lucide-react';

interface CitoyenFormData {
  nom: string; prenom: string; dateNaissance: string;
  lieuNaissance: string; genre: 'MASCULIN' | 'FEMININ' | 'AUTRE';
  typePersonne: 'ADULTE' | 'ENFANT'; telephone: string;
  email: string; ville: string; region: string;
}

const REGIONS_MALI = [
  'Kayes','Koulikoro','Sikasso','Ségou','Mopti',
  'Tombouctou','Gao','Kidal','Ménaka','Taoudénit','Bamako (District)',
];

const STEPS = ['Photo', 'Identité', 'Contact'];

// ─── Compression via Canvas à partir d'un dataURL ───────────────────────────
// On utilise un dataURL en entrée (depuis FileReader) plutôt que createObjectURL
// car FileReader est universellement compatible (iOS Safari inclus).
function compressDataUrl(dataUrl: string, maxDim = 600, quality = 0.78): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        const ratio = Math.min(maxDim / width, maxDim / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }
      const canvas = document.createElement('canvas');
      canvas.width  = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas non disponible')); return; }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('Impossible de décoder l\'image'));
    img.src = dataUrl;
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export default function CitoyenInscriptionPage() {
  const router = useRouter();
  const [step, setStep] = useState<1|2|3|4>(1);
  const [isLoading, setIsLoading]       = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [error, setError]               = useState('');
  const [matricule, setMatricule]       = useState('');

  const [photoPreview, setPhotoPreview] = useState('');  // blob dataURL pour l'affichage
  const [photoBase64, setPhotoBase64]   = useState('');  // JPEG compressé envoyé à l'API
  const [photoSizeKo, setPhotoSizeKo]   = useState(0);
  const [photoError, setPhotoError]     = useState('');
  const [isDragging, setIsDragging]     = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<CitoyenFormData>({
    nom:'', prenom:'', dateNaissance:'', lieuNaissance:'',
    genre:'MASCULIN', typePersonne:'ADULTE', telephone:'', email:'', ville:'', region:'',
  });
  const [errors, setErrors] = useState<Partial<CitoyenFormData>>({});

  // ─── Sélection de photo : FileReader → aperçu → compression ─────────────
  const handleFileSelect = useCallback((file: File) => {
    setPhotoError('');
    setPhotoBase64('');
    setPhotoSizeKo(0);
    setPhotoPreview('');

    if (!file.type.startsWith('image/')) {
      setPhotoError('Seules les images sont acceptées (JPG, PNG, WEBP)');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setPhotoError('La photo ne doit pas dépasser 15 Mo');
      return;
    }

    setIsCompressing(true);

    const reader = new FileReader();

    reader.onload = async (ev) => {
      const originalDataUrl = ev.target?.result as string | null;
      if (!originalDataUrl) {
        setPhotoError('Impossible de lire le fichier');
        setIsCompressing(false);
        return;
      }

      // 1. Aperçu immédiat
      setPhotoPreview(originalDataUrl);

      // 2. Compression via Canvas
      try {
        const compressed = await compressDataUrl(originalDataUrl);
        const sizeKo = Math.round((compressed.length * 3) / 4 / 1024);
        setPhotoBase64(compressed);
        setPhotoSizeKo(sizeKo);
      } catch (compErr) {
        // Si la compression échoue, on utilise l'original si assez petit
        console.warn('Compression échouée, fallback sur original:', compErr);
        const sizeKo = Math.round((originalDataUrl.length * 3) / 4 / 1024);
        if (sizeKo > 800) {
          setPhotoError(`Photo trop volumineuse (${sizeKo} Ko). Veuillez choisir une image plus petite.`);
          // NE PAS effacer l'aperçu – l'utilisateur voit son image et le message d'erreur
        } else {
          setPhotoBase64(originalDataUrl);
          setPhotoSizeKo(sizeKo);
        }
      } finally {
        setIsCompressing(false);
      }
    };

    reader.onerror = () => {
      setPhotoError('Erreur lors de la lecture du fichier');
      setIsCompressing(false);
    };

    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  }, [handleFileSelect]);

  const resetPhoto = useCallback(() => {
    setPhotoPreview('');
    setPhotoBase64('');
    setPhotoSizeKo(0);
    setPhotoError('');
    setIsCompressing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);
  // ────────────────────────────────────────────────────────────────────────────

  const validateStep2 = () => {
    const e: Partial<CitoyenFormData> = {};
    if (!form.nom.trim())           e.nom           = 'Nom requis';
    if (!form.prenom.trim())        e.prenom        = 'Prénom requis';
    if (!form.dateNaissance)        e.dateNaissance = 'Date de naissance requise';
    if (!form.lieuNaissance.trim()) e.lieuNaissance = 'Lieu de naissance requis';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep3 = () => {
    const e: Partial<CitoyenFormData> = {};
    if (!form.telephone.trim()) e.telephone = 'Téléphone requis';
    if (!form.ville.trim())     e.ville     = 'Ville requise';
    if (!form.region)           e.region    = 'Région requise';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = async () => {
    setError('');
    if (step === 1) {
      if (!photoBase64 && !isCompressing) {
        setPhotoError('La photo de profil est obligatoire');
        return;
      }
      if (isCompressing) {
        setPhotoError('Veuillez attendre la fin de la compression');
        return;
      }
      setStep(2);
    } else if (step === 2 && validateStep2()) {
      setStep(3);
    } else if (step === 3 && validateStep3()) {
      await handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('/api/citoyen/auth/inscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, photoBase64 }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Erreur lors de l\'inscription');
        return;
      }
      setMatricule(data.matricule);
      setStep(4);
    } catch {
      setError('Erreur de connexion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const update = (field: keyof CitoyenFormData, value: string) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="mb-8 text-center">
        <Link href="/citoyen/connexion"
          className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm mb-6">
          <ChevronLeft className="w-4 h-4" />Retour à la connexion
        </Link>
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/30">
          <Shield className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white">Créer un compte citoyen</h1>
        <p className="text-white/50 text-sm mt-1">Inscription obligatoire pour voyager</p>
      </div>

      {step < 4 && (
        <div className="w-full max-w-md mb-6">
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all ${i+1 <= step ? 'bg-blue-500' : 'bg-white/15'}`} />
                <p className={`text-xs mt-1.5 text-center ${i+1 === step ? 'text-white/80' : 'text-white/30'}`}>{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-md bg-white/8 backdrop-blur-sm border border-white/15 rounded-2xl p-8 shadow-2xl">

        {/* ── ÉTAPE 4 – SUCCÈS ─────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="text-center py-4">
            {photoPreview && (
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-green-500/50 mx-auto mb-4">
                <img src={photoPreview} alt="Photo de profil" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="w-16 h-16 bg-green-500/20 border-2 border-green-500/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Compte créé avec succès !</h2>
            <p className="text-white/60 text-sm mb-6">Votre compte citoyen a été enregistré dans le système SIGDM.</p>
            <div className="bg-blue-600/20 border border-blue-500/40 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-2 text-blue-300 text-xs uppercase tracking-wider font-semibold mb-3">
                <BadgeCheck className="w-4 h-4" />Votre matricule unique
              </div>
              <p className="text-white font-mono text-4xl font-bold tracking-[0.3em]">{matricule}</p>
              <p className="text-white/50 text-xs mt-3">⚠️ Conservez ce matricule précieusement.</p>
            </div>
            <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-4 mb-6 text-left">
              <p className="text-amber-300 text-sm font-semibold mb-2">À retenir :</p>
              <ul className="text-amber-200/70 text-xs space-y-1.5">
                <li>• Nom : <span className="text-white font-medium">{form.prenom} {form.nom.toUpperCase()}</span></li>
                <li>• Téléphone : <span className="text-white font-medium">{form.telephone}</span></li>
                <li>• Matricule : <span className="text-white font-mono font-bold">{matricule}</span></li>
              </ul>
            </div>
            <button onClick={() => router.replace('/citoyen/dashboard')}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30">
              Accéder à mon espace <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ── ÉTAPE 1 – PHOTO ──────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Camera className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold">Photo de profil</h2>
            </div>
            <p className="text-white/50 text-sm">
              Une photo récente est <span className="text-red-400 font-medium">obligatoire</span>.
              Elle sera <span className="text-blue-300 font-medium">compressée automatiquement</span> et stockée de façon sécurisée.
            </p>

            {/* Aperçu si une photo est sélectionnée */}
            {photoPreview ? (
              <div className="relative flex flex-col items-center">
                <div className="relative w-40 h-40 rounded-2xl overflow-hidden border-2 border-blue-500/60 shadow-lg">
                  <img src={photoPreview} alt="Aperçu de votre photo" className="w-full h-full object-cover" />
                  {isCompressing && (
                    <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                      <div className="w-8 h-8 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                      <span className="text-white text-xs font-medium">Compression…</span>
                    </div>
                  )}
                  {!isCompressing && (
                    <button onClick={resetPhoto}
                      className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 text-white text-xs font-medium">
                      <RotateCcw className="w-5 h-5" />Changer
                    </button>
                  )}
                </div>

                {isCompressing && (
                  <p className="text-blue-300 text-xs mt-2">Compression en cours…</p>
                )}
                {!isCompressing && photoBase64 && !photoError && (
                  <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    Photo prête – {photoSizeKo} Ko
                  </p>
                )}

                <button onClick={resetPhoto}
                  className="mt-1 inline-flex items-center gap-1.5 text-red-400 hover:text-red-300 text-xs transition-colors">
                  <X className="w-3.5 h-3.5" />Supprimer
                </button>
              </div>
            ) : (
              /* Zone de dépôt : <label> natif = fiable sur tous navigateurs y compris iOS */
              <label
                htmlFor="photo-upload-input"
                onDrop={handleDrop}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all select-none ${
                  isDragging
                    ? 'border-blue-400 bg-blue-500/10'
                    : 'border-white/20 hover:border-blue-400/50 hover:bg-white/5 active:bg-white/10'
                }`}
                style={{ WebkitTapHighlightColor: 'transparent' }}>
                <div className="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-8 h-8 text-white/40" />
                </div>
                <p className="text-white/70 font-medium text-sm">Glissez votre photo ici</p>
                <p className="text-white/35 text-xs mt-1">ou appuyez pour parcourir</p>
                <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 rounded-xl text-blue-300 text-sm font-medium transition-all">
                  <Upload className="w-4 h-4" />Choisir une photo
                </div>
                <p className="text-white/25 text-xs mt-3">JPG, PNG, WEBP · Max 15 Mo</p>
              </label>
            )}

            {/* Input fichier masqué via opacity (display:none bloque le .click() sur mobile) */}
            <input
              id="photo-upload-input"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/*"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
              style={{
                position: 'absolute',
                width: '1px',
                height: '1px',
                opacity: 0,
                overflow: 'hidden',
                pointerEvents: 'none',
              }}
            />

            {photoError && (
              <div className="px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm">
                {photoError}
              </div>
            )}

            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-200/70 space-y-1">
              <p className="text-amber-300 font-medium mb-1">📋 Consignes :</p>
              <p>• Visage entier, bien éclairé, fond neutre</p>
              <p>• Pas de lunettes de soleil ni de couvre-chef</p>
              <p>• Expression neutre, regard face à l&apos;appareil</p>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 2 – IDENTITÉ ───────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold">Informations d&apos;identité</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Prénom *" error={errors.prenom}>
                <input type="text" value={form.prenom}
                  onChange={e => update('prenom', e.target.value)}
                  className={inputClass} placeholder="Amadou" />
              </Field>
              <Field label="Nom *" error={errors.nom}>
                <input type="text" value={form.nom}
                  onChange={e => update('nom', e.target.value.toUpperCase())}
                  className={inputClass} placeholder="COULIBALY" />
              </Field>
            </div>
            <Field label="Date de naissance *" error={errors.dateNaissance}>
              <input type="date" value={form.dateNaissance}
                onChange={e => update('dateNaissance', e.target.value)}
                className={inputClass} />
            </Field>
            <Field label="Lieu de naissance *" error={errors.lieuNaissance}>
              <input type="text" value={form.lieuNaissance}
                onChange={e => update('lieuNaissance', e.target.value)}
                className={inputClass} placeholder="Bamako, Mali" />
            </Field>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Genre *</label>
              <div className="grid grid-cols-3 gap-2">
                {(['MASCULIN','FEMININ','AUTRE'] as const).map(g => (
                  <button key={g} type="button" onClick={() => update('genre', g)}
                    className={`py-2 rounded-xl border text-sm font-medium transition-all ${
                      form.genre === g
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
                    }`}>
                    {g === 'MASCULIN' ? 'Homme' : g === 'FEMININ' ? 'Femme' : 'Autre'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {(['ADULTE','ENFANT'] as const).map(t => (
                  <button key={t} type="button" onClick={() => update('typePersonne', t)}
                    className={`py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      form.typePersonne === t
                        ? 'bg-blue-600 border-blue-500 text-white'
                        : 'bg-white/5 border-white/15 text-white/60 hover:border-white/30'
                    }`}>
                    {t === 'ADULTE' ? '🧑 Adulte' : '👶 Enfant'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── ÉTAPE 3 – CONTACT ────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-6">
              <Phone className="w-5 h-5 text-blue-400" />
              <h2 className="text-white font-semibold">Coordonnées</h2>
            </div>
            {photoPreview && (
              <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl mb-2">
                <img src={photoPreview} alt="Photo" className="w-10 h-10 rounded-full object-cover border border-white/20" />
                <div>
                  <p className="text-white text-sm font-medium">{form.prenom || '–'} {form.nom}</p>
                  <p className="text-white/40 text-xs">Photo compressée ({photoSizeKo} Ko) ✓</p>
                </div>
              </div>
            )}
            <Field label="Numéro de téléphone *" error={errors.telephone}>
              <input type="tel" value={form.telephone}
                onChange={e => update('telephone', e.target.value)}
                className={inputClass} placeholder="+223 70 00 00 00" />
            </Field>
            <Field label="Email (optionnel)" error={undefined}>
              <input type="email" value={form.email}
                onChange={e => update('email', e.target.value)}
                className={inputClass} placeholder="votre@email.com" />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Ville *" error={errors.ville}>
                <input type="text" value={form.ville}
                  onChange={e => update('ville', e.target.value)}
                  className={inputClass} placeholder="Bamako" />
              </Field>
              <Field label="Région *" error={errors.region}>
                <select value={form.region}
                  onChange={e => update('region', e.target.value)}
                  className={inputClass}>
                  <option value="" className="bg-slate-800">Choisir...</option>
                  {REGIONS_MALI.map(r => (
                    <option key={r} value={r} className="bg-slate-800">{r}</option>
                  ))}
                </select>
              </Field>
            </div>
          </div>
        )}

        {/* ── Erreur globale ───────────────────────────────────────────────── */}
        {error && step < 4 && (
          <div className="mt-4 px-4 py-3 bg-red-500/15 border border-red-500/30 rounded-xl text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* ── Boutons de navigation ────────────────────────────────────────── */}
        {step < 4 && (
          <div className="mt-6 flex gap-3">
            {step > 1 && (
              <button type="button"
                onClick={() => setStep(s => (s - 1) as 1|2|3|4)}
                className="px-4 py-3 border border-white/20 text-white/70 hover:text-white hover:border-white/40 rounded-xl transition-all text-sm font-medium">
                Retour
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={isLoading || isCompressing}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-600/30">
              {isCompressing ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Compression…</>
              ) : isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>{step === 3 ? 'Créer mon compte' : 'Continuer'}<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const inputClass = 'w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/30 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-sm';

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}
