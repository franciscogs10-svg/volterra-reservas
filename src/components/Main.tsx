'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadSnapshot, type Snapshot } from '@/lib/data';
import { formatMoney, friendlyError } from '@/lib/logic';
import { loadState } from '@/lib/ui-load';
import type { Reservation, TableRow } from '@/lib/types';
import type { Actions, Msg } from './actions';
import { Board } from './Board';
import { Icon } from './Icon';
import { StateScreen } from './StateScreen';

type Result = PromiseLike<{ error: { message: string } | null }>;

export function Main({ email }: { email: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState('');
  const [live, setLive] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const dismiss = useCallback(() => setMsg(null), []);
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
    reserve: async (t, v) => {
      setBusy(true);
      const created = await sb().rpc('create_reservation', {
        p_table_id: t.id,
        p_customer_name: v.name,
        p_phone: v.phone || null,
        p_guests: v.guests,
        p_total: v.total,
        p_deposit: v.deposit,
        p_method: v.method,
        p_notes: null,
      });
      if (created.error) {
        setBusy(false);
        setMsg({ text: friendlyError(created.error.message), err: true });
        return false;
      }
      // create_reservation devuelve el uuid de la reserva; el correo va aparte para no cambiarle la firma (spec, sección 7).
      let emailFail = '';
      if (v.email) {
        const saved = await sb().rpc('set_customer_email', { p_res: created.data as string, p_email: v.email });
        if (saved.error) emailFail = friendlyError(saved.error.message);
      }
      setBusy(false);
      // La reserva ya existe aunque el correo falle: se devuelve true para que el formulario no se pueda reenviar
      // (un segundo envío duplicaría la reserva y su anticipo). El correo se guarda después desde la hoja.
      setMsg(
        emailFail
          ? { text: `La reserva quedó creada, pero el correo no se guardó: ${emailFail} Agrégalo desde la hoja de la mesa.`, err: true }
          : { text: `${v.guests} ${v.guests === 1 ? 'puesto reservado' : 'puestos reservados'} para ${v.name}.`, err: false },
      );
      await reload();
      return true;
    },
    setEmail: (r, email) =>
      run(() => sb().rpc('set_customer_email', { p_res: r.id, p_email: email }), email ? `Correo de ${r.name} guardado.` : `Correo de ${r.name} borrado.`),
    pay: (r: Reservation, amount, method) =>
      run(() => sb().rpc('add_payment', { p_res: r.id, p_amount: amount, p_method: method, p_ref: null }), `Pago de ${formatMoney(amount)} registrado.`),
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

  const state = loadState(snap !== null, loadError);
  if (state.screen === 'error') {
    return (
      <StateScreen>
        <p className="err-msg" role="alert">
          <Icon name="alert" size="sm" />
          <span>{loadError}</span>
        </p>
        <div className="row-wrap">
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Reintentar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => supabase().auth.signOut()}>
            Salir
          </button>
        </div>
      </StateScreen>
    );
  }
  if (!snap) {
    return (
      <StateScreen>
        <p className="muted" role="status">
          Cargando…
        </p>
      </StateScreen>
    );
  }

  return (
    <Board
      snap={snap}
      email={email}
      live={live && !state.stale}
      stale={state.stale}
      busy={busy}
      msg={msg}
      actions={actions}
      onSaveDate={saveDate}
      onSignOut={() => supabase().auth.signOut()}
      onDismissMsg={dismiss}
    />
  );
}
