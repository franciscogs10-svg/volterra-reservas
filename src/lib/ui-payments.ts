import type { AppRole, Payment } from './types';
import { TZ, payLabels } from './ui-format';

/** Ven montos y abonos admin y vendedor (espejo de la política read_pay de 0001); la puerta no. */
export const seesPayments = (role: AppRole | null) => role === 'admin' || role === 'seller';

/** Revertir un abono es solo del admin (reverse_payment exige require_role('admin'), 0008). */
export const mayReverse = (role: AppRole | null) => role === 'admin';

export interface PayRow {
  p: Payment;
  label: string;
  reversed: boolean;
  canReverse: boolean;
}

/** Movimientos de una reserva con su nombre y si ya tienen reverso: un reverso por abono (0008). */
export function paymentRows(payments: Payment[]): PayRow[] {
  const reversed = new Set(payments.map((p) => p.reverses_payment_id).filter((id): id is string => id !== null));
  const labels = payLabels(payments);
  return payments.map((p, i) => {
    const done = p.kind === 'payment' && reversed.has(p.id);
    return { p, label: labels[i], reversed: done, canReverse: p.kind === 'payment' && !done };
  });
}

/** Fecha corta de un movimiento en hora de Maracaibo: "14/10". */
export function payDate(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', timeZone: TZ }).format(new Date(iso));
}
