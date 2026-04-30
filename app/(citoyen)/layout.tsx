/**
 * ============================================================================
 * LAYOUT – PORTAIL CITOYEN
 * ============================================================================
 */

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Espace Citoyen – SIGDM Mali',
  description: 'Déclarez vos voyages, gérez vos véhicules et consultez votre historique de trajets.',
};

export default function CitoyenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {children}
    </div>
  );
}
