'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Users, Plus, ArrowLeft, RefreshCw, AlertTriangle, 
  Search, Info, CheckCircle, UserCheck, Shield
} from 'lucide-react';

interface Chauffeur {
  id: string;
  statut: string;
  dateEmbauche: string;
  citoyen: {
    id: string;
    matricule: string;
    nom: string;
    prenom: string;
    telephone: string;
    photoUrl: string | null;
    numeroPiece: string | null;
    _count?: { chauffeurTrips: number };
  };
}

export default function ChauffeursPage() {
  const router = useRouter();
  const [chauffeurs, setChauffeurs] = useState<Chauffeur[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [matricule, setMatricule] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const loadChauffeurs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/entreprise/chauffeurs');
      if (res.status === 401) {
        router.replace('/entreprise/connexion');
        return;
      }
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      setChauffeurs(data.data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadChauffeurs();
  }, [loadChauffeurs]);

  const handleAddChauffeur = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      const res = await fetch('/api/entreprise/chauffeurs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest'
        },
        body: JSON.stringify({ matricule }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur lors de l\'ajout');
      
      setShowAddModal(false);
      setMatricule('');
      await loadChauffeurs();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment révoquer ce chauffeur ? Il passera au statut INACTIF.')) return;
    try {
      const res = await fetch(`/api/entreprise/chauffeurs/${id}`, {
        method: 'DELETE',
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await loadChauffeurs();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const filteredChauffeurs = chauffeurs.filter(c => 
    c.citoyen.matricule.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.citoyen.nom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.citoyen.prenom.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.citoyen.telephone.includes(searchTerm)
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
              <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Users className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h1 className="font-semibold text-lg">Mes Chauffeurs</h1>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-amber-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Ajouter un chauffeur</span>
            <span className="sm:hidden">Ajouter</span>
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        {/* Intro */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-start gap-4">
          <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center shrink-0">
            <Info className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="font-medium">Gestion de vos employés</h3>
            <p className="text-sm text-white/60 mt-1">
              Pour ajouter un chauffeur à votre entreprise, vous devez connaître son matricule citoyen à 5 caractères (ex: A3B7K). Le chauffeur doit d'abord s'inscrire sur l'application citoyen.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm font-medium">Total Chauffeurs</p>
              <p className="text-3xl font-bold mt-1">{chauffeurs.length}</p>
            </div>
            <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-white/50" />
            </div>
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <p className="text-white/50 text-sm font-medium">Actifs</p>
              <p className="text-3xl font-bold mt-1 text-green-400">
                {chauffeurs.filter(c => c.statut === 'ACTIF').length}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-500/10 rounded-xl flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-400" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher par nom, matricule ou téléphone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder:text-white/40"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredChauffeurs.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <UserCheck className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucun chauffeur</h3>
            <p className="text-white/50 text-sm mb-6">Vous n'avez pas encore ajouté de chauffeur à votre entreprise.</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Ajouter via Matricule
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredChauffeurs.map((employe) => (
              <div key={employe.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors flex flex-col sm:flex-row gap-4">
                
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500/20 to-purple-500/20 rounded-full flex items-center justify-center shrink-0 border border-white/10">
                  {employe.citoyen.photoUrl ? (
                    <img src={employe.citoyen.photoUrl} alt="Photo" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <span className="font-bold text-lg text-white/80">
                      {employe.citoyen.nom[0]}{employe.citoyen.prenom[0]}
                    </span>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-white truncate">
                        {employe.citoyen.prenom} {employe.citoyen.nom}
                      </h3>
                      <p className="text-amber-400 font-mono text-sm mt-0.5">
                        Matricule: {employe.citoyen.matricule}
                      </p>
                    </div>
                    {employe.statut === 'ACTIF' ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs font-medium border border-green-500/20">
                        <CheckCircle className="w-3 h-3" /> Actif
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20">
                        <AlertTriangle className="w-3 h-3" /> {employe.statut}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-4 grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
                    <div>
                      <p className="text-white/40 text-xs">Téléphone</p>
                      <p className="text-white/80 mt-0.5">{employe.citoyen.telephone}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">N° Pièce</p>
                      <p className="text-white/80 mt-0.5">{employe.citoyen.numeroPiece || 'Non renseigné'}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Date d'embauche</p>
                      <p className="text-white/80 mt-0.5">{new Date(employe.dateEmbauche).toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div>
                      <p className="text-white/40 text-xs">Trajets effectués</p>
                      <p className="text-white/80 mt-0.5">{employe.citoyen._count?.chauffeurTrips || 0}</p>
                    </div>
                  </div>

                  {employe.statut === 'ACTIF' && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-end">
                      <button 
                        onClick={() => handleDelete(employe.id)}
                        className="px-4 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium rounded-lg transition-colors"
                      >
                        Révoquer
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Modal Ajout via Matricule */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 border-b border-white/10 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Ajouter un chauffeur</h3>
              <button onClick={() => setShowAddModal(false)} className="text-white/50 hover:text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddChauffeur} className="p-5 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-400">{errorMsg}</p>
                </div>
              )}
              
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Matricule Citoyen *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
                  <input
                    required
                    type="text"
                    maxLength={5}
                    placeholder="Ex: A3B7K"
                    value={matricule}
                    onChange={(e) => setMatricule(e.target.value.toUpperCase())}
                    className="w-full pl-10 pr-3 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 text-white font-mono text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:text-white/30"
                  />
                </div>
                <p className="text-xs text-white/40 mt-2">
                  Le matricule à 5 caractères est disponible sur l'application citoyen de votre chauffeur.
                </p>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || matricule.length < 5}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <UserCheck className="w-4 h-4" />
                  )}
                  Valider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
