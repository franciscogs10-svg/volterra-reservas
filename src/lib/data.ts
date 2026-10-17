import type { SupabaseClient } from '@supabase/supabase-js';
import type { AreaCode, EventRow, Payment, Reservation, TableRow } from './types';

export interface Snapshot {
  event: EventRow;
  tables: TableRow[];
  reservations: Reservation[];
}

type Num = number | string | null;
const num = (v: Num) => (v === null ? null : Number(v));
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export async function loadSnapshot(sb: SupabaseClient): Promise<Snapshot> {
  const ev = await sb.from('events').select('id,name,event_date').limit(1).maybeSingle();
  if (ev.error) throw ev.error;
  if (!ev.data) throw new Error('No hay un evento cargado. Aplica supabase/migrations/0002_seed.sql.');
  const event = ev.data as EventRow;

  const [tb, rs] = await Promise.all([
    sb
      .from('tables')
      .select('id,code,capacity,price,seat_price,map_x,map_y,map_w,map_h,map_rot,shape,areas(code)')
      .eq('event_id', event.id)
      .eq('active', true)
      .order('code'),
    sb
      .from('reservations')
      .select('id,code,table_id,guests,total_price,notes,customers(full_name,phone),payments(id,amount,kind,method),check_ins(people_in)')
      .eq('event_id', event.id)
      .neq('status', 'cancelled')
      .order('created_at'),
  ]);
  if (tb.error) throw tb.error;
  if (rs.error) throw rs.error;

  const tables: TableRow[] = (tb.data ?? []).map((t: any) => ({
    id: t.id,
    code: t.code,
    area: one<{ code: string }>(t.areas)?.code as AreaCode,
    capacity: t.capacity,
    price: num(t.price),
    seat_price: num(t.seat_price),
    map_x: Number(t.map_x),
    map_y: Number(t.map_y),
    map_w: Number(t.map_w),
    map_h: Number(t.map_h),
    map_rot: Number(t.map_rot),
    shape: t.shape,
  }));

  const reservations: Reservation[] = (rs.data ?? []).map((r: any) => {
    const c = one<{ full_name: string; phone: string | null }>(r.customers);
    return {
      id: r.id,
      code: r.code,
      table_id: r.table_id,
      guests: r.guests,
      total_price: Number(r.total_price),
      notes: r.notes,
      name: c?.full_name ?? 'Sin nombre',
      phone: c?.phone ?? null,
      payments: ((r.payments ?? []) as Payment[]).map((p) => ({ ...p, amount: Number(p.amount) })),
      checked_in: one<{ people_in: number }>(r.check_ins)?.people_in ?? null,
    };
  });

  return { event, tables, reservations };
}
