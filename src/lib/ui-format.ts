import type { ResStatus } from './types';

/* Funciones puras de presentación de MOREFEST. Sin React ni Supabase; imports relativos (vitest no resuelve '@/').
   La fecha larga del evento (eventDateLabel) y los montos con centavos (formatMoney) viven en logic.ts (plan A). */

/** "1 reserva", "3 reservas". */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Nombre corto del lugar para el encabezado: "Restaurante VOLTERRA, Maracaibo" pasa a "VOLTERRA". */
export function placeName(venue: string | null | undefined): string {
  const name = (venue ?? '').split(',')[0].replace(/^restaurante\s+/i, '').trim();
  return name || 'VOLTERRA';
}

/** Montos del resumen sin centavos y con punto de miles venezolano: $3.040. */
export function moneyShort(n: number): string {
  return `$${new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

/** Lo que devuelve summarize() de logic.ts y usa el resumen. */
export interface Summary {
  sold: number;
  collected: number;
  pending: number;
  seatsFree: number;
  totalSeats: number;
  untouched: number;
  totalTables: number;
  inside: number;
}

/** Las seis cifras del resumen: etiqueta, valor en dorado y nota debajo. */
export function statItems(s: Summary, reservations: number): [label: string, value: string, note: string][] {
  const pct = s.sold > 0 ? Math.round((s.collected / s.sold) * 100) : 0;
  return [
    ['Vendido', moneyShort(s.sold), plural(reservations, 'reserva', 'reservas')],
    ['Cobrado', moneyShort(s.collected), `${pct}% del total`],
    ['Por cobrar', moneyShort(s.pending), 'en saldos'],
    ['Puestos libres', String(s.seatsFree), `de ${s.totalSeats}`],
    ['Mesas sin tocar', String(s.untouched), `de ${s.totalTables}`],
    ['Personas dentro', String(s.inside), 'ya llegaron'],
  ];
}

/** Métodos de pago que acepta Alejandro, en el orden en que más los usa. */
export const METHODS = ['Efectivo', 'Zelle', 'Pago móvil', 'Transferencia'];

/** Estado de una reserva en palabras de la puerta. */
export const RES_LABEL: Record<ResStatus, string> = { held: 'Con saldo', paid: 'Pagada', in: 'Llegó' };

/** Barra de puestos de la hoja: primero los que llegaron, luego los vendidos, luego los libres. */
export function seatBar(capacity: number, sold: number, inSeats: number): ('in' | 'on' | '')[] {
  return Array.from({ length: capacity }, (_, i) => (i < inSeats ? 'in' : i < sold ? 'on' : ''));
}

/** Nombre de cada movimiento: los abonos se numeran solos, los reversos no cuentan. */
export function payLabels(payments: { kind: 'payment' | 'reversal' }[]): string[] {
  let n = 0;
  return payments.map((p) => (p.kind === 'reversal' ? 'Reverso' : `Abono ${++n}`));
}
