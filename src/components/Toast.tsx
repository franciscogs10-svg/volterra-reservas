'use client';

import { useEffect } from 'react';
import type { Msg } from './actions';
import { Icon } from './Icon';

/** Aviso flotante: se anuncia por aria-live sin robar el foco; 4 s si salió bien, 7 s si hubo error. */
export function Toast({ msg, onDone }: { msg: Msg | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, msg.err ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [msg, onDone]);

  return (
    <div className={`toast${msg ? ' show' : ''}${msg?.err ? ' err' : ''}`} role="status" aria-live="polite">
      {msg && (
        <>
          <Icon name={msg.err ? 'alert' : 'info'} />
          <span>{msg.text}</span>
          <button type="button" className="toast-x" aria-label="Cerrar aviso" onClick={onDone}>
            <Icon name="x" size="sm" />
          </button>
        </>
      )}
    </div>
  );
}
