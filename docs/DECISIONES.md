# Decisiones — volterra-reservas

Una entrada por decisión, la más nueva arriba. Fecha absoluta, qué se decidió y por qué. Lo que afecte al imperio se copia a `C:\Dev\fbrain\projects\volterra-reservas.md`.

## 2026-10-17 (tarde) — MOREFEST: nombre real, link público como venta de tickets, Resend

- La app es **MOREFEST**, el festival de Morella Montiel (cantante) en el restaurante VOLTERRA, Maracaibo, programa "Renacer" (15 artistas invitados, patrocinadores). Admin: Alejandro Hernández, tío de Valentina Hernández (esposa de Francisco) y esposo de Morella. Volterra es el lugar, no el producto. Falta rebautizar título, metadatos y `events.name`, y decidir la URL.
- El link público es **compra de ticket con pago inmediato**: nada queda apartado desde el público; solo Alejandro aparta, reserva y asigna. Sustituye la propuesta de apartado de 24 h. Los sofás de patrocinadores (VIP-05/06/07) quedan fuera del link y se venden a mano.
- Resend para avisos por correo: cuenta creada por Francisco, `RESEND_API_KEY` en Vercel (producción y desarrollo). La key pasó por el chat: rotarla cuando se pueda.
- Pendientes de decisión antes de construir: medio de pago inmediato (pasarela o Pago Móvil/Zelle/Binance con comprobante) y entrega del ticket (QR por WhatsApp o correo con dominio verificado).

## 2026-10-17 — Plano VIP se edita por código, no se redibuja con IA

- Francisco pidió modificar `public/plano-vip.jpg` (quitar las mesas de la zona de artistas, dibujar tres sofás y mesitas altas y bajas) y ofreció hacerlo con ChatGPT. Se edita con PIL sobre la imagen original para conservar el lienzo 792x966 y las coordenadas del mapa; una imagen regenerada cambiaría proporciones y encuadre. Pendiente de hacer.

## 2026-10-17 — Link público de reservas: propuesto, espera tres decisiones

- Los clientes eligen mesa o puestos, dejan nombre y teléfono, reciben un código y pagan manual; el panel de Alejandro se llena solo. Tiene que verse profesional: es demo de capacidad para IS.
- Pendiente de Francisco: plazo de apartado (propuesto 24 h), sofás de patrocinadores fuera del link (propuesto sí) y cuenta Resend para los avisos por correo. No se construye antes de blindar lo que ya está en producción.

## 2026-10-17 — Producción antes de blindar

- La app se desplegó en Vercel desde la PC antes de correr `blindar`. Se acepta como hecho; el blindaje se corre sobre lo que ya está publicado antes de abrir el link público.

## 2026-10-17 — Metodología del imperio aplicada al repo

- CLAUDE.md (sección propia más el template de imperio-bootstrap), STATE.md y este registro. Flujo diseñar, blindar, publicar obligatorio; el primer push a `main` solo después de `blindar`.
- Razón: el repo nació la noche del 16 sin el kit y la sesión de Claude trabajaba sin saber del cerebro ni de las fases. Francisco: "está bruto".

## 2026-10-17 — VIP: zona de artistas sin venta y sofás para patrocinadores (migración 0005)

- VIP-01, VIP-02, VIP-03, VIP-04 y VIP-08 dejan de venderse: el lado izquierdo y la zona de abajo son de los artistas. VIP-05, VIP-06 y VIP-07 pasan de mesas de 10 a sofás de 4 puestos para patrocinadores.
- Las mesas retiradas no se borran: columna `tables.active`, quedan fuera del mapa y `create_reservation` las rechaza con "mesa retirada". Razón: conservar historial y poder reactivarlas sin tocar el seed.

## 2026-10-17 — Puestos sueltos: barra PB-16 y sillones VIP-08 (migración 0004)

- La barra de planta baja (11 puestos) y los sillones de VIP se venden por puesto (`kind = 'seat'`). No estaban en el seed original; se agregan por migración, no editando el seed.

## 2026-10-17 — Endurecimiento de permisos (migración 0003)

- Las funciones de disparador no se exponen por la API; `search_path` fijo en las funciones `security definer`. RLS ya protegía; esto quita los permisos que la app no usa.

## 2026-10-16 — Base: las reglas viven en la base de datos, no en la interfaz (migraciones 0001 y 0002)

- Capacidad por mesa garantizada con trigger y bloqueo de la fila de la mesa: dos reservas a la vez no se pasan.
- Pagos inmutables: una corrección es un reverso con motivo (`reverse_payment`).
- Toda acción pasa por funciones que exigen sesión y rol (`require_role`); la app solo usa la clave `anon`.
- Pruebas sobre PGlite con las migraciones reales. Lo que PGlite no cubre (bloqueo con dos conexiones, roles `anon` y `authenticated`) se verifica en el proyecto real de Supabase.
- Coordenadas del croquis generadas por `scripts/gen-seed.mjs` (lienzo 792x966), no a mano.
