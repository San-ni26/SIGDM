import { redirect } from 'next/navigation';
import { verifyChauffeurSession } from '@/lib/auth/chauffeur-session';

/**
 * /compagnie/chauffeur — Point d'entrée de l'espace chauffeur.
 * Redirige automatiquement vers le trajet si connecté, sinon vers la connexion.
 */
export default async function ChauffeurIndexPage() {
  const session = await verifyChauffeurSession();
  if (session) {
    redirect('/compagnie/chauffeur/trajet');
  } else {
    redirect('/compagnie/chauffeur/connexion');
  }
}
