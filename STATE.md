# volterra-reservas — STATE

**Actualizado:** 2026-10-17
**Fase:** en producción (https://volterra-reservas.vercel.app, HTTP 200 verificado 2026-10-17 19:15), desplegada desde la PC antes de blindar. En GitHub, `main` sigue en el commit inicial; el código vive en la rama `feat/app-base`.
**Cliente:** Corporación Montiel. Usuario admin: Alejandro (corporacionmontiel@gmail.com). Página canónica: `C:\Dev\fbrain\projects\volterra-reservas.md`.

## Qué es

Reservas de mesas y control de acceso de un evento con dos plantas: planta baja (PB, 15 mesas más la barra PB-16 de 11 banquetas) y planta alta VIP (tres sofás de 4 para patrocinadores, VIP-05/06/07; el resto es zona de artistas sin venta). Roles admin y vendedor. Mapa sobre los croquis reales (`public/plano-pb.jpg`, `public/plano-vip.jpg`). Cada mesa se vende entera o por puestos; abonos inmutables con reverso; llegada confirmada por reserva; resumen y CSV; estado en vivo entre celulares.

## Estado real (2026-10-17)

Rama `feat/app-base`:

- `5d601e0` (2026-10-16, noche): base de la app. Migraciones 0001 (esquema, triggers de capacidad y pagos, roles, auditoría) y 0002 (seed de 22 mesas), mapa sobre el croquis, reservas por puestos, pruebas.
- `7eb9096` (2026-10-17): migraciones 0003 (endurecimiento de permisos) y 0004 (barra PB-16 y sillones VIP-08 como puestos sueltos), con prueba.
- `0922b13` (2026-10-17): migración 0005. VIP-01 a VIP-04 y VIP-08 pasan a inactivas (zona de artistas); VIP-05 a VIP-07 se vuelven sofás de 4 puestos. Columna nueva `tables.active`; `create_reservation` rechaza una mesa retirada.
- `d6b6677` (2026-10-17): metodología del imperio (este archivo, CLAUDE.md, `docs/DECISIONES.md`).

Supabase `nymslckxukoqhifpkrgl`: migraciones 0001 a 0005 aplicadas (registrado por la sesión que las aplicó el 2026-10-17). Usuario admin creado con contraseña inicial pasada por chat.

Ventas: dos sofás VIP vendidos a patrocinadores y uno por vender. Esas reservas todavía no están registradas en la app.

## Verificación (2026-10-17, sobre `0922b13`)

- `npm test`: PASS. 2 archivos, 22 pruebas, 22 en verde (vitest 5.0.5, 3.9 s).
- `npm run typecheck`: PASS (tsc sin errores).
- Producción: PASS. HTTP 200, título "VOLTERRA Reservas".

## Próximo paso

1. Francisco decide las tres cosas del link público: plazo de apartado (propuesto 24 h), sofás de patrocinadores fuera del link (propuesto sí) y cuenta Resend para avisos por correo.
2. Francisco, a mano en el panel: desactivar el registro público en Supabase Auth, cambiar la contraseña inicial del admin y, si quiere, agregar `&skip_elicitations=execute_sql%2Capply_migration` a la URL de `.mcp.json`.
3. `blindar` sobre lo que ya está en producción, fusionar `feat/app-base` en `main` y confirmar en Vercel que el deploy queda Ready.
4. Registrar las reservas de los dos sofás vendidos.
5. Construir el link público solo después del blindaje y de las tres decisiones.

## Vuelta atrás

- Código: `git revert` del commit; en Vercel, promover el deploy anterior.
- Una mesa retirada se reactiva con `update tables set active = true where code = '...'`.
- Pagos: nunca se borran; un error se corrige con `reverse_payment`.
- Migraciones: no se deshacen a mano; se escribe la siguiente que revierta el cambio.
