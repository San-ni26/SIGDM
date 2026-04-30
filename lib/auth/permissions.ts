/**
 * ============================================================================
 * AUTHENTIFICATION ET PERMISSIONS
 * ============================================================================
 * Système unifié d'authentification et de vérification des droits
 */

// ============================================================================
// TYPES
// ============================================================================

export type UserRole = 
  | 'SUPER_ADMIN'
  | 'AGENT_CONTROLE'
  | 'AGENT_DOUANE'
  | 'AGENT_PEAGE'
  | 'ENTREPRISE'
  | 'COMPAGNIE'
  | 'CITOYEN';

export type Permission =
  // Trajets
  | 'trip:declare'
  | 'trip:view'
  | 'trip:validate'
  | 'trip:cancel'
  | 'trip:view_all'
  // Véhicules
  | 'vehicle:register'
  | 'vehicle:view'
  | 'vehicle:edit'
  | 'vehicle:view_all'
  // Postes
  | 'post:manage'
  | 'post:view'
  // Agents
  | 'agent:manage'
  | 'agent:view'
  // Anomalies
  | 'anomaly:signal'
  | 'anomaly:view'
  | 'anomaly:resolve'
  // Audit
  | 'audit:view'
  // Admin
  | 'admin:super'
  | 'admin:stats'
  // Citoyens
  | 'citoyen:view'
  | 'citoyen:manage';

export interface AuthenticatedUser {
  id: string;
  userType: UserRole;
  email?: string | null;
  status: 'ACTIF' | 'INACTIF' | 'SUSPENDU' | 'EN_ATTENTE';
  // Profil spécifique selon le type
  profile?: {
    id: string;
    nom: string;
    prenom?: string;
    telephone?: string;
    matricule?: string;
    // Agent
    posteId?: string;
    typeAgent?: string;
    // Entreprise/Compagnie
    raisonSociale?: string;
    // SuperAdmin
    niveauAcces?: 'NATIONAL' | 'REGIONAL';
  };
}

// ============================================================================
// PERMISSIONS PAR RÔLE
// ============================================================================

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  SUPER_ADMIN: [
    'trip:view_all', 'trip:cancel',
    'vehicle:view_all', 'vehicle:edit',
    'post:manage', 'post:view',
    'agent:manage', 'agent:view',
    'anomaly:view', 'anomaly:resolve',
    'audit:view',
    'admin:super', 'admin:stats',
    'citoyen:view', 'citoyen:manage',
  ],
  AGENT_CONTROLE: [
    'trip:view', 'trip:validate',
    'vehicle:view',
    'post:view',
    'anomaly:signal', 'anomaly:view',
  ],
  AGENT_DOUANE: [
    'trip:view', 'trip:validate',
    'vehicle:view',
    'post:view',
    'anomaly:signal', 'anomaly:view',
  ],
  AGENT_PEAGE: [
    'trip:view', 'trip:validate',
    'vehicle:view',
    'post:view',
    'anomaly:signal', 'anomaly:view',
  ],
  ENTREPRISE: [
    'trip:declare', 'trip:view', 'trip:cancel',
    'vehicle:register', 'vehicle:view', 'vehicle:edit',
  ],
  COMPAGNIE: [
    'trip:declare', 'trip:view', 'trip:cancel',
    'vehicle:register', 'vehicle:view', 'vehicle:edit',
  ],
  CITOYEN: [
    'trip:declare', 'trip:view', 'trip:cancel',
    'vehicle:register', 'vehicle:view', 'vehicle:edit',
  ],
};

// ============================================================================
// FONCTIONS DE VÉRIFICATION
// ============================================================================

export function hasPermission(user: AuthenticatedUser | null, permission: Permission): boolean {
  if (!user) return false;
  if (user.status !== 'ACTIF') return false;
  
  const permissions = ROLE_PERMISSIONS[user.userType];
  return permissions?.includes(permission) ?? false;
}

export function hasAnyPermission(user: AuthenticatedUser | null, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(user, p));
}

export function hasAllPermissions(user: AuthenticatedUser | null, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(user, p));
}

export function getRolePermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// ============================================================================
// GARDES DE ROUTES
// ============================================================================

export interface RouteGuard {
  requireAuth: boolean;
  allowedRoles?: UserRole[];
  requiredPermissions?: Permission[];
  requireActive?: boolean;
}

export const ROUTE_GUARDS: Record<string, RouteGuard> = {
  // Admin routes
  '/admin': {
    requireAuth: true,
    allowedRoles: ['SUPER_ADMIN'],
    requiredPermissions: ['admin:super'],
  },
  '/admin/dashboard': {
    requireAuth: true,
    allowedRoles: ['SUPER_ADMIN'],
    requiredPermissions: ['admin:super'],
  },
  
  // Agent routes
  '/agent': {
    requireAuth: true,
    allowedRoles: ['AGENT_CONTROLE', 'AGENT_DOUANE', 'AGENT_PEAGE'],
  },
  '/agent/dashboard': {
    requireAuth: true,
    allowedRoles: ['AGENT_CONTROLE', 'AGENT_DOUANE', 'AGENT_PEAGE'],
  },
  '/agent/validation': {
    requireAuth: true,
    allowedRoles: ['AGENT_CONTROLE', 'AGENT_DOUANE', 'AGENT_PEAGE'],
    requiredPermissions: ['trip:validate'],
  },
  '/agent/anomalie': {
    requireAuth: true,
    allowedRoles: ['AGENT_CONTROLE', 'AGENT_DOUANE', 'AGENT_PEAGE'],
    requiredPermissions: ['anomaly:signal'],
  },
  
  // Citoyen routes
  '/citoyen/dashboard': {
    requireAuth: true,
    allowedRoles: ['CITOYEN'],
  },
  '/citoyen/trajets': {
    requireAuth: true,
    allowedRoles: ['CITOYEN'],
    requiredPermissions: ['trip:declare'],
  },
  '/citoyen/vehicules': {
    requireAuth: true,
    allowedRoles: ['CITOYEN'],
    requiredPermissions: ['vehicle:register'],
  },
  
  // Entreprise routes
  '/entreprise': {
    requireAuth: true,
    allowedRoles: ['ENTREPRISE'],
  },
  '/entreprise/dashboard': {
    requireAuth: true,
    allowedRoles: ['ENTREPRISE'],
  },
  
  // Compagnie routes
  '/compagnie': {
    requireAuth: true,
    allowedRoles: ['COMPAGNIE'],
  },
  '/compagnie/dashboard': {
    requireAuth: true,
    allowedRoles: ['COMPAGNIE'],
  },
};

export function checkRouteAccess(
  user: AuthenticatedUser | null,
  path: string
): { allowed: boolean; reason?: string } {
  // Trouver le guard le plus spécifique
  let guard: RouteGuard | undefined;
  let matchedPath = '';
  
  for (const [routePath, routeGuard] of Object.entries(ROUTE_GUARDS)) {
    if (path.startsWith(routePath) && routePath.length > matchedPath.length) {
      guard = routeGuard;
      matchedPath = routePath;
    }
  }
  
  if (!guard) {
    return { allowed: true }; // Pas de restriction
  }
  
  if (guard.requireAuth && !user) {
    return { allowed: false, reason: 'AUTH_REQUIRED' };
  }
  
  if (guard.requireActive && user?.status !== 'ACTIF') {
    return { allowed: false, reason: 'ACCOUNT_INACTIVE' };
  }
  
  if (guard.allowedRoles && user) {
    if (!guard.allowedRoles.includes(user.userType)) {
      return { allowed: false, reason: 'ROLE_NOT_ALLOWED' };
    }
  }
  
  if (guard.requiredPermissions && user) {
    const hasAll = guard.requiredPermissions.every(p => hasPermission(user, p));
    if (!hasAll) {
      return { allowed: false, reason: 'PERMISSION_DENIED' };
    }
  }
  
  return { allowed: true };
}

// ============================================================================
// HELPERS
// ============================================================================

export function getDashboardForRole(role: UserRole): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/dashboard';
    case 'AGENT_CONTROLE':
    case 'AGENT_DOUANE':
    case 'AGENT_PEAGE':
      return '/agent/dashboard';
    case 'ENTREPRISE':
      return '/entreprise/dashboard';
    case 'COMPAGNIE':
      return '/compagnie/dashboard';
    case 'CITOYEN':
      return '/citoyen/dashboard';
    default:
      return '/';
  }
}

export function getRoleLabel(role: UserRole): string {
  const labels: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Administrateur',
    AGENT_CONTROLE: 'Agent de Contrôle',
    AGENT_DOUANE: 'Agent des Douanes',
    AGENT_PEAGE: 'Agent de Péage',
    ENTREPRISE: 'Entreprise de Transport',
    COMPAGNIE: 'Compagnie de Transport',
    CITOYEN: 'Citoyen',
  };
  return labels[role] || role;
}

export function getRoleColor(role: UserRole): string {
  const colors: Record<UserRole, string> = {
    SUPER_ADMIN: 'text-red-500',
    AGENT_CONTROLE: 'text-blue-500',
    AGENT_DOUANE: 'text-green-500',
    AGENT_PEAGE: 'text-amber-500',
    ENTREPRISE: 'text-purple-500',
    COMPAGNIE: 'text-pink-500',
    CITOYEN: 'text-cyan-500',
  };
  return colors[role] || 'text-gray-500';
}
