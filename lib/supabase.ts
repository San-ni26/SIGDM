/**
 * ============================================================================
 * CLIENT SUPABASE – TRANSPORT ML
 * ============================================================================
 * Utilise @supabase/ssr pour créer un client adapté au SSR et éviter
 * la création de multiples instances GoTrueClient lors des rechargements HMR.
 */

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    'Variables NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY manquantes'
  );
}

/** Client Supabase singleton (géré automatiquement par createBrowserClient) */
export const supabase = createBrowserClient(supabaseUrl, supabaseKey);

/** Nom du bucket Supabase Storage */
export const BUCKET_PHOTOS = 'SIGDM';
