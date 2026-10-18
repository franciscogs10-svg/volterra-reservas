'use client';

import { useState } from 'react';
import { LABEL, balance, forTable, money, paid, resStatus, seatPrice, soldSeats, tableStatus } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';
import type { Actions } from './actions';

const METHODS = ['Efectivo', 'Zelle', 'Pago móvil', 'Transferencia'];

interface Props {
  table: TableRow | null;
  reservations: Reservation[];
  actions: Actions;
  busy: boolean;
  msg: { text: string; err: boolean } | null;
}

export function Panel({ table, reservations, actions, busy, msg }: Props) {
  if (!table) {
    return (
      <aside className="card">
        <h2>Mesa</h2>
        <p className="note">Toca una mesa del plano para ver sus puestos o reservar. Una mesa se puede vender entera o por puestos.</p>
        {msg && <p className={`msg${msg.err ? ' err' : ''}`}>{msg.text}</p>}
      </aside>
    );
  }
  const list = forTable(table.id, reservations);
  const sold = soldSeats(table.id, reservations);
  const free = table.capacity - sold;
  const s = tableStatus(table, reservations);
  const sp = seatPrice(table);

  return (
    <aside className="card" aria-live="polite">
      <h2>
        {table.code} <span className={`pill ${s}`}>{LABEL[s]}</span>
      </h2>
      <div className="kv">
        <span>Puestos</span>
        <span>
          {sold} vendidos · {free} libres de {table.capacity}
        </span>
      </div>

      <PriceForm key={`${table.id}-${table.price}-${table.seat_price}`} table={table} busy={busy} onSave={actions.savePrices} />
      <div className="kv">
        <span>Precio mesa / puesto</span>
        <span>
          {sp === null ? 'Por definir' : `${table.price ? money(table.price) : 'por definir'} / ${money(sp)}${table.seat_price !== null ? ' (fijado)' : ''}`}
        </span>
      </div>

      {list.length > 0 && (
        <>
          <h2 style={{ marginTop: 12, fontSize: 14 }}>Reservas de esta mesa</h2>
          {list.map((r) => (
            <ReservationCard key={r.id} r={r} busy={busy} actions={actions} />
          ))}
        </>
      )}

      {free > 0 ? (
        <>
          <h2 style={{ marginTop: 12, fontSize: 14 }}>Nueva reserva</h2>
          <NewForm key={`${table.id}-${sold}`} table={table} free={free} sp={sp} busy={busy} onReserve={actions.reserve} />
        </>
      ) : (
        <p className="note">No quedan puestos libres en esta mesa.</p>
      )}
      {msg && <p className={`msg${msg.err ? ' err' : ''}`}>{msg.text}</p>}
    </aside>
  );
}

function PriceForm({ table, busy, onSave }: { table: TableRow; busy: boolean; onSave: Actions['savePrices'] }) {
  const [price, setPrice] = useState(table.price?.toString() ?? '');
  const [seat, setSeat] = useState(table.seat_price?.toString() ?? '');
  const placeholder = table.price ? `${(table.price / table.capacity).toFixed(2)} (mesa / puestos)` : 'Por definir';
  return (
    <form
      className="form"
      onSubmit={(e) => {
        e.preventDefault();
        onSave(table, Number(price) > 0 ? Number(price) : null, Number(seat) > 0 ? Number(seat) : null);
      }}
    >
      <label>
        Precio de la mesa entera
        <input type="number" min="0" step="0.01" value={price} placeholder="Por definir" onChange={(e) => setPrice(e.target.value)} />
      </label>
      <label>
        Precio por puesto
        <input type="number" min="0" step="0.01" value={seat} placeholder={placeholder} onChange={(e) => setSeat(e.target.value)} />
      </label>
      <div className="full note" style={{ margin: 0 }}>
        Si dejas el puesto vacío, se calcula dividiendo la mesa entre sus puestos.
      </div>
      <div className="full">
        <button disabled={busy}>Guardar precios</button>
      </div>
    </form>
  );
}

function NewForm({ table, free, sp, busy, onReserve }: { table: TableRow; free: number; sp: number | null; busy: boolean; onReserve: Actions['reserve'] }) {
  const [seats, setSeats] = useState(free);
  const [total, setTotal] = useState(sp ? (sp * free).toFixed(2) : '');
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState('');

  function changeSeats(v: number) {
    setSeats(v);
    if (!edited && sp && v > 0) setTotal((sp * v).toFixed(2));
  }

  return (
    <form
      className="form"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const name = String(f.get('name')).trim();
        const deposit = Number(f.get('deposit')) || 0;
        const t = Number(total) || 0;
        if (!name) return setError('Escribe el nombre del cliente.');
        if (!(seats >= 1) || seats > free) return setError(`Solo quedan ${free} puestos libres en esta mesa.`);
        if (deposit > t) return setError('El anticipo no puede ser mayor al total.');
        setError('');
        await onReserve(table, { name, phone: String(f.get('phone')).trim(), guests: seats, total: t, deposit, method: String(f.get('method')) });
      }}
    >
      <label className="full">
        Cliente
        <input name="name" required autoComplete="off" />
      </label>
      <label className="full">
        WhatsApp
        <input name="phone" inputMode="tel" placeholder="+58 4xx xxx xxxx" />
      </label>
      <label>
        Puestos
        <input type="number" min={1} max={free} value={seats} onChange={(e) => changeSeats(Number(e.target.value))} />
      </label>
      <label>
        Precio total
        <input
          type="number"
          min="0"
          step="0.01"
          value={total}
          placeholder="0.00"
          onChange={(e) => {
            setTotal(e.target.value);
            setEdited(true);
          }}
        />
      </label>
      <label>
        Anticipo
        <input name="deposit" type="number" min="0" step="0.01" defaultValue={0} />
      </label>
      <label>
        Método
        <select name="method">
          {METHODS.map((m) => (
            <option key={m}>{m}</option>
          ))}
        </select>
      </label>
      <div className="full actions" style={{ marginTop: 2 }}>
        <button className="primary" disabled={busy}>
          Reservar
        </button>
      </div>
      {sp === null && <p className="full note">El precio aún no está definido: escribe el total a mano.</p>}
      {error && <p className="full msg err">{error}</p>}
    </form>
  );
}

function ReservationCard({ r, busy, actions }: { r: Reservation; busy: boolean; actions: Actions }) {
  const [confirm, setConfirm] = useState(false);
  const [amount, setAmount] = useState(balance(r).toFixed(2));
  const [method, setMethod] = useState(METHODS[0]);
  const bal = balance(r);
  const s = resStatus(r);
  return (
    <div className="res">
      <div className="reshead">
        <b>{r.name}</b>
        <span className={`pill ${s}`}>{LABEL[s]}</span>
      </div>
      <div className="kv">
        <span>
          {r.guests} {r.guests === 1 ? 'puesto' : 'puestos'} · {r.phone || 'sin WhatsApp'}
        </span>
        <span className="code">{r.code}</span>
      </div>
      <div className="kv">
        <span>Total / pagado</span>
        <span>
          {money(r.total_price)} / {money(paid(r))}
        </span>
      </div>
      <div className="kv">
        <span>Saldo</span>
        <span className={bal > 0 ? 'bal' : ''}>{money(bal)}</span>
      </div>
      {r.payments.map((p, i) => (
        <div className="pay" key={p.id}>
          <span>
            {p.kind === 'reversal' ? 'Reverso' : `Abono ${i + 1}`} · {p.method}
          </span>
          <span>{money(p.amount)}</span>
        </div>
      ))}
      {bal > 0 && (
        <form
          className="form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await actions.pay(r, Number(amount), method)) setAmount('');
          }}
        >
          <label>
            Monto
            <input type="number" min="0.01" max={bal} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            Método
            <select value={method} onChange={(e) => setMethod(e.target.value)}>
              {METHODS.map((m) => (
                <option key={m}>{m}</option>
              ))}
            </select>
          </label>
          <div className="full">
            <button disabled={busy}>Registrar pago</button>
          </div>
        </form>
      )}
      <div className="actions">
        {r.checked_in !== null ? (
          <span className="pill in">Ingreso confirmado</span>
        ) : (
          <button className="primary" disabled={busy} onClick={() => actions.checkIn(r)}>
            Confirmar llegada
          </button>
        )}
        {confirm ? (
          <>
            <button
              className="danger"
              disabled={busy}
              onClick={async () => {
                await actions.cancel(r);
                setConfirm(false);
              }}
            >
              Sí, liberar puestos
            </button>
            <button onClick={() => setConfirm(false)}>No</button>
          </>
        ) : (
          <button className="danger" disabled={busy} onClick={() => setConfirm(true)}>
            Cancelar
          </button>
        )}
      </div>
      {r.checked_in === null && bal > 0 && <p className="note">Debe {money(bal)}. Se puede dejar entrar, queda el aviso.</p>}
    </div>
  );
}
