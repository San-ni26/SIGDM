/**
 * ============================================================================
 * INSTANCE PRISMA CLIENT - VERSION OPTIMISÉE
 * ============================================================================
 * Singleton pattern avec pool de connexions optimisé
 */

import { PrismaClient } from '../app/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Configuration du client Prisma optimisée
const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // Prisma 7 nécessite soit accelerateUrl soit un adapter
  const isAccelerateUrl = databaseUrl.startsWith('prisma://') || databaseUrl.startsWith('prisma+postgres://');
  
  if (isAccelerateUrl) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
      log: process.env.NODE_ENV === 'production' 
        ? ['error'] 
        : ['error', 'warn'],
    });
  }
  
  // Configuration avec adapter pg optimisée
  const pool = new Pool({
    connectionString: databaseUrl,
    // Optimisations du pool
    max: 10,                    // Maximum 10 connexions simultanées
    min: 2,                     // Minimum 2 connexions maintenues
    idleTimeoutMillis: 30000,   // Fermer les connexions inactives après 30s
    connectionTimeoutMillis: 30000, // Timeout de connexion 30s (augmenté)
    allowExitOnIdle: true,        // Permettre la sortie si idle
  });
  
  // Gestion des erreurs du pool
  pool.on('error', (err) => {
    console.error('Erreur inattendue du pool PostgreSQL:', err);
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'production' 
      ? ['error'] 
      : ['error', 'warn'],
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export pour compatibilité
export default prisma;
