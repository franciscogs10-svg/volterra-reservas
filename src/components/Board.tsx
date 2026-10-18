'use client';

import { useState } from 'react';
import type { Snapshot } from '@/lib/data';
import { fmtDate } from '@/lib/logic';
import type { AreaCode, TableRow } from '@/lib/types';
import type { Actions, Msg } from './actions';
import { FloorMap } from './FloorMap';
import { Panel } from './Panel';
import { ReservationList } from './ReservationList';
import { Stats } from './Stats';

export interface BoardProps {
  snap: Snapshot;
  email: string;
  live: boolean;
  /** La última recarga falló: se muestra lo último que se cargó. */
  stale?: boolean;
  busy: boolean;
  msg: Msg | null;
  actions: Actions;
  onSaveDate: (value: string) => void;
  onSignOut: () => void;
  onDismissMsg: () => void;
}

/** Panel de Alejandro sin datos propios: todo llega por props, así se monta igual con Supabase o con la vista previa. */
export function Board({ snap, email, live, stale, busy, msg, actions, onSaveDate, onSignOut, onDismissMsg }: BoardProps) {
  const [area, setArea] = useState<AreaCode>('PB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = snap.tables.find((t) => t.id === selectedId) ?? null;

  function pick(t: TableRow) {
    setArea(t.area);
    setSelectedId(t.id);
    onDismissMsg();
  }

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
              onChange={(e) => onSaveDate(e.target.value)}
            />
          </label>
          <button onClick={onSignOut} title={email}>
            Salir
          </button>
        </div>
      </header>
      {stale && <p role="status">Sin conexión: mostrando lo último que se cargó.</p>}

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
          </div>
          <FloorMap area={area} tables={snap.tables} reservations={snap.reservations} selected={selectedId} onPick={pick} />
        </section>

        <Panel table={selected} reservations={snap.reservations} actions={actions} busy={busy} msg={msg} />
      </div>

      <ReservationList tables={snap.tables} reservations={snap.reservations} onPick={pick} />
    </div>
  );
}
