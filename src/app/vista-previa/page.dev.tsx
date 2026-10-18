import type { AppRole } from '@/lib/types';
import { Preview } from './Preview';

const ROLES: Record<string, AppRole> = { admin: 'admin', vendedor: 'seller', puerta: 'door' };

/**
 * Vista previa con datos de ejemplo, solo con `next dev` (ver pageExtensions en next.config.ts).
 *   /vista-previa                panel como admin
 *   /vista-previa?rol=vendedor   ve pagos, no revierte
 *   /vista-previa?rol=puerta     no ve pagos
 *   /vista-previa?p=entrar       pantalla de entrada
 */
export default async function VistaPrevia({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const rol = ROLES[String(sp.rol ?? 'admin')] ?? 'admin';
  return <Preview pantalla={sp.p === 'entrar' ? 'entrar' : 'panel'} rol={rol} />;
}
