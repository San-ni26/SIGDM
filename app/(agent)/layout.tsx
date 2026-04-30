import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Espace Agent – SIGDM Mali',
  description: 'Interface terrain pour les agents de police, douane et péage. Validation et contrôle des passages.',
};

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-amber-950 to-slate-900">
      {children}
    </div>
  );
}
