'use client';

import { useState } from 'react';
import { eventDateLabel, protocolRows, protocolTotals } from '@/lib/logic';
import type { AppRole, EventRow, ProtocolRow, Reservation, TableRow } from '@/lib/types';
import { arrivalTime, matchesQuery, plural } from '@/lib/ui-format';
import { seesPayments } from '@/lib/ui-payments';
import { groupByArea, saldoText } from '@/lib/ui-protocol';
import { Icon } from './Icon';

type Order = 'mesa' | 'nombre';

const ORDERS: [Order, string][] = [
  ['mesa', 'Por mesa'],
  ['nombre', 'Por nombre'],
];

interface Props {
  tables: TableRow[];
  reservations: Reservation[];
  event: EventRow;
  role: AppRole | null;
  onPick: (table: TableRow) => void;
  onPrint: () => void;
}

export function ProtocolView({ tables, reservations, event, role, onPick, onPrint }: Props) {
  const [order, setOrder] = useState<Order>('mesa');
  const [query, setQuery] = useState('');
  const rows = protocolRows(tables, reservations, order, seesPayments(role));
  const totals = protocolTotals(rows);
  const groups = groupByArea(rows.filter((row) => matchesQuery([row.name, row.tableCode, row.code], query)));
  const percent = totals.expected > 0 ? Math.round((totals.inside / totals.expected) * 100) : 0;
  const tablesById = new Map(tables.map((table) => [table.id, table]));

  function open(row: ProtocolRow) {
    const table = tablesById.get(row.tableId);
    if (table) onPick(table);
  }

  return (
    <section aria-labelledby="proto-title">
      <div className="view-head">
        <h2 className="h2" id="proto-title">Lista de protocolo</h2>
        <p className="sub">{eventDateLabel(event.event_date)}. Toca una fila para abrir su hoja y confirmar la llegada.</p>
      </div>
      <div className="proto-top">
        <p className="proto-count" aria-live="polite">
          <b>{totals.inside}</b>
          <span>de {plural(totals.expected, 'persona', 'personas')} {totals.inside === 1 ? 'llegó' : 'llegaron'} · {plural(totals.reservations, 'reserva', 'reservas')}</span>
        </p>
        <div className="pmeter" aria-hidden="true"><span style={{ width: `${percent}%` }} /></div>
        <div className="seg" role="radiogroup" aria-label="Orden de la lista">
          {ORDERS.map(([value, label]) => (
            <button key={value} type="button" role="radio" aria-checked={order === value} onClick={() => setOrder(value)}>{label}</button>
          ))}
        </div>
        <div className="search">
          <Icon name="search" />
          <input className="inp" type="search" autoComplete="off" placeholder="Nombre, mesa o código" aria-label="Buscar en la lista por nombre, mesa o código" value={query} onChange={(event) => setQuery(event.target.value)} />
        </div>
        <button type="button" className="btn btn-secondary btn-block" onClick={onPrint}><Icon name="print" />Imprimir lista</button>
        <p className="help">Sale en blanco y negro, por mesa, sin teléfonos y con una casilla para marcar a mano. Mejor desde la computadora.</p>
      </div>
      {groups.map((group) => (
        <section className="pgroup" key={group.area} aria-labelledby={`pg-${group.area}`}>
          <h3 className="pg-head" id={`pg-${group.area}`}><b>{group.label}</b><small>{plural(group.rows.length, 'reserva', 'reservas')}</small></h3>
          <ul className="plist">
            {group.rows.map((row) => (
              <li key={row.reservationId}>
                <button type="button" className={`prow${row.checkedIn !== null ? ' is-in' : ''}`} onClick={() => open(row)}>
                  <span className="pr-mesa">{row.tableCode}</span>
                  <span className="pr-main"><b>{row.name}</b><span>{plural(row.guests, 'persona', 'personas')} · <code>{row.code}</code> · <Saldo balance={row.balance} /></span></span>
                  <Arrival row={row} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!groups.length && <p className="empty">{rows.length ? 'Nadie con ese nombre, mesa o código. Revisa cómo se escribe.' : 'Todavía no hay reservas.'}</p>}
    </section>
  );
}

function Saldo({ balance }: { balance: number | null }) {
  if (balance === null) return <span>Saldo —</span>;
  if (balance > 0) return <span className="pr-due"><Icon name="clock" size="sm" />Debe {saldoText(balance)}</span>;
  return <span className="pr-ok"><Icon name="check" size="sm" />Pagado</span>;
}

function Arrival({ row }: { row: ProtocolRow }) {
  if (row.checkedIn === null) return <span className="pending"><span className="box" aria-hidden="true" />Pendiente</span>;
  return <span className="arrived"><span><Icon name="check" size="sm" />Llegó</span>{row.checkedInAt && <small>{arrivalTime(row.checkedInAt)}</small>}</span>;
}
