import { describe, expect, it } from 'vitest';
import {
  balance, confirmationMessage, eventDateLabel, formatMoney, friendlyError, isValidEmail, mailtoHref, money,
  protocolRows, protocolTotals, resStatus, seatPrice, summarize, tableStatus, toCsv,
} from '../src/lib/logic';
import type { EventRow, Payment, Reservation, TableRow } from '../src/lib/types';

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
  it('lo retenido de reservas canceladas suma a lo cobrado, pero no cambia lo pendiente', () => {
    expect(summarize(tables, all, 50)).toMatchObject({ sold: 100, collected: 110, pending: 40, retained: 50 });
    expect(summarize(tables, all)).toMatchObject({ collected: 60, pending: 40, retained: 0 });
  });
  it('el CSV solo lista las reservas activas que recibe, sin filas de lo retenido', () => {
    expect(toCsv(tables, all).split('\n')).toHaveLength(2);
  });
  it('exporta CSV con comillas escapadas', () => {
    const csv = toCsv(tables, [res({ name: 'Ana "la jefa"' })]);
    expect(csv.split('\n')[1]).toContain('"Ana ""la jefa"""');
    expect(csv.split('\n')[0]).toBe('"mesa","reserva","cliente","whatsapp","correo","puestos","total","pagado","saldo","estado"');
  });
  it('el CSV lleva el correo del cliente, o vacío si no hay', () => {
    expect(toCsv(tables, [res({ email: 'ana@ejemplo.com' })]).split('\n')[1]).toContain('"+58 412","ana@ejemplo.com","4"');
    expect(toCsv(tables, [res()]).split('\n')[1]).toContain('"+58 412","","4"');
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
  it('traduce los errores del correo y del reverso', () => {
    expect(friendlyError('new row for relation "customers" violates check constraint "customers_email_format"')).toBe(
      'El correo no tiene un formato válido. Revisa que tenga @ y un dominio.',
    );
    expect(friendlyError('reserva inexistente')).toBe('Esa reserva ya no existe. Revisa el mapa.');
    expect(friendlyError('pago inexistente')).toBe('Ese pago ya no existe. Revisa la reserva.');
    expect(friendlyError('pago ya revertido')).toBe('Ese pago ya estaba revertido.');
    expect(friendlyError('el reverso exige motivo')).toBe('Escribe el motivo del reverso.');
  });
  it('traduce los errores de dinero y cancelación de la 0010', () => {
    expect(friendlyError('el abono supera el saldo')).toBe('El abono es mayor que el saldo de la reserva. Revisa el monto.');
    expect(friendlyError('reserva cancelada')).toBe('Esa reserva está cancelada y ya no recibe abonos.');
    expect(friendlyError('monto inválido')).toBe('El monto debe ser mayor que cero.');
    expect(friendlyError('falta el método de pago')).toBe('Elige el método de pago.');
    expect(friendlyError('la cancelación exige motivo')).toBe('Escribe el motivo de la cancelación.');
    expect(friendlyError('reserva ya cancelada')).toBe('Esa reserva ya estaba cancelada.');
    expect(friendlyError('falta el nombre')).toBe('Escribe el nombre del cliente.');
  });
});

describe('montos y correo', () => {
  it('formatea montos al estilo venezolano', () => {
    expect(formatMoney(240)).toBe('$240,00');
    expect(formatMoney(1234.5)).toBe('$1.234,50');
    expect(formatMoney(0)).toBe('$0,00');
    expect(formatMoney(-80)).toBe('-$80,00');
    expect(formatMoney(-0.001)).toBe('$0,00');
    expect(formatMoney(0.1 + 0.2)).toBe('$0,30');
  });
  it('money da el mismo formato, para los componentes que todavía lo importan', () => {
    expect(money(1234.5)).toBe('$1.234,50');
  });
  it('valida el correo con la misma regla que la base', () => {
    expect(isValidEmail('mafer.urdaneta@ejemplo.com')).toBe(true);
    expect(isValidEmail('  Mafer@Ejemplo.COM ')).toBe(true);
    expect(isValidEmail('mafer@ejemplo')).toBe(false);
    expect(isValidEmail('mafer urdaneta@ejemplo.com')).toBe(false);
    expect(isValidEmail('a@@b.co')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

const ev = (over: Partial<EventRow> = {}): EventRow => ({
  id: 'e1', name: 'MOREFEST', venue: 'Restaurante VOLTERRA, Maracaibo', event_date: '2026-11-14', ...over,
});

describe('fecha del evento', () => {
  it('en español con el día de la semana, o por anunciar', () => {
    expect(eventDateLabel('2026-11-14')).toBe('Sábado, 14 de noviembre de 2026');
    expect(eventDateLabel(null)).toBe('Fecha por anunciar');
  });
});

describe('mensaje de confirmación', () => {
  const t = table({ code: 'PB-07' });
  const conSaldo = res({
    name: 'José Ángel Añez', code: 'A3F91C', guests: 6, total_price: 300,
    payments: [
      pay(140, { id: 'p2', method: 'Zelle', created_at: '2026-10-14T15:00:00+00:00' }),
      pay(100, { id: 'p1', method: 'Pago móvil', created_at: '2026-10-10T15:00:00+00:00' }),
    ],
  });

  it('asunto con la mesa; cuerpo con abonos en orden de fecha, pagado y saldo', () => {
    const m = confirmationMessage(conSaldo, t, ev());
    expect(m.subject).toBe('MOREFEST · Confirmación de tu reserva (Mesa PB-07)');
    expect(m.body).toBe([
      'Hola, José Ángel Añez:',
      '',
      'Te confirmamos tu reserva para MOREFEST.',
      '',
      'Mesa PB-07, planta baja',
      '6 personas',
      'Sábado, 14 de noviembre de 2026',
      'Restaurante VOLTERRA, Maracaibo',
      'Código de reserva: A3F91C',
      '',
      'Total: $300,00',
      'Abonos:',
      '- 10/10/2026, Pago móvil: $100,00',
      '- 14/10/2026, Zelle: $140,00',
      'Pagado: $240,00',
      'Saldo pendiente: $60,00',
      '',
      'En la puerta te ubicamos por tu nombre o por el código de la reserva.',
      '',
      'Corporación Montiel',
    ].join('\n'));
  });

  it('un pago revertido y su reverso se netean: no se listan y lo listado suma lo pagado', () => {
    const r = res({
      total_price: 200,
      payments: [
        pay(100, { id: 'p1', method: 'Efectivo' }),
        pay(200, { id: 'p2', method: 'Zelle', created_at: '2026-10-13T02:30:00+00:00' }), // 12/10 a las 10:30 p. m. en Maracaibo
        pay(-100, { id: 'p3', kind: 'reversal', method: 'Efectivo', reverses_payment_id: 'p1' }),
      ],
    });
    const { body } = confirmationMessage(r, t, ev());
    expect(body).toContain('Abonos:\n- 12/10/2026, Zelle: $200,00\nPagado: $200,00\nPagado completo\n');
    expect(body).not.toContain('Efectivo');
    expect(body).not.toContain('Saldo pendiente');
  });

  it('sin fecha, sin lugar y sin abonos; en VIP dice planta alta', () => {
    const { body } = confirmationMessage(res({ guests: 1 }), table({ code: 'VIP-05', area: 'VIP' }), ev({ event_date: null, venue: null }));
    expect(body).toContain('Mesa VIP-05, planta alta VIP\n1 persona\nFecha por anunciar\nCódigo de reserva: AB12CD\n');
    expect(body).toContain('Abonos:\n- Sin abonos todavía\nPagado: $0,00\nSaldo pendiente: $100,00\n');
  });
});

describe('enlace de correo', () => {
  const m = confirmationMessage(res({ name: 'José Ángel Añez', payments: [pay(40)] }), table({ code: 'PB-07' }), ev());

  it('codifica asunto y cuerpo, y al decodificar vuelven intactos', () => {
    const href = mailtoHref('mafer.urdaneta@ejemplo.com', m);
    expect(href?.startsWith('mailto:mafer.urdaneta@ejemplo.com?subject=')).toBe(true);
    expect(href).not.toMatch(/\s/);
    const q = new URLSearchParams(href!.split('?')[1]);
    expect(q.get('subject')).toBe(m.subject);
    expect(q.get('body')).toBe(m.body);
  });

  it('un + o un & no rompen el enlace', () => {
    expect(mailtoHref('ana+morefest@ejemplo.com', { subject: 'Hola', body: 'a&b' })).toBe(
      'mailto:ana%2Bmorefest@ejemplo.com?subject=Hola&body=a%26b',
    );
  });

  it('hasta 1.800 caracteres devuelve el enlace; desde 1.801, null', () => {
    const base = 'mailto:a@b.co?subject=s&body='.length;
    expect(mailtoHref('a@b.co', { subject: 's', body: 'x'.repeat(1800 - base) })).toHaveLength(1800);
    expect(mailtoHref('a@b.co', { subject: 's', body: 'x'.repeat(1801 - base) })).toBeNull();
    expect(mailtoHref('mafer.urdaneta@ejemplo.com', m)!.length).toBeLessThan(1000);
  });
});

describe('lista de protocolo', () => {
  const tables = [
    table({ id: 'v5', code: 'VIP-05', area: 'VIP', capacity: 4 }),
    table({ id: 'p10', code: 'PB-10' }),
    table({ id: 'p2', code: 'PB-2' }),
  ];
  const all = [
    res({ id: 'a', code: 'AAA111', table_id: 'p10', name: 'Óscar Atencio', guests: 10, total_price: 400,
      payments: [pay(400)], checked_in: 10, checked_in_at: '2026-11-15T00:14:00+00:00' }),
    res({ id: 'b', code: 'BBB222', table_id: 'v5', name: 'Ana Bracho', guests: 4, total_price: 600,
      payments: [pay(300)], notes: 'Patrocinador' }),
    res({ id: 'c', code: 'CCC333', table_id: 'p2', name: 'Ñeri Paz', guests: 2, total_price: 80 }),
    res({ id: 'd', code: 'DDD444', table_id: 'p10', name: 'carmen Ríos', guests: 3, total_price: 120 }),
    res({ id: 'e', code: 'EEE555', table_id: 'p2', name: 'Nora Leal', guests: 2, total_price: 80 }),
  ];

  it('por mesa: planta baja antes que VIP, PB-2 antes que PB-10 y por nombre dentro de la mesa', () => {
    expect(protocolRows(tables, all, 'mesa', true).map((r) => `${r.tableCode} ${r.name}`)).toEqual([
      'PB-2 Nora Leal', 'PB-2 Ñeri Paz', 'PB-10 carmen Ríos', 'PB-10 Óscar Atencio', 'VIP-05 Ana Bracho',
    ]);
  });

  it('por nombre: alfabético en español (la Ñ va después de la N), sin mirar mayúsculas ni acentos', () => {
    expect(protocolRows(tables, all, 'nombre', true).map((r) => r.name)).toEqual([
      'carmen Ríos', 'Nora Leal', 'Ñeri Paz', 'Óscar Atencio', 'Ana Bracho',
    ]);
  });

  it('cada fila lleva saldo, llegada y notas; sin permiso de pagos el saldo va en null', () => {
    const rows = protocolRows(tables, all, 'mesa', true);
    expect(rows.find((r) => r.code === 'AAA111')).toEqual({
      reservationId: 'a', tableId: 'p10', tableCode: 'PB-10', area: 'PB', name: 'Óscar Atencio', guests: 10,
      code: 'AAA111', balance: 0, checkedIn: 10, checkedInAt: '2026-11-15T00:14:00+00:00', notes: null,
    });
    expect(rows.find((r) => r.code === 'BBB222')).toMatchObject({ balance: 300, notes: 'Patrocinador', checkedIn: null });
    expect(protocolRows(tables, all, 'mesa', false).map((r) => r.balance)).toEqual([null, null, null, null, null]);
  });

  it('una reserva cuya mesa no está en el mapa no sale en la lista', () => {
    expect(protocolRows(tables, [res({ table_id: 'retirada' })], 'mesa', true)).toEqual([]);
  });

  it('totales: reservas, personas esperadas y personas dentro', () => {
    expect(protocolTotals(protocolRows(tables, all, 'mesa', true))).toEqual({ reservations: 5, expected: 21, inside: 10 });
    expect(protocolTotals([])).toEqual({ reservations: 0, expected: 0, inside: 0 });
  });
});
