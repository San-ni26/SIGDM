/**
 * ============================================================================
 * LAYOUT ADMIN
 * ============================================================================
 * Layout protégé pour les pages d'administration
 */

import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/jwt';

export const metadata: Metadata = {
  title: 'Administration - Transport ML',
  description: 'Tableau de bord de supervision des déplacements',
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Vérifier l'authentification côté serveur
  const session = await getSession();
  
  if (!session) {
    redirect('/login');
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  );
}
