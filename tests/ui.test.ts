import { describe, expect, it } from 'vitest';
import * as load from '../src/lib/ui-load';
import * as ui from '../src/lib/ui-format';

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
