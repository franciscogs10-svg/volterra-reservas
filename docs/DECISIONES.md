# Decisiones — volterra-reservas

Una entrada por decisión, la más nueva arriba. Fecha absoluta, qué se decidió y por qué. Lo que afecte al imperio se copia a `C:\Dev\fbrain\projects\volterra-reservas.md`.

## 2026-10-17 (noche) — Sin link público: la app es solo para que Alejandro administre

- **No hay venta al público.** Alejandro no quiere link: la gente lo llama o le escribe y él aparta, reserva, asigna y registra. En la puerta trabaja el protocolo con la lista de mesas y reservas. Quedan descartados el checkout público, los comprobantes de pago, el bloqueo de 20 minutos, el QR, el modo puerta y el envío por WhatsApp (todo se diseñó y se descartó en la misma sesión). La planta VIP no se vende al público.
- **Confirmación por correo, enviada por Alejandro cuando quiera.** Botón "Enviar confirmación" que abre su correo (Gmail de Corporación Montiel) con el estado de cuenta ya escrito: mesa, personas, total, abonos y saldo; más "Copiar mensaje". El envío automático se descartó: Resend exige dominio propio verificado y Corporación Montiel no tiene (verificado por DNS). Requiere el campo de correo del cliente.
- **Lista de protocolo** en pantalla (marcar llegada con un toque) e imprimible sin teléfonos.
- **Identidad MOREFEST** sobre la app existente, a partir de las fotos de Morella. La entrada lleva su foto saliendo del agua; nada de atardecer genérico ni íconos de Maracaibo ("se ve ordinario, tiene que ser más chic").
- **Sofás VIP en fila paralela a la baranda, frente a la pantalla LED** (migración 0007, aprobado por Francisco con el dibujo).
- Publicación: `fix/blindaje` y `fix/plano-vip-sofas` fusionadas en `main@9e91621` y desplegadas; 0007 y 0008 aplicadas en Supabase con go de Francisco.

## 2026-10-17 (noche) — Blindaje de lo que está en producción (rama fix/blindaje, migración 0008)

- **Registro abierto = vendedor gratis.** Supabase Auth tenía el registro público abierto (`disable_signup=false`) y `handle_new_user` le daba a todo usuario nuevo un perfil `seller` activo: con eso se leen clientes, teléfonos y pagos, y se registran abonos. Se cierra en dos capas: Francisco apaga el registro en el panel y la 0008 hace que todo usuario después del primero nazca inactivo hasta que el admin lo active (README, "Usuarios del equipo"). Razón: no depender de un interruptor del panel para la seguridad de los datos.
- **La puerta solo deja entrar reservas confirmadas.** `check_in` rechaza `held`. Hoy nadie crea reservas `held`, pero el link público las usará mientras el pago no se confirme.
- **Un pago se revierte una sola vez y con motivo.** Columna `payments.reverses_payment_id` única: el reverso apunta a su pago y dos reversos simultáneos no restan doble. Necesario antes de manejar reembolsos del link público.
- **Cabeceras de seguridad** en `next.config.ts` (CSP que solo habla con el Supabase del proyecto y Google Fonts, sin iframes) y **CSV sin fórmulas** (un nombre como `=HYPERLINK(...)` ya no se ejecuta en Excel).
- La migración es la 0008 porque la 0007 la tomó la rama `fix/plano-vip-sofas`.

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
