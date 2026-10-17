# volterra-reservas — STATE

**Actualizado:** 2026-10-17
**Fase:** base funcional en la rama `feat/app-base`, sin fusionar a `main`, sin blindar y sin producción (`origin/main` solo tiene el commit inicial).
**Cliente / evento:** VOLTERRA. Quién lo organiza, fecha del evento y precios: pendientes de registrar en `C:\Dev\fbrain\projects\volterra-reservas.md`.

## Qué es

Reservas de mesas y control de acceso de un evento con dos plantas: planta baja (PB, 15 mesas más la barra PB-16 de 11 puestos) y planta alta VIP (tres sofás de 4 para patrocinadores; el resto es zona de artistas). Un usuario admin y un rol vendedor. Mapa sobre los croquis reales (`public/plano-pb.jpg`, `public/plano-vip.jpg`). Cada mesa se vende entera o por puestos; abonos inmutables con reverso; llegada confirmada por reserva; resumen y CSV; estado en vivo entre celulares.

## Estado real (2026-10-17)

Rama `feat/app-base`, 2 commits adelante de `origin/feat/app-base`:

- `5d601e0` (2026-10-16, noche): base de la app. Migraciones 0001 (esquema, triggers de capacidad y pagos, roles, auditoría) y 0002 (seed de 22 mesas), mapa sobre el croquis, reservas por puestos, pruebas.
- `7eb9096` (2026-10-17): migraciones 0003 (endurecimiento de permisos) y 0004 (barra PB-16 y sillones VIP-08 como puestos sueltos), con prueba.
- `0922b13` (2026-10-17): migración 0005. VIP-01 a VIP-04 y VIP-08 pasan a inactivas (zona de artistas); VIP-05 a VIP-07 se vuelven sofás de 4 puestos para patrocinadores. Columna nueva `tables.active`; `create_reservation` rechaza una mesa retirada.

Pruebas: `tests/db.test.ts` (reglas de la base sobre PGlite con las migraciones reales) y `tests/logic.test.ts` (estados, precio por puesto, resumen y CSV). Resultado de la última corrida: sección "Verificación".

Supabase: proyecto `nymslckxukoqhifpkrgl`, MCP configurado en `.mcp.json`. Qué migraciones están aplicadas en la base real: NO VERIFICADO. Confirmar con el MCP antes de aplicar la siguiente.

Vercel: proyecto `volterra-reservas` enlazado (`.vercel/project.json`). Producción no tiene la app todavía: `origin/main` es el commit inicial.

Metodología del imperio: aplicada el 2026-10-17 (CLAUDE.md por imperio-bootstrap, STATE.md, docs/DECISIONES.md, página en fbrain). Sin blindaje todavía: el primer push a `main` pasa por `blindar`.

## Verificación (2026-10-17, sobre `0922b13`)

- `npm test`: PASS. 2 archivos, 22 pruebas, 22 en verde (vitest 5.0.5, 3.9 s).
- `npm run typecheck`: PASS (tsc sin errores).

## Próximo paso

1. Aplicar 0003 a 0005 en la base real si faltan (toca datos reales: go de Francisco).
2. Registrar en fbrain quién es el cliente, la fecha del evento y los precios por mesa y por puesto.
3. `blindar`, fusionar `feat/app-base` en `main`, deploy en Vercel y confirmar deploy Ready.

## Vuelta atrás

- Código: `git revert` del commit. Una mesa retirada se reactiva con `update tables set active = true where code = '...'`.
- Pagos: nunca se borran; un error se corrige con `reverse_payment`.
- Migraciones: no se deshacen a mano; se escribe la siguiente que revierta el cambio.
