'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadSnapshot, type Snapshot } from '@/lib/data';
import { fmtDate, friendlyError } from '@/lib/logic';
import type { AreaCode, Reservation, TableRow } from '@/lib/types';
import { FloorMap } from './FloorMap';
import { Panel, type Actions } from './Panel';
import { ReservationList } from './ReservationList';
import { Stats } from './Stats';

type Result = PromiseLike<{ error: { message: string } | null }>;

export function Main({ email }: { email: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState('');
  const [live, setLive] = useState(false);
  const [area, setArea] = useState<AreaCode>('PB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; err: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reload = useCallback(async () => {
    try {
      setSnap(await loadSnapshot(supabase()));
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : (e as { message?: string }).message || 'No se pudo cargar.');
    }
  }, []);

  useEffect(() => {
    reload();
    const sb = supabase();
    const later = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(reload, 250);
    };
    let ch = sb.channel('volterra');
    for (const table of ['reservations', 'payments', 'check_ins', 'tables', 'events']) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, later);
    }
    ch.subscribe((status) => setLive(status === 'SUBSCRIBED'));
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    const poll = setInterval(reload, 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
      sb.removeChannel(ch);
    };
  }, [reload]);

  async function run(fn: () => Result, ok: string): Promise<boolean> {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    setMsg(error ? { text: friendlyError(error.message), err: true } : { text: ok, err: false });
    await reload();
    return !error;
  }

  const sb = supabase;
  const actions: Actions = {
    reserve: (t, v) =>
      run(
        () =>
          sb().rpc('create_reservation', {
            p_table_id: t.id,
            p_customer_name: v.name,
            p_phone: v.phone || null,
            p_guests: v.guests,
            p_total: v.total,
            p_deposit: v.deposit,
            p_method: v.method,
            p_notes: null,
          }),
        `${v.guests} ${v.guests === 1 ? 'puesto reservado' : 'puestos reservados'} para ${v.name}.`,
      ),
    pay: (r: Reservation, amount, method) =>
      run(() => sb().rpc('add_payment', { p_res: r.id, p_amount: amount, p_method: method, p_ref: null }), `Pago de $${amount.toFixed(2)} registrado.`),
    checkIn: (r) => run(() => sb().rpc('check_in', { p_res: r.id, p_people: r.guests }), `Llegada de ${r.name} confirmada.`),
    cancel: (r) => run(() => sb().rpc('cancel_reservation', { p_res: r.id, p_reason: 'Cancelada desde la app' }), 'Reserva cancelada. Los puestos quedaron libres.'),
    savePrices: (t: TableRow, price, seat) =>
      run(async () => {
        const { data, error } = await sb().from('tables').update({ price, seat_price: seat }).eq('id', t.id).select('id');
        if (!error && !data?.length) return { error: { message: 'forbidden' } };
        return { error };
      }, `Precios de ${t.code} guardados.`),
  };

  async function saveDate(value: string) {
    if (!snap) return;
    await run(async () => {
      const { data, error } = await sb().from('events').update({ event_date: value || null }).eq('id', snap.event.id).select('id');
      if (!error && !data?.length) return { error: { message: 'forbidden' } };
      return { error };
    }, 'Fecha del evento guardada.');
  }

  function pick(t: TableRow) {
    setArea(t.area);
    setSelectedId(t.id);
    setMsg(null);
  }

  if (loadError) {
    return (
      <div className="wrap center">
        <h1>VOLTERRA</h1>
        <p className="err-banner">{loadError}</p>
        <div className="actions">
          <button onClick={reload}>Reintentar</button>
          <button onClick={() => supabase().auth.signOut()}>Salir</button>
        </div>
      </div>
    );
  }
  if (!snap) return <div className="wrap center note">Cargando…</div>;

  const selected = snap.tables.find((t) => t.id === selectedId) ?? null;

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>VOLTERRA</h1>
          <div className="sub">
            Reservas y acceso · Evento: {fmtDate(snap.event.event_date)} · <span className={`live${live ? '' : ' off'}`}>{live ? 'en vivo' : 'sin conexión en vivo'}</span>
          </div>
        </div>
        <div className="bar">
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            Fecha del evento
            <input
              type="date"
              style={{ width: 'auto' }}
              defaultValue={snap.event.event_date ?? ''}
              key={snap.event.event_date ?? 'sin-fecha'}
              onChange={(e) => saveDate(e.target.value)}
            />
          </label>
          <button onClick={() => supabase().auth.signOut()} title={email}>
            Salir
          </button>
        </div>
      </header>

      <Stats tables={snap.tables} reservations={snap.reservations} />

      <div className="main">
        <section className="card">
          <div className="tabs">
            {(['PB', 'VIP'] as AreaCode[]).map((a) => (
              <button
                key={a}
                aria-pressed={area === a}
                onClick={() => {
                  setArea(a);
                  setSelectedId(null);
                }}
              >
                {a === 'PB' ? 'Planta baja' : 'Planta alta VIP'}
              </button>
            ))}
            <div className="legend">
              <span><i style={{ background: 'var(--free)' }} />Disponible</span>
              <span><i style={{ background: 'var(--part)' }} />Parcial</span>
              <span><i style={{ background: 'var(--held)' }} />Reservada</span>
              <span><i style={{ background: 'var(--paid)' }} />Pagada</span>
              <span><i style={{ background: 'var(--in)' }} />Ocupada</span>
            </div>
          </div>
          <FloorMap area={area} tables={snap.tables} reservations={snap.reservations} selected={selectedId} onPick={pick} />
          <p className="note">Las mesas se venden enteras o por puestos. El número bajo el código son los puestos vendidos sobre la capacidad.</p>
        </section>

        <Panel table={selected} reservations={snap.reservations} actions={actions} busy={busy} msg={msg} />
      </div>

      <ReservationList tables={snap.tables} reservations={snap.reservations} onPick={pick} />
    </div>
  );
}
