'use client';

import { useEffect, useRef } from 'react';
import { LABEL, forTable, seatPrice, soldSeats, tableStatus } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';
import { plural, seatBar } from '@/lib/ui-format';
import { kindName, thisName } from '@/lib/ui-map';
import type { Actions } from './actions';
import { Icon } from './Icon';
import { NewReservation } from './NewReservation';
import { PriceBlock } from './PriceBlock';
import { ReservationCard } from './ReservationCard';
import { StatusPill } from './StatusPill';

interface Props {
  table: TableRow | null;
  reservations: Reservation[];
  actions: Actions;
  busy: boolean;
  /** Celular: hoja inferior modal sobre la sección. Escritorio: columna fija a la derecha. */
  modal: boolean;
  onClose: () => void;
}

/** Hoja de la mesa. En el celular toma el foco, se cierra con Escape, con la X o tocando fuera, y devuelve el foco a la mesa. */
export function Panel({ table, reservations, actions, busy, modal, onClose }: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  const tableId = table?.id ?? null;

  useEffect(() => {
    if (!tableId || !modal) return;
    const before = document.activeElement as HTMLElement | null;
    title.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (before?.isConnected) before.focus?.({ preventScroll: true });
    };
  }, [tableId, modal, onClose]);

  if (!table) {
    if (modal) return null;
    return (
      <aside className="sheet sheet-empty" aria-label="Hoja de la mesa">
        <h2 className="h3">Ninguna mesa abierta</h2>
        <p className="help">Toca una mesa del plano, o una reserva de la lista, para ver sus puestos, cobrar o reservar.</p>
      </aside>
    );
  }

  const list = forTable(table.id, reservations);
  const sold = soldSeats(table.id, reservations);
  const free = table.capacity - sold;
  const status = tableStatus(table, reservations);
  const sp = seatPrice(table);
  const inSeats = list.reduce((n, r) => n + (r.checked_in !== null ? r.guests : 0), 0);

  return (
    <>
      {modal && <div className="scrim" onClick={onClose} aria-hidden="true" />}
      <aside className="sheet" role={modal ? 'dialog' : 'region'} aria-modal={modal || undefined} aria-labelledby="sheet-title">
        <div className="sheet-head">
          <div>
            <h2 className="sheet-title" id="sheet-title" tabIndex={-1} ref={title}>
              {kindName(table)} {table.code}
            </h2>
            <span className="sub">
              {table.area === 'PB' ? 'Planta baja' : 'Planta alta VIP'} · {plural(table.capacity, 'puesto', 'puestos')}
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar la hoja">
            <Icon name="x" size="lg" />
          </button>
        </div>

        <div className="m-sum">
          <div className="m-sum-row">
            <StatusPill status={status} label={LABEL[status]} />
            <p>
              <b>{sold}</b> vendidos · <b>{free}</b> libres de {table.capacity}
            </p>
          </div>
          <div className="seatbar" role="img" aria-label={`${sold} de ${table.capacity} puestos vendidos, ${inSeats} con llegada confirmada`}>
            {seatBar(table.capacity, sold, inSeats).map((c, i) => (
              <i key={i} className={c || undefined} />
            ))}
          </div>
        </div>

        <PriceBlock key={`${table.id}-${table.price}-${table.seat_price}`} table={table} sp={sp} busy={busy} onSave={actions.savePrices} />

        {list.length > 0 && (
          <>
            <div className="m-h">
              <h3 className="h3">Reservas de {thisName(table)}</h3>
              <span className="muted">{list.length}</span>
            </div>
            {list.map((r) => (
              <ReservationCard key={r.id} r={r} busy={busy} actions={actions} />
            ))}
          </>
        )}

        {free > 0 ? (
          <NewReservation key={`${table.id}-${sold}`} table={table} free={free} sp={sp} busy={busy} onReserve={actions.reserve} />
        ) : (
          <p className="free-note">No quedan puestos libres en {thisName(table)}.</p>
        )}
      </aside>
    </>
  );
}
