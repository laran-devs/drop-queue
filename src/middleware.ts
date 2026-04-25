import createMiddleware from 'next-intl/middleware';
import { locales } from './i18n/request';

export default createMiddleware({
  // A list of all locales that are supported
  locales,

  // Used when no locale matches
  defaultLocale: 'en',
  
  // If this is set to 'as-needed', the default locale will not have a prefix
  localePrefix: 'as-needed'
});

export const config = {
  // Match only internationalized pathnames
  matcher: ['/', '/(ru|en)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
