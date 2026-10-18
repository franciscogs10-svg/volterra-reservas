# volterra-reservas (MOREFEST) — STATE

**Actualizado:** 2026-10-17 (noche, cierre)
**Fase:** MOREFEST completo en producción: https://morefest.vercel.app (la dirección vieja volterra-reservas.vercel.app sigue activa). Proyecto de Vercel renombrado a `morefest`. `main@8e08ab0`, deploy Ready, verificado 2026-10-17 22:57: título MOREFEST, cabeceras y CSP, vista previa de desarrollo 404, fotos e ícono 200, variables de Supabase dentro del build, consola sin errores. Migraciones 0001 a 0010 aplicadas (0009 y 0010 las pegó Francisco en el SQL Editor antes del push; no se verificaron por catálogo porque el MCP de Supabase pidió volver a iniciar sesión).
**Hecho hoy:** identidad MOREFEST con las fotos de Morella, correo del cliente y confirmación por mailto, reverso de pagos (solo admin), cancelar eligiendo devolver o retener el abono, guardas de dinero (tope de abonos, sin pagos a canceladas), lista de protocolo en pantalla e imprimible, sofás VIP frente a la pantalla. 138 pruebas, typecheck y build en verde; security-review sin hallazgos altos ni medios.
**Pendiente:** apagar "Allow new users to sign up" en Supabase Auth; Francisco aceptó el riesgo de no cambiar la contraseña del admin ni revocar `RESEND_API_KEY`; registrar las reservas de los dos sofás vendidos; verificar 0009 y 0010 por catálogo cuando el MCP se reconecte; monitoreo de errores; probar la impresión desde el iPhone; usuario de prueba para ver pantallas con sesión.
**Vuelta atrás:** en Vercel promover `volterra-reservas-hbkdgever` (deploy del plano VIP y blindaje, sin el rediseño); las migraciones 0009 y 0010 son compatibles con ese código.

---
(Histórico anterior, de la tarde del 2026-10-17)


**Actualizado:** 2026-10-17 (noche)
**Fase:** en producción y blindada. https://volterra-reservas.vercel.app, deploy `b0al54lmb` Ready desde `main@9e91621` (verificado 2026-10-17 20:26: HTTP 200, cabeceras de seguridad, plano VIP nuevo, variables de Supabase dentro del build, CSP deja pasar Supabase y bloquea dominios ajenos). Gate `.claude/gates/blindaje.json` firmado sobre `f5be546`.
**Cliente:** Corporación Montiel. Admin: Alejandro Hernández, tío de Valentina Hernández (esposa de Francisco) (corporacionmontiel@gmail.com). El evento es **MOREFEST**, festival de Morella Montiel (cantante, esposa de Alejandro) en el restaurante VOLTERRA, Maracaibo, programa "Renacer": 15 artistas invitados y patrocinadores. La app pasa a llamarse MOREFEST; Volterra es el lugar. Página canónica: `C:\Dev\fbrain\projects\volterra-reservas.md`.

## Qué es

App interna para que Alejandro administre las reservas de un evento con dos plantas. **Nada público:** la gente lo llama o le escribe y él aparta, reserva, asigna y registra. En la puerta trabaja el protocolo con la lista de mesas y reservas. Planta baja (PB, 15 mesas más la barra PB-16 de 11 banquetas) y planta alta VIP (tres sofás de 4 para patrocinadores, VIP-05/06/07, en fila frente a la pantalla LED; el resto es zona de artistas sin venta). Roles admin, vendedor y puerta. Cada mesa se vende entera o por puestos; abonos inmutables con reverso único; llegada confirmada por reserva; resumen y CSV; estado en vivo entre celulares.

## Estado real (2026-10-17, noche)

`main@9e91621` (antes estaba en el commit inicial) = `feat/app-base` + rama `fix/blindaje` + rama `fix/plano-vip-sofas`:

- `d507d22`: plano VIP sin mesas de artistas, sofás dibujados; migración 0006.
- `3388726`: sofás en fila paralela a la baranda, espaldar hacia artistas, frente a la pantalla LED (aprobado por Francisco); migración 0007 (96x40, giro 48); `scripts/plano-vip-sofas.py` reproduce la imagen.
- `3d04ed2`/`03b0685`: migración 0008 de blindaje: usuarios nuevos inactivos hasta que el admin los active, `check_in` solo para reservas confirmadas, un reverso por pago con motivo obligatorio.
- `b46b515`: el CSV neutraliza fórmulas. `e650ff0`: CSP, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy (`next.config.ts`).

Supabase `nymslckxukoqhifpkrgl`: migraciones 0001 a 0008 aplicadas (0008 y 0007 aplicadas por MCP el 2026-10-17 con go de Francisco y verificadas). 1 perfil (admin), 0 reservas, 0 pagos.

Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `RESEND_API_KEY` en producción (sensibles: `vercel env pull` las trae vacías; se miden en el bundle desplegado: URL 40, clave 46) y en desarrollo. Las vistas previas de Vercel no tienen variables: una preview no conecta con Supabase.

Ramas: `feat/app-base` quedó atrás de `main` (la usa otra sesión en el checkout principal); el trabajo sigue sobre `main`. Worktrees: `C:\Dev\volterra-reservas-wt-blindaje` (`fix/blindaje`) y `C:\Dev\volterra-reservas-wt-plano` (`fix/plano-vip-sofas`), ambas ya fusionadas.

## Verificación (2026-10-17, noche, sobre `f5be546`)

- `npm test`: PASS, 3 archivos, 35 pruebas. `npm run typecheck`: PASS. `npm run build`: PASS.
- security-review: sin hallazgos High ni Medium con confianza ≥ 0.8 (probado con los roles de Supabase sobre PGlite).
- Producción: PASS (ver encabezado). Error de consola conocido: falta `favicon.ico` (se resuelve con el rebautizo).

## Decisiones de Francisco (2026-10-17, noche)

Ver `docs/DECISIONES.md`. Resumen: no hay link público; identidad MOREFEST sobre la app existente (fotos de Morella, nada de atardecer genérico: la entrada lleva la foto de Morella saliendo del agua); Lista de protocolo en pantalla e imprimible; botón "Enviar confirmación" que abre el correo de Alejandro con el estado de cuenta (sin envío automático: Resend exige dominio y no hay); campo de correo del cliente.

## Próximo paso

1. Francisco, en los paneles: apagar "Allow new users to sign up" en Supabase Auth, cambiar la contraseña del admin, revocar `RESEND_API_KEY` (pasó por chat y ya no se usa).
2. Francisco deja las fotos de Morella en `docs/brand/` (sigue vacía).
3. Diseño MOREFEST: prototipo navegable listo en el scratchpad de la sesión (`morefest-prototipo.html`, 8 pantallas); falta cambiar la entrada por la foto de Morella, aprobarlo, cerrar la especificación y el plan (`writing-plans`) e implementar con pruebas: identidad, rebautizo (título, metadatos, favicon, `events.name` por migración 0009), campo de correo del cliente, botón de confirmación, Lista de protocolo, botón de reverso en la interfaz.
4. Alejandro registra las reservas de los dos sofás vendidos.
5. Pendientes menores del blindaje: monitoreo de errores (decidir), protección de contraseñas filtradas en Supabase, `.mcp.json` con `read_only=true` por defecto.

## Vuelta atrás

- Producción: en Vercel, promover el deploy anterior (`volterra-reservas-qyxldg4e4`, del 2026-10-17 18:36); en git, `git revert` sobre `main`.
- La 0008 no se deshace a mano: se escribe la siguiente migración. La 0007 se revierte con una migración que vuelva a 120x44 y giro -42 (y la imagen de `d507d22`).
- Una mesa retirada se reactiva con `update tables set active = true where code = '...'`.
- Pagos: nunca se borran; un error se corrige con `reverse_payment` (una vez por pago, con motivo).
