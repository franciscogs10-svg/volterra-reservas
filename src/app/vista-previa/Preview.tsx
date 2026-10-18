'use client';

import { useCallback, useState } from 'react';
import { Board } from '@/components/Board';
import { Login } from '@/components/Login';
import type { Actions, Msg } from '@/components/actions';
import type { AppRole } from '@/lib/types';
import { FIXTURE } from './fixture';

/** Panel con datos de ejemplo y acciones que solo avisan: nada toca Supabase. */
export function Preview({ pantalla, rol }: { pantalla: 'entrar' | 'panel'; rol: AppRole }) {
  const [msg, setMsg] = useState<Msg | null>(null);
  const dismiss = useCallback(() => setMsg(null), []);
  if (pantalla === 'entrar') return <Login />;

  const aviso = (text: string) => {
    setMsg({ text: `Vista previa: ${text} No se guardó nada.`, err: false });
    return Promise.resolve(true);
  };
  const actions: Actions = {
    reserve: (t, v) => aviso(`reserva de ${v.guests} puestos en ${t.code} para ${v.name}.`),
    pay: (r, amount, method) => aviso(`pago de ${amount} por ${method} para ${r.name}.`),
    checkIn: (r) => aviso(`llegada de ${r.name}.`),
    cancel: (r) => aviso(`cancelación de ${r.name}.`),
    savePrices: (t) => aviso(`precios de ${t.code}.`),
    setEmail: (r, email) => aviso(email ? `correo ${email} para ${r.name}.` : `correo de ${r.name} borrado.`),
  };

  return (
    <Board
      snap={{ ...FIXTURE, role: rol }}
      email="vista-previa@morefest.local"
      live
      busy={false}
      msg={msg}
      actions={actions}
      onSaveDate={(v) => void aviso(`fecha ${v || 'borrada'}.`)}
      onSignOut={() => void aviso('salir.')}
      onDismissMsg={dismiss}
    />
  );
}
