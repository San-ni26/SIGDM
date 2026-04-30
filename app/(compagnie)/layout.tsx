import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Espace Compagnie – SIGDM Mali',
  description: 'Gestion des voyages de transport public, passagers et déclarations de routes.',
};

export default function CompagnieLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900">
      {children}
    </div>
  );
}
