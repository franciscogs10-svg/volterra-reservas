# MOREFEST: identidad y herramientas de Alejandro (especificación)

Fecha: 2026-10-17. Estado: **aprobada por Francisco** ("sí, aprobado todo", sobre el prototipo navegable). Referencia visual obligatoria: `docs/design/morefest-prototipo.html` (8 pantallas, abrir en el navegador). Fotos originales: `docs/brand/`.

Convención: VERIFICADO = leído en archivo o comprobado; NO VERIFICADO = inferido.

## 1. Objetivo

La app de reservas que ya está en producción (https://volterra-reservas.vercel.app, `main@e939c99`, blindada) pasa a llamarse y verse **MOREFEST**, con la identidad de las fotos de Morella Montiel, y suma tres herramientas pequeñas para Alejandro: correo del cliente con botón de confirmación, lista de protocolo para la puerta (pantalla e impresión) y botón de reverso de pagos. La app sigue siendo privada: nada público.

## 2. Decisiones (todas de Francisco, 2026-10-17)

- **Alcance:** la app es solo para que Alejandro administre las reservas. La gente lo llama o le escribe; él aparta, reserva, asigna y registra. En la puerta trabaja el protocolo con la lista. Descartado lo público (ver `docs/DECISIONES.md`).
- **Nombre:** MOREFEST. VOLTERRA es el lugar.
- **Identidad:** la del prototipo aprobado. Entrada con la foto de Morella saliendo del lago (`MORELLA_03`) a sangre; nada de ilustraciones ni íconos de Maracaibo ("tiene que ser más chic"). Sello circular con la cara de `MORELLA_01` junto al wordmark en el encabezado. En el celular el brillo del sol queda fuera de cuadro para centrar a Morella (aprobado tal cual).
- **Confirmación al cliente:** la envía Alejandro cuando quiera, desde su propio correo (Gmail de Corporación Montiel). Botón "Enviar confirmación" que abre su app de correo (`mailto:`) con asunto y cuerpo ya escritos, más "Copiar mensaje". Sin envío automático: Resend exige dominio verificado y no hay (VERIFICADO por DNS).
- **Lista de protocolo:** sí, en pantalla y para imprimir.
- Riesgo aceptado: no se cambia la contraseña del admin ni se revoca `RESEND_API_KEY`.

## 3. Alcance

Dentro:
1. Identidad visual en todas las pantallas existentes.
2. Rebautizo: título, metadatos, favicon, textos, `events.name` y `venue`.
3. Correo del cliente: campo nuevo, editable, y botón de confirmación.
4. Botón de reverso de un pago (solo admin), sobre `reverse_payment` ya blindada en la 0008.
5. Lista de protocolo en pantalla e imprimible.

Fuera: todo lo público, envío automático de correos, asignar la URL `morefest.vercel.app` (pide go aparte), cambios de capacidad, precios o permisos existentes.

## 4. Identidad visual

Fuente de verdad: el prototipo. Tokens (contrastes calculados, ver `brief-visual` de la sesión):

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#140c08` | fondo espresso |
| `--surface` / `--surface-2` | `#1d130d` / `#2a1b12` | tarjetas / controles y hojas |
| `--leather` | `#3b2416` | selección, bloques |
| `--fg` / `--fg-dim` / `--fg-mute` | `#f3e6d3` / `#c9bba8` / `#a8969a` | texto principal / secundario / etiquetas |
| `--accent` | `#f2a03d` | acción principal (texto encima en `--bg`) |
| `--amber` | `#e0892f` | foco, enlaces, íconos |
| `--gold` | `#f7c873` | cifras y énfasis de display |
| `--ok` / `--err` | `#8fbf7a` / `#e8745a` | confirmado / error y destructivo (siempre con ícono y texto) |
| `--line-strong` | `#8a6244` | borde de controles (3:1) |
| papel | `#f3e6d3` + croquis con `mix-blend-mode: multiply` | mapa |

- El malva `#6b5a5e` nunca va como texto (2.99:1). Texto sobre naranja o ámbar siempre en espresso.
- Tipografía con `next/font/google`, servida desde el propio dominio: **Fraunces** (wordmark, títulos, "Renacer" en cursiva dorada), **Inter** (interfaz y cuerpo), **IBM Plex Mono** 500 (códigos de mesa y de reserva). Cifras con `tabular-nums`. Se elimina el `<link>` a Google Fonts de `layout.tsx` y se cierra la CSP a `'self'` para fuentes y estilos externos.
- Base 16px, controles de 48px, espaciado 4/8/12/16/24/32, foco con anillo ámbar de 2px. Movimiento corto (180 a 240 ms) y apagado con `prefers-reduced-motion`.
- Montos en formato venezolano (`$240,00`) con `Intl.NumberFormat('es-VE')`.
- Fotos servidas desde `public/brand/` en JPEG optimizado (máx. 1600px, calidad 80) con `next/image` o `<img>` con medidas declaradas. Los originales quedan en `docs/brand/`.

## 5. Pantallas

Todas existen hoy en `src/components/`; cambia el vestido y la disposición en el celular. Lo nuevo está marcado.

- **Entrar (`Login.tsx`):** `MORELLA_03` a pantalla completa con viñeta abajo; "Corporación Montiel presenta", MOREFEST en Fraunces espaciada, "Renacer" en cursiva dorada, "Morella Montiel"; formulario con etiquetas visibles, botón "Entrar"; pie "Solo para el equipo de Corporación Montiel. Plataforma por IS Performance Solutions."
- **Encabezado y resumen (`Main.tsx`, `Stats.tsx`):** sello circular + MOREFEST + lugar y fecha del evento (editable como hoy), indicador en vivo, "Salir". Las seis cifras en dorado; en el celular, fila desplazable.
- **Mapa (`FloorMap.tsx`):** pestañas Planta baja / Planta alta VIP; croquis en papel crema; los cinco estados actuales distinguibles por trazo o trama además del color, con leyenda; mesa seleccionada con trazo de tinta; área de toque mínima de 44px y zoom del plano como en el prototipo.
- **Hoja de la mesa (`Panel.tsx`):** hoja inferior en el celular, columna derecha en escritorio. Contenido actual más: **correo** del cliente (ver y editar), **"Enviar confirmación"** y **"Copiar mensaje"**, y **"Revertir"** en cada pago (solo admin, pide motivo, una vez por pago).
- **Nueva reserva:** como hoy, más el campo **Correo** (opcional, validado).
- **Reservas (`ReservationList.tsx`):** buscador y CSV como hoy; por debajo de 820px pasa de tabla a tarjetas; etiquetas "Llegó" y "Con saldo". El CSV incluye el correo y se llama `morefest-reservas-AAAA-MM-DD.csv`.
- **Protocolo (nuevo):** pestaña de solo lectura sobre el snapshot. Una fila por reserva activa: mesa, nombre, personas, código, saldo ("Debe $X"), llegada (hora o casilla). Agrupada por planta y ordenada por mesa, con interruptor alfabético. Totales: reservas, personas esperadas, personas dentro. Tocar una fila abre la hoja de esa mesa (donde está "Confirmar llegada").
- **Imprimible (nuevo):** `@media print` de la lista de protocolo: blanco y negro, 12 a 13 pt, encabezado con MOREFEST, fecha del evento y hora de impresión, cabecera repetida, filas sin partir, sin botones, sin teléfonos.

## 6. Mensaje de confirmación

Función pura `confirmationMessage(reserva, evento)` en `src/lib/logic.ts` que devuelve `{ subject, body }`:
- Asunto: `MOREFEST · Confirmación de tu reserva (Mesa PB-07)`.
- Cuerpo en texto plano: saludo con el nombre, mesa y personas, fecha del evento ("por anunciar" si no hay), total, abonos con fecha y método (los reversos netean), pagado, saldo pendiente o "Pagado completo", cierre firmado "Corporación Montiel".
- El enlace `mailto:` codifica asunto y cuerpo con `encodeURIComponent` y se mantiene por debajo de 1.800 caracteres; si se pasa, el botón avisa y deja "Copiar mensaje".
- Sin correo del cliente: el botón queda deshabilitado con el motivo visible.

## 7. Datos (migración 0009)

`0009_morefest.sql`, sin `delete` ni `drop`:
- `update events set name = 'MOREFEST', venue = 'Restaurante VOLTERRA, Maracaibo'` (hay un solo evento, VERIFICADO en 0002).
- `alter table customers add column email text` con `check` de formato simple (`email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'`).
- Función nueva `set_customer_email(p_res uuid, p_email text)` con `require_role('admin','seller')`, `security definer`, `search_path` fijo, `execute` solo para `authenticated`: guarda el correo normalizado (minúsculas, sin espacios) o `null`. No se toca `create_reservation` (cambiarle la firma crearía una sobrecarga ambigua en PostgREST); la interfaz llama `create_reservation` y luego `set_customer_email` si hay correo.
- `src/lib/data.ts` lee `customers(full_name, phone, email)`, `events.venue` y los pagos con fecha y `reverses_payment_id`.

## 8. Seguridad

- Nada nuevo para `anon`. La función nueva exige rol y valida entrada; la restricción de formato vive en la tabla.
- El `mailto:` lo arma el cliente con datos que el usuario ya ve: no hay envío desde el servidor ni llaves nuevas.
- El botón "Revertir" se muestra solo al admin; la base lo exige igual (0008).
- La lista impresa no lleva teléfonos.
- `robots: noindex` se mantiene.

## 9. Casos borde

| Caso | Qué pasa |
|---|---|
| Correo inválido | Error bajo el campo; la base también lo rechaza. |
| Reserva sin correo | "Enviar confirmación" deshabilitado con motivo; "Copiar mensaje" sí funciona. |
| Pago ya revertido | El botón desaparece y el pago muestra "Revertido"; si dos personas lo intentan, la base rechaza el segundo ("pago ya revertido"). |
| Reverso sin motivo | No se envía; error bajo el campo. |
| Sin fecha de evento | "Fecha por anunciar" en encabezado, mensaje y protocolo. |
| `multiply` no pinta bien en el celular | Respaldo `filter: sepia(.25)`. |
| Imprimir desde el iPhone | NO VERIFICADO; se recomienda imprimir desde la computadora; CSV como respaldo. |
| Rol `door` | No ve pagos (por diseño): en protocolo el saldo se muestra como "—". |

## 10. Pruebas

- **PGlite (`npm test`):** 0009 deja nombre y lugar; `set_customer_email` guarda normalizado, rechaza formato inválido, exige rol (vendedor sí, puerta y anónimo no) y permite borrar con `null`. Las 35 pruebas actuales siguen en verde.
- **Lógica (`tests/logic.test.ts`):** `confirmationMessage` (abonos, reversos, saldo, sin fecha, nombres con acentos), `protocolRows` (orden por mesa y alfabético con `localeCompare('es')`, excluye canceladas, saldo y llegada), formato de montos `es-VE`.
- **Build y tipos:** `npm run typecheck` y `npm run build`.
- **Visual:** capturas con Playwright a 390x844 y 1280 de cada pantalla, comparadas contra el prototipo; emulación de impresión de la lista; `design-review` al cerrar. Para pantallas con sesión: `next dev` contra una base de prueba o la sesión de Francisco (decidir en el plan).

## 11. Entrega

Un solo despliegue al final, en este orden de trabajo, una tarea a la vez con pruebas primero: migración 0009 y datos → lógica pura (mensaje, protocolo, formato) → tokens, fuentes y fotos → pantallas → protocolo e imprimible → rebautizo de metadatos y favicon → `design-review` → `blindar` → `main` → aplicar 0009 en Supabase (go de Francisco) → deploy Ready → verificación en producción.

Vuelta atrás: promover en Vercel el deploy `b0al54lmb`; la 0009 es aditiva (columna y función nuevas, `update` del nombre), se revierte con una 0010 si hiciera falta.
