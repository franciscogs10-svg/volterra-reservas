import { isValidEmail, mailtoHref } from './logic';

/** Error que va debajo del campo de correo, o '' si está vacío (es opcional) o bien escrito. */
export function emailError(value: string): string {
  const v = value.trim();
  if (!v || isValidEmail(v)) return '';
  return 'Revisa el correo: debe verse como nombre@correo.com.';
}

export interface MailState {
  href: string | null;
  reason: string;
}

/** Estado de "Enviar confirmación": el enlace mailto, o por qué no se puede y qué hacer.
 *  mailtoHref (plan A) solo devuelve null por largo; la falta de correo la decide esta función. */
export function mailState(email: string | null, msg: { subject: string; body: string }): MailState {
  if (!email) return { href: null, reason: 'Falta el correo del cliente: agrégalo arriba para enviarle la confirmación. "Copiar mensaje" sí funciona.' };
  if (!isValidEmail(email)) return { href: null, reason: 'El correo guardado no es válido: corrígelo arriba.' };
  const href = mailtoHref(email, msg);
  if (!href) return { href: null, reason: 'El mensaje es muy largo para abrirlo en tu app de correo. Usa "Copiar mensaje" y pégalo.' };
  return { href, reason: '' };
}

/** Lo que copia "Copiar mensaje": asunto y cuerpo, listo para pegar en el correo o en WhatsApp. */
export const clipboardText = (msg: { subject: string; body: string }) => `Asunto: ${msg.subject}\n\n${msg.body}`;
