import { describe, expect, it } from 'vitest';
import * as load from '../src/lib/ui-load';

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
