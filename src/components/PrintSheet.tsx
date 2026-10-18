import { eventDateLabel, protocolRows, protocolTotals } from '@/lib/logic';
import type { AppRole, EventRow, Reservation, TableRow } from '@/lib/types';
import { arrivalTime, plural, printStamp } from '@/lib/ui-format';
import { seesPayments } from '@/lib/ui-payments';
import { groupByArea, saldoText } from '@/lib/ui-protocol';

interface Props {
  event: EventRow;
  tables: TableRow[];
  reservations: Reservation[];
  role: AppRole | null;
  printedAt: Date | null;
}

export function PrintSheet({ event, tables, reservations, role, printedAt }: Props) {
  const rows = protocolRows(tables, reservations, 'mesa', seesPayments(role));
  const totals = protocolTotals(rows);
  return (
    <div className="print-only" aria-hidden="true">
      <article className="print-sheet">
        <header className="ps-head">
          <div>
            <p className="ps-wm">MOREFEST</p>
            <p className="ps-sub">Renacer · Morella Montiel · {event.venue ?? 'Restaurante VOLTERRA, Maracaibo'}</p>
          </div>
          <div className="ps-meta">
            <b>Lista de protocolo</b>
            {eventDateLabel(event.event_date)}
            <br />
            Impresa: {printedAt ? printStamp(printedAt) : ''}
          </div>
        </header>
        <table className="ps-table">
          <thead><tr><th scope="col">Mesa</th><th scope="col">Reserva</th><th scope="col">Código</th><th scope="col" className="n">Pers.</th><th scope="col" className="n">Saldo</th><th scope="col">Llegó</th></tr></thead>
          {groupByArea(rows).map((group) => (
            <tbody key={group.area}>
              <tr className="ps-area"><th colSpan={6} scope="colgroup">{group.label}</th></tr>
              {group.rows.map((row) => (
                <tr key={row.reservationId}>
                  <td className="mono">{row.tableCode}</td><td>{row.name}</td><td className="code">{row.code}</td><td className="n">{row.guests}</td><td className="n">{saldoText(row.balance)}</td>
                  <td className="when">{row.checkedInAt ? arrivalTime(row.checkedInAt) : row.checkedIn !== null ? 'Sí' : <span className="ps-box" />}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <footer className="ps-foot"><span>{plural(totals.reservations, 'reserva', 'reservas')} · {plural(totals.expected, 'persona', 'personas')} · {totals.inside} dentro</span><span>Corporación Montiel</span></footer>
      </article>
    </div>
  );
}
