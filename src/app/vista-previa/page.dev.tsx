import { Preview } from './Preview';

/**
 * Vista previa con datos de ejemplo, solo con `next dev` (ver pageExtensions en next.config.ts).
 *   /vista-previa            panel
 *   /vista-previa?p=entrar   pantalla de entrada
 */
export default async function VistaPrevia({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <Preview pantalla={sp.p === 'entrar' ? 'entrar' : 'panel'} />;
}
