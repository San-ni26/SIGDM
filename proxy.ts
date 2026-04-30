/**
 * ============================================================================
 * PROXY DE SÉCURITÉ GLOBAL (Next.js Proxy)
 * ============================================================================
 * Remplace le middleware déprécié - Protection CSRF, headers de sécurité
 */

import { NextRequest, NextResponse } from 'next/server';

// En-têtes de sécurité HTTP
const SECURITY_HEADERS = {
  'Content-Security-Policy': 
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' blob: data: https:; " +
    "font-src 'self'; " +
    "connect-src 'self' https://*.prisma.io https://*.googleapis.com; " +
    "frame-ancestors 'none'; " +
    "base-uri 'self'; " +
    "form-action 'self';",
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(self), camera=(self), microphone=()',
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
};

// Stockage simple en mémoire pour le rate limiting
const ipRequests = new Map<string, { count: number; resetTime: number }>();

function checkIPRateLimit(ip: string): { success: boolean; remaining: number; reset: number } {
  const now = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 100;
  
  const record = ipRequests.get(ip);
  
  if (!record || now > record.resetTime) {
    ipRequests.set(ip, { count: 1, resetTime: now + windowMs });
    return { success: true, remaining: maxRequests - 1, reset: Math.floor((now + windowMs) / 1000) };
  }
  
  if (record.count >= maxRequests) {
    return { success: false, remaining: 0, reset: Math.floor(record.resetTime / 1000) };
  }
  
  record.count++;
  return { success: true, remaining: maxRequests - record.count, reset: Math.floor(record.resetTime / 1000) };
}

function getClientIP(request: NextRequest): string {
  const headers = ['x-forwarded-for', 'x-real-ip', 'cf-connecting-ip', 'x-client-ip'];
  
  for (const header of headers) {
    const value = request.headers.get(header);
    if (value) {
      const ip = value.split(',')[0].trim();
      if (/^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(ip)) return ip;
    }
  }
  
  return '127.0.0.1';
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const clientIP = getClientIP(request);
  
  // Rate limiting
  const rateLimitResult = checkIPRateLimit(clientIP);
  
  if (!rateLimitResult.success) {
    return new NextResponse(
      JSON.stringify({ error: 'Trop de requêtes', message: 'Veuillez réessayer plus tard.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': (rateLimitResult.reset - Math.floor(Date.now() / 1000)).toString(),
          ...SECURITY_HEADERS,
        },
      }
    );
  }
  
  // Vérifier l'authentification pour les routes protégées
  const PROTECTED_ROUTES = ['/dashboard', '/api/admin', '/api/dashboard'];
  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route));
  
  if (isProtectedRoute) {
    const token = request.cookies.get('access_token')?.value;
    
    if (!token && pathname.startsWith('/api')) {
      return new NextResponse(
        JSON.stringify({ error: 'Authentification requise' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
        }
      );
    }
    
    if (!token && !pathname.startsWith('/api')) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }
  
  // Vérifier CSRF pour les mutations API
  if (pathname.startsWith('/api/admin') && request.method !== 'GET') {
    const requestedWith = request.headers.get('x-requested-with');
    if (!requestedWith || requestedWith !== 'XMLHttpRequest') {
      return new NextResponse(
        JSON.stringify({ error: 'Requête non autorisée' }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
        }
      );
    }
  }
  
  // Continuer avec les headers de sécurité
  const response = NextResponse.next();
  
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });
  
  response.headers.set('X-RateLimit-Limit', '100');
  response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
  response.headers.set('X-RateLimit-Reset', rateLimitResult.reset.toString());
  
  return response;
}

// Configuration du proxy
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public/).*)'],
};
