/**
 * ============================================================================
 * INSTANCE PRISMA CLIENT
 * ============================================================================
 * Singleton pattern pour éviter les connexions multiples en développement
 */

import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = global as unknown as { prisma: PrismaClient };

// Configuration du client Prisma
const prismaClientSingleton = () => {
  const databaseUrl = process.env.DATABASE_URL || '';
  
  // Prisma 7 nécessite soit accelerateUrl soit un adapter
  const isAccelerateUrl = databaseUrl.startsWith('prisma://') || databaseUrl.startsWith('prisma+postgres://');
  
  if (isAccelerateUrl) {
    return new PrismaClient({
      accelerateUrl: databaseUrl,
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'error', 'warn'] 
        : ['error'],
    });
  }
  
  // Configuration avec adapter pg pour connexion directe
  const pool = new Pool({
    connectionString: databaseUrl,
  });
  
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' 
      ? ['query', 'error', 'warn'] 
      : ['error'],
  });
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// Export pour compatibilité
export default prisma;
