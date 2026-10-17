import type { NextConfig } from 'next';

/**
 * Cabeceras de seguridad para todas las rutas. La CSP solo deja hablar con el Supabase del proyecto
 * (REST, Auth y Realtime) y con Google Fonts. Next necesita 'unsafe-inline' en script-src para sus
 * scripts de hidratación; en desarrollo además 'unsafe-eval'.
 */
function securityHeaders() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const api = url ? new URL(url).origin : 'https://*.supabase.co';
  const ws = api.replace(/^https:/, 'wss:');
  const dev = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${api} ${ws}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
  return [
    { key: 'Content-Security-Policy', value: csp },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=()' },
  ];
}

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders() }];
  },
};

export default nextConfig;
