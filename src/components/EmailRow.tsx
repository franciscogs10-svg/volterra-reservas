'use client';

import { useState } from 'react';
import type { Reservation } from '@/lib/types';
import { emailError } from '@/lib/ui-mail';
import type { Actions } from './actions';
import { Icon } from './Icon';

/** Correo del cliente dentro de la tarjeta: se ve, se agrega, se corrige o se borra (vacío). */
export function EmailRow({ r, busy, canEdit, onSave }: { r: Reservation; busy: boolean; canEdit: boolean; onSave: Actions['setEmail'] }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(r.email ?? '');
  const [error, setError] = useState('');
  const id = `em-${r.id}`;

  if (!edit) {
    return (
      <div className="mail-row">
        <span className="pay-l">
          <b>
            <Icon name="mail" size="sm" />
            Correo
          </b>
          <small>{r.email ?? 'Sin correo'}</small>
        </span>
        {canEdit && (
          <button
            type="button"
            className="mini"
            onClick={() => {
              setValue(r.email ?? '');
              setError('');
              setEdit(true);
            }}
          >
            {r.email ? 'Editar' : 'Agregar'}
          </button>
        )}
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const bad = emailError(value);
    if (bad) {
      setError(bad);
      return;
    }
    if (await onSave(r, value.trim() || null)) setEdit(false);
  }

  return (
    <form className="subform" noValidate onSubmit={submit}>
      <div className="field">
        <label htmlFor={id}>Correo del cliente</label>
        <input
          className="inp"
          id={id}
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="nombre@correo.com"
          value={value}
          autoFocus
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          onBlur={() => setError(emailError(value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-help${error ? ` ${id}-err` : ''}`}
        />
        <p className="help" id={`${id}-help`}>
          Déjalo vacío para borrarlo. Se usa para enviarle la confirmación.
        </p>
        {error && (
          <p className="err-msg" id={`${id}-err`} role="alert">
            <Icon name="alert" size="sm" />
            <span>{error}</span>
          </p>
        )}
      </div>
      <div className="row2">
        <button type="button" className="btn btn-secondary" onClick={() => setEdit(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Guardar correo
        </button>
      </div>
    </form>
  );
}
