import { formatMoney, paid } from './logic';
import type { AppRole, Reservation } from './types';

/** Devolver = cancel_and_refund (revierte cada abono). Retener = cancel_reservation (los pagos no se tocan). */
export type CancelMode = 'refund' | 'retain';

export const MODE_LABEL: Record<CancelMode, string> = { refund: 'Devolver el abono', retain: 'Retener el abono' };
export const MODE_HELP: Record<CancelMode, string> = {
  refund: 'Cada abono queda revertido en el historial y sale de lo cobrado.',
  retain: 'La mesa se libera y el dinero sigue contando en lo cobrado.',
};

/** Cancelar es solo del admin (cancel_reservation y cancel_and_refund exigen require_role('admin')). */
export const mayCancel = (role: AppRole | null) => role === 'admin';

export interface CancelPlan {
  /** Se muestra el formulario de cancelación. */
  offered: boolean;
  /** Texto cuando no se puede cancelar aunque el rol sea admin; '' si no hay nada que explicar. */
  blocked: string;
  /** Hay abono neto positivo: hay que elegir devolver o retener. */
  asksMode: boolean;
  /** Abono neto de la reserva (pagos menos reversos). */
  net: number;
}

export function cancelPlan(r: Reservation, role: AppRole | null): CancelPlan {
  const net = Math.round(paid(r) * 100) / 100;
  if (!mayCancel(role)) return { offered: false, blocked: '', asksMode: false, net };
  if (r.checked_in !== null) return { offered: false, blocked: 'Ya entró: no se puede cancelar.', asksMode: false, net };
  return { offered: true, blocked: '', asksMode: net > 0, net };
}

export interface CancelErrors {
  mode: string;
  reason: string;
}

/** Errores de cada campo, '' si está bien. Con abono neto la opción es obligatoria; el motivo siempre. */
export function cancelErrors(plan: CancelPlan, mode: CancelMode | null, reason: string): CancelErrors {
  return {
    mode: plan.asksMode && mode === null ? 'Elige si devuelves o retienes el abono.' : '',
    reason: reason.trim() ? '' : 'Escribe el motivo de la cancelación.',
  };
}

/** Función de la base: devolver llama a cancel_and_refund; retener, o cancelar sin abono, a cancel_reservation. */
export const cancelRpc = (mode: CancelMode | null) => (mode === 'refund' ? 'cancel_and_refund' : 'cancel_reservation');

/** Aviso de confirmación, distinto para cada decisión. */
export function cancelMessage(mode: CancelMode | null, net: number): string {
  if (net <= 0) return 'Reserva cancelada. Los puestos quedaron libres.';
  if (mode === 'refund') return `Reserva cancelada. Se devolvió ${formatMoney(net)}.`;
  if (mode === 'retain') return `Reserva cancelada. El abono de ${formatMoney(net)} quedó retenido.`;
  return 'Reserva cancelada. Los puestos quedaron libres.';
}
