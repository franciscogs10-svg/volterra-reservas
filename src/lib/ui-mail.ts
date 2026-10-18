import { isValidEmail } from './logic';

/** Error que va debajo del campo de correo, o '' si está vacío (es opcional) o bien escrito. */
export function emailError(value: string): string {
  const v = value.trim();
  if (!v || isValidEmail(v)) return '';
  return 'Revisa el correo: debe verse como nombre@correo.com.';
}
