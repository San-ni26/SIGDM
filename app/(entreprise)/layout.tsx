import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Espace Entreprise – SIGDM Mali',
  description: 'Gestion de flotte, déclaration de trajets logistiques et suivi des marchandises.',
};

export default function EntrepriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900">
      {children}
    </div>
  );
}
