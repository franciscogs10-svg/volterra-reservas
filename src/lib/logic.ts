import type { Reservation, ResStatus, TableRow, TableStatus } from './types';

export const LABEL: Record<TableStatus, string> = {
  free: 'Disponible',
  part: 'Parcial',
  held: 'Reservada',
  paid: 'Pagada',
  in: 'Ocupada',
};

export const money = (n: number) => `$${n.toFixed(2)}`;

export function fmtDate(d: string | null) {
  if (!d) return 'fecha por definir';
  const [y, m, day] = d.split('-');
  return `${day}/${m}/${y}`;
}

export const paid = (r: Reservation) => r.payments.reduce((s, p) => s + p.amount, 0);
export const balance = (r: Reservation) => r.total_price - paid(r);

export function resStatus(r: Reservation): ResStatus {
  if (r.checked_in !== null) return 'in';
  if (r.total_price > 0 && paid(r) >= r.total_price) return 'paid';
  return 'held';
}

export const forTable = (tableId: string, all: Reservation[]) => all.filter((r) => r.table_id === tableId);
export const soldSeats = (tableId: string, all: Reservation[]) =>
  forTable(tableId, all).reduce((s, r) => s + r.guests, 0);

export function tableStatus(t: TableRow, all: Reservation[]): TableStatus {
  const list = forTable(t.id, all);
  if (!list.length) return 'free';
  if (list.reduce((s, r) => s + r.guests, 0) < t.capacity) return 'part';
  if (list.every((r) => resStatus(r) === 'in')) return 'in';
  if (list.every((r) => resStatus(r) !== 'held')) return 'paid';
  return 'held';
}

/** Precio fijado para el puesto, o el de la mesa dividido entre sus puestos. Null si no hay precio. */
export function seatPrice(t: TableRow): number | null {
  if (t.seat_price !== null) return t.seat_price;
  if (t.price !== null && t.price > 0) return t.price / t.capacity;
  return null;
}

export function summarize(tables: TableRow[], all: Reservation[]) {
  const totalSeats = tables.reduce((s, t) => s + t.capacity, 0);
  const sold = all.reduce((s, r) => s + r.total_price, 0);
  const collected = all.reduce((s, r) => s + paid(r), 0);
  const seats = all.reduce((s, r) => s + r.guests, 0);
  const inside = all.reduce((s, r) => s + (r.checked_in ?? 0), 0);
  const untouched = tables.filter((t) => !forTable(t.id, all).length).length;
  return {
    sold,
    collected,
    pending: sold - collected,
    seatsFree: totalSeats - seats,
    totalSeats,
    untouched,
    totalTables: tables.length,
    inside,
  };
}

const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

export function toCsv(tables: TableRow[], all: Reservation[]) {
  const code = new Map(tables.map((t) => [t.id, t.code]));
  const rows = [['mesa', 'reserva', 'cliente', 'whatsapp', 'puestos', 'total', 'pagado', 'saldo', 'estado']];
  [...all]
    .sort((a, b) => (code.get(a.table_id) ?? '').localeCompare(code.get(b.table_id) ?? ''))
    .forEach((r) =>
      rows.push([
        code.get(r.table_id) ?? '',
        r.code,
        r.name,
        r.phone ?? '',
        String(r.guests),
        r.total_price.toFixed(2),
        paid(r).toFixed(2),
        balance(r).toFixed(2),
        LABEL[resStatus(r)],
      ]),
    );
  return rows.map((r) => r.map(csvCell).join(',')).join('\n');
}

export function friendlyError(message: string): string {
  if (/sin puestos/.test(message)) return 'Ya no quedan puestos suficientes en esta mesa. Otra reserva se adelantó, revisa el mapa.';
  if (/excede capacidad/.test(message)) return 'El grupo es más grande que la capacidad de la mesa.';
  if (/anticipo/.test(message)) return 'El anticipo no puede ser mayor al total.';
  if (/forbidden/.test(message)) return 'Tu sesión no tiene permiso para esta acción. Vuelve a entrar.';
  if (/excede los puestos/.test(message)) return 'No pueden entrar más personas que los puestos de la reserva.';
  if (/duplicate|unique/.test(message)) return 'Esta acción ya estaba registrada.';
  return message;
}
