import type { Reservation, TableRow } from '@/lib/types';

/** Lo que la interfaz le pide a la base. Main lo implementa con Supabase; la vista previa, con avisos. */
export interface Actions {
  /** `email` llega recortado y validado; vacío si no hay. Devuelve true si la reserva quedó creada, aunque el correo no se haya guardado. */
  reserve: (
    t: TableRow,
    v: { name: string; phone: string; email: string; guests: number; total: number; deposit: number; method: string },
  ) => Promise<boolean>;
  pay: (r: Reservation, amount: number, method: string) => Promise<boolean>;
  checkIn: (r: Reservation) => Promise<boolean>;
  cancel: (r: Reservation) => Promise<boolean>;
  savePrices: (t: TableRow, price: number | null, seat: number | null) => Promise<boolean>;
  /** null borra el correo. */
  setEmail: (r: Reservation, email: string | null) => Promise<boolean>;
}

/** Aviso con el resultado de una acción. */
export interface Msg {
  text: string;
  err: boolean;
}
