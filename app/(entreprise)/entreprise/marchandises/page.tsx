'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  Package, ArrowLeft, Search, TrendingUp, Scale,
  DollarSign, FileText, BarChart3, Navigation
} from 'lucide-react';

interface Trip {
  id: string;
  reference: string;
  pointDepart: string;
  destination: string;
  dateDepart: string;
  statut: string;
  typeMarchandise: string | null;
  poidsMarchandise: number | null;
  valeurMarchandise: number | null;
  vehicle: { plaque: string; typeVehicle: string };
}

export default function MarchandisesPage() {
  const router = useRouter();
  const [tripsWithGoods, setTripsWithGoods] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/entreprise/trajets');
      if (res.status === 401) {
        router.replace('/entreprise/connexion');
        return;
      }
      if (!res.ok) throw new Error('Erreur');
      const data = await res.json();
      
      // Filtrer uniquement les trajets qui ont une marchandise déclarée
      const goods = (data.data || []).filter((t: Trip) => t.typeMarchandise !== null && t.typeMarchandise.trim() !== '');
      setTripsWithGoods(goods);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Statistiques
  const totalWeight = tripsWithGoods.reduce((sum, t) => sum + (t.poidsMarchandise || 0), 0);
  const totalValue = tripsWithGoods.reduce((sum, t) => sum + (t.valeurMarchandise || 0), 0);
  
  // Extraire les types uniques et compter
  const typesCount = tripsWithGoods.reduce((acc, t) => {
    const type = t.typeMarchandise?.toLowerCase() || 'inconnu';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const uniqueTypes = Object.keys(typesCount).length;

  const filteredGoods = tripsWithGoods.filter(t => 
    t.typeMarchandise?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.pointDepart.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.destination.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen text-white bg-gradient-to-br from-slate-900 via-amber-950/20 to-slate-900 pb-12">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/entreprise/dashboard" className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/60 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-amber-500/20 rounded-xl flex items-center justify-center">
                <Package className="w-5 h-5 text-amber-400" />
              </div>
              <h1 className="font-semibold text-lg">Suivi des Marchandises</h1>
            </div>
          </div>
          
          <Link 
            href="/entreprise/trajets"
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Navigation className="w-4 h-4" />
            <span className="hidden sm:inline">Voir les trajets</span>
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 mt-8 space-y-6">
        
        {/* Intro */}
        <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-amber-400 mb-2 flex items-center gap-2">
            <BarChart3 className="w-6 h-6" />
            Tableau de Bord Fret
          </h2>
          <p className="text-white/60 text-sm max-w-2xl">
            Cette page analyse les données de fret rattachées à vos trajets. Pour ajouter de nouvelles marchandises, vous devez déclarer un trajet et remplir la section "Détails de la Marchandise".
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center shrink-0">
              <Scale className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm font-medium">Volume Total Transporté</p>
              <p className="text-2xl font-bold mt-1 text-blue-100">
                {totalWeight.toLocaleString('fr-FR')} <span className="text-sm text-blue-400 font-normal">Tonnes</span>
              </p>
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center shrink-0">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm font-medium">Valeur Globale Estimée</p>
              <p className="text-2xl font-bold mt-1 text-green-100">
                {totalValue > 0 ? (totalValue / 1000000).toFixed(2) : 0} <span className="text-sm text-green-400 font-normal">Millions FCFA</span>
              </p>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <p className="text-white/50 text-sm font-medium">Types de Marchandises</p>
              <p className="text-2xl font-bold mt-1 text-purple-100">
                {uniqueTypes} <span className="text-sm text-purple-400 font-normal">Catégories</span>
              </p>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
          <input
            type="text"
            placeholder="Rechercher une marchandise, un trajet..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-white placeholder:text-white/40"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredGoods.length === 0 ? (
          <div className="text-center py-20 bg-white/5 border border-white/10 rounded-2xl">
            <Package className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Aucune marchandise enregistrée</h3>
            <p className="text-white/50 text-sm mb-6">Vous n'avez pas encore renseigné de marchandises dans vos trajets.</p>
            <Link 
              href="/entreprise/trajets"
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Déclarer un trajet avec fret
            </Link>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-white/5 border-b border-white/10 text-white/50">
                  <tr>
                    <th className="px-6 py-4 font-medium">Marchandise</th>
                    <th className="px-6 py-4 font-medium">Poids / Valeur</th>
                    <th className="px-6 py-4 font-medium">Itinéraire</th>
                    <th className="px-6 py-4 font-medium">Date Expédition</th>
                    <th className="px-6 py-4 font-medium">Réf. Trajet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredGoods.map((trip) => (
                    <tr key={trip.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                            <Package className="w-4 h-4 text-amber-400" />
                          </div>
                          <span className="font-medium text-amber-50">{trip.typeMarchandise}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{trip.poidsMarchandise ? `${trip.poidsMarchandise} t` : '-'}</span>
                          <span className="text-xs text-green-400">
                            {trip.valeurMarchandise ? `${trip.valeurMarchandise.toLocaleString('fr-FR')} FCFA` : 'Valeur non déclarée'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="text-white/80">{trip.pointDepart}</span>
                          <span className="text-white/40 text-xs">vers {trip.destination}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-white/70">
                        {new Date(trip.dateDepart).toLocaleDateString('fr-FR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-mono text-xs text-purple-300 bg-purple-500/10 px-2 py-1 rounded inline-block w-fit">
                            {trip.reference}
                          </span>
                          <span className="text-xs text-white/40 mt-1">{trip.vehicle.plaque}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
