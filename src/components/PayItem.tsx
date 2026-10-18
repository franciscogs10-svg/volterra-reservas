'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/logic';
import { payDate, type PayRow } from '@/lib/ui-payments';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  row: PayRow;
  admin: boolean;
  busy: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onReverse: Actions['reverse'];
}

/** Un movimiento de pago. El admin puede revertir un abono una sola vez y con motivo; el abono no se borra. */
export function PayItem({ row, admin, busy, open, onOpen, onClose, onReverse }: Props) {
  const { p } = row;
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const id = `rev-${p.id}`;

  if (p.kind === 'reversal') {
    return (
      <li className="pay rev">
        <span className="pay-l">
          <b>
            <Icon name="undo" size="sm" />
            {row.label}
          </b>
          <small>
            {p.method} · {payDate(p.created_at)}
          </small>
        </span>
        <span className="pay-a">{formatMoney(p.amount)}</span>
        <span />
      </li>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Escribe el motivo del reverso: queda en el historial.');
      return;
    }
    if (await onReverse(p, reason.trim())) onClose();
  }

  return (
    <>
      <li className={`pay${row.reversed ? ' is-rev' : ''}`}>
        <span className="pay-l">
          <b>{row.label}</b>
          <small>
            {p.method} · {payDate(p.created_at)}
            {row.reversed ? ' · revertido' : ''}
          </small>
        </span>
        <span className="pay-a">{formatMoney(p.amount)}</span>
        {admin && row.canReverse ? (
          <button
            type="button"
            className="mini"
            aria-expanded={open}
            aria-controls={`${id}-form`}
            aria-label={`Revertir ${row.label.toLowerCase()} de ${formatMoney(p.amount)}`}
            onClick={open ? onClose : onOpen}
          >
            Revertir
          </button>
        ) : (
          <span />
        )}
      </li>
      {open && (
        <li>
          <form id={`${id}-form`} className="subform danger" noValidate onSubmit={submit}>
            <div className="field">
              <label htmlFor={id}>Motivo del reverso</label>
              <input
                className="inp"
                id={id}
                value={reason}
                placeholder="Ej.: abono cargado dos veces"
                autoComplete="off"
                autoFocus
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${id}-help${error ? ` ${id}-err` : ''}`}
              />
              <p className="help" id={`${id}-help`}>
                El abono no se borra: queda en el historial y se suma un movimiento negativo con este motivo.
              </p>
              {error && (
                <p className="err-msg" id={`${id}-err`} role="alert">
                  <Icon name="alert" size="sm" />
                  <span>{error}</span>
                </p>
              )}
            </div>
            <div className="row2">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                No revertir
              </button>
              <button type="submit" className="btn btn-danger" disabled={busy}>
                Revertir {formatMoney(p.amount)}
              </button>
            </div>
          </form>
        </li>
      )}
    </>
  );
}
