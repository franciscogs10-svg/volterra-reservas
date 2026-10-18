'use client';

import { confirmationMessage } from '@/lib/logic';
import type { EventRow, Reservation, TableRow } from '@/lib/types';
import { clipboardText, mailState } from '@/lib/ui-mail';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  id: string;
  r: Reservation;
  table: TableRow;
  event: EventRow;
  notify: Actions['notify'];
}

/** Confirmación por correo: vista previa del mensaje, abrir la app de correo de Alejandro o copiar el texto. Nada sale solo. */
export function MailBox({ id, r, table, event, notify }: Props) {
  const msg = confirmationMessage(r, table, event);
  const st = mailState(r.email, msg);
  const why = `${id}-why`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(clipboardText(msg));
      notify('Mensaje copiado. Pégalo en tu correo o en WhatsApp.');
    } catch {
      notify('No se pudo copiar. Mantén presionado el texto de la vista previa para copiarlo.', true);
    }
  }

  return (
    <section className="mailbox" id={id} aria-label={`Confirmación por correo para ${r.name}`}>
      <div className="mail-preview">
        <dl className="mp-head">
          <dt>Para</dt>
          <dd>{r.email ?? 'sin correo'}</dd>
          <dt>Asunto</dt>
          <dd>{msg.subject}</dd>
        </dl>
        <p className="mp-body">{msg.body}</p>
      </div>
      <div className="stack">
        {st.href ? (
          <a className="btn btn-primary btn-block" href={st.href} onClick={() => notify('Se abre tu app de correo con el mensaje listo. Revísalo y envíalo.')}>
            <Icon name="mail" />
            Enviar confirmación
          </a>
        ) : (
          <button type="button" className="btn btn-primary btn-block" disabled aria-describedby={why}>
            <Icon name="mail" />
            Enviar confirmación
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={copy}>
          <Icon name="copy" />
          Copiar mensaje
        </button>
      </div>
      <p className={st.href ? 'help' : 'err-msg'} id={why}>
        {!st.href && <Icon name="info" size="sm" />}
        <span>{st.href ? '"Enviar confirmación" abre tu app de correo con el asunto y el texto ya escritos. Tú decides cuándo enviarla.' : st.reason}</span>
      </p>
    </section>
  );
}
