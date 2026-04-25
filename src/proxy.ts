import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n/config';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'as-needed',
  localeDetection: false
});

/**
 * Next.js 16 Proxy Convention
 * Replaces the deprecated middleware.ts
 */
export default function proxy(req: NextRequest) {
  // CIRCUIT BREAKER
  if (req.nextUrl.pathname.includes('undefined') || req.nextUrl.pathname.includes('null')) {
    console.error(`[CIRCUIT_BREAKER] 🛑 Blocking malformed request: ${req.nextUrl.pathname}`);
    return new Response('Malformed Request', { status: 400 });
  }

  // Russian locale is now fully supported

  const response = intlMiddleware(req);

  // Add Security Headers
  if (req.nextUrl.pathname.includes('/overlay/')) {
    response.headers.set('X-Frame-Options', 'SAMEORIGIN');
  } else {
    response.headers.set('X-Frame-Options', 'DENY');
  }
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  return response;
}

export const config = {
  // Match all pathnames except for
  // - API routes (anywhere in the path)
  // - _next (Next.js internals)
  // - Static files (e.g. /favicon.ico, /images/*, /uploads/*)
  matcher: ['/((?!(?:api|_next|.*\\..*|uploads)).*)']
};
