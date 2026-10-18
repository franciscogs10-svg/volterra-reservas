'use client';

import { useCallback, useState } from 'react';
import type { Snapshot } from '@/lib/data';
import type { AreaCode, TableRow } from '@/lib/types';
import { placeName } from '@/lib/ui-format';
import type { Actions, Msg } from './actions';
import { Icon, type IconName } from './Icon';
import { MapView } from './MapView';
import { Panel } from './Panel';
import { ReservationList } from './ReservationList';
import { Toast } from './Toast';
import { useIsMobile } from './useMedia';

export type View = 'mapa' | 'reservas';

const VIEWS: [View, string, IconName][] = [
  ['mapa', 'Mapa', 'map'],
  ['reservas', 'Reservas', 'list'],
];

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

/** Panel de Alejandro: encabezado con sello, secciones (barra inferior en el celular, pestañas en escritorio) y la hoja de la mesa. */
export function Board({ snap, email, live, stale, busy, msg, actions, onSaveDate, onSignOut, onDismissMsg }: BoardProps) {
  const [view, setView] = useState<View>('mapa');
  const [area, setArea] = useState<AreaCode>('PB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mobile = useIsMobile();
  const selected = snap.tables.find((t) => t.id === selectedId) ?? null;
  const close = useCallback(() => setSelectedId(null), []);

  function pick(t: TableRow) {
    setArea(t.area);
    setSelectedId(t.id);
    onDismissMsg();
  }
  function changeArea(a: AreaCode) {
    setArea(a);
    setSelectedId(null);
  }

  return (
    <div className="app">
      <header className="apphead">
        <img className="ah-seal" src="/brand/sello-morella.jpg" alt="" width={40} height={40} />
        <div className="ah-title">
          <h1 className="ah-wm">MOREFEST</h1>
          <p className="ah-sub">Renacer · {placeName(null)}</p>
        </div>
        <span className={`live${live ? '' : ' off'}`}>
          <i aria-hidden="true" />
          {live ? 'En vivo' : 'Sin conexión'}
        </span>
        <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Salir" title={`Salir (${email})`}>
          <Icon name="logout" />
        </button>
      </header>
      {stale && (
        <p className="stale" role="status">
          <Icon name="alert" size="sm" />
          Sin conexión: se muestra lo último que se cargó.
        </p>
      )}
      <nav className="tabbar" aria-label="Secciones">
        {VIEWS.map(([v, label, icon]) => (
          <button key={v} type="button" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </nav>
      <div className="layout">
        <main className="view" key={view}>
          {view === 'mapa' && (
            <MapView snap={snap} area={area} onArea={changeArea} selectedId={selectedId} onPick={pick} onSaveDate={onSaveDate} />
          )}
          {view === 'reservas' && <ReservationList tables={snap.tables} reservations={snap.reservations} onPick={pick} />}
        </main>
        <Panel table={selected} reservations={snap.reservations} actions={actions} busy={busy} modal={mobile} onClose={close} />
      </div>
      <Toast msg={msg} onDone={onDismissMsg} />
    </div>
  );
}
