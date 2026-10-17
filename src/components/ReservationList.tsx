'use client';

import { useState } from 'react';
import { LABEL, balance, money, paid, resStatus, toCsv } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';

interface Props {
  tables: TableRow[];
  reservations: Reservation[];
  onPick: (t: TableRow) => void;
}

export function ReservationList({ tables, reservations, onPick }: Props) {
  const [q, setQ] = useState('');
  const byId = new Map(tables.map((t) => [t.id, t]));
  const query = q.trim().toLowerCase();
  const rows = reservations
    .filter((r) => !query || `${byId.get(r.table_id)?.code} ${r.code} ${r.name} ${r.phone ?? ''}`.toLowerCase().includes(query))
    .sort((a, b) => (byId.get(a.table_id)?.code ?? '').localeCompare(byId.get(b.table_id)?.code ?? ''));

  function download() {
    const blob = new Blob(['﻿' + toCsv(tables, reservations)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `volterra-reservas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <section className="card">
      <div className="tabs">
        <h2 style={{ margin: 0 }}>Reservas</h2>
        <input
          className="search"
          style={{ marginLeft: 'auto' }}
          placeholder="Buscar nombre, teléfono o código"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Buscar reservas"
        />
        <button onClick={download}>Descargar CSV</button>
      </div>
      <div className="tablewrap">
        <table>
          <thead>
            <tr>
              <th>Mesa</th>
              <th>Código</th>
              <th>Cliente</th>
              <th>WhatsApp</th>
              <th className="n">Puestos</th>
              <th className="n">Total</th>
              <th className="n">Pagado</th>
              <th className="n">Saldo</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const t = byId.get(r.table_id);
              const s = resStatus(r);
              return (
                <tr key={r.id} className="row" onClick={() => t && onPick(t)}>
                  <td className="code">{t?.code}</td>
                  <td className="code">{r.code}</td>
                  <td>{r.name}</td>
                  <td>{r.phone ?? '-'}</td>
                  <td className="n">{r.guests}</td>
                  <td className="n">{money(r.total_price)}</td>
                  <td className="n">{money(paid(r))}</td>
                  <td className="n">{money(balance(r))}</td>
                  <td>
                    <span className={`pill ${s}`}>{LABEL[s]}</span>
                  </td>
                </tr>
              );
            })}
            {!rows.length && (
              <tr>
                <td colSpan={9} className="note">
                  {reservations.length ? 'Sin resultados.' : 'Todavía no hay reservas. Toca una mesa del plano para crear la primera.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
