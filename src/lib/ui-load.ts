/** Qué pantalla toca según haya datos cargados y un error de recarga.
 *  Una recarga fallida con datos previos no tapa el panel: se conserva lo último y se avisa. */
export function loadState(hasData: boolean, error: string): { screen: 'loading' | 'error' | 'board'; stale: boolean } {
  if (!hasData) return { screen: error ? 'error' : 'loading', stale: false };
  return { screen: 'board', stale: Boolean(error) };
}
