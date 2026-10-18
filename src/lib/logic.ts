import type { AreaCode, EventRow, ProtocolRow, Reservation, ResStatus, TableRow, TableStatus } from './types';

export const LABEL: Record<TableStatus, string> = {
  free: 'Disponible',
  part: 'Parcial',
  held: 'Reservada',
  paid: 'Pagada',
  in: 'Ocupada',
};

const MONEY = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' });
const DIGIT_PARTS = new Set(['integer', 'group', 'decimal', 'fraction']);

/** Monto al estilo venezolano: $1.234,50 y -$80,00. Se arma con las partes de Intl porque, según
 *  la versión de ICU, el símbolo sale como "USD", "US$" o "$" y con espacios duros (Node 24 da "USD 240,00"). */
export function formatMoney(n: number): string {
  const digits = MONEY.formatToParts(Math.abs(n))
    .filter((p) => DIGIT_PARTS.has(p.type))
    .map((p) => p.value)
    .join('');
  return `${n < 0 && /[1-9]/.test(digits) ? '-' : ''}$${digits}`;
}

/** Nombre viejo: los componentes actuales lo importan. Cuando el plan B los pase a formatMoney, se borra. */
export const money = formatMoney;

/** Misma regla que la restricción customers_email_format (0009), sobre el texto sin espacios a los lados. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i;
export const isValidEmail = (s: string) => EMAIL.test(s.trim());

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

/** `retained`: neto de los abonos retenidos de reservas canceladas (snapshot.retained). Suma a lo cobrado,
 *  pero no a lo pendiente: esas reservas ya no deben nada. */
export function summarize(tables: TableRow[], all: Reservation[], retained = 0) {
  const totalSeats = tables.reduce((s, t) => s + t.capacity, 0);
  const sold = all.reduce((s, r) => s + r.total_price, 0);
  const active = all.reduce((s, r) => s + paid(r), 0);
  const collected = active + retained;
  const seats = all.reduce((s, r) => s + r.guests, 0);
  const inside = all.reduce((s, r) => s + (r.checked_in ?? 0), 0);
  const untouched = tables.filter((t) => !forTable(t.id, all).length).length;
  return {
    sold,
    collected,
    pending: sold - active,
    retained,
    seatsFree: totalSeats - seats,
    totalSeats,
    untouched,
    totalTables: tables.length,
    inside,
  };
}

/** Excel ejecuta como fórmula lo que empieza con = + - @; un teléfono (+58 412...) no se toca. */
const neutralize = (s: string) => (/^[=+\-@\t\r]/.test(s) && !/^[+-][\d\s().-]*$/.test(s) ? `'${s}` : s);
const csvCell = (v: string | number) => `"${neutralize(String(v)).replace(/"/g, '""')}"`;

export function toCsv(tables: TableRow[], all: Reservation[]) {
  const code = new Map(tables.map((t) => [t.id, t.code]));
  const rows = [['mesa', 'reserva', 'cliente', 'whatsapp', 'correo', 'puestos', 'total', 'pagado', 'saldo', 'estado']];
  [...all]
    .sort((a, b) => (code.get(a.table_id) ?? '').localeCompare(code.get(b.table_id) ?? ''))
    .forEach((r) =>
      rows.push([
        code.get(r.table_id) ?? '',
        r.code,
        r.name,
        r.phone ?? '',
        r.email ?? '',
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
  if (/customers_email_format/.test(message)) return 'El correo no tiene un formato válido. Revisa que tenga @ y un dominio.';
  if (/la cancelación exige motivo/.test(message)) return 'Escribe el motivo de la cancelación.';
  if (/el abono supera el saldo/.test(message)) return 'El abono es mayor que el saldo de la reserva. Revisa el monto.';
  if (/reserva ya cancelada/.test(message)) return 'Esa reserva ya estaba cancelada.';
  if (/reserva cancelada/.test(message)) return 'Esa reserva está cancelada y ya no recibe abonos.';
  if (/monto inválido/.test(message)) return 'El monto debe ser mayor que cero.';
  if (/falta el método de pago/.test(message)) return 'Elige el método de pago.';
  if (/falta el nombre/.test(message)) return 'Escribe el nombre del cliente.';
  if (/reserva inexistente/.test(message)) return 'Esa reserva ya no existe. Revisa el mapa.';
  if (/pago inexistente/.test(message)) return 'Ese pago ya no existe. Revisa la reserva.';
  if (/ya revertido/.test(message)) return 'Ese pago ya estaba revertido.';
  if (/exige motivo/.test(message)) return 'Escribe el motivo del reverso.';
  if (/duplicate|unique/.test(message)) return 'Esta acción ya estaba registrada.';
  return message;
}

const EVENT_DATE = new Intl.DateTimeFormat('es-VE', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
const PAY_DATE = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas',
});
const AREA_NAME: Record<AreaCode, string> = { PB: 'planta baja', VIP: 'planta alta VIP' };

/** "Sábado, 14 de noviembre de 2026", o "Fecha por anunciar" si el evento no tiene fecha. */
export function eventDateLabel(d: string | null): string {
  if (!d) return 'Fecha por anunciar';
  const s = EVENT_DATE.format(new Date(`${d}T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Correo de confirmación que Alejandro envía desde su propia app de correo (spec, sección 6).
 *  Los reversos netean: un pago revertido y su reverso no se listan, y lo listado suma lo pagado. */
export function confirmationMessage(r: Reservation, table: TableRow, ev: EventRow): { subject: string; body: string } {
  const reversed = new Set(r.payments.map((p) => p.reverses_payment_id));
  const lines = r.payments
    .filter((p) => p.kind === 'payment' && !reversed.has(p.id))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((p) => `- ${PAY_DATE.format(new Date(p.created_at))}, ${p.method}: ${formatMoney(p.amount)}`);
  const bal = balance(r);
  const body = [
    `Hola, ${r.name.trim()}:`,
    '',
    'Te confirmamos tu reserva para MOREFEST.',
    '',
    `Mesa ${table.code}, ${AREA_NAME[table.area]}`,
    `${r.guests} ${r.guests === 1 ? 'persona' : 'personas'}`,
    eventDateLabel(ev.event_date),
    ...(ev.venue ? [ev.venue] : []),
    `Código de reserva: ${r.code}`,
    '',
    `Total: ${formatMoney(r.total_price)}`,
    'Abonos:',
    ...(lines.length ? lines : ['- Sin abonos todavía']),
    `Pagado: ${formatMoney(paid(r))}`,
    r.total_price > 0 && bal <= 0 ? 'Pagado completo' : `Saldo pendiente: ${formatMoney(Math.max(0, bal))}`,
    '',
    'En la puerta te ubicamos por tu nombre o por el código de la reserva.',
    '',
    'Corporación Montiel',
  ].join('\n');
  return { subject: `MOREFEST · Confirmación de tu reserva (Mesa ${table.code})`, body };
}

/** Enlace mailto con asunto y cuerpo codificados, o null si pasa de 1.800 caracteres: algunos clientes
 *  de correo cortan los enlaces largos, y entonces la interfaz avisa y deja "Copiar mensaje".
 *  El correo debe llegar ya validado con isValidEmail. */
export function mailtoHref(email: string, msg: { subject: string; body: string }): string | null {
  const to = encodeURIComponent(email.trim()).replace(/%40/g, '@');
  const href = `mailto:${to}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.body)}`;
  return href.length > 1800 ? null : href;
}

const AREA_ORDER: Record<AreaCode, number> = { PB: 0, VIP: 1 };
const TABLE_CODE = new Intl.Collator('es', { numeric: true }); // PB-2 antes que PB-10
const byName = (a: ProtocolRow, b: ProtocolRow) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
const byTable = (a: ProtocolRow, b: ProtocolRow) => TABLE_CODE.compare(a.tableCode, b.tableCode);

/** Lista de la puerta: una fila por reserva activa (las canceladas no llegan al snapshot), planta baja
 *  antes que VIP, por mesa o por nombre. Una reserva de una mesa fuera del mapa (retirada) no sale.
 *  Sin permiso de pagos (rol puerta) el saldo va en null: la base no le muestra los abonos. */
export function protocolRows(
  tables: TableRow[], reservations: Reservation[], order: 'mesa' | 'nombre', canSeePayments: boolean,
): ProtocolRow[] {
  const byId = new Map(tables.map((t) => [t.id, t]));
  const rows = reservations.flatMap((r): ProtocolRow[] => {
    const t = byId.get(r.table_id);
    if (!t) return [];
    return [{
      reservationId: r.id, tableId: t.id, tableCode: t.code, area: t.area, name: r.name, guests: r.guests,
      code: r.code, balance: canSeePayments ? balance(r) : null, checkedIn: r.checked_in,
      checkedInAt: r.checked_in_at, notes: r.notes,
    }];
  });
  return rows.sort(
    (a, b) =>
      AREA_ORDER[a.area] - AREA_ORDER[b.area] ||
      (order === 'mesa' ? byTable(a, b) || byName(a, b) : byName(a, b) || byTable(a, b)) ||
      a.code.localeCompare(b.code),
  );
}

export function protocolTotals(rows: ProtocolRow[]): { reservations: number; expected: number; inside: number } {
  return {
    reservations: rows.length,
    expected: rows.reduce((s, r) => s + r.guests, 0),
    inside: rows.reduce((s, r) => s + (r.checkedIn ?? 0), 0),
  };
}
