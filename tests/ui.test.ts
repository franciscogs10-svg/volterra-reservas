import { describe, expect, it } from 'vitest';
import * as load from '../src/lib/ui-load';
import * as ui from '../src/lib/ui-format';
import * as map from '../src/lib/ui-map';
import { FIXTURE } from '../src/app/vista-previa/fixture';

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
