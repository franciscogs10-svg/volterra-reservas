'use client';

import { useId, useState } from 'react';
import type { AppRole, Reservation } from '@/lib/types';
import { undoOffered } from '@/lib/ui-arrival';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  r: Reservation;
  role: AppRole | null;
  busy: boolean;
  onUndo: Actions['undoCheckIn'];
}

/** "Deshacer llegada": para corregir una llegada marcada por error sin pedir ayuda. Solo admin, con confirmación en línea. */
export function ArrivalUndo({ r, role, busy, onUndo }: Props) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  if (!undoOffered(r, role)) return null;
  const boxId = `${uid}-undo`;

  if (!open) {
    return (
      <button type="button" className="btn btn-secondary" disabled={busy} aria-expanded={false} aria-controls={boxId} onClick={() => setOpen(true)}>
        <Icon name="undo" />
        Deshacer llegada
      </button>
    );
  }

  return (
    <div id={boxId} className="subform" role="group" aria-label={`Deshacer la llegada de ${r.name}`}>
      <p className="cancel-lead">
        ¿Deshacer la llegada de <b>{r.name}</b>? La reserva vuelve a quedar pendiente y la mesa deja de verse como ocupada.
      </p>
      <div className="row2">
        <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => setOpen(false)}>
          No, dejarla
        </button>
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={async () => {
            if (await onUndo(r)) setOpen(false);
          }}
        >
          Sí, deshacer
        </button>
      </div>
    </div>
  );
}
