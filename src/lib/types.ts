export type AreaCode = 'PB' | 'VIP';

export interface EventRow {
  id: string;
  name: string;
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
  payments: Payment[];
  checked_in: number | null;
}

export type TableStatus = 'free' | 'part' | 'held' | 'paid' | 'in';
export type ResStatus = 'held' | 'paid' | 'in';
