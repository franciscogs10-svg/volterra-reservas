import { money, summarize } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';

export function Stats({ tables, reservations }: { tables: TableRow[]; reservations: Reservation[] }) {
  const s = summarize(tables, reservations);
  const items: [string, string][] = [
    ['Vendido', money(s.sold)],
    ['Cobrado', money(s.collected)],
    ['Por cobrar', money(s.pending)],
    ['Puestos libres', `${s.seatsFree} de ${s.totalSeats}`],
    ['Mesas sin tocar', `${s.untouched} de ${s.totalTables}`],
    ['Personas dentro', String(s.inside)],
  ];
  return (
    <section className="stats" aria-label="Resumen">
      {items.map(([label, value]) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <b>{value}</b>
        </div>
      ))}
    </section>
  );
}
