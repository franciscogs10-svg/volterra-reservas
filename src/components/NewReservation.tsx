'use client';

import { useState } from 'react';
import type { TableRow } from '@/lib/types';
import { METHODS, plural } from '@/lib/ui-format';
import { emailError } from '@/lib/ui-mail';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  table: TableRow;
  free: number;
  sp: number | null;
  busy: boolean;
  onReserve: Actions['reserve'];
}

/** Nueva reserva: mesa entera o por puestos, con selector de puestos de 48 px y correo opcional. */
export function NewReservation({ table, free, sp, busy, onReserve }: Props) {
  const [seats, setSeats] = useState(free);
  const [total, setTotal] = useState(sp ? (sp * free).toFixed(2) : '');
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState('');
  const [nameMissing, setNameMissing] = useState(false);
  const [emailErr, setEmailErr] = useState('');

  function changeSeats(v: number) {
    const n = Math.min(free, Math.max(1, v));
    setSeats(n);
    if (!edited && sp) setTotal((sp * n).toFixed(2));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name')).trim();
    const email = String(f.get('email') ?? '').trim();
    const deposit = Number(f.get('deposit')) || 0;
    const t = Number(total) || 0;
    setNameMissing(!name);
    if (!name) return setError('Escribe el nombre del cliente.');
    if (!(seats >= 1) || seats > free) return setError(`Solo quedan ${free} puestos libres.`);
    if (deposit > t) return setError('El anticipo no puede ser mayor al total.');
    const badEmail = emailError(email);
    setEmailErr(badEmail);
    if (badEmail) {
      setError('');
      document.getElementById('nr-email')?.focus();
      return;
    }
    setError('');
    await onReserve(table, { name, phone: String(f.get('phone')).trim(), email, guests: seats, total: t, deposit, method: String(f.get('method')) });
  }

  return (
    <section className="m-block" aria-labelledby="h-new">
      <div className="m-row">
        <h3 className="h3" id="h-new">
          Nueva reserva
        </h3>
        <span className="muted">{free} libres</span>
      </div>
      <p className="help">Se vende completa o por puestos; admite varias reservas hasta llenarse.</p>
      <form className="stack" noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor="nr-name">
            Cliente <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            className="inp"
            id="nr-name"
            name="name"
            autoComplete="off"
            required
            aria-invalid={nameMissing || undefined}
            aria-describedby={error ? 'nr-err' : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="nr-phone">WhatsApp</label>
          <input className="inp" id="nr-phone" name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="+58 4xx xxx xxxx" />
        </div>
        <div className="field">
          <label htmlFor="nr-email">Correo (opcional)</label>
          <input
            className="inp"
            id="nr-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="Para enviarle la confirmación"
            aria-invalid={emailErr ? true : undefined}
            aria-describedby={emailErr ? 'nr-email-err' : undefined}
            onBlur={(e) => setEmailErr(emailError(e.target.value))}
            onChange={() => setEmailErr('')}
          />
          {emailErr && (
            <p className="err-msg" id="nr-email-err" role="alert">
              <Icon name="alert" size="sm" />
              <span>{emailErr}</span>
            </p>
          )}
        </div>
        <div className="nr-seats">
          <span className="lbl-txt" id="nr-seats-l">
            Puestos
          </span>
          <div className="stepper" role="group" aria-labelledby="nr-seats-l">
            <button type="button" className="step-btn" aria-label="Quitar un puesto" disabled={seats <= 1} onClick={() => changeSeats(seats - 1)}>
              <Icon name="minus" />
            </button>
            <output aria-live="polite">{seats}</output>
            <button type="button" className="step-btn" aria-label="Agregar un puesto" disabled={seats >= free} onClick={() => changeSeats(seats + 1)}>
              <Icon name="plus" />
            </button>
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="nr-total">Precio total</label>
            <div className="money">
              <span className="unit">$</span>
              <input
                className="inp"
                id="nr-total"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={total}
                placeholder="0.00"
                onChange={(e) => {
                  setTotal(e.target.value);
                  setEdited(true);
                }}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="nr-dep">Anticipo</label>
            <div className="money">
              <span className="unit">$</span>
              <input className="inp" id="nr-dep" name="deposit" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={0} />
            </div>
          </div>
          <div className="field full">
            <label htmlFor="nr-met">Método del anticipo</label>
            <div className="sel-wrap">
              <select className="inp" id="nr-met" name="method">
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <Icon name="down" />
            </div>
          </div>
        </div>
        {error && (
          <p className="err-msg" id="nr-err" role="alert">
            <Icon name="alert" size="sm" />
            <span>{error}</span>
          </p>
        )}
        {sp === null && <p className="help">El precio aún no está definido: escribe el total a mano.</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          Reservar {plural(seats, 'puesto', 'puestos')}
        </button>
      </form>
    </section>
  );
}
