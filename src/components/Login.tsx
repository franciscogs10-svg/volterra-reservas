'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Icon } from './Icon';

/** Entrada: Morella saliendo del lago a sangre; el formulario se lee sobre la viñeta oscura. */
export function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

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
    <main className="login-screen">
      <div className="login-photo">
        <img
          src="/brand/morella-lago-1280.jpg"
          srcSet="/brand/morella-lago-800.jpg 800w, /brand/morella-lago-1280.jpg 1280w"
          sizes="100vw"
          width={1280}
          height={1280}
          alt="Morella Montiel caminando dentro del lago al atardecer"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="login-col">
        <div className="login-top">
          <p className="mast-kicker">Corporación Montiel presenta</p>
          <h1 className="mast">
            <span className="mast-wm">Morefest</span>
            <span className="mast-prog">Renacer</span>
          </h1>
          <p className="mast-by">Morella Montiel</p>
        </div>
        <div className="login">
          <p className="eyebrow">Reservas y acceso</p>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="lg-email">Correo</label>
              <input
                className="inp"
                id="lg-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'lg-err' : undefined}
              />
            </div>
            <div className="field">
              <label htmlFor="lg-pass">Contraseña</label>
              <div className="pass">
                <input
                  className="inp"
                  id="lg-pass"
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'lg-err' : undefined}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={show}
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShow(!show)}
                >
                  <Icon name={show ? 'eyeoff' : 'eye'} />
                </button>
              </div>
            </div>
            {error && (
              <p className="err-msg" id="lg-err" role="alert">
                <Icon name="alert" size="sm" />
                <span>{error}</span>
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <p className="login-foot">Solo para el equipo de Corporación Montiel. Plataforma por IS Performance Solutions.</p>
        </div>
      </div>
    </main>
  );
}
