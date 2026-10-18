import { describe, expect, it } from 'vitest';
import { balance, friendlyError, resStatus, seatPrice, summarize, tableStatus, toCsv } from '../src/lib/logic';
import type { Payment, Reservation, TableRow } from '../src/lib/types';

const table = (over: Partial<TableRow> = {}): TableRow => ({
  id: 't1', code: 'PB-04', area: 'PB', capacity: 10, price: null, seat_price: null,
  map_x: 0, map_y: 0, map_w: 10, map_h: 10, map_rot: 0, shape: 'r', ...over,
});
const res = (over: Partial<Reservation> = {}): Reservation => ({
  id: 'r1', code: 'AB12CD', table_id: 't1', guests: 4, total_price: 100, notes: null,
  name: 'Marcela', phone: '+58 412', email: null, payments: [], checked_in: null, checked_in_at: null, ...over,
});
const pay = (amount: number, over: Partial<Payment> = {}): Payment => ({
  id: String(Math.random()), amount, kind: 'payment', method: 'Efectivo',
  created_at: '2026-10-12T15:00:00+00:00', reverses_payment_id: null, ...over,
});

describe('estado de reserva', () => {
  it('reservada sin pagos, pagada al completar, ocupada al ingresar', () => {
    expect(resStatus(res())).toBe('held');
    expect(resStatus(res({ payments: [pay(50)] }))).toBe('held');
    expect(resStatus(res({ payments: [pay(50), pay(50)] }))).toBe('paid');
    expect(resStatus(res({ checked_in: 4 }))).toBe('in');
  });
  it('sin precio definido no cuenta como pagada', () => {
    expect(resStatus(res({ total_price: 0 }))).toBe('held');
  });
  it('un reverso baja lo pagado y sube el saldo', () => {
    const r = res({ payments: [pay(100), { ...pay(-40), kind: 'reversal' }] });
    expect(balance(r)).toBe(40);
  });
});

describe('estado de mesa', () => {
  const t = table();
  it('libre, parcial y llena', () => {
    expect(tableStatus(t, [])).toBe('free');
    expect(tableStatus(t, [res({ guests: 4 })])).toBe('part');
    expect(tableStatus(t, [res({ guests: 4 }), res({ id: 'r2', guests: 6 })])).toBe('held');
  });
  it('pagada cuando todas pagaron, ocupada cuando todas entraron', () => {
    const a = res({ guests: 4, payments: [pay(100)] });
    const b = res({ id: 'r2', guests: 6, payments: [pay(100)] });
    expect(tableStatus(t, [a, b])).toBe('paid');
    expect(tableStatus(t, [{ ...a, checked_in: 4 }, b])).toBe('paid');
    expect(tableStatus(t, [{ ...a, checked_in: 4 }, { ...b, checked_in: 6 }])).toBe('in');
  });
});

describe('precio por puesto', () => {
  it('divide la mesa, respeta el fijado y devuelve null sin precio', () => {
    expect(seatPrice(table())).toBeNull();
    expect(seatPrice(table({ price: 200 }))).toBe(20);
    expect(seatPrice(table({ price: 200, seat_price: 25 }))).toBe(25);
  });
});

describe('resumen y CSV', () => {
  const tables = [table(), table({ id: 't2', code: 'PB-05', capacity: 4 })];
  const all = [res({ guests: 4, payments: [pay(60)], checked_in: 4 })];
  it('suma ventas, cobros, puestos y personas dentro', () => {
    expect(summarize(tables, all)).toMatchObject({
      sold: 100, collected: 60, pending: 40, seatsFree: 10, totalSeats: 14, untouched: 1, inside: 4,
    });
  });
  it('exporta CSV con comillas escapadas', () => {
    const csv = toCsv(tables, [res({ name: 'Ana "la jefa"' })]);
    expect(csv.split('\n')[1]).toContain('"Ana ""la jefa"""');
    expect(csv.split('\n')[0]).toBe('"mesa","reserva","cliente","whatsapp","puestos","total","pagado","saldo","estado"');
  });
  it('un nombre con fórmula no se ejecuta al abrir el CSV en Excel', () => {
    const row = (name: string) => toCsv(tables, [res({ name })]).split('\n')[1];
    expect(row('=HYPERLINK("http://x","clic")')).toContain(`"'=HYPERLINK(""http://x"",""clic"")"`);
    expect(row('@SUM(A1)')).toContain(`"'@SUM(A1)"`);
    expect(row('-2+3')).toContain(`"'-2+3"`);
    expect(row('+cmd|x')).toContain(`"'+cmd|x"`);
  });
  it('los teléfonos con + quedan intactos en el CSV', () => {
    const row = toCsv(tables, [res({ phone: '+58 412-555 1234' })]).split('\n')[1];
    expect(row).toContain('"+58 412-555 1234"');
  });
});

describe('errores', () => {
  it('traduce el error de capacidad', () => {
    expect(friendlyError('mesa sin puestos suficientes (3 libres)')).toMatch(/Ya no quedan puestos/);
  });
});
