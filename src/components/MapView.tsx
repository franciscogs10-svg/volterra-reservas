'use client';

import type { Snapshot } from '@/lib/data';
import { fmtDate } from '@/lib/logic';
import type { AreaCode, TableRow } from '@/lib/types';
import { FloorMap } from './FloorMap';
import { Icon } from './Icon';
import { Stats } from './Stats';

const AREAS: [AreaCode, string][] = [
  ['PB', 'Planta baja'],
  ['VIP', 'Planta alta VIP'],
];

interface Props {
  snap: Snapshot;
  area: AreaCode;
  onArea: (a: AreaCode) => void;
  selectedId: string | null;
  onPick: (t: TableRow) => void;
  onSaveDate: (value: string) => void;
}

/** Sección Mapa: fecha del evento, resumen, pestañas de planta y plano. */
export function MapView({ snap, area, onArea, selectedId, onPick, onSaveDate }: Props) {
  const date = snap.event.event_date;

  function onTabKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: AreaCode = area === 'PB' ? 'VIP' : 'PB';
    onArea(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <section aria-labelledby="mapa-title">
      <h2 className="sr-only" id="mapa-title">Mapa y resumen</h2>
      <div className="evdate">
        <label htmlFor="ev-date">
          Fecha del evento
          {/* fmtDate existe antes y después del plan A; la tarea 10 lo cambia por eventDateLabel ("Sábado, 14 de noviembre de 2026"). */}
          <b>{fmtDate(date)}</b>
        </label>
        <input className="inp" id="ev-date" type="date" defaultValue={date ?? ''} key={date ?? 'sin-fecha'} onChange={(e) => onSaveDate(e.target.value)} />
      </div>
      <Stats tables={snap.tables} reservations={snap.reservations} />
      <div className="area-tabs">
        <div className="seg" role="tablist" aria-label="Planta">
          {AREAS.map(([a, label]) => (
            <button
              key={a}
              id={`tab-${a}`}
              type="button"
              role="tab"
              aria-selected={area === a}
              aria-controls="plano"
              tabIndex={area === a ? 0 : -1}
              onClick={() => onArea(a)}
              onKeyDown={onTabKey}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div id="plano" role="tabpanel" aria-labelledby={`tab-${area}`}>
        <FloorMap area={area} tables={snap.tables} reservations={snap.reservations} selected={selectedId} onPick={onPick} />
      </div>
      <p className="map-hint">
        <Icon name="info" size="sm" />
        <span>
          {area === 'PB'
            ? 'Toca una mesa para ver sus reservas. Debajo del código van los puestos vendidos sobre la capacidad.'
            : 'Planta alta: solo los tres sofás de patrocinadores se reservan. La zona de artistas no tiene mesas.'}
        </span>
      </p>
    </section>
  );
}
