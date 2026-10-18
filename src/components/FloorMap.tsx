'use client';

import { useRef, useState } from 'react';
import { LABEL, soldSeats, tableStatus } from '@/lib/logic';
import type { AreaCode, Reservation, TableRow, TableStatus } from '@/lib/types';
import { centerScroll, resolveTouch, ringBox, shortCode, tableAria } from '@/lib/ui-map';
import { Icon } from './Icon';

const ORDER: TableStatus[] = ['free', 'part', 'held', 'paid', 'in'];

interface Props {
  area: AreaCode;
  tables: TableRow[];
  reservations: Reservation[];
  selected: string | null;
  onPick: (t: TableRow) => void;
}

/** Plano en papel crema. Cada estado se distingue por trazo o trama además del color (leyenda arriba).
 *  El toque se resuelve con resolveTouch (forma real, luego centro más cercano) sobre todo el plano, así las
 *  áreas de toque de al menos 44 px no se roban toques entre vecinas; la lupa amplía el plano al 185%. */
export function FloorMap({ area, tables, reservations, selected, onPick }: Props) {
  const [zoom, setZoom] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const list = tables.filter((t) => t.area === area);

  function toggleZoom() {
    const on = !zoom;
    setZoom(on);
    const t = list.find((x) => x.id === selected);
    if (!on || !t) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(
      () => {
        const box = scroller.current;
        const plan = svg.current;
        if (!box || !plan) return;
        box.scrollTo({ ...centerScroll(t, plan.clientWidth, { w: box.clientWidth, h: box.clientHeight }), behavior: reduce ? 'auto' : 'smooth' });
      },
      reduce ? 0 : 260,
    );
  }

  function onPlanClick(e: React.MouseEvent<SVGSVGElement>) {
    const plan = svg.current;
    if (!plan) return;
    const r = plan.getBoundingClientRect();
    const t = resolveTouch(list, ((e.clientX - r.left) / r.width) * 792, ((e.clientY - r.top) / r.height) * 966);
    if (t) onPick(t);
  }

  function onKey(e: React.KeyboardEvent, t: TableRow) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick(t);
    }
  }

  return (
    <div className={`map-paper${zoom ? ' zoomed' : ''}`}>
      <ul className="legend" aria-label="Leyenda del plano">
        {ORDER.map((s) => (
          <li key={s}>
            <svg viewBox="0 0 22 14" aria-hidden="true">
              <rect className={`lg-${s}`} x="2" y="2" width="18" height="10" rx="2" />
            </svg>
            {LABEL[s]}
          </li>
        ))}
      </ul>
      <div className="map-scroll" ref={scroller}>
        <svg
          ref={svg}
          className="map-svg"
          viewBox="0 0 792 966"
          role="group"
          onClick={onPlanClick}
          aria-label={
            area === 'PB'
              ? 'Plano de la planta baja. Toca una mesa para ver sus reservas.'
              : 'Plano de la planta alta VIP: tres sofás de patrocinadores; el resto es zona de artistas. Toca un sofá para ver sus reservas.'
          }
        >
          <defs>
            <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="12" height="12" style={{ fill: 'var(--paper-2)' }} />
              <rect width="3.5" height="12" style={{ fill: 'var(--ink-2)' }} />
            </pattern>
            <pattern id="hatch-lg" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" style={{ fill: 'var(--paper-2)' }} />
              <rect width="1.4" height="4" style={{ fill: 'var(--ink-2)' }} />
            </pattern>
            <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" style={{ fill: 'var(--paper)' }} />
              <circle cx="5" cy="5" r="2.2" style={{ fill: 'var(--map-part)' }} />
            </pattern>
            <pattern id="dots-lg" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" style={{ fill: 'var(--paper)' }} />
              <circle cx="2" cy="2" r="1" style={{ fill: 'var(--map-part)' }} />
            </pattern>
          </defs>
          <rect className="paper-bg" width="792" height="966" />
          <image className="map-img" href={`/plano-${area.toLowerCase()}.jpg`} x="0" y="0" width="792" height="966" preserveAspectRatio="none" />
          <g>
            {list.map((t) => {
              const s = tableStatus(t, reservations);
              const sold = soldSeats(t.id, reservations);
              const ring = ringBox(t);
              const sel = selected === t.id;
              return (
                <g
                  key={t.id}
                  className={`tbl t-${s}${sel ? ' is-sel' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={tableAria(t, s, sold)}
                  aria-current={sel ? 'true' : undefined}
                  onKeyDown={(e) => onKey(e, t)}
                >
                  <rect className="t-ring" x={ring.x} y={ring.y} width={ring.w} height={ring.h} rx={12} />
                  <g transform={`rotate(${t.map_rot} ${t.map_x} ${t.map_y})`}>
                    {t.shape === 'c' ? (
                      <ellipse className="t-shape" cx={t.map_x} cy={t.map_y} rx={t.map_w / 2} ry={t.map_h / 2} />
                    ) : (
                      <rect className="t-shape" x={t.map_x - t.map_w / 2} y={t.map_y - t.map_h / 2} width={t.map_w} height={t.map_h} rx={6} />
                    )}
                  </g>
                  <text className="t-label" x={t.map_x} y={t.map_y - 9}>
                    {shortCode(t.code)}
                  </text>
                  <text className="t-count" x={t.map_x} y={t.map_y + 13}>
                    {sold}/{t.capacity}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <button type="button" className="zoom-btn" aria-pressed={zoom} aria-label={zoom ? 'Reducir el plano' : 'Ampliar el plano'} onClick={toggleZoom}>
        <Icon name={zoom ? 'zoomout' : 'zoomin'} size="lg" />
      </button>
    </div>
  );
}
