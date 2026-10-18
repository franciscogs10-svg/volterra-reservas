import { useCallback, useSyncExternalStore } from 'react';

/** true mientras se cumpla la media query. En el servidor responde false (escritorio). */
export function useMedia(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    },
    [query],
  );
  return useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);
}

/** Celular: por debajo de 821 px la hoja de la mesa es una hoja inferior. Mismo corte que globals.css. */
export const useIsMobile = () => useMedia('(max-width: 820px)');
