'use client';

import { useId, useState } from 'react';
import { formatMoney } from '@/lib/logic';
import type { AppRole, Reservation } from '@/lib/types';
import { MODE_HELP, MODE_LABEL, cancelErrors, cancelPlan, type CancelMode } from '@/lib/ui-cancel';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  r: Reservation;
  role: AppRole | null;
  busy: boolean;
  onCancel: Actions['cancel'];
}

/** Cancelar una reserva (solo admin, solo sin llegada confirmada). Con abono neto, Alejandro decide cada vez:
 *  devolver el abono o retenerlo. Sin abono, solo pide el motivo. Sin opción preseleccionada. */
export function CancelBox({ r, role, busy, onCancel }: Props) {
  const plan = cancelPlan(r, role);
  const uid = useId();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<CancelMode | null>(null);
  const [reason, setReason] = useState('');
  const [errors, setErrors] = useState({ mode: '', reason: '' });

  if (plan.blocked) {
    return (
      <p className="res-note">
        <Icon name="info" />
        <span>{plan.blocked}</span>
      </p>
    );
  }
  if (!plan.offered) return null;

  const formId = `${uid}-cancel`;
  const groupId = `${uid}-mode`;
  const reasonId = `${uid}-reason`;

  if (!open) {
    return (
      <button type="button" className="btn btn-quiet-danger" disabled={busy} aria-expanded={false} aria-controls={formId} onClick={() => setOpen(true)}>
        Cancelar reserva
      </button>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const next = cancelErrors(plan, mode, reason);
    setErrors(next);
    if (next.mode || next.reason) return;
    // Sin abono neto no hay decisión: cancelar sin tocar pagos (cancel_reservation).
    await onCancel(r, plan.asksMode ? (mode as CancelMode) : 'retain', reason.trim());
  }

  const confirmLabel = !plan.asksMode
    ? 'Cancelar reserva'
    : mode === 'refund'
      ? `Cancelar y devolver ${formatMoney(plan.net)}`
      : mode === 'retain'
        ? `Cancelar y retener ${formatMoney(plan.net)}`
        : 'Cancelar reserva';

  return (
    <form id={formId} className="subform danger cancel-box" noValidate onSubmit={submit} aria-label={`Cancelar la reserva de ${r.name}`}>
      <p className="cancel-lead">
        Se liberan los puestos de <b>{r.name}</b>.{' '}
        {plan.asksMode ? `Tiene un abono de ${formatMoney(plan.net)}: elige qué pasa con ese dinero.` : 'No tiene abonos: solo falta el motivo.'}
      </p>

      {plan.asksMode && (
        <div className="field">
          <span className="lbl-txt" id={groupId}>
            Qué pasa con el abono
          </span>
          <div className="opts" role="radiogroup" aria-labelledby={groupId} aria-describedby={errors.mode ? `${uid}-mode-err` : undefined} aria-invalid={errors.mode ? true : undefined}>
            {(['refund', 'retain'] as const).map((m) => (
              <label className={`opt${mode === m ? ' on' : ''}`} key={m}>
                <input
                  type="radio"
                  name={groupId}
                  value={m}
                  checked={mode === m}
                  onChange={() => {
                    setMode(m);
                    setErrors((e) => ({ ...e, mode: '' }));
                  }}
                />
                <span>
                  <b>{m === 'refund' ? `${MODE_LABEL.refund} (${formatMoney(plan.net)})` : MODE_LABEL.retain}</b>
                  <small>{MODE_HELP[m]}</small>
                </span>
              </label>
            ))}
          </div>
          {errors.mode && (
            <p className="err-msg" id={`${uid}-mode-err`} role="alert">
              <Icon name="alert" size="sm" />
              <span>{errors.mode}</span>
            </p>
          )}
        </div>
      )}

      <div className="field">
        <label htmlFor={reasonId}>Motivo de la cancelación</label>
        <input
          className="inp"
          id={reasonId}
          value={reason}
          autoComplete="off"
          autoFocus={!plan.asksMode}
          placeholder="Ej.: el cliente ya no viene"
          onChange={(e) => {
            setReason(e.target.value);
            setErrors((x) => ({ ...x, reason: '' }));
          }}
          aria-invalid={errors.reason ? true : undefined}
          aria-describedby={errors.reason ? `${reasonId}-err` : undefined}
        />
        {errors.reason && (
          <p className="err-msg" id={`${reasonId}-err`} role="alert">
            <Icon name="alert" size="sm" />
            <span>{errors.reason}</span>
          </p>
        )}
      </div>

      <div className="row2">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setOpen(false)}>
          No cancelar
        </button>
        <button type="submit" className="btn btn-danger" disabled={busy}>
          {confirmLabel}
        </button>
      </div>
    </form>
  );
}
