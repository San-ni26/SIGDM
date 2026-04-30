/**
 * ============================================================================
 * PAGE D'ACCUEIL – SIGDM MALI
 * Plateforme Nationale de Digitalisation des Déplacements
 * ============================================================================
 */

import Link from "next/link";
import {
  Shield,
  Users,
  Building2,
  Truck,
  ArrowRight,
  MapPin,
  Lock,
  Wifi,
  CheckCircle,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 backdrop-blur-sm bg-white/5 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Emblème simplifié */}
            <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm sm:text-base leading-tight">
                SIGDM
              </p>
              <p className="text-white/60 text-xs">République du Mali</p>
            </div>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-all duration-200 shadow-lg shadow-blue-600/30"
          >
            <Lock className="w-4 h-4" />
            Administration
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-500/15 border border-green-500/30 rounded-full text-green-400 text-sm font-medium mb-8">
          <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
          Système opérationnel
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white max-w-4xl leading-tight mb-6">
          Plateforme Nationale de{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-400">
            Digitalisation
          </span>{" "}
          des Déplacements
        </h1>

        <p className="text-white/60 text-lg sm:text-xl max-w-2xl mb-12 leading-relaxed">
          Suivi et contrôle des déplacements sur le territoire malien. Déclaration
          obligatoire des trajets, traçabilité totale, contrôle renforcé aux postes
          et frontières.
        </p>

        {/* Portails d'accès */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full max-w-5xl mb-16">
          <PortalCard
            href="/citoyen/connexion"
            icon={<Users className="w-7 h-7" />}
            title="Espace Citoyen"
            description="Déclarez vos voyages, gérez vos véhicules et consultez votre historique de trajets."
            color="from-blue-600 to-blue-700"
            badge="Voyageurs"
          />
          <PortalCard
            href="/agent/connexion"
            icon={<Shield className="w-7 h-7" />}
            title="Espace Agent"
            description="Interface terrain pour les agents police, douane et péage. Validation et contrôle."
            color="from-amber-600 to-orange-700"
            badge="Agents terrain"
          />
          <PortalCard
            href="/entreprise/connexion"
            icon={<Truck className="w-7 h-7" />}
            title="Espace Entreprise"
            description="Gestion de flotte, déclaration de trajets logistiques et suivi des marchandises."
            color="from-purple-600 to-purple-700"
            badge="Logistique"
          />
          <PortalCard
            href="/compagnie/connexion"
            icon={<Building2 className="w-7 h-7" />}
            title="Espace Compagnie"
            description="Gestion des voyages de transport public, passagers et déclarations de routes."
            color="from-teal-600 to-teal-700"
            badge="Transport public"
          />
        </div>

        {/* Caractéristiques clés */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-3xl">
          <Feature
            icon={<MapPin className="w-5 h-5 text-blue-400" />}
            title="Suivi en temps réel"
            description="Timeline complète : Départ → Postes → Péages → Frontière → Arrivée"
          />
          <Feature
            icon={<Wifi className="w-5 h-5 text-green-400" />}
            title="Offline-first"
            description="Fonctionnel même sans connexion internet. Synchronisation automatique."
          />
          <Feature
            icon={<CheckCircle className="w-5 h-5 text-amber-400" />}
            title="Traçabilité totale"
            description="Audit immutable de chaque action. Qui, quoi, où, quand."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 px-4 text-center">
        <p className="text-white/40 text-sm">
          © 2024 République du Mali – Ministère de la Sécurité et de la Protection Civile
        </p>
        <p className="text-white/25 text-xs mt-1">
          SIGDM – Système Intégré de Gestion des Déplacements au Mali
        </p>
      </footer>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Composants internes                                                         */
/* -------------------------------------------------------------------------- */

function PortalCard({
  href,
  icon,
  title,
  description,
  color,
  badge,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  badge: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col bg-white/8 hover:bg-white/12 border border-white/10 hover:border-white/20 rounded-2xl p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
    >
      <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <span className="text-xs font-medium text-white/50 uppercase tracking-wider mb-1">
        {badge}
      </span>
      <h2 className="text-white font-semibold text-base mb-2">{title}</h2>
      <p className="text-white/50 text-sm leading-relaxed flex-1">{description}</p>
      <div className="flex items-center gap-1 mt-4 text-white/40 group-hover:text-white/70 text-sm transition-colors">
        Accéder <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
}

function Feature({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-3 p-5 bg-white/5 border border-white/10 rounded-xl">
      <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
        {icon}
      </div>
      <p className="text-white font-medium text-sm">{title}</p>
      <p className="text-white/50 text-xs leading-relaxed">{description}</p>
    </div>
  );
}
