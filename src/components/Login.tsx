'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const { error } = await supabase().auth.signInWithPassword({
      email: String(f.get('email')).trim(),
      password: String(f.get('password')),
    });
    setBusy(false);
    if (error) setError('Correo o contraseña incorrectos.');
  }

  return (
    <div className="wrap center">
      <header>
        <div>
          <h1>VOLTERRA</h1>
          <div className="sub">Reservas y control de acceso</div>
        </div>
      </header>
      <form className="card form" onSubmit={submit}>
        <label>
          Correo
          <input name="email" type="email" autoComplete="username" required />
        </label>
        <label>
          Contraseña
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        {error && <p className="msg err">{error}</p>}
      </form>
    </div>
  );
}
