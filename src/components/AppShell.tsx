'use client';

import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isConfigured, supabase } from '@/lib/supabase';
import { Login } from './Login';
import { Main } from './Main';
import { StateScreen } from './StateScreen';

export function AppShell() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    if (!isConfigured) return;
    const sb = supabase();
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (!isConfigured) {
    return (
      <StateScreen>
        <p className="banner">
          Falta conectar Supabase. Copia <code>.env.example</code> a <code>.env.local</code>, pega la URL del proyecto y la clave <code>anon</code>, y
          reinicia. En Vercel van como variables de entorno.
        </p>
      </StateScreen>
    );
  }
  if (session === undefined) {
    return (
      <StateScreen>
        <p className="muted" role="status">
          Cargando…
        </p>
      </StateScreen>
    );
  }
  if (!session) return <Login />;
  return <Main email={session.user.email ?? ''} />;
}
