import { describe, expect, it } from 'vitest';
import config from '../next.config';

async function headersFor(supabaseUrl: string | undefined) {
  const before = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  else process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
  try {
    expect(typeof config.headers).toBe('function');
    const rules = await config.headers!();
    const all = rules.find((r) => r.source === '/:path*');
    expect(all, 'regla para todas las rutas').toBeDefined();
    return Object.fromEntries(all!.headers.map((h) => [h.key.toLowerCase(), h.value]));
  } finally {
    if (before === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    else process.env.NEXT_PUBLIC_SUPABASE_URL = before;
  }
}

describe('cabeceras de seguridad', () => {
  it('nadie puede meter la app en un iframe ni adivinar tipos de archivo', async () => {
    const h = await headersFor('https://abc.supabase.co');
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['permissions-policy']).toContain('microphone=()');
    expect(h['permissions-policy']).toContain('camera=(self)'); // la puerta podrá leer QR con la cámara
  });

  it('la CSP solo deja hablar con el propio Supabase; fuentes y estilos salen del mismo dominio', async () => {
    const csp = (await headersFor('https://abc.supabase.co'))['content-security-policy'];
    const directive = (name: string) => csp.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name} `));
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co");
    expect(directive('font-src')).toBe("font-src 'self'");
    expect(directive('style-src')).toBe("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain('fonts.googleapis.com');
    expect(csp).not.toContain('fonts.gstatic.com');
  });

  it('sin URL de Supabase configurada cae a los dominios de Supabase', async () => {
    const csp = (await headersFor(undefined))['content-security-policy'];
    expect(csp).toContain("connect-src 'self' https://*.supabase.co wss://*.supabase.co");
  });
});
