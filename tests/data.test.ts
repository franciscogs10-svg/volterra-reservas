import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { loadSnapshot } from '../src/lib/data';

/** Cliente de Supabase de mentira: anota qué pidió cada tabla y devuelve filas fijas, como las manda PostgREST. */
function fakeSupabase(rows: Record<string, unknown>, role: string | null) {
  const asked: Record<string, string> = {};
  const filters: string[] = [];
  const from = (table: string) => {
    const result = { data: rows[table], error: null };
    const q: any = {
      select: (cols: string) => {
        asked[table] = cols;
        return q;
      },
      eq: () => q,
      neq: (col: string, val: string) => {
        filters.push(`${table}.${col} <> ${val}`);
        return q;
      },
      order: () => q,
      limit: () => q,
      maybeSingle: () => Promise.resolve(result),
      then: (ok: (v: typeof result) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(result).then(ok, ko),
    };
    return q;
  };
  const rpc = (fn: string) => Promise.resolve({ data: fn === 'current_role_name' ? role : null, error: null });
  return { sb: { from, rpc } as unknown as SupabaseClient, asked, filters };
}

const reservation = {
  id: 'r1', code: 'A3F91C', table_id: 't1', guests: 6, total_price: '240.00', notes: null,
  customers: { full_name: 'María Fernanda Urdaneta', phone: '+58 414 612 3348', email: 'mafer@ejemplo.com' },
  payments: [
    { id: 'p1', amount: '100.00', kind: 'payment', method: 'Pago móvil', created_at: '2026-10-10T14:00:00+00:00', reverses_payment_id: null },
    { id: 'p2', amount: '-100.00', kind: 'reversal', method: 'Pago móvil', created_at: '2026-10-11T14:00:00+00:00', reverses_payment_id: 'p1' },
  ],
  check_ins: { people_in: 6, checked_at: '2026-11-15T00:52:00+00:00' },
};
const rows = {
  events: { id: 'e1', name: 'MOREFEST', venue: 'Restaurante VOLTERRA, Maracaibo', event_date: null },
  tables: [{
    id: 't1', code: 'PB-05', capacity: 10, price: '400.00', seat_price: null,
    map_x: '472', map_y: '270', map_w: '108', map_h: '30', map_rot: '-22', shape: 'r', areas: { code: 'PB' },
  }],
  reservations: [reservation],
};

describe('snapshot', () => {
  it('pide el lugar, el correo, la fecha de cada pago, la hora de llegada y deja fuera las canceladas', async () => {
    const { sb, asked, filters } = fakeSupabase(rows, 'door');
    await loadSnapshot(sb);
    expect(asked.events).toBe('id,name,venue,event_date');
    expect(asked.reservations).toContain('customers(full_name,phone,email)');
    expect(asked.reservations).toContain('payments(id,amount,kind,method,created_at,reverses_payment_id)');
    expect(asked.reservations).toContain('check_ins(people_in,checked_at)');
    expect(filters).toContain('reservations.status <> cancelled');
  });

  it('entrega el rol, el lugar, el correo, los pagos con fecha y la llegada', async () => {
    const { sb } = fakeSupabase(rows, 'seller');
    const s = await loadSnapshot(sb);
    expect(s.role).toBe('seller');
    expect(s.event.venue).toBe('Restaurante VOLTERRA, Maracaibo');
    const r = s.reservations[0];
    expect(r.email).toBe('mafer@ejemplo.com');
    expect(r.payments).toEqual([
      { id: 'p1', amount: 100, kind: 'payment', method: 'Pago móvil', created_at: '2026-10-10T14:00:00+00:00', reverses_payment_id: null },
      { id: 'p2', amount: -100, kind: 'reversal', method: 'Pago móvil', created_at: '2026-10-11T14:00:00+00:00', reverses_payment_id: 'p1' },
    ]);
    expect(r.checked_in).toBe(6);
    expect(r.checked_in_at).toBe('2026-11-15T00:52:00+00:00');
  });

  it('ordena los pagos de cada reserva por fecha ascendente', async () => {
    const shuffled = { ...reservation, payments: [...reservation.payments].reverse() };
    const { sb } = fakeSupabase({ ...rows, reservations: [shuffled] }, 'admin');
    const s = await loadSnapshot(sb);
    expect(s.reservations[0].payments.map((p) => p.id)).toEqual(['p1', 'p2']);
  });

  it('sin perfil activo el rol es null; sin correo ni llegada quedan en null', async () => {
    const bare = { ...reservation, customers: { full_name: 'Ana', phone: null }, check_ins: null };
    const { sb } = fakeSupabase({ ...rows, reservations: [bare] }, null);
    const s = await loadSnapshot(sb);
    expect(s.role).toBeNull();
    expect(s.reservations[0].email).toBeNull();
    expect(s.reservations[0].checked_in).toBeNull();
    expect(s.reservations[0].checked_in_at).toBeNull();
  });
});
