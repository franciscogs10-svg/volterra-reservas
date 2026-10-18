import { summarize } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';
import { statItems } from '@/lib/ui-format';

/** Seis cifras en dorado: 3 x 2 en el celular, una fila en escritorio. */
export function Stats({ tables, reservations, retained }: { tables: TableRow[]; reservations: Reservation[]; retained: number }) {
  const items = statItems(summarize(tables, reservations, retained), reservations.length);
  return (
    <section className="stats" aria-label="Resumen de ventas">
      {items.map(([label, value, note]) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <b>{value}</b>
          <small>{note}</small>
        </div>
      ))}
    </section>
  );
}
