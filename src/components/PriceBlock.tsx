'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/logic';
import type { TableRow } from '@/lib/types';
import { wholeName } from '@/lib/ui-map';
import type { Actions } from './actions';

interface Props {
  table: TableRow;
  sp: number | null;
  busy: boolean;
  onSave: Actions['savePrices'];
}

/** Precios de la mesa: se leen de un vistazo y se editan a pedido. */
export function PriceBlock({ table, sp, busy, onSave }: Props) {
  const [edit, setEdit] = useState(false);
  const [price, setPrice] = useState(table.price?.toString() ?? '');
  const [seat, setSeat] = useState(table.seat_price?.toString() ?? '');
  const hint = table.price ? (table.price / table.capacity).toFixed(2) : 'Por definir';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (await onSave(table, Number(price) > 0 ? Number(price) : null, Number(seat) > 0 ? Number(seat) : null)) setEdit(false);
  }

  return (
    <section className="m-block" aria-labelledby="h-precios">
      <h3 className="h3" id="h-precios">
        Precios
      </h3>
      {edit ? (
        <form className="stack" onSubmit={submit}>
          <div className="grid2">
            <div className="field">
              <label htmlFor="pr-mesa">{wholeName(table)}</label>
              <div className="money">
                <span className="unit">$</span>
                <input className="inp" id="pr-mesa" type="number" inputMode="decimal" min="0" step="0.01" value={price} placeholder="Por definir" onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pr-puesto">Por puesto</label>
              <div className="money">
                <span className="unit">$</span>
                <input className="inp" id="pr-puesto" type="number" inputMode="decimal" min="0" step="0.01" value={seat} placeholder={hint} onChange={(e) => setSeat(e.target.value)} />
              </div>
            </div>
          </div>
          <p className="help">Si dejas el puesto vacío, se calcula dividiendo el total entre los puestos.</p>
          <div className="row2">
            <button type="button" className="btn btn-secondary" onClick={() => setEdit(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Guardar precios
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="kv">
            <span>{wholeName(table)}</span>
            <b>{table.price ? formatMoney(table.price) : 'Por definir'}</b>
          </p>
          <p className="kv">
            <span>Por puesto</span>
            <b>
              {sp === null ? 'Por definir' : formatMoney(sp)}
              {sp !== null && <small> {table.seat_price !== null ? '(fijado)' : '(total ÷ puestos)'}</small>}
            </b>
          </p>
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => setEdit(true)}>
            Editar precios
          </button>
        </>
      )}
    </section>
  );
}
