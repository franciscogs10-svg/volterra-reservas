import type { AppRole } from './types';

/** Ven montos y abonos admin y vendedor (espejo de la política read_pay de 0001); la puerta no. */
export const seesPayments = (role: AppRole | null) => role === 'admin' || role === 'seller';
