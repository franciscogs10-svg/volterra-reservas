import type { Snapshot } from '@/lib/data';
import type { AreaCode, EventRow, Payment, Reservation, TableRow } from '@/lib/types';

/** Datos de ejemplo de la vista previa: mismos clientes y estados que docs/design/morefest-prototipo.html.
 *  Nada de esto toca la base. */
type Def = [code: string, x: number, y: number, w: number, h: number, rot: number, cap: number, shape?: 'r' | 'c'];

const DEFS: Def[] = [
  ['PB-01', 302, 160, 125, 34, 0, 10], ['PB-02', 125, 318, 60, 60, 0, 4, 'c'], ['PB-03', 326, 252, 52, 52, 0, 4],
  ['PB-04', 360, 327, 108, 30, -33, 10], ['PB-05', 472, 270, 108, 30, -22, 10], ['PB-06', 525, 348, 108, 30, -33, 10],
  ['PB-07', 420, 417, 108, 30, -35, 10], ['PB-08', 600, 397, 105, 30, -60, 10], ['PB-09', 498, 472, 52, 52, 0, 4],
  ['PB-10', 590, 540, 28, 104, 0, 10], ['PB-11', 122, 500, 30, 112, 0, 10], ['PB-12', 122, 690, 30, 112, 0, 10],
  ['PB-13', 692, 422, 28, 96, 0, 10], ['PB-14', 692, 530, 28, 96, 0, 10], ['PB-15', 686, 670, 30, 118, 0, 10],
  ['PB-16', 275, 650, 26, 228, 0, 11],
  ['VIP-05', 280, 445, 96, 40, 48, 4], ['VIP-06', 352, 520, 96, 40, 48, 4], ['VIP-07', 420, 598, 96, 40, 48, 4],
];

const price = (code: string, cap: number) => (code === 'PB-16' ? null : code.startsWith('VIP') ? 600 : cap === 4 ? 180 : 400);

const tables: TableRow[] = DEFS.map(([code, x, y, w, h, rot, cap, shape]) => ({
  id: `t-${code}`,
  code,
  area: (code.startsWith('VIP') ? 'VIP' : 'PB') as AreaCode,
  capacity: cap,
  price: price(code, cap),
  seat_price: code === 'PB-16' ? 35 : null,
  map_x: x,
  map_y: y,
  map_w: w,
  map_h: h,
  map_rot: rot,
  shape: shape ?? 'r',
}));

let pid = 0;
const P = (amount: number, method: string, day: string) =>
  ({ id: `p${++pid}`, amount, kind: 'payment', method, created_at: `${day}T15:00:00Z`, reverses_payment_id: null }) as Payment;
const REV = (of: Payment, day: string) =>
  ({ id: `p${++pid}`, amount: -of.amount, kind: 'reversal', method: of.method, created_at: `${day}T16:00:00Z`, reverses_payment_id: of.id }) as Payment;

const R = (
  id: string,
  code: string,
  table: string,
  name: string,
  phone: string | null,
  email: string | null,
  guests: number,
  total: number,
  payments: Payment[],
  cin?: { n: number; at: string },
) =>
  ({
    id,
    code,
    table_id: `t-${table}`,
    guests,
    total_price: total,
    notes: null,
    name,
    phone,
    email,
    payments,
    checked_in: cin?.n ?? null,
    checked_in_at: cin?.at ?? null,
  }) as Reservation;

/** Un abono cargado dos veces y corregido con su reverso: el original no se borra. */
const doble = P(80, 'Efectivo', '2026-10-12');

const event = { id: 'ev-morefest', name: 'MOREFEST', venue: 'Restaurante VOLTERRA, Maracaibo', event_date: null } as EventRow;

export const FIXTURE = {
  event,
  tables,
  role: 'admin',
  reservations: [
    R('r01', '7C2E19', 'PB-01', 'Héctor Urdaneta', '+58 414 605 2231', null, 10, 400, [P(200, 'Zelle', '2026-10-08'), P(200, 'Pago móvil', '2026-10-15')]),
    R('r02', 'B41D07', 'PB-02', 'Daniela Fuenmayor', '+58 424 610 7782', null, 4, 180, [P(180, 'Efectivo', '2026-10-11')], { n: 4, at: '2026-11-21T00:52:00Z' }),
    R('r03', 'E90A3F', 'PB-04', 'Carmen Elena Ríos', '+58 412 771 0954', null, 10, 400, [P(150, 'Pago móvil', '2026-10-09')]),
    R('r04', 'A3F91C', 'PB-05', 'María Fernanda Urdaneta', '+58 414 612 3348', 'mafer.urdaneta@ejemplo.com', 6, 240, [P(100, 'Pago móvil', '2026-10-10'), P(140, 'Zelle', '2026-10-14')]),
    R('r05', '5D0C8B', 'PB-05', 'Rafael Bracho', '+58 424 338 4106', null, 4, 160, [P(80, 'Efectivo', '2026-10-12'), doble, REV(doble, '2026-10-12')]),
    R('r06', '1F6A2D', 'PB-07', 'Luis Ferrer', '+58 414 220 7813', null, 10, 400, [P(400, 'Transferencia', '2026-10-05')], { n: 10, at: '2026-11-21T00:14:00Z' }),
    R('r07', 'C8E5B0', 'PB-08', 'Valeria Chourio', '+58 412 447 9150', null, 10, 400, [P(200, 'Zelle', '2026-10-07'), P(200, 'Zelle', '2026-10-13')]),
    R('r08', '0B7F44', 'PB-10', 'Andreína Villalobos', '+58 412 958 4410', null, 6, 240, [P(120, 'Pago móvil', '2026-10-16')]),
    R('r09', 'D2A817', 'PB-12', 'Gabriel Añez', '+58 414 884 0561', null, 10, 400, [P(400, 'Efectivo', '2026-10-14')]),
    R('r10', '69C3E2', 'PB-14', 'Óscar Atencio', '+58 424 709 0562', null, 10, 400, [P(200, 'Pago móvil', '2026-10-15')]),
    R('r11', '3E8B5A', 'PB-16', 'José Gregorio Paz', '+58 424 733 1902', null, 3, 105, [P(105, 'Zelle', '2026-10-16')]),
    R('r12', 'F07C21', 'PB-16', 'Mariela Leal', '+58 414 590 2287', null, 2, 70, []),
    R('r13', '8A1D6E', 'VIP-05', 'Patrocinador A (ejemplo)', null, null, 4, 600, [P(600, 'Transferencia', '2026-10-03')]),
    R('r14', '27B9F3', 'VIP-06', 'Patrocinador B (ejemplo)', null, null, 4, 600, [P(300, 'Transferencia', '2026-10-03')]),
  ],
} as Snapshot;
