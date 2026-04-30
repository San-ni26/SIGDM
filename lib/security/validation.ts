/**
 * ============================================================================
 * VALIDATION ET SANITIZATION DES INPUTS
 * ============================================================================
 * Protection contre les injections XSS, SQL, NoSQL et autres attaques
 */

import { z } from 'zod';

// Patterns dangereux à bloquer
const DANGEROUS_PATTERNS = [
  // Scripts XSS
  /\<script\b[^\<]*\>[^\<]*[\<\/]*script\>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,  // onerror, onclick, etc.
  /\<iframe/gi,
  /\<object/gi,
  /\<embed/gi,
  // Injections SQL basiques
  /(\%27)|(\')|(\-\-)|(\%23)|(#)/gi,
  /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/gi,
  // Command injection
  /\;.*\$/gi,
  /\|.*\/bin/gi,
  // Path traversal
  /\.\.\//gi,
  /\.\.\\/gi,
  // Null bytes
  /\x00/g,
];

/**
 * Vérifie si une chaîne contient des patterns dangereux
 */
export function containsDangerousPattern(input: string): boolean {
  return DANGEROUS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Sanitize une chaîne de caractères
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') return '';
  
  return input
    .trim()
    // Échapper les caractères HTML
    .replace(/\u003C/g, '&lt;')
    .replace(/\u003E/g, '&gt;')
    .replace(/\u0022/g, '&quot;')
    .replace(/\u0027/g, '&#x27;')
    .replace(/\u0026/g, '&amp;')
    // Supprimer les null bytes
    .replace(/\x00/g, '')
    // Normaliser les espaces
    .replace(/\s+/g, ' ')
    .slice(0, 10000); // Limite de taille
}

/**
 * Sanitize un objet récursivement
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    // Sanitize la clé aussi
    const safeKey = sanitizeString(key);
    
    if (typeof value === 'string') {
      sanitized[safeKey] = sanitizeString(value);
    } else if (typeof value === 'number') {
      sanitized[safeKey] = value;
    } else if (typeof value === 'boolean') {
      sanitized[safeKey] = value;
    } else if (value === null) {
      sanitized[safeKey] = null;
    } else if (Array.isArray(value)) {
      sanitized[safeKey] = value.map(item => 
        typeof item === 'string' ? sanitizeString(item) :
        typeof item === 'object' && item !== null ? sanitizeObject(item as Record<string, unknown>) :
        item
      );
    } else if (typeof value === 'object') {
      sanitized[safeKey] = sanitizeObject(value as Record<string, unknown>);
    }
  }
  
  return sanitized as T;
}

// Schémas de validation Zod pour les différents types d'inputs

export const emailSchema = z.string()
  .min(5, 'L\'email doit contenir au moins 5 caractères')
  .max(254, 'L\'email est trop long')
  .email('Format d\'email invalide')
  .transform(val => val.toLowerCase().trim())
  .refine(val => !containsDangerousPattern(val), {
    message: 'L\'email contient des caractères non autorisés'
  });

export const passwordSchema = z.string()
  .min(12, 'Le mot de passe doit contenir au moins 12 caractères')
  .max(128, 'Le mot de passe ne doit pas dépasser 128 caractères')
  .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
  .regex(/[a-z]/, 'Le mot de passe doit contenir au moins une minuscule')
  .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre')
  .regex(/[^A-Za-z0-9]/, 'Le mot de passe doit contenir au moins un caractère spécial')
  .refine(val => !containsDangerousPattern(val), {
    message: 'Le mot de passe contient des caractères non autorisés'
  });

export const uuidSchema = z.string()
  .uuid('Identifiant invalide')
  .transform(val => val.toLowerCase().trim());

export const matriculeSchema = z.string()
  .length(5, 'Le matricule doit contenir exactement 5 caractères')
  .regex(/^[A-Z0-9]{5}$/, 'Le matricule doit contenir 5 caractères alphanumériques en majuscules');

export const plaqueSchema = z.string()
  .min(5, 'La plaque est trop courte')
  .max(20, 'La plaque est trop longue')
  .regex(/^[A-Z0-9\- ]+$/, 'Format de plaque invalide')
  .transform(val => val.toUpperCase().replace(/\s+/g, ' ').trim());

export const telephoneSchema = z.string()
  .regex(/^[0-9]{8,15}$/, 'Le numéro de téléphone doit contenir entre 8 et 15 chiffres')
  .transform(val => val.replace(/\D/g, ''));

export const nomSchema = z.string()
  .min(2, 'Le nom doit contenir au moins 2 caractères')
  .max(100, 'Le nom est trop long')
  .regex(/^[a-zA-ZÀ-ÿ\-\s']+$/, 'Le nom contient des caractères non autorisés')
  .transform(val => sanitizeString(val))
  .refine(val => !containsDangerousPattern(val), {
    message: 'Le nom contient des caractères dangereux'
  });

export const paginationSchema = z.object({
  page: z.string().optional().default('1')
    .transform(val => parseInt(val) || 1)
    .refine(val => val > 0 && val <= 1000, 'Page invalide'),
  limit: z.string().optional().default('20')
    .transform(val => parseInt(val) || 20)
    .refine(val => val > 0 && val <= 100, 'Limite invalide'),
});

// Schéma de validation pour le login SuperAdmin
export const superAdminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Le mot de passe est requis'),
  rememberMe: z.boolean().optional().default(false),
});

// Schéma pour la création d'un poste
export const createPosteSchema = z.object({
  nom: z.string()
    .min(3, 'Le nom doit contenir au moins 3 caractères')
    .max(100, 'Le nom est trop long')
    .transform(val => sanitizeString(val)),
  type: z.enum(['CONTROLE', 'PEAGE', 'DOUANE', 'FRONTIERE']),
  latitude: z.union([
    z.number().min(-90).max(90),
    z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val >= -90 && val <= 90, 'Latitude invalide')
  ]),
  longitude: z.union([
    z.number().min(-180).max(180),
    z.string().transform(val => parseFloat(val)).refine(val => !isNaN(val) && val >= -180 && val <= 180, 'Longitude invalide')
  ]),
  adresse: z.string().max(255).optional().transform(val => val ? sanitizeString(val) : undefined),
  ville: z.string().min(2).max(100).transform(val => sanitizeString(val)),
  region: z.string().min(2).max(100).transform(val => sanitizeString(val)),
  telephone: z.string().optional().transform(val => val ? val.replace(/\D/g, '') : undefined),
});

// Type exportés pour TypeScript
export type SuperAdminLoginInput = z.infer<typeof superAdminLoginSchema>;
export type CreatePosteInput = z.infer<typeof createPosteSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
