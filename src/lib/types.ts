export type AreaCode = 'PB' | 'VIP';
export type AppRole = 'admin' | 'seller' | 'door';

export interface EventRow {
  id: string;
  name: string;
  venue: string | null;
  event_date: string | null;
}

export interface TableRow {
  id: string;
  code: string;
  area: AreaCode;
  capacity: number;
  price: number | null;
  seat_price: number | null;
  map_x: number;
  map_y: number;
  map_w: number;
  map_h: number;
  map_rot: number;
  shape: 'r' | 'c';
}

export interface Payment {
  id: string;
  amount: number;
  kind: 'payment' | 'reversal';
  method: string;
  created_at: string;
  /** En un reverso, el pago que revierte (0008). Null en los pagos. */
  reverses_payment_id: string | null;
}

export interface Reservation {
  id: string;
  code: string;
  table_id: string;
  guests: number;
  total_price: number;
  notes: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  payments: Payment[];
  checked_in: number | null;
  checked_in_at: string | null;
}

export type TableStatus = 'free' | 'part' | 'held' | 'paid' | 'in';
export type ResStatus = 'held' | 'paid' | 'in';

/** Una fila de la lista de protocolo de la puerta. `balance` es null cuando el rol no ve pagos (puerta). */
export interface ProtocolRow {
  reservationId: string;
  tableId: string;
  tableCode: string;
  area: AreaCode;
  name: string;
  guests: number;
  code: string;
  balance: number | null;
  checkedIn: number | null;
  checkedInAt: string | null;
  notes: string | null;
}
