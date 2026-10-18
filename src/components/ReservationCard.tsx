'use client';

import { useState } from 'react';
import { balance, money, paid, resStatus } from '@/lib/logic';
import type { Reservation } from '@/lib/types';
import { METHODS, RES_LABEL, payLabels, plural } from '@/lib/ui-format';
import type { Actions } from './actions';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';

interface Props {
  r: Reservation;
  busy: boolean;
  actions: Actions;
}

/** Una reserva dentro de la hoja: montos, movimientos, cobro, llegada y cancelación. */
export function ReservationCard({ r, busy, actions }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [amount, setAmount] = useState(balance(r).toFixed(2));
  const [method, setMethod] = useState(METHODS[0]);
  const [payError, setPayError] = useState('');
  const bal = balance(r);
  const s = resStatus(r);
  const labels = payLabels(r.payments);

  async function submitPay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Number(amount);
    if (!(v > 0)) return setPayError('Escribe un monto mayor a cero.');
    if (v > bal + 0.001) return setPayError(`El monto pasa el saldo de ${money(bal)}.`);
    setPayError('');
    if (await actions.pay(r, v, method)) setAmount('');
  }

  return (
    <article className="res" aria-labelledby={`rn-${r.id}`}>
      <header className="res-head">
        <div>
          <h4 className="res-name" id={`rn-${r.id}`}>
            {r.name}
          </h4>
          <p className="res-meta">
            {plural(r.guests, 'puesto', 'puestos')} · <span className="nowrap">{r.phone || 'sin WhatsApp'}</span>
          </p>
        </div>
        <div className="res-right">
          <StatusPill status={s} label={RES_LABEL[s]} />
          <code className="res-code">{r.code}</code>
        </div>
      </header>

      <dl className="res-money">
        <div>
          <dt>Total</dt>
          <dd>{money(r.total_price)}</dd>
        </div>
        <div>
          <dt>Pagado</dt>
          <dd>{money(paid(r))}</dd>
        </div>
        <div>
          <dt>Saldo</dt>
          <dd className={bal > 0 ? 'due' : undefined}>{money(bal)}</dd>
        </div>
      </dl>

      {r.payments.length ? (
        <ul className="pays" aria-label="Movimientos de pago">
          {r.payments.map((p, i) => (
            <li className={`pay${p.kind === 'reversal' ? ' rev' : ''}`} key={p.id}>
              <span className="pay-l">
                <b>
                  {p.kind === 'reversal' && <Icon name="undo" size="sm" />}
                  {labels[i]}
                </b>
                <small>{p.method}</small>
              </span>
              <span className="pay-a">{money(p.amount)}</span>
              <span />
            </li>
          ))}
        </ul>
      ) : (
        <p className="help">Sin abonos todavía.</p>
      )}

      {bal > 0 && (
        <form className="subform" noValidate onSubmit={submitPay}>
          <div className="grid2">
            <div className="field">
              <label htmlFor={`pay-amt-${r.id}`}>Monto</label>
              <div className="money">
                <span className="unit">$</span>
                <input
                  className="inp"
                  id={`pay-amt-${r.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={payError ? true : undefined}
                  aria-describedby={payError ? `pay-err-${r.id}` : undefined}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`pay-met-${r.id}`}>Método</label>
              <div className="sel-wrap">
                <select className="inp" id={`pay-met-${r.id}`} value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <Icon name="down" />
              </div>
            </div>
          </div>
          {payError && (
            <p className="err-msg" id={`pay-err-${r.id}`} role="alert">
              <Icon name="alert" size="sm" />
              <span>{payError}</span>
            </p>
          )}
          <button type="submit" className="btn btn-secondary btn-block" disabled={busy}>
            Registrar pago
          </button>
        </form>
      )}

      <div className="res-act">
        {r.checked_in !== null ? (
          <span className="pill st-in">
            <Icon name="users" />
            Ingreso confirmado
          </span>
        ) : (
          <button type="button" className="btn btn-ok" disabled={busy} onClick={() => actions.checkIn(r)}>
            <Icon name="check" />
            Confirmar llegada
          </button>
        )}
        {confirm ? (
          <>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={async () => {
                await actions.cancel(r);
                setConfirm(false);
              }}
            >
              Sí, liberar puestos
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>
              No
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-quiet-danger" disabled={busy} onClick={() => setConfirm(true)}>
            Cancelar reserva
          </button>
        )}
      </div>

      {r.checked_in === null && bal > 0 && (
        <p className="res-note">
          <Icon name="info" />
          <span>Debe {money(bal)}. Se puede dejar entrar; queda el aviso.</span>
        </p>
      )}
    </article>
  );
}
