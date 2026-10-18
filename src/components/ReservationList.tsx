'use client';

import { useState } from 'react';
import { balance, money, paid, resStatus, toCsv } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';
import { RES_LABEL, csvFileName, matchesQuery, plural } from '@/lib/ui-format';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';

interface Props {
  tables: TableRow[];
  reservations: Reservation[];
  onPick: (t: TableRow) => void;
}

/** Reservas: buscador y CSV; tarjetas por debajo de 821 px y tabla desde 821 px. Tocar una abre la hoja de su mesa. */
export function ReservationList({ tables, reservations, onPick }: Props) {
  const [q, setQ] = useState('');
  const byId = new Map(tables.map((t) => [t.id, t]));
  const code = (r: Reservation) => byId.get(r.table_id)?.code ?? '';
  const all = [...reservations].sort((a, b) => code(a).localeCompare(code(b)) || a.code.localeCompare(b.code));
  const rows = all.filter((r) => matchesQuery([code(r), r.code, r.name, r.phone], q));
  const seats = reservations.reduce((n, r) => n + r.guests, 0);

  function download() {
    const blob = new Blob(['﻿' + toCsv(tables, reservations)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = csvFileName(new Date());
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function open(r: Reservation) {
    const t = byId.get(r.table_id);
    if (t) onPick(t);
  }

  return (
    <section aria-labelledby="reservas-title">
      <div className="view-head">
        <h2 className="h2" id="reservas-title">
          Reservas
        </h2>
        <p className="sub">
          {plural(reservations.length, 'reserva', 'reservas')} · {plural(seats, 'puesto', 'puestos')}
        </p>
      </div>
      <div className="r-tools">
        <div className="search">
          <Icon name="search" />
          <input
            className="inp"
            type="search"
            autoComplete="off"
            placeholder="Nombre, teléfono o código"
            aria-label="Buscar reservas por nombre, teléfono o código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn-secondary" onClick={download}>
          <Icon name="download" />
          CSV
        </button>
      </div>
      <p className="r-count" aria-live="polite">
        {q.trim() ? `${rows.length} de ${all.length} reservas` : 'Ordenadas por mesa. Toca una para abrir su hoja.'}
      </p>

      {!rows.length ? (
        <p className="empty">
          {all.length ? 'Sin resultados. Prueba con el nombre, el teléfono o el código de 6 caracteres.' : 'Todavía no hay reservas. Toca una mesa del plano para crear la primera.'}
        </p>
      ) : (
        <>
          <ul className="rlist">
            {rows.map((r) => {
              const s = resStatus(r);
              const bal = balance(r);
              return (
                <li key={r.id}>
                  <button type="button" className="rrow" onClick={() => open(r)}>
                    <span className="rr-mesa">{code(r)}</span>
                    <span className="rr-main">
                      <b>{r.name}</b>
                      <span>
                        {plural(r.guests, 'puesto', 'puestos')} · <code>{r.code}</code>
                      </span>
                      <span>{r.phone || 'sin WhatsApp'}</span>
                    </span>
                    <span className="rr-side">
                      <StatusPill status={s} label={RES_LABEL[s]} />
                      <span className={`rr-bal${bal > 0 ? ' due' : ''}`}>{bal > 0 ? `Saldo ${money(bal)}` : `Pagado ${money(paid(r))}`}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="rtable-wrap">
            <table className="rtable">
              <thead>
                <tr>
                  <th scope="col">Mesa</th>
                  <th scope="col">Código</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">WhatsApp</th>
                  <th scope="col" className="n">
                    Puestos
                  </th>
                  <th scope="col" className="n">
                    Total
                  </th>
                  <th scope="col" className="n">
                    Pagado
                  </th>
                  <th scope="col" className="n">
                    Saldo
                  </th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = resStatus(r);
                  const bal = balance(r);
                  return (
                    <tr key={r.id} onClick={() => open(r)}>
                      <td>
                        <button
                          type="button"
                          className="linkish"
                          aria-label={`Abrir ${code(r)}, reserva de ${r.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            open(r);
                          }}
                        >
                          {code(r)}
                        </button>
                      </td>
                      <td>
                        <code>{r.code}</code>
                      </td>
                      <td className="wrap">{r.name}</td>
                      <td>{r.phone ?? '—'}</td>
                      <td className="n">{r.guests}</td>
                      <td className="n">{money(r.total_price)}</td>
                      <td className="n">{money(paid(r))}</td>
                      <td className={`n${bal > 0 ? ' due' : ''}`}>{money(bal)}</td>
                      <td>
                        <StatusPill status={s} label={RES_LABEL[s]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
