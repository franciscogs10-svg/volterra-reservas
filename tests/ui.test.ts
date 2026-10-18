import { describe, expect, it } from 'vitest';
import * as load from '../src/lib/ui-load';
import * as ui from '../src/lib/ui-format';
import * as map from '../src/lib/ui-map';
import * as mail from '../src/lib/ui-mail';
import * as pay from '../src/lib/ui-payments';
import type { Payment } from '../src/lib/types';
import { FIXTURE } from '../src/app/vista-previa/fixture';
import { summarize } from '../src/lib/logic';

describe('textos del encabezado', () => {
  it('nombre corto del lugar', () => {
    expect(ui.placeName(null)).toBe('VOLTERRA');
    expect(ui.placeName('Restaurante VOLTERRA, Maracaibo')).toBe('VOLTERRA');
    expect(ui.placeName('Casa Morella')).toBe('Casa Morella');
  });
  it('plural en español', () => {
    expect(ui.plural(1, 'reserva', 'reservas')).toBe('1 reserva');
    expect(ui.plural(0, 'reserva', 'reservas')).toBe('0 reservas');
    expect(ui.plural(14, 'puesto', 'puestos')).toBe('14 puestos');
  });
});

describe('resumen', () => {
  it('montos sin centavos con punto de miles', () => {
    expect(ui.moneyShort(3040)).toBe('$3.040');
    expect(ui.moneyShort(0)).toBe('$0');
    expect(ui.moneyShort(999.6)).toBe('$1.000');
    expect(ui.moneyShort(12345.4)).toBe('$12.345');
  });
  it('seis cifras con su nota', () => {
    const s = { sold: 3040, collected: 1520, pending: 1520, seatsFree: 12, totalSeats: 93, untouched: 5, totalTables: 19, inside: 14 };
    expect(ui.statItems(s, 14)).toEqual([
      ['Vendido', '$3.040', '14 reservas'],
      ['Cobrado', '$1.520', '50% del total'],
      ['Por cobrar', '$1.520', 'en saldos'],
      ['Puestos libres', '12', 'de 93'],
      ['Mesas sin tocar', '5', 'de 19'],
      ['Personas dentro', '14', 'ya llegaron'],
    ]);
  });
  it('sin ventas el porcentaje cobrado es 0', () => {
    const s = { sold: 0, collected: 0, pending: 0, seatsFree: 93, totalSeats: 93, untouched: 19, totalTables: 19, inside: 0 };
    expect(ui.statItems(s, 0)[1]).toEqual(['Cobrado', '$0', '0% del total']);
  });
});

describe('estado de carga', () => {
  it('sin datos todavía: cargando, o el error a pantalla completa', () => {
    expect(load.loadState(false, '')).toEqual({ screen: 'loading', stale: false });
    expect(load.loadState(false, 'Failed to fetch')).toEqual({ screen: 'error', stale: false });
  });
  it('con datos previos una recarga fallida no tapa el panel: queda lo último y se avisa', () => {
    expect(load.loadState(true, 'Failed to fetch')).toEqual({ screen: 'board', stale: true });
  });
  it('con datos al día el panel se ve sin aviso', () => {
    expect(load.loadState(true, '')).toEqual({ screen: 'board', stale: false });
  });
});

describe('mapa', () => {
  const mesa = (over: Partial<Parameters<typeof map.hitBox>[0] & { code: string; area: 'PB' | 'VIP'; capacity: number }> = {}) => ({
    code: 'PB-03', area: 'PB' as 'PB' | 'VIP', capacity: 4, map_x: 326, map_y: 252, map_w: 52, map_h: 52, map_rot: 0, ...over,
  });

  it('el área de toque nunca baja de 96 unidades: 44 px con el plano a 366 px', () => {
    const b = map.hitBox(mesa());
    expect(b.w).toBe(96);
    expect(b.h).toBe(96);
    expect(b.x + b.w / 2).toBe(326);
    expect(b.y + b.h / 2).toBe(252);
    expect((map.HIT_MIN * 366) / 792).toBeGreaterThanOrEqual(44);
  });
  it('una mesa larga y girada cubre su caja girada más el margen', () => {
    const b = map.hitBox(mesa({ map_x: 472, map_y: 270, map_w: 108, map_h: 30, map_rot: -22 }));
    expect(b.w).toBeCloseTo(129.37, 1);
    expect(b.h).toBe(96);
  });
  it('el anillo de selección deja 10 unidades de aire', () => {
    expect(map.ringBox(mesa({ map_x: 302, map_y: 160, map_w: 125, map_h: 34 }))).toEqual({ x: 229.5, y: 133, w: 145, h: 54 });
  });
  it('código corto, nombres y lectura para lector de pantalla', () => {
    expect(map.shortCode('PB-05')).toBe('05');
    expect(map.shortCode('VIP-06')).toBe('06');
    expect(map.kindName({ area: 'VIP' })).toBe('Sofá');
    expect(map.thisName({ area: 'VIP' })).toBe('este sofá');
    expect(map.thisName({ area: 'PB' })).toBe('esta mesa');
    expect(map.wholeName({ area: 'PB' })).toBe('Mesa entera');
    expect(map.wholeName({ area: 'VIP' })).toBe('Sofá entero');
    expect(map.tableAria(mesa(), 'part', 2)).toBe('Mesa PB-03, Parcial, 2 de 4 puestos vendidos');
  });
  it('al ampliar centra la mesa sin pasarse del borde', () => {
    const s = map.centerScroll({ map_x: 472, map_y: 270 }, 677.1, { w: 366, h: 480 });
    expect(s.left).toBeCloseTo((472 * 677.1) / 792 - 183, 3);
    expect(s.top).toBe(0);
  });
});

describe('resolución de toques: el centro más cercano gana, nunca el orden de dibujo', () => {
  const tables = FIXTURE.tables;
  const nueve = (t: (typeof tables)[number]): [number, number][] => {
    // centro, cuatro esquinas y cuatro medios de la forma real, al 80% para quedar dentro, girados como la mesa
    const a = (t.map_rot * Math.PI) / 180;
    const hw = (t.map_w / 2) * 0.8;
    const hh = (t.map_h / 2) * 0.8;
    const local: [number, number][] = [[0, 0], [-hw, -hh], [hw, -hh], [-hw, hh], [hw, hh], [0, -hh], [0, hh], [-hw, 0], [hw, 0]];
    return local.map(([x, y]) => [t.map_x + x * Math.cos(a) - y * Math.sin(a), t.map_y + x * Math.sin(a) + y * Math.cos(a)]);
  };

  it('las 19 mesas activas: cada uno de sus 9 puntos abre su propia mesa', () => {
    expect(tables).toHaveLength(19);
    for (const t of tables) {
      const vecinas = tables.filter((x) => x.area === t.area);
      for (const [x, y] of nueve(t)) expect(map.resolveTouch(vecinas, x, y)?.code, `${t.code} en ${x.toFixed(0)},${y.toFixed(0)}`).toBe(t.code);
    }
  });
  it('en la zona donde dos cajas se cruzan gana la de centro más cercano', () => {
    const a = { code: 'A', map_x: 100, map_y: 100, map_w: 52, map_h: 52, map_rot: 0 };
    const b = { code: 'B', map_x: 160, map_y: 100, map_w: 52, map_h: 52, map_rot: 0 };
    expect(map.resolveTouch([a, b], 120, 100)?.code).toBe('A');
    expect(map.resolveTouch([a, b], 140, 100)?.code).toBe('B');
    expect(map.resolveTouch([b, a], 120, 100)?.code).toBe('A');
  });
  it('un toque lejos de toda caja no abre nada', () => {
    expect(map.resolveTouch(tables, 5, 5)).toBeNull();
  });
});

describe('hoja de la mesa', () => {
  it('estado de reserva en palabras de la puerta', () => {
    expect(ui.RES_LABEL).toEqual({ held: 'Con saldo', paid: 'Pagada', in: 'Llegó' });
  });
  it('barra de puestos: primero los que llegaron, luego vendidos, luego libres', () => {
    expect(ui.seatBar(5, 3, 1)).toEqual(['in', 'on', 'on', '', '']);
    expect(ui.seatBar(2, 0, 0)).toEqual(['', '']);
  });
  it('los abonos se numeran sin contar los reversos', () => {
    expect(ui.payLabels([{ kind: 'payment' }, { kind: 'reversal' }, { kind: 'payment' }])).toEqual(['Abono 1', 'Reverso', 'Abono 2']);
  });
});

describe('lista de reservas', () => {
  const campos = ['PB-05', 'A3F91C', 'María Fernanda Urdaneta', '+58 414 612 3348'];
  it('busca sin acentos ni mayúsculas en mesa, código, nombre y teléfono', () => {
    expect(ui.matchesQuery(campos, 'maria')).toBe(true);
    expect(ui.matchesQuery(campos, 'URDANETA')).toBe(true);
    expect(ui.matchesQuery(campos, 'a3f9')).toBe(true);
    expect(ui.matchesQuery(campos, 'pb-05')).toBe(true);
    expect(ui.matchesQuery(campos, 'zzz')).toBe(false);
  });
  it('encuentra el teléfono aunque se escriba sin espacios', () => {
    expect(ui.matchesQuery(campos, '4146123')).toBe(true);
  });
  it('búsqueda vacía muestra todo', () => {
    expect(ui.matchesQuery(campos, '   ')).toBe(true);
  });
  it('el CSV se nombra con la fecha local, no la UTC', () => {
    expect(ui.csvFileName(new Date(2026, 9, 17, 22, 30))).toBe('morefest-reservas-2026-10-17.csv');
    expect(ui.csvFileName(new Date(2026, 0, 5, 9, 0))).toBe('morefest-reservas-2026-01-05.csv');
  });
});

describe('horas de Maracaibo', () => {
  it('hora de llegada en 12 horas, con espacios normales', () => {
    expect(ui.arrivalTime('2026-11-21T00:52:00Z')).toBe('8:52 p. m.');
    expect(ui.arrivalTime('2026-11-20T14:05:00Z')).toBe('10:05 a. m.');
  });
});

describe('cobrado con lo retenido', () => {
  it('el fixture trae un abono retenido y suma en Cobrado sin tocar Por cobrar', () => {
    expect(FIXTURE.retained).toBe(150);
    const sin = summarize(FIXTURE.tables, FIXTURE.reservations);
    const con = summarize(FIXTURE.tables, FIXTURE.reservations, FIXTURE.retained);
    expect(con.collected).toBe(sin.collected + 150);
    expect(con.pending).toBe(sin.pending);
  });
});

describe('correo del cliente', () => {
  it('vacío no es error: el correo es opcional', () => {
    expect(mail.emailError('')).toBe('');
    expect(mail.emailError('   ')).toBe('');
  });
  it('acepta un correo bien escrito, aunque traiga espacios alrededor', () => {
    expect(mail.emailError(' mafer.urdaneta@ejemplo.com ')).toBe('');
  });
  it('rechaza un correo sin dominio con un mensaje que dice cómo arreglarlo', () => {
    expect(mail.emailError('mafer@ejemplo')).toBe('Revisa el correo: debe verse como nombre@correo.com.');
    expect(mail.emailError('mafer urdaneta@ejemplo.com')).toBe('Revisa el correo: debe verse como nombre@correo.com.');
  });
});

describe('confirmación por correo', () => {
  const corto = {
    subject: 'MOREFEST · Confirmación de tu reserva (Mesa PB-05)',
    body: 'Hola, María Fernanda Urdaneta:\n\nTe confirmamos tu reserva para MOREFEST.',
  };
  it('sin correo no hay enlace y el motivo dice qué hacer', () => {
    const s = mail.mailState(null, corto);
    expect(s.href).toBeNull();
    expect(s.reason).toMatch(/Falta el correo del cliente/);
  });
  it('con correo válido arma el enlace mailto', () => {
    const s = mail.mailState('mafer.urdaneta@ejemplo.com', corto);
    expect(s.href).toMatch(/^mailto:mafer\.urdaneta@ejemplo\.com\?subject=/);
    expect(s.reason).toBe('');
  });
  it('un correo guardado mal escrito no abre la app de correo', () => {
    expect(mail.mailState('mafer@ejemplo', corto).href).toBeNull();
  });
  it('si el mensaje no cabe en un enlace, pide copiarlo', () => {
    const s = mail.mailState('mafer.urdaneta@ejemplo.com', { subject: 's', body: 'x'.repeat(2000) });
    expect(s.href).toBeNull();
    expect(s.reason).toMatch(/Copiar mensaje/);
  });
  it('el texto copiado lleva asunto y cuerpo', () => {
    expect(mail.clipboardText(corto)).toBe(`Asunto: ${corto.subject}\n\n${corto.body}`);
  });
});

describe('quién ve pagos', () => {
  it('ven pagos admin y vendedor; la puerta y el rol vacío no', () => {
    expect([pay.seesPayments('admin'), pay.seesPayments('seller'), pay.seesPayments('door'), pay.seesPayments(null)]).toEqual([true, true, false, false]);
  });
});


describe('pagos y reversos', () => {
  const mov = (id: string, amount: number, over: Partial<Payment> = {}): Payment => ({
    id, amount, kind: amount < 0 ? 'reversal' : 'payment', method: 'Efectivo',
    created_at: '2026-10-12T15:00:00Z', reverses_payment_id: null, ...over,
  });

  it('revierte solo el admin', () => {
    expect([pay.mayReverse('admin'), pay.mayReverse('seller'), pay.mayReverse('door'), pay.mayReverse(null)]).toEqual([true, false, false, false]);
  });
  it('un abono revertido queda marcado y ya no se puede revertir', () => {
    const rows = pay.paymentRows([mov('a', 80), mov('b', 80), mov('c', -80, { reverses_payment_id: 'b' })]);
    expect(rows.map((r) => [r.label, r.reversed, r.canReverse])).toEqual([
      ['Abono 1', false, true],
      ['Abono 2', true, false],
      ['Reverso', false, false],
    ]);
  });
  it('fecha corta de un movimiento en hora de Maracaibo', () => {
    expect(pay.payDate('2026-10-15T02:00:00Z')).toBe('14/10');
  });
});

describe('resumen sin montos para la puerta', () => {
  it('sin montos quedan solo puestos libres, mesas sin tocar y personas dentro', () => {
    const s = summarize(FIXTURE.tables, FIXTURE.reservations, FIXTURE.retained);
    expect(ui.statItems(s, 14, true).map((i) => i[0])).toEqual(['Vendido', 'Cobrado', 'Por cobrar', 'Puestos libres', 'Mesas sin tocar', 'Personas dentro']);
    expect(ui.statItems(s, 14, false).map((i) => i[0])).toEqual(['Puestos libres', 'Mesas sin tocar', 'Personas dentro']);
  });
});
