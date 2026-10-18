/** Pantalla de paso (cargando, error, falta configurar) con el sello y el wordmark. */
export function StateScreen({ children }: { children: React.ReactNode }) {
  return (
    <main className="state-screen">
      <img className="ah-seal" src="/brand/sello-morella.jpg" alt="" width={40} height={40} />
      <h1 className="ah-wm">MOREFEST</h1>
      {children}
    </main>
  );
}
