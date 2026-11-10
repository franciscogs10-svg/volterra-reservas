import type { AppRole, Reservation } from './types';

/** Deshacer una llegada marcada por error es solo del admin (undo_check_in exige require_role('admin')). */
export const mayUndoArrival = (role: AppRole | null) => role === 'admin';

/** El botón "Deshacer llegada" se ofrece solo al admin y solo si la reserva tiene llegada confirmada. */
export const undoOffered = (r: Reservation, role: AppRole | null) => mayUndoArrival(role) && r.checked_in !== null;

/** Aviso de confirmación tras deshacer. */
export const undoMessage = (r: Reservation) => `Llegada de ${r.name} deshecha. Puede volver a marcarse o cancelarse.`;
