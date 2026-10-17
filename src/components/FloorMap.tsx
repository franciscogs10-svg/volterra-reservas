import { LABEL, soldSeats, tableStatus } from '@/lib/logic';
import type { AreaCode, Reservation, TableRow, TableStatus } from '@/lib/types';

const TOKEN: Record<TableStatus, string> = {
  free: '--free',
  part: '--part',
  held: '--held',
  paid: '--paid',
  in: '--in',
};

interface Props {
  area: AreaCode;
  tables: TableRow[];
  reservations: Reservation[];
  selected: string | null;
  onPick: (t: TableRow) => void;
}

export function FloorMap({ area, tables, reservations, selected, onPick }: Props) {
  return (
    <svg viewBox="0 0 792 966" role="img" aria-label="Croquis de VOLTERRA con las mesas marcadas">
      <image href={`/plano-${area.toLowerCase()}.jpg`} x="0" y="0" width="792" height="966" />
      {tables
        .filter((t) => t.area === area)
        .map((t) => {
          const s = tableStatus(t, reservations);
          const sel = selected === t.id;
          const color = `var(${TOKEN[s]})`;
          const sold = soldSeats(t.id, reservations);
          const shape =
            t.shape === 'c' ? (
              <ellipse cx={t.map_x} cy={t.map_y} rx={t.map_w / 2} ry={t.map_h / 2} {...paint(color, sel, s)} />
            ) : (
              <rect x={t.map_x - t.map_w / 2} y={t.map_y - t.map_h / 2} width={t.map_w} height={t.map_h} rx={6} {...paint(color, sel, s)} />
            );
          return (
            <g
              key={t.id}
              className="tbl"
              tabIndex={0}
              role="button"
              aria-label={`${t.code} ${LABEL[s]}, ${sold} de ${t.capacity} puestos vendidos`}
              onClick={() => onPick(t)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onPick(t);
                }
              }}
            >
              <g transform={`rotate(${t.map_rot} ${t.map_x} ${t.map_y})`}>{shape}</g>
              <text x={t.map_x} y={t.map_y + 1} textAnchor="middle" fontSize={14} fontWeight={500} fill="#1d1a22" stroke="#fff" strokeWidth={4} paintOrder="stroke">
                {t.code}
              </text>
              <text x={t.map_x} y={t.map_y + 14} textAnchor="middle" fontSize={11} fill="#1d1a22" stroke="#fff" strokeWidth={3} paintOrder="stroke">
                {sold}/{t.capacity}
              </text>
            </g>
          );
        })}
    </svg>
  );
}

function paint(color: string, selected: boolean, s: TableStatus) {
  return {
    fill: color,
    fillOpacity: 0.5,
    stroke: selected ? '#000' : color,
    strokeWidth: selected ? 5 : 3,
    strokeDasharray: s === 'part' ? '7 4' : undefined,
  };
}
