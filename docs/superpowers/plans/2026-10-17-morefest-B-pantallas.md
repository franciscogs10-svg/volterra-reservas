# MOREFEST B: pantallas. Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendado) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** vestir la app de reservas con la identidad MOREFEST aprobada (foto de Morella, papel crema, espresso, Fraunces, Inter, IBM Plex Mono) y sumar en la interfaz el correo del cliente, la confirmación por correo, el reverso de pagos y la lista de protocolo en pantalla e impresa.

**Arquitectura:** `Main` queda como contenedor de datos (Supabase, tiempo real, acciones) y entrega todo a un `Board` presentacional que también se monta en una vista previa solo de desarrollo con datos de ejemplo. Las decisiones de presentación que se pueden probar (textos, cajas del mapa, búsqueda, nombres de archivo, estado del botón de correo) viven en funciones puras `src/lib/ui-*.ts` con pruebas en `tests/ui.test.ts`; el resto es marcado y CSS verificado con capturas de Playwright contra el prototipo. Móvil primero: por debajo de 821 px la hoja de la mesa es una hoja inferior modal; desde 821 px es una columna fija a la derecha.

**Stack:** Next.js 16.4 (App Router, `next/font/google`), React 19.3, TypeScript 5.9, Vitest 5, CSS plano en `src/app/globals.css`, Python 3 con Pillow para las imágenes, Playwright (MCP) para la verificación visual.

---

## Antes de empezar

- **Repo y rama:** worktree `C:\Dev\volterra-reservas-wt-blindaje`, rama `feat/morefest-diseno` (sale de `main@e939c99`, en producción). Todo comando corre desde esa carpeta.
- **Fuente de verdad visual:** `docs/design/morefest-prototipo.html` (8 pantallas) y `docs/superpowers/specs/2026-10-17-morefest-identidad-design.md` (secciones 4, 5, 8, 9, 10 y 11). El CSS de este plan copia valores y nombres del prototipo.
- **Línea base:** `npm test` en verde (35 pruebas al escribir este plan; el plan A suma las suyas), `npm run typecheck` y `npm run build` en verde.
- **Alcance exclusivo de este plan:** `src/components/*`, `src/app/*`, `public/brand/*`, `scripts/brand-assets.py`, `next.config.ts`, `tests/headers.test.ts`, `tests/ui.test.ts` y los archivos nuevos `src/lib/ui-*.ts`. **No tocar** `src/lib/logic.ts`, `src/lib/types.ts`, `src/lib/data.ts`, `src/lib/supabase.ts`, `supabase/migrations/*`, `tests/logic.test.ts` ni `tests/db.test.ts`: son del plan A (`docs/superpowers/plans/2026-10-17-morefest-A-datos-logica.md`).
- **Imports en `src/lib/ui-*.ts`:** siempre relativos (`./logic`, `./types`, `./ui-format`). `vitest.config.mts` no resuelve el alias `@/`; los componentes sí pueden usar `@/`.
- **Commits:** mensaje en español, una línea que diga qué y por qué; cierra con la línea de coautoría que indique tu sesión. Nunca `git add -A`: agrega los archivos de la tarea por nombre.
- **Tono de los textos de la interfaz:** español, tuteo neutro, sin voseo.
- **Criterios:** cada paso de verificación termina en PASS, FAIL o NO VERIFICADO. Un FAIL se corrige antes de pasar a la siguiente tarea.

## Contrato del plan A que usa la Parte 2

Fuente: `docs/superpowers/plans/2026-10-17-morefest-A-datos-logica.md` (commit `79043ac`), con los ajustes que fijó el coordinador el 2026-10-17. La Parte 1 (tareas 1 a 9) no depende del plan A: compila y pasa sus pruebas tanto antes como después de que el plan A entre (la vista previa usa aserciones `as` para eso; ver tarea 4). La Parte 2 (tareas 10 a 16) arranca solo cuando el plan A esté integrado en esta rama y exponga, tal cual:

- Tipos (en `src/lib/types.ts`): `EventRow.venue: string | null`; `Payment.created_at: string`; `Payment.reverses_payment_id: string | null` (sin `reason`: el motivo del reverso no llega a la interfaz); `Reservation.email: string | null`; `Reservation.checked_in_at: string | null`; `type AppRole = 'admin' | 'seller' | 'door'`; `interface ProtocolRow { reservationId; tableId; tableCode; area; name; guests; code; balance: number | null; checkedIn: number | null; checkedInAt: string | null; notes: string | null }`.
- `Snapshot` de `loadSnapshot` (en `src/lib/data.ts`) con `role: AppRole | null` (null si el perfil no está activo).
- En `src/lib/logic.ts`: `formatMoney(n)` (`$1.234,50`, `-$80,00`); `money` queda como alias de `formatMoney`; **no existe `paidAmount`**: se usan `paid(r)` y `balance(r)`; `isValidEmail(s)` (recorta espacios); `eventDateLabel(d: string | null)` (`"Sábado, 14 de noviembre de 2026"` o `"Fecha por anunciar"`), que se usa en la fila de fecha, el protocolo y la hoja impresa; `confirmationMessage(r, table, ev) => { subject, body }` (el asunto siempre dice "Mesa"); `mailtoHref(email, msg) => string | null` (null solo si el enlace pasa de 1.800 caracteres: la falta de correo la resuelve la pantalla); `protocolRows(tables, reservations, order: 'mesa' | 'nombre', canSeePayments) => ProtocolRow[]`; `protocolTotals(rows) => { reservations, expected, inside }`; `toCsv` ya trae la columna `correo`; `friendlyError` ya traduce correo inválido, reserva o pago inexistente, pago ya revertido y reverso sin motivo.
- Regla de permisos: ven pagos `role === 'admin' || role === 'seller'` (espejo de la política `read_pay` de 0001); "Revertir" solo `role === 'admin'`.
- RPC: `set_customer_email(p_res uuid, p_email text)` (admin y vendedor; se le manda `email.trim()`) y `reverse_payment(p_payment uuid, p_reason text)` (solo admin). `create_reservation` devuelve el `uuid` de la reserva (VERIFICADO en `0005_vip_patrocinadores.sql`). Crear con correo: validar con `isValidEmail`, `create_reservation`, luego `set_customer_email`.
- Orden de entrega: la 0009 se aplica en Supabase **antes** del merge a `main` (desde la tarea 2 del plan A, `loadSnapshot` pide `customers.email`).

La tarea 10 empieza comprobando este contrato con `grep`; si algo falta, se detiene y se avisa.

## Decisiones de este plan

1. **Verificación visual con una vista previa solo de desarrollo, no con la base real.** Se recomienda `src/app/vista-previa/page.dev.tsx` con datos de ejemplo, que existe solo con `next dev` (por `pageExtensions` en `next.config.ts`; en el build de producción no es una ruta). Razones: (a) en este worktree no hay `.env.local` y `vercel env pull` trae vacías las variables sensibles (VERIFICADO en `STATE.md`), así que `next dev` "con las variables de Vercel" no conecta sin pegar llaves a mano; (b) la base real tiene 0 reservas: las capturas no mostrarían ninguno de los cinco estados del mapa ni reversos ni saldos; (c) crear datos de prueba en la base de producción pide go de Francisco y deja rastro en la base del cliente; (d) con una sola cuenta admin no se puede ver el rol puerta. La vista previa usa los mismos clientes ficticios del prototipo, así cada captura se compara con su pantalla gemela. El flujo real (entrar, reservar, cobrar) se verifica en producción después del deploy, como manda la sección 11 de la spec.
2. **Tres secciones con barra inferior** (Mapa, Reservas, Protocolo), como el prototipo. En escritorio la barra pasa a pestañas bajo el encabezado y la hoja de la mesa queda a la derecha de cualquier sección, así tocar una fila de Reservas o Protocolo abre la hoja sin cambiar de sección.
3. **El resumen va en cuadrícula de 3 x 2 en el celular**, como el prototipo, no en fila desplazable como dice el texto de la spec (sección 5): se ven las seis cifras sin deslizar. En escritorio, una fila de seis.
4. **Área de toque de 96 unidades del lienzo** (44 px con el plano a 366 px de ancho). El prototipo usa 70 (32 px), por debajo del mínimo de 44 px que pide la spec.
5. **Mesa seleccionada con anillo ámbar** (`--map-sel`), como el prototipo; el foco de teclado usa anillo de tinta discontinuo.
6. **La confirmación por correo vive dentro de la tarjeta de la reserva** (se despliega en la hoja), no en una pantalla aparte, porque la spec convierte la mesa en hoja inferior. Los botones "Enviar confirmación" y "Copiar mensaje" van uno sobre otro: en dos columnas no caben a 390 px.
7. **Protocolo de solo lectura** (spec sección 5): la fila abre la hoja de la mesa, donde está "Confirmar llegada". El prototipo marcaba la llegada en la fila; se sigue la spec. El interruptor de la lista es el orden (por mesa o alfabético); la vista "Para imprimir" del prototipo se reemplaza por el botón "Imprimir lista" y el `@media print`.
8. **Los mensajes de resultado pasan a un aviso flotante** (`Toast`, `aria-live`), 4 s si salió bien y 7 s si hubo error, con botón de cerrar. Los errores de un campo siguen debajo del campo. Los errores de la base pasan por `friendlyError` (plan A), que ya traduce los del correo y del reverso.
9. **Fecha del evento con `eventDateLabel` del plan A** ("Sábado, 14 de noviembre de 2026" o "Fecha por anunciar") en la fila de fecha de la sección Mapa, en el encabezado del protocolo y en la hoja impresa. La línea bajo el wordmark se queda como en el prototipo, "Renacer · VOLTERRA" (el lugar sale de `events.venue`): la fecha larga no cabe a 390 px junto al sello, el indicador en vivo y el botón de salir. En la Parte 1 la fila usa `fmtDate`, que existe antes y después del plan A.
10. **Permisos en pantalla, espejo de la base:** montos, abonos y cobro solo si `role === 'admin' || role === 'seller'`; "Revertir" solo si `role === 'admin'`; la puerta ve "Saldo —" en el protocolo. La base lo exige igual (RLS y `require_role`).

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `scripts/brand-assets.py` | Genera fotos optimizadas, sello y `apple-icon.png`; `--verificar` las compara con el prototipo | 1 |
| `public/brand/morella-lago-1280.jpg`, `morella-lago-800.jpg`, `sello-morella.jpg` | Fondo de Entrar y sello del encabezado (generados) | 1 |
| `src/app/apple-icon.png`, `src/app/icon.svg` | Monograma M crema sobre espresso | 1, 2 |
| `src/app/layout.tsx` | `next/font`, metadatos, viewport | 2 |
| `src/app/globals.css` | Tokens y estilos; cada tarea agrega su bloque al final | 2 a 15 |
| `src/components/Icon.tsx`, `StatusPill.tsx` | Íconos de trazo del prototipo; estado con borde, ícono y texto | 2 |
| `next.config.ts`, `tests/headers.test.ts` | CSP cerrada; vista previa fuera del build de producción | 3, 4 |
| `src/components/actions.ts` | Tipos `Actions` y `Msg` | 4, 11, 12, 13 |
| `src/components/Main.tsx` | Contenedor: Supabase, tiempo real, acciones | 4, 6, 10 a 13 |
| `src/components/Board.tsx` | Armazón: encabezado, secciones, hoja, aviso, impresión | 4, 6, 8, 10, 12 a 15 |
| `src/app/vista-previa/page.dev.tsx`, `Preview.tsx`, `fixture.ts` | Vista previa con datos de ejemplo (solo `next dev`) | 4, 10 a 15 |
| `src/components/Login.tsx` | Entrar con la foto | 5 |
| `src/lib/ui-format.ts` | Textos, montos cortos, búsqueda, nombre del CSV, horas | 6, 8, 9, 10, 15 |
| `tests/ui.test.ts` | Pruebas de todas las funciones `ui-*` | 6 a 15 |
| `src/components/StateScreen.tsx`, `MapView.tsx`, `Stats.tsx`, `AppShell.tsx` | Pantallas de paso, sección Mapa, resumen | 6 |
| `src/lib/ui-map.ts`, `src/components/FloorMap.tsx` | Geometría del mapa y plano en papel | 7 |
| `src/components/useMedia.ts`, `Toast.tsx`, `Panel.tsx`, `PriceBlock.tsx`, `ReservationCard.tsx`, `NewReservation.tsx` | Hoja de la mesa | 8, 10 a 13 |
| `src/components/ReservationList.tsx` | Lista: tarjetas en el celular, tabla en escritorio, CSV | 9, 10 |
| `src/lib/ui-mail.ts`, `src/components/EmailRow.tsx`, `MailBox.tsx` | Correo del cliente y confirmación | 11, 12 |
| `src/lib/ui-payments.ts`, `src/components/PayItem.tsx` | Movimientos y reverso | 13 |
| `src/lib/ui-protocol.ts`, `src/components/ProtocolView.tsx` | Lista de protocolo | 14 |
| `src/components/PrintSheet.tsx` | Hoja impresa | 15 |

## Procedimiento de captura (lo usan las tareas 5 a 16)

1. Servidor de la app, una vez por sesión y en segundo plano: `npm run dev`. Espera la línea `Ready` y anota la URL (normalmente `http://localhost:3000`).
2. Servidor del prototipo, una vez por sesión y en segundo plano: `python -I -m http.server 8765 --directory docs/design`. El prototipo queda en `http://localhost:8765/morefest-prototipo.html`.
3. Carpeta de capturas fuera del repo: `mkdir -p /c/tmp/morefest-capturas`.
4. Con Playwright (MCP): `browser_resize` al tamaño indicado; `browser_navigate` a la URL de la app; `browser_take_screenshot` con `filename` `C:\tmp\morefest-capturas\<nombre>.png`. Luego `browser_navigate` al prototipo con el `#ancla` indicada, mismo tamaño, captura `<nombre>-proto.png`. A 390 px el prototipo muestra arriba unas pastillas de navegación: compara solo el teléfono.
5. Abre las dos imágenes con `Read` y marca cada criterio de la tarea PASS, FAIL o NO VERIFICADO.
6. `browser_console_messages` con nivel `error`: no debe haber `Refused to load` (CSP) ni errores de React. Si hay, FAIL.

---

# Parte 1: independiente del plan A

### Task 1: Fotos de marca optimizadas y su script

**Files:**
- Create: `scripts/brand-assets.py`
- Create (generados): `public/brand/morella-lago-1280.jpg`, `public/brand/morella-lago-800.jpg`, `public/brand/sello-morella.jpg`, `src/app/apple-icon.png`

Valores del prototipo, medidos sobre sus imágenes embebidas: la foto de Entrar es `MORELLA_03` completa (1280x1280 en el original, 1200x1200 en el prototipo; diferencia media 0,9 de 255), y el sello es el cuadrado de 280 px con esquina en (745, 40) de `MORELLA_01` (1280x951), reducido (diferencia media 2,5 de 255).

- [ ] **Step 1: Escribe el script**

```python
"""Genera las imágenes de marca de MOREFEST desde los originales de docs/brand/.

Salidas:
- public/brand/morella-lago-1280.jpg y public/brand/morella-lago-800.jpg: MORELLA_03 (Morella saliendo
  del lago), fondo de la pantalla Entrar. El original mide 1280x1280; la especificación pide máximo
  1600 px y calidad 80, así que no se agranda. La de 800 px es para teléfonos (srcset).
- public/brand/sello-morella.jpg: sello circular del encabezado, 240x240, desde MORELLA_01 con el
  recorte del prototipo aprobado (cuadrado de 280 px con esquina en 745,40).
- src/app/apple-icon.png: 180x180, monograma M crema sobre espresso con anillo dorado; mismos
  polígonos que src/app/icon.svg.

Las salidas no llevan EXIF: Pillow no lo copia si no se le pide.

Uso, desde la raíz del repo (Python con Pillow):
    python -I scripts/brand-assets.py              # escribe las cuatro imágenes
    python -I scripts/brand-assets.py --verificar  # además las compara con las del prototipo
"""
import argparse
import base64
import io
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parent.parent
ORIGINALES = ROOT / 'docs' / 'brand'
PROTOTIPO = ROOT / 'docs' / 'design' / 'morefest-prototipo.html'
SALIDA = ROOT / 'public' / 'brand'
APPLE_ICON = ROOT / 'src' / 'app' / 'apple-icon.png'

CALIDAD = 80
LAGO_MAX = 1600
LAGO_ANCHOS = (1280, 800)
SELLO_CAJA = (745, 40, 1025, 320)  # izquierda, arriba, derecha, abajo sobre MORELLA_01 (1280x951)
SELLO_LADO = 240

ESPRESSO = (20, 12, 8)
CREMA = (243, 230, 211)
DORADO = (247, 200, 115)
ANILLO = (32, 28.5, 1.5)  # centro, radio y grosor sobre la grilla de 64 de icon.svg
M = [
    [(15, 18), (17, 18), (17, 46), (15, 46)],          # asta izquierda, fina
    [(15, 18), (21, 18), (33.5, 46), (30.5, 46)],      # diagonal gruesa
    [(30.5, 46), (32.5, 46), (47, 18), (45, 18)],      # diagonal fina
    [(44, 18), (49.5, 18), (49.5, 46), (44, 46)],      # asta derecha, gruesa
    [(11.5, 18), (21, 18), (21, 19.4), (11.5, 19.4)],  # remates
    [(43, 18), (53, 18), (53, 19.4), (43, 19.4)],
    [(11.5, 44.6), (20.5, 44.6), (20.5, 46), (11.5, 46)],
    [(40.5, 44.6), (53, 44.6), (53, 46), (40.5, 46)],
]


def guardar_jpeg(img, ruta):
    img.save(ruta, 'JPEG', quality=CALIDAD, optimize=True, progressive=True)
    print(f'{ruta.relative_to(ROOT).as_posix()}: {img.width}x{img.height}, {ruta.stat().st_size // 1024} KB')


def lago():
    src = Image.open(ORIGINALES / 'MORELLA_03.jpg').convert('RGB')
    for ancho in LAGO_ANCHOS:
        w = min(ancho, src.width, LAGO_MAX)
        img = src if w == src.width else src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
        guardar_jpeg(img, SALIDA / f'morella-lago-{ancho}.jpg')


def sello():
    src = Image.open(ORIGINALES / 'MORELLA_01.jpg').convert('RGB')
    guardar_jpeg(src.crop(SELLO_CAJA).resize((SELLO_LADO, SELLO_LADO), Image.LANCZOS), SALIDA / 'sello-morella.jpg')


def apple_icon(lado=180, ss=4):
    e = lado * ss / 64
    img = Image.new('RGB', (lado * ss, lado * ss), ESPRESSO)
    d = ImageDraw.Draw(img)
    c, r, g = (v * e for v in ANILLO)
    ro = r + g / 2
    d.ellipse((c - ro, c - ro, c + ro, c + ro), outline=DORADO, width=round(g))
    for poligono in M:
        d.polygon([(x * e, y * e) for x, y in poligono], fill=CREMA)
    img = img.resize((lado, lado), Image.LANCZOS)
    img.save(APPLE_ICON, 'PNG', optimize=True)
    print(f'{APPLE_ICON.relative_to(ROOT).as_posix()}: {img.width}x{img.height}')


def diferencia(a, b):
    """Diferencia media en gris (0 a 255) entre dos imágenes del mismo tamaño."""
    return ImageStat.Stat(ImageChops.difference(a.convert('L'), b.convert('L'))).mean[0]


def verificar():
    html = PROTOTIPO.read_text(encoding='utf-8')
    datos = re.findall(r'data:image/jpeg;base64,([A-Za-z0-9+/=]+)', html)
    entrada, sello_proto = (Image.open(io.BytesIO(base64.b64decode(b))) for b in datos[:2])  # orden: entrada, sello, planos
    casos = [
        ('sello', Image.open(SALIDA / 'sello-morella.jpg').resize(sello_proto.size, Image.LANCZOS), sello_proto, 4.0),
        ('entrada', Image.open(SALIDA / 'morella-lago-1280.jpg').resize(entrada.size, Image.LANCZOS), entrada, 3.0),
    ]
    ok = True
    for nombre, nuevo, ref, tope in casos:
        dif = diferencia(nuevo, ref)
        print(f'{nombre}: diferencia media {dif:.2f} (tope {tope}) {"PASS" if dif < tope else "FAIL"}')
        ok = ok and dif < tope
    return ok


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Genera las imágenes de marca de MOREFEST.')
    ap.add_argument('--verificar', action='store_true', help='compara con las imágenes embebidas en el prototipo')
    args = ap.parse_args()
    SALIDA.mkdir(parents=True, exist_ok=True)
    lago()
    sello()
    apple_icon()
    if args.verificar and not verificar():
        sys.exit(1)
```

- [ ] **Step 2: Corre el script con verificación**

Run: `python -I scripts/brand-assets.py --verificar`
Expected (los KB pueden variar en ±5):
```
public/brand/morella-lago-1280.jpg: 1280x1280, 135 KB
public/brand/morella-lago-800.jpg: 800x800, 56 KB
public/brand/sello-morella.jpg: 240x240, 10 KB
src/app/apple-icon.png: 180x180
sello: diferencia media 2.63 (tope 4.0) PASS
entrada: diferencia media 1.17 (tope 3.0) PASS
```
Código de salida 0. Si alguna línea dice FAIL, el recorte o el archivo de origen no es el del prototipo: no sigas.

- [ ] **Step 3: Mira el sello y el ícono**

Abre con `Read` `public/brand/sello-morella.jpg` y `src/app/apple-icon.png`.
Criterios: el sello muestra la cara de Morella centrada con el pelo al viento y el cielo naranja (PASS/FAIL); el ícono es una M con remates, crema sobre espresso, dentro de un anillo dorado (PASS/FAIL).

- [ ] **Step 4: Commit**

```bash
git add scripts/brand-assets.py public/brand/morella-lago-1280.jpg public/brand/morella-lago-800.jpg public/brand/sello-morella.jpg src/app/apple-icon.png
git commit -m "Fotos de marca MOREFEST optimizadas y el script que las genera desde docs/brand"
```

---

### Task 2: Tokens, estilos base, fuentes propias, metadatos e íconos

**Files:**
- Modify: `src/app/globals.css` (se reemplaza entero)
- Modify: `src/app/layout.tsx` (se reemplaza entero)
- Create: `src/app/icon.svg`
- Create: `src/components/Icon.tsx`
- Create: `src/components/StatusPill.tsx`

Al terminar esta tarea las pantallas viejas se ven sin estilo: sus clases (`.card`, `.wrap`, `.tabs`...) dejan de existir y cada tarea siguiente viste la suya. Es esperado; el deploy es uno solo al final.

- [ ] **Step 1: Reemplaza `src/app/globals.css` por los tokens y la base**

```css
/* MOREFEST. Un solo mundo oscuro espresso; el plano y la hoja de protocolo son papel crema.
   Tokens: docs/superpowers/specs/2026-10-17-morefest-identidad-design.md, sección 4.
   Nombres y valores: docs/design/morefest-prototipo.html (fuente de verdad visual).
   Móvil primero; desde 821 px la hoja de la mesa pasa a columna derecha.
   Cada tarea del plan B agrega su bloque al final de este archivo. */
:root{
  color-scheme:dark;
  /* superficies */
  --bg:#140c08; --bg-veil:rgba(20,12,8,.94); --surface:#1d130d; --surface-2:#2a1b12; --leather:#3b2416;
  --fg:#f3e6d3; --fg-dim:#c9bba8; --fg-mute:#a8969a;
  --gold:#f7c873; --accent:#f2a03d; --accent-hi:#f6b45f; --amber:#e0892f;
  --ok:#8fbf7a; --ok-wash:#1b2415; --err:#e8745a; --err-wash:#2a140e;
  --line-strong:#8a6244; --hair:#38251a;
  /* papel crema: plano e impresión */
  --paper:#f3e6d3; --paper-2:#e6d4ba; --ink:#140c08; --ink-2:#3b2416;
  --map-free:#2f6b3a; --map-free-wash:rgba(47,107,58,.2); --map-part:#9a5413; --map-part-wash:rgba(154,84,19,.14); --map-sel:#e0892f;
  /* viñetas y sombras */
  --veil-top:rgba(14,8,5,.72); --veil-mid:rgba(14,8,5,.55); --veil-low:rgba(14,8,5,.9);
  --scrim:rgba(8,5,3,.66); --shadow-deep:rgba(0,0,0,.62);
  /* tipografía: las variables --ff-* las pone next/font en <html> (src/app/layout.tsx) */
  --font-display:var(--ff-fraunces),"Iowan Old Style","Palatino Linotype",Georgia,serif;
  --font-ui:var(--ff-inter),system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;
  --font-mono:var(--ff-plex-mono),ui-monospace,"SFMono-Regular",Consolas,monospace;
  /* forma, movimiento y bordes seguros del teléfono */
  --r-card:16px; --r-ctl:12px; --r-nest:8px;
  --ease-out:cubic-bezier(.22,1,.36,1);
  --safe-t:env(safe-area-inset-top,0px); --safe-b:env(safe-area-inset-bottom,0px);
  --safe-l:env(safe-area-inset-left,0px); --safe-r:env(safe-area-inset-right,0px);
  --grain-paper:url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='180' height='180'><filter id='p'><feTurbulence type='fractalNoise' baseFrequency='.7' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 .23  0 0 0 0 .14  0 0 0 0 .09  0 0 0 .5 0'/></filter><rect width='100%25' height='100%25' filter='url(%23p)'/></svg>");
}

*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
body{margin:0;min-height:100dvh;background:var(--bg);color:var(--fg);font:400 16px/1.5 var(--font-ui);-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
button,input,select,textarea{font:inherit;color:inherit}
button,a,[role="button"]{touch-action:manipulation}
:focus-visible{outline:2px solid var(--amber);outline-offset:2px}
h1,h2,h3,h4{text-wrap:balance}
p{text-wrap:pretty}
img{max-width:100%}
code{font-family:var(--font-mono)}
.sr-only{position:absolute!important;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap;border:0}
.ico{width:20px;height:20px;flex:none;fill:none;stroke:currentColor;stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.ico-sm{width:16px;height:16px}
.ico-lg{width:24px;height:24px}
.print-only{display:none}

/* ---------- piezas comunes ---------- */
.eyebrow{margin:0;font:500 12px/1.3 var(--font-ui);letter-spacing:.08em;text-transform:uppercase;color:var(--fg-mute)}
.h2{margin:0;font:600 24px/1.1 var(--font-display);font-variation-settings:"opsz" 72,"SOFT" 50;color:var(--fg)}
.h3{margin:0;font:600 19px/1.2 var(--font-display);font-variation-settings:"opsz" 36,"SOFT" 50;color:var(--fg)}
.sub{margin:2px 0 0;font:500 13px var(--font-ui);color:var(--fg-mute)}
.muted{color:var(--fg-dim)}
.nowrap{white-space:nowrap}
.help{margin:0;font-size:14px;color:var(--fg-mute)}
.err-msg{display:flex;gap:6px;align-items:flex-start;margin:0;font-size:14px;color:var(--err)}
.err-msg .ico{margin-top:2px}
.empty{margin:8px 16px;padding:18px;border-radius:var(--r-card);border:1px dashed var(--line-strong);color:var(--fg-dim);font-size:15px}
.stack{display:flex;flex-direction:column;gap:12px}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.row-wrap{display:flex;flex-wrap:wrap;gap:8px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.full{grid-column:1/-1}

/* botones: 48 px de alto, texto sobre naranja siempre en espresso */
.btn{min-height:48px;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:0 18px;border-radius:var(--r-ctl);border:1px solid transparent;cursor:pointer;font:600 15px var(--font-ui);text-decoration:none;white-space:nowrap;transition:transform 120ms var(--ease-out),background 160ms var(--ease-out),border-color 160ms var(--ease-out)}
.btn:active{transform:scale(.98)}
.btn[disabled],.btn[aria-disabled="true"]{opacity:.45;cursor:not-allowed;transform:none}
.btn-primary{background:var(--accent);color:var(--bg)}
.btn-primary:hover:not([disabled]){background:var(--accent-hi)}
.btn-secondary{background:var(--surface-2);color:var(--fg);border-color:var(--line-strong)}
.btn-secondary:hover:not([disabled]){background:var(--leather)}
.btn-ghost{background:transparent;color:var(--amber);padding:0 12px}
.btn-ghost:hover{background:var(--surface-2)}
.btn-inline{align-self:flex-start;margin-left:-12px}
.btn-ok{background:var(--ok);color:var(--bg)}
.btn-danger{background:transparent;color:var(--err);border-color:var(--err)}
.btn-danger:hover:not([disabled]){background:var(--err-wash)}
.btn-quiet-danger{background:transparent;color:var(--err);padding:0 12px}
.btn-quiet-danger:hover:not([disabled]){background:var(--err-wash)}
.btn-block{width:100%}
.icon-btn{width:48px;height:48px;display:grid;place-items:center;border-radius:12px;border:0;background:transparent;color:var(--fg);cursor:pointer}
.icon-btn:hover{background:var(--surface)}
.mini{min-height:44px;padding:0 8px;border:0;border-radius:8px;background:transparent;color:var(--amber);font:600 13px var(--font-ui);cursor:pointer}
.mini:hover{background:var(--surface-2)}

/* formularios: etiqueta visible, control de 48 px, borde 3:1 */
.field{display:flex;flex-direction:column;gap:6px;min-width:0}
.field > label,.lbl-txt{font:500 14px var(--font-ui);color:var(--fg-dim)}
.req{color:var(--gold)}
.inp{width:100%;min-height:48px;padding:0 14px;border-radius:var(--r-ctl);border:1px solid var(--line-strong);background:var(--surface-2);color:var(--fg);font:400 16px var(--font-ui);transition:border-color 160ms var(--ease-out)}
.inp:focus-visible{border-color:var(--amber)}
.inp[aria-invalid="true"]{border-color:var(--err)}
.inp::placeholder{color:var(--fg-mute)}
select.inp{appearance:none;-webkit-appearance:none;padding-right:44px;cursor:pointer}
.sel-wrap{position:relative}
.sel-wrap .ico{position:absolute;right:14px;top:50%;transform:translateY(-50%);pointer-events:none;color:var(--fg-dim)}
.money{position:relative}
.money .unit{position:absolute;left:14px;top:50%;transform:translateY(-50%);font:600 15px var(--font-ui);color:var(--fg-mute);pointer-events:none}
.money .inp{padding-left:34px;font-variant-numeric:tabular-nums}
.search{position:relative}
.search .ico{position:absolute;left:14px;top:50%;transform:translateY(-50%);color:var(--fg-mute);pointer-events:none}
.search .inp{padding-left:46px}
.seg{display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:4px;background:var(--surface);border:1px solid var(--hair);border-radius:14px}
.seg button{min-height:44px;border:0;border-radius:10px;background:transparent;color:var(--fg-dim);font:600 15px var(--font-ui);cursor:pointer}
.seg button[aria-selected="true"],.seg button[aria-checked="true"]{background:var(--leather);color:var(--fg)}

/* estados de mesa y reserva: borde + ícono + texto, nunca solo color */
.pill{display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:999px;border:1px solid;font:600 12px var(--font-ui);white-space:nowrap}
.pill .ico{width:14px;height:14px}
.st-free{color:var(--ok);border-color:var(--ok)}
.st-part{color:var(--ok);border-color:var(--ok);border-style:dashed}
.st-held{color:var(--gold);border-color:var(--gold)}
.st-paid{color:var(--bg);background:var(--ok);border-color:var(--ok)}
.st-in{color:var(--fg);background:var(--leather);border-color:var(--line-strong)}

.live{display:inline-flex;align-items:center;gap:6px;font:500 13px var(--font-ui);color:var(--fg-dim);white-space:nowrap}
.live i{width:8px;height:8px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 3px var(--ok-wash)}
.live.off i{background:var(--err);box-shadow:0 0 0 3px var(--err-wash)}

/* ---------- movimiento: corto y apagado con reduced-motion ---------- */
@keyframes entrada{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@keyframes revela{from{transform:scale(1.05);filter:brightness(.7)}to{transform:none;filter:none}}
@keyframes sube{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{animation:none!important;transition:none!important}
}
```

- [ ] **Step 2: Reemplaza `src/app/layout.tsx`**

```tsx
import type { Metadata, Viewport } from 'next';
import { Fraunces, IBM_Plex_Mono, Inter } from 'next/font/google';
import './globals.css';

/* Fuentes servidas desde el propio dominio con next/font: la CSP no deja salir a Google. */
const fraunces = Fraunces({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  axes: ['opsz', 'SOFT', 'WONK'],
  variable: '--ff-fraunces',
  display: 'swap',
});
const inter = Inter({ subsets: ['latin'], variable: '--ff-inter', display: 'swap' });
const plexMono = IBM_Plex_Mono({ subsets: ['latin'], weight: ['500', '600'], variable: '--ff-plex-mono', display: 'swap' });

export const metadata: Metadata = {
  title: 'MOREFEST',
  description: 'Reservas de mesas y control de acceso de MOREFEST, Renacer de Morella Montiel, en VOLTERRA.',
  applicationName: 'MOREFEST',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#140c08',
  colorScheme: 'dark',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${fraunces.variable} ${inter.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Crea `src/app/icon.svg` (mismos polígonos que `apple-icon.png`)**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#140c08"/>
  <circle cx="32" cy="32" r="28.5" fill="none" stroke="#f7c873" stroke-width="1.5"/>
  <g fill="#f3e6d3">
    <polygon points="15,18 17,18 17,46 15,46"/>
    <polygon points="15,18 21,18 33.5,46 30.5,46"/>
    <polygon points="30.5,46 32.5,46 47,18 45,18"/>
    <polygon points="44,18 49.5,18 49.5,46 44,46"/>
    <polygon points="11.5,18 21,18 21,19.4 11.5,19.4"/>
    <polygon points="43,18 53,18 53,19.4 43,19.4"/>
    <polygon points="11.5,44.6 20.5,44.6 20.5,46 11.5,46"/>
    <polygon points="40.5,44.6 53,44.6 53,46 40.5,46"/>
  </g>
</svg>
```

- [ ] **Step 4: Crea `src/components/Icon.tsx` (trazos del sprite del prototipo)**

```tsx
/** Íconos de trazo (24x24, trazo 1,6) copiados del sprite de docs/design/morefest-prototipo.html.
 *  Siempre decorativos: el texto o el aria-label del botón dice lo que hacen. */
const PATHS = {
  alert: (
    <>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  clip: (
    <>
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="m9 14 2 2 4-4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </>
  ),
  dot: <circle cx="12" cy="12" r="7" />,
  down: <path d="m6 9 6 6 6-6" />,
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeoff: (
    <>
      <path d="M2 12s3.5-7 10-7c2 0 3.7.6 5.1 1.5M22 12s-3.5 7-10 7c-2 0-3.7-.6-5.1-1.5" />
      <path d="m3 3 18 18" />
    </>
  ),
  half: (
    <>
      <circle cx="12" cy="12" r="7" />
      <path d="M12 5a7 7 0 0 1 0 14z" fill="currentColor" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 16v-4M12 8h.01" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  map: (
    <>
      <path d="M9 3 3 6v15l6-3 6 3 6-3V3l-6 3-6-3z" />
      <path d="M9 3v15M15 6v15" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  plus: <path d="M12 5v14M5 12h14" />,
  print: (
    <>
      <path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </>
  ),
  undo: (
    <>
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </>
  ),
  users: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
    </>
  ),
  x: <path d="M18 6 6 18M6 6l12 12" />,
  zoomin: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M11 8v6M8 11h6" />
    </>
  ),
  zoomout: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3M8 11h6" />
    </>
  ),
} satisfies Record<string, React.ReactNode>;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size }: { name: IconName; size?: 'sm' | 'lg' }) {
  return (
    <svg className={size ? `ico ico-${size}` : 'ico'} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {PATHS[name]}
    </svg>
  );
}
```

- [ ] **Step 5: Crea `src/components/StatusPill.tsx`**

```tsx
import type { TableStatus } from '@/lib/types';
import { Icon, type IconName } from './Icon';

const ICON: Record<TableStatus, IconName> = { free: 'dot', part: 'half', held: 'clock', paid: 'check', in: 'users' };

/** Estado de mesa o reserva: borde, ícono y texto, nunca solo color. */
export function StatusPill({ status, label }: { status: TableStatus; label: string }) {
  return (
    <span className={`pill st-${status}`}>
      <Icon name={ICON[status]} />
      {label}
    </span>
  );
}
```

- [ ] **Step 6: Tipos**

Run: `npm run typecheck`
Expected: termina sin errores (solo las dos líneas del encabezado de npm y `tsc --noEmit`).

- [ ] **Step 7: Build**

Run: `npm run build`
Expected: termina sin errores; la tabla de rutas incluye `/`, `/icon.svg` y `/apple-icon.png`. Necesita internet: `next/font` baja las fuentes de Google una sola vez, en el build.

- [ ] **Step 8: Las fuentes salen del propio dominio**

Run: `ls .next/static/media | grep -c woff2 ; grep -rl "fonts.googleapis.com" .next/server/app | wc -l`
Expected: primera línea 3 o más (archivos `.woff2` propios); segunda línea `0` (ningún HTML generado apunta a Google).

- [ ] **Step 9: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/app/icon.svg src/components/Icon.tsx src/components/StatusPill.tsx
git commit -m "Tokens MOREFEST, fuentes propias con next/font, metadatos y monograma; base de estilos del prototipo"
```

---

### Task 3: CSP cerrada a fuentes y estilos propios

**Files:**
- Modify: `tests/headers.test.ts:30-38`
- Modify: `next.config.ts:3-24`

- [ ] **Step 1: Cambia la prueba de la CSP (falla primero)**

En `tests/headers.test.ts`, reemplaza el bloque completo que empieza en `it('la CSP solo deja hablar con el propio Supabase y las fuentes de Google', ...` (líneas 30 a 38) por:

```ts
  it('la CSP solo deja hablar con el propio Supabase; fuentes y estilos salen del mismo dominio', async () => {
    const csp = (await headersFor('https://abc.supabase.co'))['content-security-policy'];
    const directive = (name: string) => csp.split(';').map((s) => s.trim()).find((s) => s.startsWith(`${name} `));
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("connect-src 'self' https://abc.supabase.co wss://abc.supabase.co");
    expect(directive('font-src')).toBe("font-src 'self'");
    expect(directive('style-src')).toBe("style-src 'self' 'unsafe-inline'");
    expect(csp).not.toContain('fonts.googleapis.com');
    expect(csp).not.toContain('fonts.gstatic.com');
  });
```

- [ ] **Step 2: Corre la prueba y mira que falle**

Run: `npx vitest run tests/headers.test.ts`
Expected: FAIL en "la CSP solo deja hablar con el propio Supabase; fuentes y estilos salen del mismo dominio": `expected "font-src 'self' https://fonts.gstatic.com" to be "font-src 'self'"`.

- [ ] **Step 3: Cierra la CSP en `next.config.ts`**

Reemplaza las líneas 3 a 24 (el comentario y la función hasta el `.join('; ');`) por:

```ts
/**
 * Cabeceras de seguridad para todas las rutas. La CSP solo deja hablar con el Supabase del proyecto
 * (REST, Auth y Realtime). Las fuentes salen del propio dominio con next/font, así que fuentes y estilos
 * se cierran a 'self'. Next necesita 'unsafe-inline' en script-src para sus scripts de hidratación y en
 * style-src para los atributos style; en desarrollo además 'unsafe-eval'.
 */
function securityHeaders() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const api = url ? new URL(url).origin : 'https://*.supabase.co';
  const ws = api.replace(/^https:/, 'wss:');
  const dev = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "img-src 'self' data: blob:",
    `connect-src 'self' ${api} ${ws}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');
```

- [ ] **Step 4: Corre la prueba y mira que pase**

Run: `npx vitest run tests/headers.test.ts`
Expected: PASS, `Tests  3 passed (3)`.

- [ ] **Step 5: Suite completa**

Run: `npm test`
Expected: todas en verde, 0 fallidas.

- [ ] **Step 6: Commit**

```bash
git add tests/headers.test.ts next.config.ts
git commit -m "CSP cerrada: fuentes y estilos solo del propio dominio, ya no hace falta Google Fonts"
```

---

### Task 4: Vista previa de desarrollo y separación de `Main` y `Board`

**Files:**
- Modify: `tests/headers.test.ts` (prueba nueva al final)
- Modify: `next.config.ts` (agrega `pageExtensions`)
- Create: `src/components/actions.ts`
- Modify: `src/components/Panel.tsx:3-15` (el tipo `Actions` sale a `actions.ts`)
- Create: `src/components/Board.tsx`
- Modify: `src/components/Main.tsx` (se reemplaza entero)
- Create: `src/app/vista-previa/fixture.ts`
- Create: `src/app/vista-previa/Preview.tsx`
- Create: `src/app/vista-previa/page.dev.tsx`

En esta tarea nada cambia de aspecto: `Board` recibe tal cual el marcado que hoy está en `Main`. Lo que cambia es que el panel ya se puede montar con datos de ejemplo.

- [ ] **Step 1: Prueba de que la vista previa no existe en producción (falla primero)**

En `tests/headers.test.ts`, cambia la primera línea a:

```ts
import { describe, expect, it, vi } from 'vitest';
```

y agrega al final del archivo:

```ts
describe('vista previa de desarrollo', () => {
  it('existe con next dev y desaparece del build de producción', async () => {
    expect(config.pageExtensions).toContain('dev.tsx');
    const before = process.env.NODE_ENV;
    Object.assign(process.env, { NODE_ENV: 'production' });
    vi.resetModules();
    try {
      const prod = (await import('../next.config')).default;
      expect(prod.pageExtensions).toEqual(['tsx', 'ts']);
    } finally {
      Object.assign(process.env, { NODE_ENV: before });
      vi.resetModules();
    }
  });
});
```

- [ ] **Step 2: Corre y mira que falle**

Run: `npx vitest run tests/headers.test.ts`
Expected: FAIL en "existe con next dev y desaparece del build de producción": `expected undefined to include 'dev.tsx'` (o "Target cannot be null or undefined").

- [ ] **Step 3: Agrega `pageExtensions` en `next.config.ts`**

Reemplaza:

```ts
const nextConfig: NextConfig = {
  poweredByHeader: false,
```

por:

```ts
/** La vista previa con datos de ejemplo (src/app/vista-previa/page.dev.tsx) solo existe con `next dev`:
 *  en el build de producción un archivo `page.dev.tsx` no es una ruta. */
const pageExtensions = process.env.NODE_ENV === 'production' ? ['tsx', 'ts'] : ['dev.tsx', 'tsx', 'ts'];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  pageExtensions,
```

- [ ] **Step 4: Corre y mira que pase**

Run: `npx vitest run tests/headers.test.ts`
Expected: PASS, `Tests  4 passed (4)`.

- [ ] **Step 5: Crea `src/components/actions.ts`**

```ts
import type { Reservation, TableRow } from '@/lib/types';

/** Lo que la interfaz le pide a la base. Main lo implementa con Supabase; la vista previa, con avisos. */
export interface Actions {
  reserve: (t: TableRow, v: { name: string; phone: string; guests: number; total: number; deposit: number; method: string }) => Promise<boolean>;
  pay: (r: Reservation, amount: number, method: string) => Promise<boolean>;
  checkIn: (r: Reservation) => Promise<boolean>;
  cancel: (r: Reservation) => Promise<boolean>;
  savePrices: (t: TableRow, price: number | null, seat: number | null) => Promise<boolean>;
}

/** Aviso con el resultado de una acción. */
export interface Msg {
  text: string;
  err: boolean;
}
```

- [ ] **Step 6: `Panel.tsx` toma el tipo de `actions.ts`**

En `src/components/Panel.tsx`, reemplaza:

```ts
import type { Reservation, TableRow } from '@/lib/types';

const METHODS = ['Efectivo', 'Zelle', 'Pago móvil', 'Transferencia'];

export interface Actions {
  reserve: (t: TableRow, v: { name: string; phone: string; guests: number; total: number; deposit: number; method: string }) => Promise<boolean>;
  pay: (r: Reservation, amount: number, method: string) => Promise<boolean>;
  checkIn: (r: Reservation) => Promise<boolean>;
  cancel: (r: Reservation) => Promise<boolean>;
  savePrices: (t: TableRow, price: number | null, seat: number | null) => Promise<boolean>;
}
```

por:

```ts
import type { Reservation, TableRow } from '@/lib/types';
import type { Actions } from './actions';

const METHODS = ['Efectivo', 'Zelle', 'Pago móvil', 'Transferencia'];
```

- [ ] **Step 7: Crea `src/components/Board.tsx` con el marcado que hoy tiene `Main`**

```tsx
'use client';

import { useState } from 'react';
import type { Snapshot } from '@/lib/data';
import { fmtDate } from '@/lib/logic';
import type { AreaCode, TableRow } from '@/lib/types';
import type { Actions, Msg } from './actions';
import { FloorMap } from './FloorMap';
import { Panel } from './Panel';
import { ReservationList } from './ReservationList';
import { Stats } from './Stats';

export interface BoardProps {
  snap: Snapshot;
  email: string;
  live: boolean;
  busy: boolean;
  msg: Msg | null;
  actions: Actions;
  onSaveDate: (value: string) => void;
  onSignOut: () => void;
  onDismissMsg: () => void;
}

/** Panel de Alejandro sin datos propios: todo llega por props, así se monta igual con Supabase o con la vista previa. */
export function Board({ snap, email, live, busy, msg, actions, onSaveDate, onSignOut, onDismissMsg }: BoardProps) {
  const [area, setArea] = useState<AreaCode>('PB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = snap.tables.find((t) => t.id === selectedId) ?? null;

  function pick(t: TableRow) {
    setArea(t.area);
    setSelectedId(t.id);
    onDismissMsg();
  }

  return (
    <div className="wrap">
      <header>
        <div>
          <h1>VOLTERRA</h1>
          <div className="sub">
            Reservas y acceso · Evento: {fmtDate(snap.event.event_date)} · <span className={`live${live ? '' : ' off'}`}>{live ? 'en vivo' : 'sin conexión en vivo'}</span>
          </div>
        </div>
        <div className="bar">
          <label style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            Fecha del evento
            <input
              type="date"
              style={{ width: 'auto' }}
              defaultValue={snap.event.event_date ?? ''}
              key={snap.event.event_date ?? 'sin-fecha'}
              onChange={(e) => onSaveDate(e.target.value)}
            />
          </label>
          <button onClick={onSignOut} title={email}>
            Salir
          </button>
        </div>
      </header>

      <Stats tables={snap.tables} reservations={snap.reservations} />

      <div className="main">
        <section className="card">
          <div className="tabs">
            {(['PB', 'VIP'] as AreaCode[]).map((a) => (
              <button
                key={a}
                aria-pressed={area === a}
                onClick={() => {
                  setArea(a);
                  setSelectedId(null);
                }}
              >
                {a === 'PB' ? 'Planta baja' : 'Planta alta VIP'}
              </button>
            ))}
          </div>
          <FloorMap area={area} tables={snap.tables} reservations={snap.reservations} selected={selectedId} onPick={pick} />
        </section>

        <Panel table={selected} reservations={snap.reservations} actions={actions} busy={busy} msg={msg} />
      </div>

      <ReservationList tables={snap.tables} reservations={snap.reservations} onPick={pick} />
    </div>
  );
}
```

- [ ] **Step 8: Reemplaza `src/components/Main.tsx`**

```tsx
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { loadSnapshot, type Snapshot } from '@/lib/data';
import { friendlyError } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';
import type { Actions, Msg } from './actions';
import { Board } from './Board';

type Result = PromiseLike<{ error: { message: string } | null }>;

/** Contenedor: carga el snapshot, escucha los cambios en vivo y traduce cada acción a una RPC de Supabase. */
export function Main({ email }: { email: string }) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loadError, setLoadError] = useState('');
  const [live, setLive] = useState(false);
  const [msg, setMsg] = useState<Msg | null>(null);
  const [busy, setBusy] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismiss = useCallback(() => setMsg(null), []);

  const reload = useCallback(async () => {
    try {
      setSnap(await loadSnapshot(supabase()));
      setLoadError('');
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : (e as { message?: string }).message || 'No se pudo cargar.');
    }
  }, []);

  useEffect(() => {
    reload();
    const sb = supabase();
    const later = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(reload, 250);
    };
    let ch = sb.channel('volterra');
    for (const table of ['reservations', 'payments', 'check_ins', 'tables', 'events']) {
      ch = ch.on('postgres_changes', { event: '*', schema: 'public', table }, later);
    }
    ch.subscribe((status) => setLive(status === 'SUBSCRIBED'));
    const onFocus = () => reload();
    window.addEventListener('focus', onFocus);
    const poll = setInterval(reload, 60000);
    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(poll);
      if (timer.current) clearTimeout(timer.current);
      sb.removeChannel(ch);
    };
  }, [reload]);

  async function run(fn: () => Result, ok: string): Promise<boolean> {
    setBusy(true);
    const { error } = await fn();
    setBusy(false);
    setMsg(error ? { text: friendlyError(error.message), err: true } : { text: ok, err: false });
    await reload();
    return !error;
  }

  const sb = supabase;
  const actions: Actions = {
    reserve: (t, v) =>
      run(
        () =>
          sb().rpc('create_reservation', {
            p_table_id: t.id,
            p_customer_name: v.name,
            p_phone: v.phone || null,
            p_guests: v.guests,
            p_total: v.total,
            p_deposit: v.deposit,
            p_method: v.method,
            p_notes: null,
          }),
        `${v.guests} ${v.guests === 1 ? 'puesto reservado' : 'puestos reservados'} para ${v.name}.`,
      ),
    pay: (r: Reservation, amount, method) =>
      run(() => sb().rpc('add_payment', { p_res: r.id, p_amount: amount, p_method: method, p_ref: null }), `Pago de $${amount.toFixed(2)} registrado.`),
    checkIn: (r) => run(() => sb().rpc('check_in', { p_res: r.id, p_people: r.guests }), `Llegada de ${r.name} confirmada.`),
    cancel: (r) => run(() => sb().rpc('cancel_reservation', { p_res: r.id, p_reason: 'Cancelada desde la app' }), 'Reserva cancelada. Los puestos quedaron libres.'),
    savePrices: (t: TableRow, price, seat) =>
      run(async () => {
        const { data, error } = await sb().from('tables').update({ price, seat_price: seat }).eq('id', t.id).select('id');
        if (!error && !data?.length) return { error: { message: 'forbidden' } };
        return { error };
      }, `Precios de ${t.code} guardados.`),
  };

  async function saveDate(value: string) {
    if (!snap) return;
    await run(async () => {
      const { data, error } = await sb().from('events').update({ event_date: value || null }).eq('id', snap.event.id).select('id');
      if (!error && !data?.length) return { error: { message: 'forbidden' } };
      return { error };
    }, 'Fecha del evento guardada.');
  }

  if (loadError) {
    return (
      <div className="wrap center">
        <h1>VOLTERRA</h1>
        <p className="err-banner">{loadError}</p>
        <div className="actions">
          <button onClick={reload}>Reintentar</button>
          <button onClick={() => supabase().auth.signOut()}>Salir</button>
        </div>
      </div>
    );
  }
  if (!snap) return <div className="wrap center note">Cargando…</div>;

  return (
    <Board
      snap={snap}
      email={email}
      live={live}
      busy={busy}
      msg={msg}
      actions={actions}
      onSaveDate={saveDate}
      onSignOut={() => supabase().auth.signOut()}
      onDismissMsg={dismiss}
    />
  );
}
```

- [ ] **Step 9: Crea `src/app/vista-previa/fixture.ts`**

Coordenadas reales del croquis (`scripts/gen-seed.mjs`, `0004_puestos_sueltos.sql` para PB-16 y `0007_sofas_mirando_pantalla.sql` para los sofás); clientes, teléfonos y montos ficticios, los mismos del prototipo. El archivo ya trae los campos del plan A (`created_at`, `reverses_payment_id`, `email`, `checked_in_at`, `venue`, `role`) y los asegura con `as`: así compila con los tipos de hoy (los campos de más se aceptan en una aserción) y con los del plan A. La tarea 10 cambia las aserciones por anotaciones para que el compilador vuelva a vigilarlo todo.

```ts
import type { Snapshot } from '@/lib/data';
import type { AreaCode, EventRow, Payment, Reservation, TableRow } from '@/lib/types';

/** Datos de ejemplo de la vista previa: mismos clientes y estados que docs/design/morefest-prototipo.html.
 *  Nada de esto toca la base. */
type Def = [code: string, x: number, y: number, w: number, h: number, rot: number, cap: number, shape?: 'r' | 'c'];

const DEFS: Def[] = [
  ['PB-01', 302, 160, 125, 34, 0, 10], ['PB-02', 125, 318, 60, 60, 0, 4, 'c'], ['PB-03', 326, 252, 52, 52, 0, 4],
  ['PB-04', 360, 327, 108, 30, -33, 10], ['PB-05', 472, 270, 108, 30, -22, 10], ['PB-06', 525, 348, 108, 30, -33, 10],
  ['PB-07', 420, 417, 108, 30, -35, 10], ['PB-08', 600, 397, 105, 30, -60, 10], ['PB-09', 498, 472, 52, 52, 0, 4],
  ['PB-10', 590, 540, 28, 104, 0, 10], ['PB-11', 122, 500, 30, 112, 0, 10], ['PB-12', 122, 690, 30, 112, 0, 10],
  ['PB-13', 692, 422, 28, 96, 0, 10], ['PB-14', 692, 530, 28, 96, 0, 10], ['PB-15', 686, 670, 30, 118, 0, 10],
  ['PB-16', 275, 650, 26, 228, 0, 11],
  ['VIP-05', 280, 445, 96, 40, 48, 4], ['VIP-06', 352, 520, 96, 40, 48, 4], ['VIP-07', 420, 598, 96, 40, 48, 4],
];

const price = (code: string, cap: number) => (code === 'PB-16' ? null : code.startsWith('VIP') ? 600 : cap === 4 ? 180 : 400);

const tables: TableRow[] = DEFS.map(([code, x, y, w, h, rot, cap, shape]) => ({
  id: `t-${code}`,
  code,
  area: (code.startsWith('VIP') ? 'VIP' : 'PB') as AreaCode,
  capacity: cap,
  price: price(code, cap),
  seat_price: code === 'PB-16' ? 35 : null,
  map_x: x,
  map_y: y,
  map_w: w,
  map_h: h,
  map_rot: rot,
  shape: shape ?? 'r',
}));

let pid = 0;
const P = (amount: number, method: string, day: string) =>
  ({ id: `p${++pid}`, amount, kind: 'payment', method, created_at: `${day}T15:00:00Z`, reverses_payment_id: null }) as Payment;
const REV = (of: Payment, day: string) =>
  ({ id: `p${++pid}`, amount: -of.amount, kind: 'reversal', method: of.method, created_at: `${day}T16:00:00Z`, reverses_payment_id: of.id }) as Payment;

const R = (
  id: string,
  code: string,
  table: string,
  name: string,
  phone: string | null,
  email: string | null,
  guests: number,
  total: number,
  payments: Payment[],
  cin?: { n: number; at: string },
) =>
  ({
    id,
    code,
    table_id: `t-${table}`,
    guests,
    total_price: total,
    notes: null,
    name,
    phone,
    email,
    payments,
    checked_in: cin?.n ?? null,
    checked_in_at: cin?.at ?? null,
  }) as Reservation;

/** Un abono cargado dos veces y corregido con su reverso: el original no se borra. */
const doble = P(80, 'Efectivo', '2026-10-12');

const event = { id: 'ev-morefest', name: 'MOREFEST', venue: 'Restaurante VOLTERRA, Maracaibo', event_date: null } as EventRow;

export const FIXTURE = {
  event,
  tables,
  role: 'admin',
  reservations: [
    R('r01', '7C2E19', 'PB-01', 'Héctor Urdaneta', '+58 414 605 2231', null, 10, 400, [P(200, 'Zelle', '2026-10-08'), P(200, 'Pago móvil', '2026-10-15')]),
    R('r02', 'B41D07', 'PB-02', 'Daniela Fuenmayor', '+58 424 610 7782', null, 4, 180, [P(180, 'Efectivo', '2026-10-11')], { n: 4, at: '2026-11-21T00:52:00Z' }),
    R('r03', 'E90A3F', 'PB-04', 'Carmen Elena Ríos', '+58 412 771 0954', null, 10, 400, [P(150, 'Pago móvil', '2026-10-09')]),
    R('r04', 'A3F91C', 'PB-05', 'María Fernanda Urdaneta', '+58 414 612 3348', 'mafer.urdaneta@ejemplo.com', 6, 240, [P(100, 'Pago móvil', '2026-10-10'), P(140, 'Zelle', '2026-10-14')]),
    R('r05', '5D0C8B', 'PB-05', 'Rafael Bracho', '+58 424 338 4106', null, 4, 160, [P(80, 'Efectivo', '2026-10-12'), doble, REV(doble, '2026-10-12')]),
    R('r06', '1F6A2D', 'PB-07', 'Luis Ferrer', '+58 414 220 7813', null, 10, 400, [P(400, 'Transferencia', '2026-10-05')], { n: 10, at: '2026-11-21T00:14:00Z' }),
    R('r07', 'C8E5B0', 'PB-08', 'Valeria Chourio', '+58 412 447 9150', null, 10, 400, [P(200, 'Zelle', '2026-10-07'), P(200, 'Zelle', '2026-10-13')]),
    R('r08', '0B7F44', 'PB-10', 'Andreína Villalobos', '+58 412 958 4410', null, 6, 240, [P(120, 'Pago móvil', '2026-10-16')]),
    R('r09', 'D2A817', 'PB-12', 'Gabriel Añez', '+58 414 884 0561', null, 10, 400, [P(400, 'Efectivo', '2026-10-14')]),
    R('r10', '69C3E2', 'PB-14', 'Óscar Atencio', '+58 424 709 0562', null, 10, 400, [P(200, 'Pago móvil', '2026-10-15')]),
    R('r11', '3E8B5A', 'PB-16', 'José Gregorio Paz', '+58 424 733 1902', null, 3, 105, [P(105, 'Zelle', '2026-10-16')]),
    R('r12', 'F07C21', 'PB-16', 'Mariela Leal', '+58 414 590 2287', null, 2, 70, []),
    R('r13', '8A1D6E', 'VIP-05', 'Patrocinador A (ejemplo)', null, null, 4, 600, [P(600, 'Transferencia', '2026-10-03')]),
    R('r14', '27B9F3', 'VIP-06', 'Patrocinador B (ejemplo)', null, null, 4, 600, [P(300, 'Transferencia', '2026-10-03')]),
  ],
} as Snapshot;
```

Estados que deja en el mapa: libre (PB-03, 06, 09, 11, 13, 15, VIP-07), parcial (PB-10, PB-16), reservada (PB-04, PB-05, PB-14, VIP-06), pagada (PB-01, PB-08, PB-12, VIP-05) y ocupada (PB-02, PB-07). Cifras del resumen: vendido 4.595, cobrado 3.575 (78 %), por cobrar 1.020, 62 de 155 puestos libres, 7 de 19 mesas sin tocar, 14 personas dentro; 14 reservas y 93 puestos.

- [ ] **Step 10: Crea `src/app/vista-previa/Preview.tsx`**

```tsx
'use client';

import { useCallback, useState } from 'react';
import { Board } from '@/components/Board';
import { Login } from '@/components/Login';
import type { Actions, Msg } from '@/components/actions';
import { FIXTURE } from './fixture';

/** Panel con datos de ejemplo y acciones que solo avisan: nada toca Supabase. */
export function Preview({ pantalla }: { pantalla: 'entrar' | 'panel' }) {
  const [msg, setMsg] = useState<Msg | null>(null);
  const dismiss = useCallback(() => setMsg(null), []);
  if (pantalla === 'entrar') return <Login />;

  const aviso = (text: string) => {
    setMsg({ text: `Vista previa: ${text} No se guardó nada.`, err: false });
    return Promise.resolve(true);
  };
  const actions: Actions = {
    reserve: (t, v) => aviso(`reserva de ${v.guests} puestos en ${t.code} para ${v.name}.`),
    pay: (r, amount, method) => aviso(`pago de ${amount} por ${method} para ${r.name}.`),
    checkIn: (r) => aviso(`llegada de ${r.name}.`),
    cancel: (r) => aviso(`cancelación de ${r.name}.`),
    savePrices: (t) => aviso(`precios de ${t.code}.`),
  };

  return (
    <Board
      snap={FIXTURE}
      email="vista-previa@morefest.local"
      live
      busy={false}
      msg={msg}
      actions={actions}
      onSaveDate={(v) => void aviso(`fecha ${v || 'borrada'}.`)}
      onSignOut={() => void aviso('salir.')}
      onDismissMsg={dismiss}
    />
  );
}
```

- [ ] **Step 11: Crea `src/app/vista-previa/page.dev.tsx`**

```tsx
import { Preview } from './Preview';

/**
 * Vista previa con datos de ejemplo, solo con `next dev` (ver pageExtensions en next.config.ts).
 *   /vista-previa            panel
 *   /vista-previa?p=entrar   pantalla de entrada
 */
export default async function VistaPrevia({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  return <Preview pantalla={sp.p === 'entrar' ? 'entrar' : 'panel'} />;
}
```

- [ ] **Step 12: Tipos y pruebas**

Run: `npm run typecheck && npm test`
Expected: typecheck sin errores; pruebas todas en verde.

- [ ] **Step 13: La vista previa responde en desarrollo**

Con `npm run dev` corriendo, Playwright: `browser_navigate` a `http://localhost:3000/vista-previa` y `browser_snapshot`.
Expected: el árbol muestra el encabezado "VOLTERRA" y 16 elementos `button` con nombre que empieza en "PB-" (las mesas de planta baja). `browser_console_messages` (error) sin errores. PASS/FAIL.

- [ ] **Step 14: La vista previa no existe en el build de producción**

Run: `npm run build 2>&1 | grep -c "vista-previa"`
Expected: `0`.
Si sale 1 o más (FAIL), aplica el respaldo: renombra `page.dev.tsx` a `page.tsx`, agrega `import { notFound } from 'next/navigation';` y como primera línea de la función `if (process.env.NODE_ENV === 'production') notFound();`, quita `pageExtensions` de `next.config.ts` y la prueba del Step 1; vuelve a correr Steps 12 a 14. Anota el desvío en el mensaje del commit.

- [ ] **Step 15: Commit**

```bash
git add tests/headers.test.ts next.config.ts src/components/actions.ts src/components/Panel.tsx src/components/Board.tsx src/components/Main.tsx src/app/vista-previa/fixture.ts src/app/vista-previa/Preview.tsx src/app/vista-previa/page.dev.tsx
git commit -m "Main queda como contenedor de datos y Board como panel; vista previa con datos de ejemplo solo en desarrollo"
```

---

### Task 5: Entrar con la foto de Morella

**Files:**
- Modify: `src/components/Login.tsx` (se reemplaza entero)
- Modify: `src/app/globals.css` (bloque nuevo al final)

- [ ] **Step 1: Reemplaza `src/components/Login.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Icon } from './Icon';

/** Entrada: Morella saliendo del lago a sangre; el formulario se lee sobre la viñeta oscura. */
export function Login() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    const { error } = await supabase().auth.signInWithPassword({
      email: String(f.get('email')).trim(),
      password: String(f.get('password')),
    });
    setBusy(false);
    if (error) setError('Correo o contraseña incorrectos.');
  }

  return (
    <main className="login-screen">
      <div className="login-photo">
        <img
          src="/brand/morella-lago-1280.jpg"
          srcSet="/brand/morella-lago-800.jpg 800w, /brand/morella-lago-1280.jpg 1280w"
          sizes="100vw"
          width={1280}
          height={1280}
          alt="Morella Montiel caminando dentro del lago al atardecer"
          fetchPriority="high"
          decoding="async"
        />
      </div>
      <div className="login-col">
        <div className="login-top">
          <p className="mast-kicker">Corporación Montiel presenta</p>
          <h1 className="mast">
            <span className="mast-wm">Morefest</span>
            <span className="mast-prog">Renacer</span>
          </h1>
          <p className="mast-by">Morella Montiel</p>
        </div>
        <div className="login">
          <p className="eyebrow">Reservas y acceso</p>
          <form onSubmit={submit}>
            <div className="field">
              <label htmlFor="lg-email">Correo</label>
              <input
                className="inp"
                id="lg-email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="username"
                required
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'lg-err' : undefined}
              />
            </div>
            <div className="field">
              <label htmlFor="lg-pass">Contraseña</label>
              <div className="pass">
                <input
                  className="inp"
                  id="lg-pass"
                  name="password"
                  type={show ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? 'lg-err' : undefined}
                />
                <button
                  type="button"
                  className="icon-btn"
                  aria-pressed={show}
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  onClick={() => setShow(!show)}
                >
                  <Icon name={show ? 'eyeoff' : 'eye'} />
                </button>
              </div>
            </div>
            {error && (
              <p className="err-msg" id="lg-err" role="alert">
                <Icon name="alert" size="sm" />
                <span>{error}</span>
              </p>
            )}
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
          <p className="login-foot">Solo para el equipo de Corporación Montiel. Plataforma por IS Performance Solutions.</p>
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Agrega al final de `src/app/globals.css`**

```css
/* ---------- entrar: la foto de Morella manda (encuadre del prototipo: 83% 50% en el celular) ---------- */
.login-screen{position:relative;isolation:isolate;min-height:100dvh;display:flex;flex-direction:column;background:var(--bg)}
.login-photo{position:absolute;inset:0;z-index:-1;overflow:hidden}
.login-photo img{display:block;width:100%;height:100%;object-fit:cover;object-position:83% 50%;animation:revela 1400ms var(--ease-out) both}
.login-photo::after{content:"";position:absolute;inset:0;background:linear-gradient(to bottom,var(--veil-top) 0%,transparent 30%,transparent 42%,var(--veil-mid) 54%,var(--veil-low) 63%,var(--bg) 82%)}
.login-col{flex:1;display:flex;flex-direction:column;width:100%}
.login-top{display:flex;flex-direction:column;padding:calc(var(--safe-t) + 32px) max(22px,var(--safe-r)) 0 max(22px,var(--safe-l));text-shadow:0 1px 20px var(--veil-mid)}
.mast-kicker{margin:0;font:500 12px/1.3 var(--font-ui);letter-spacing:.26em;text-transform:uppercase;color:var(--fg-dim)}
.mast{margin:16px 0 0;display:flex;flex-direction:column}
.mast-wm{font:350 42px/1 var(--font-display);font-variation-settings:"opsz" 144,"SOFT" 0,"WONK" 0;letter-spacing:.22em;text-transform:uppercase;color:var(--fg)}
.mast-prog{margin:4px 0 0 36px;font:italic 300 66px/1.05 var(--font-display);font-variation-settings:"opsz" 144,"SOFT" 100,"WONK" 1;letter-spacing:-.01em;color:var(--gold)}
.mast-by{margin:12px 0 0 39px;font:500 12px/1.3 var(--font-ui);letter-spacing:.32em;text-transform:uppercase;color:var(--fg)}
.login{margin-top:auto;display:flex;flex-direction:column;gap:16px;padding:28px max(20px,var(--safe-r)) calc(24px + var(--safe-b)) max(20px,var(--safe-l))}
.login form{display:flex;flex-direction:column;gap:14px}
.pass{position:relative}
.pass .inp{padding-right:56px}
.pass .icon-btn{position:absolute;right:0;top:0;color:var(--fg-dim)}
.login-foot{margin:4px 0 0;font-size:13px;color:var(--fg-mute)}
@media (min-width:821px){
  .login-photo img{object-position:60% 45%}
  .login-photo::after{background:linear-gradient(to right,var(--bg) 0%,var(--veil-low) 24%,var(--veil-mid) 40%,transparent 62%),linear-gradient(to bottom,var(--veil-top) 0%,transparent 26%)}
  .login-col{max-width:520px;justify-content:center;gap:40px;padding:48px 0 48px max(56px,5vw)}
  .login-top{padding:0}
  .mast-wm{font-size:54px}
  .mast-prog{font-size:84px}
  .login{margin-top:0;padding:0}
}
```

- [ ] **Step 3: Tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 4: Captura a 390x844**

Procedimiento de captura con `http://localhost:3000/vista-previa?p=entrar` y el prototipo `#login`; nombre `T5-entrar-390`.
Criterios: (a) la foto ocupa toda la pantalla y Morella queda centrada, sin el sol a la derecha; (b) "CORPORACIÓN MONTIEL PRESENTA", MOREFEST en Fraunces espaciada en crema y "Renacer" en cursiva dorada, en ese orden y alineación; (c) formulario abajo sobre la viñeta oscura, etiquetas "Correo" y "Contraseña" visibles, botón "Entrar" naranja con texto espresso; (d) pie "Solo para el equipo de Corporación Montiel. Plataforma por IS Performance Solutions."; (e) el ojo muestra y oculta la contraseña y su etiqueta cambia. Cada uno PASS/FAIL.

- [ ] **Step 5: Captura a 1280x800**

Misma URL a 1280x800; nombre `T5-entrar-1280` (el prototipo no tiene versión de escritorio).
Criterios: (a) Morella completa a la derecha con el sol del atardecer; (b) marca y formulario en una columna a la izquierda, legibles sobre el degradado; (c) sin barra de desplazamiento horizontal. PASS/FAIL.

- [ ] **Step 6: Commit**

```bash
git add src/components/Login.tsx src/app/globals.css
git commit -m "Entrar con la foto de Morella saliendo del lago, marca MOREFEST Renacer y formulario sobre la viñeta"
```

---

### Task 6: Encabezado con sello, secciones y resumen

**Files:**
- Create: `src/lib/ui-format.ts`
- Create: `tests/ui.test.ts`
- Create: `src/components/StateScreen.tsx`
- Create: `src/components/MapView.tsx`
- Modify: `src/components/Stats.tsx` (se reemplaza entero)
- Modify: `src/components/Board.tsx` (se reemplaza entero)
- Modify: `src/components/AppShell.tsx` (se reemplaza entero)
- Modify: `src/components/Main.tsx` (pantallas de carga y error)
- Modify: `src/app/globals.css` (bloque nuevo al final)

- [ ] **Step 1: Escribe las pruebas de textos y resumen**

Crea `tests/ui.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import * as ui from '../src/lib/ui-format';

describe('textos del encabezado', () => {
  it('nombre corto del lugar', () => {
    expect(ui.placeName(null)).toBe('VOLTERRA');
    expect(ui.placeName('Restaurante VOLTERRA, Maracaibo')).toBe('VOLTERRA');
    expect(ui.placeName('Casa Morella')).toBe('Casa Morella');
  });
  it('plural en español', () => {
    expect(ui.plural(1, 'reserva', 'reservas')).toBe('1 reserva');
    expect(ui.plural(0, 'reserva', 'reservas')).toBe('0 reservas');
    expect(ui.plural(14, 'puesto', 'puestos')).toBe('14 puestos');
  });
});

describe('resumen', () => {
  it('montos sin centavos con punto de miles', () => {
    expect(ui.moneyShort(3040)).toBe('$3.040');
    expect(ui.moneyShort(0)).toBe('$0');
    expect(ui.moneyShort(999.6)).toBe('$1.000');
    expect(ui.moneyShort(12345.4)).toBe('$12.345');
  });
  it('seis cifras con su nota', () => {
    const s = { sold: 3040, collected: 1520, pending: 1520, seatsFree: 12, totalSeats: 93, untouched: 5, totalTables: 19, inside: 14 };
    expect(ui.statItems(s, 14)).toEqual([
      ['Vendido', '$3.040', '14 reservas'],
      ['Cobrado', '$1.520', '50% del total'],
      ['Por cobrar', '$1.520', 'en saldos'],
      ['Puestos libres', '12', 'de 93'],
      ['Mesas sin tocar', '5', 'de 19'],
      ['Personas dentro', '14', 'ya llegaron'],
    ]);
  });
  it('sin ventas el porcentaje cobrado es 0', () => {
    const s = { sold: 0, collected: 0, pending: 0, seatsFree: 93, totalSeats: 93, untouched: 19, totalTables: 19, inside: 0 };
    expect(ui.statItems(s, 0)[1]).toEqual(['Cobrado', '$0', '0% del total']);
  });
});
```

- [ ] **Step 2: Corre y mira que falle**

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL: no encuentra el módulo `../src/lib/ui-format`.

- [ ] **Step 3: Crea `src/lib/ui-format.ts`**

```ts
/* Funciones puras de presentación de MOREFEST. Sin React ni Supabase; imports relativos (vitest no resuelve '@/').
   La fecha larga del evento (eventDateLabel) y los montos con centavos (formatMoney) viven en logic.ts (plan A). */

/** "1 reserva", "3 reservas". */
export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** Nombre corto del lugar para el encabezado: "Restaurante VOLTERRA, Maracaibo" pasa a "VOLTERRA". */
export function placeName(venue: string | null | undefined): string {
  const name = (venue ?? '').split(',')[0].replace(/^restaurante\s+/i, '').trim();
  return name || 'VOLTERRA';
}

/** Montos del resumen sin centavos y con punto de miles venezolano: $3.040. */
export function moneyShort(n: number): string {
  return `$${new Intl.NumberFormat('es-VE', { maximumFractionDigits: 0 }).format(Math.round(n))}`;
}

/** Lo que devuelve summarize() de logic.ts y usa el resumen. */
export interface Summary {
  sold: number;
  collected: number;
  pending: number;
  seatsFree: number;
  totalSeats: number;
  untouched: number;
  totalTables: number;
  inside: number;
}

/** Las seis cifras del resumen: etiqueta, valor en dorado y nota debajo. */
export function statItems(s: Summary, reservations: number): [label: string, value: string, note: string][] {
  const pct = s.sold > 0 ? Math.round((s.collected / s.sold) * 100) : 0;
  return [
    ['Vendido', moneyShort(s.sold), plural(reservations, 'reserva', 'reservas')],
    ['Cobrado', moneyShort(s.collected), `${pct}% del total`],
    ['Por cobrar', moneyShort(s.pending), 'en saldos'],
    ['Puestos libres', String(s.seatsFree), `de ${s.totalSeats}`],
    ['Mesas sin tocar', String(s.untouched), `de ${s.totalTables}`],
    ['Personas dentro', String(s.inside), 'ya llegaron'],
  ];
}
```

- [ ] **Step 4: Corre y mira que pase**

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  5 passed (5)`.

- [ ] **Step 5: Crea `src/components/StateScreen.tsx`**

```tsx
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
```

- [ ] **Step 6: Reemplaza `src/components/Stats.tsx`**

```tsx
import { summarize } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';
import { statItems } from '@/lib/ui-format';

/** Seis cifras en dorado: 3 x 2 en el celular, una fila en escritorio. */
export function Stats({ tables, reservations }: { tables: TableRow[]; reservations: Reservation[] }) {
  const items = statItems(summarize(tables, reservations), reservations.length);
  return (
    <section className="stats" aria-label="Resumen de ventas">
      {items.map(([label, value, note]) => (
        <div className="stat" key={label}>
          <span>{label}</span>
          <b>{value}</b>
          <small>{note}</small>
        </div>
      ))}
    </section>
  );
}
```

- [ ] **Step 7: Crea `src/components/MapView.tsx`**

```tsx
'use client';

import type { Snapshot } from '@/lib/data';
import { fmtDate } from '@/lib/logic';
import type { AreaCode, TableRow } from '@/lib/types';
import { FloorMap } from './FloorMap';
import { Icon } from './Icon';
import { Stats } from './Stats';

const AREAS: [AreaCode, string][] = [
  ['PB', 'Planta baja'],
  ['VIP', 'Planta alta VIP'],
];

interface Props {
  snap: Snapshot;
  area: AreaCode;
  onArea: (a: AreaCode) => void;
  selectedId: string | null;
  onPick: (t: TableRow) => void;
  onSaveDate: (value: string) => void;
}

/** Sección Mapa: fecha del evento, resumen, pestañas de planta y plano. */
export function MapView({ snap, area, onArea, selectedId, onPick, onSaveDate }: Props) {
  const date = snap.event.event_date;

  function onTabKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const next: AreaCode = area === 'PB' ? 'VIP' : 'PB';
    onArea(next);
    document.getElementById(`tab-${next}`)?.focus();
  }

  return (
    <section aria-labelledby="mapa-title">
      <h2 className="sr-only" id="mapa-title">Mapa y resumen</h2>
      <div className="evdate">
        <label htmlFor="ev-date">
          Fecha del evento
          {/* fmtDate existe antes y después del plan A; la tarea 10 lo cambia por eventDateLabel ("Sábado, 14 de noviembre de 2026"). */}
          <b>{fmtDate(date)}</b>
        </label>
        <input className="inp" id="ev-date" type="date" defaultValue={date ?? ''} key={date ?? 'sin-fecha'} onChange={(e) => onSaveDate(e.target.value)} />
      </div>
      <Stats tables={snap.tables} reservations={snap.reservations} />
      <div className="area-tabs">
        <div className="seg" role="tablist" aria-label="Planta">
          {AREAS.map(([a, label]) => (
            <button
              key={a}
              id={`tab-${a}`}
              type="button"
              role="tab"
              aria-selected={area === a}
              aria-controls="plano"
              tabIndex={area === a ? 0 : -1}
              onClick={() => onArea(a)}
              onKeyDown={onTabKey}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div id="plano" role="tabpanel" aria-labelledby={`tab-${area}`}>
        <FloorMap area={area} tables={snap.tables} reservations={snap.reservations} selected={selectedId} onPick={onPick} />
      </div>
      <p className="map-hint">
        <Icon name="info" size="sm" />
        <span>
          {area === 'PB'
            ? 'Toca una mesa para ver sus reservas. Debajo del código van los puestos vendidos sobre la capacidad.'
            : 'Planta alta: solo los tres sofás de patrocinadores se reservan. La zona de artistas no tiene mesas.'}
        </span>
      </p>
    </section>
  );
}
```

- [ ] **Step 8: Reemplaza `src/components/Board.tsx`**

`Panel` y `ReservationList` siguen con su marcado viejo hasta las tareas 8 y 9.

```tsx
'use client';

import { useState } from 'react';
import type { Snapshot } from '@/lib/data';
import type { AreaCode, TableRow } from '@/lib/types';
import { placeName } from '@/lib/ui-format';
import type { Actions, Msg } from './actions';
import { Icon, type IconName } from './Icon';
import { MapView } from './MapView';
import { Panel } from './Panel';
import { ReservationList } from './ReservationList';

export type View = 'mapa' | 'reservas';

const VIEWS: [View, string, IconName][] = [
  ['mapa', 'Mapa', 'map'],
  ['reservas', 'Reservas', 'list'],
];

export interface BoardProps {
  snap: Snapshot;
  email: string;
  live: boolean;
  busy: boolean;
  msg: Msg | null;
  actions: Actions;
  onSaveDate: (value: string) => void;
  onSignOut: () => void;
  onDismissMsg: () => void;
}

/** Panel de Alejandro: encabezado con sello, secciones (barra inferior en el celular, pestañas en escritorio) y la hoja de la mesa. */
export function Board({ snap, email, live, busy, msg, actions, onSaveDate, onSignOut, onDismissMsg }: BoardProps) {
  const [view, setView] = useState<View>('mapa');
  const [area, setArea] = useState<AreaCode>('PB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = snap.tables.find((t) => t.id === selectedId) ?? null;

  function pick(t: TableRow) {
    setArea(t.area);
    setSelectedId(t.id);
    onDismissMsg();
  }
  function changeArea(a: AreaCode) {
    setArea(a);
    setSelectedId(null);
  }

  return (
    <div className="app">
      <header className="apphead">
        <img className="ah-seal" src="/brand/sello-morella.jpg" alt="" width={40} height={40} />
        <div className="ah-title">
          <h1 className="ah-wm">MOREFEST</h1>
          <p className="ah-sub">Renacer · {placeName(null)}</p>
        </div>
        <span className={`live${live ? '' : ' off'}`}>
          <i aria-hidden="true" />
          {live ? 'En vivo' : 'Sin conexión'}
        </span>
        <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Salir" title={`Salir (${email})`}>
          <Icon name="logout" />
        </button>
      </header>
      <nav className="tabbar" aria-label="Secciones">
        {VIEWS.map(([v, label, icon]) => (
          <button key={v} type="button" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </nav>
      <div className="layout">
        <main className="view" key={view}>
          {view === 'mapa' && (
            <MapView snap={snap} area={area} onArea={changeArea} selectedId={selectedId} onPick={pick} onSaveDate={onSaveDate} />
          )}
          {view === 'reservas' && <ReservationList tables={snap.tables} reservations={snap.reservations} onPick={pick} />}
        </main>
        <Panel table={selected} reservations={snap.reservations} actions={actions} busy={busy} msg={msg} />
      </div>
    </div>
  );
}
```

- [ ] **Step 9: Reemplaza `src/components/AppShell.tsx`**

```tsx
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
```

- [ ] **Step 10: Pantallas de carga y error en `Main.tsx`**

En `src/components/Main.tsx`, agrega debajo de `import { Board } from './Board';`:

```ts
import { Icon } from './Icon';
import { StateScreen } from './StateScreen';
```

y reemplaza:

```tsx
  if (loadError) {
    return (
      <div className="wrap center">
        <h1>VOLTERRA</h1>
        <p className="err-banner">{loadError}</p>
        <div className="actions">
          <button onClick={reload}>Reintentar</button>
          <button onClick={() => supabase().auth.signOut()}>Salir</button>
        </div>
      </div>
    );
  }
  if (!snap) return <div className="wrap center note">Cargando…</div>;
```

por:

```tsx
  if (loadError) {
    return (
      <StateScreen>
        <p className="err-msg" role="alert">
          <Icon name="alert" size="sm" />
          <span>{loadError}</span>
        </p>
        <div className="row-wrap">
          <button type="button" className="btn btn-secondary" onClick={reload}>
            Reintentar
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => supabase().auth.signOut()}>
            Salir
          </button>
        </div>
      </StateScreen>
    );
  }
  if (!snap) {
    return (
      <StateScreen>
        <p className="muted" role="status">
          Cargando…
        </p>
      </StateScreen>
    );
  }
```

- [ ] **Step 11: Agrega al final de `src/app/globals.css`**

```css
/* ---------- armazón: encabezado con sello, secciones y columnas ---------- */
.app{min-height:100dvh;display:flex;flex-direction:column}
.apphead{position:sticky;top:0;z-index:15;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;column-gap:12px;align-items:center;min-height:62px;padding:calc(6px + var(--safe-t)) max(6px,var(--safe-r)) 6px max(16px,var(--safe-l));background:var(--bg-veil);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-bottom:1px solid var(--hair)}
.ah-seal{display:block;width:40px;height:40px;border-radius:50%;object-fit:cover;border:1.5px solid var(--gold);box-shadow:0 0 0 3px var(--bg)}
.ah-title{min-width:0}
.ah-wm{margin:0;font:800 23px/1 var(--font-display);font-variation-settings:"opsz" 144,"SOFT" 60;letter-spacing:.03em}
.ah-sub{margin:3px 0 0;font:500 13px var(--font-ui);color:var(--fg-mute);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tabbar{position:fixed;left:0;right:0;bottom:0;z-index:20;display:grid;grid-auto-flow:column;grid-auto-columns:1fr;gap:4px;padding:6px max(8px,var(--safe-r)) calc(6px + var(--safe-b)) max(8px,var(--safe-l));background:var(--bg-veil);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);border-top:1px solid var(--hair)}
.tabbar button{min-height:56px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;border:0;border-radius:12px;background:transparent;color:var(--fg-mute);font:500 12px var(--font-ui);cursor:pointer}
.tabbar button:hover{background:var(--surface)}
.tabbar button[aria-current="page"]{color:var(--fg)}
.tabbar button[aria-current="page"] .ico{color:var(--accent)}
.layout{flex:1;width:100%;padding-bottom:calc(88px + var(--safe-b))}
.view{min-width:0;animation:entrada 180ms var(--ease-out) both}
.view-head{padding:16px 16px 0}
.evdate{display:grid;grid-template-columns:1fr 170px;align-items:center;gap:10px;padding:14px 16px 0}
.evdate label{font:500 14px var(--font-ui);color:var(--fg-dim)}
.evdate label b{display:block;font:600 16px var(--font-ui);color:var(--fg)}
.evdate .inp{min-height:44px;font-size:15px}
.stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;padding:14px 16px 0}
.stat{display:flex;flex-direction:column;gap:3px;padding:10px 12px;border-radius:12px;background:var(--surface);min-width:0}
.stat span{min-height:2.4em;font:500 12px/1.2 var(--font-ui);letter-spacing:.04em;text-transform:uppercase;color:var(--fg-mute)}
.stat b{font:600 21px/1.1 var(--font-display);font-variation-settings:"opsz" 48;color:var(--gold);font-variant-numeric:tabular-nums lining-nums;white-space:nowrap}
.stat small{font-size:13px;color:var(--fg-dim)}
.area-tabs{padding:16px 16px 10px}
.map-hint{display:flex;align-items:flex-start;gap:8px;margin:10px 16px 0;font-size:14px;color:var(--fg-mute)}
.map-hint .ico{margin-top:2px}
.state-screen{min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:24px max(16px,var(--safe-r)) 24px max(16px,var(--safe-l));text-align:center}
.state-screen .ah-wm{font-size:30px}
.state-screen .err-msg,.state-screen .banner{max-width:420px;text-align:left}
.banner{margin:0;padding:14px 16px;border-radius:var(--r-card);background:var(--surface);border:1px solid var(--line-strong);color:var(--fg-dim);font-size:15px}
@media (min-width:821px){
  .apphead{padding-inline:24px 16px}
  .tabbar{position:static;display:flex;justify-content:flex-start;gap:6px;width:100%;max-width:1280px;margin:12px auto 0;padding:0 24px;background:none;-webkit-backdrop-filter:none;backdrop-filter:none;border:0}
  .tabbar button{min-height:44px;flex-direction:row;gap:8px;padding:0 16px;border:1px solid var(--hair);border-radius:999px;font-size:14px}
  .tabbar button[aria-current="page"]{background:var(--surface-2);border-color:var(--line-strong)}
  .layout{display:grid;grid-template-columns:minmax(0,1fr) 400px;gap:24px;align-items:start;max-width:1280px;margin:0 auto;padding:16px 24px 40px}
  .view-head,.evdate,.stats,.area-tabs{padding-inline:0}
  .evdate{grid-template-columns:auto 200px;justify-content:start;column-gap:24px;padding-top:0}
  .stats{grid-template-columns:repeat(6,minmax(0,1fr))}
  .map-hint{margin-inline:0}
}
```

- [ ] **Step 12: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores; pruebas todas en verde.

- [ ] **Step 13: Captura a 390x844**

Procedimiento de captura con `http://localhost:3000/vista-previa` y el prototipo `#mapa`; nombre `T6-mapa-390`.
Criterios: (a) encabezado fijo con sello circular de borde dorado, MOREFEST en Fraunces, "Renacer · VOLTERRA", punto verde "En vivo" e ícono de salir; (b) fila "Fecha del evento" con el texto de `fmtDate` ("fecha por definir"; la tarea 10 lo pasa a "Fecha por anunciar") y el selector de fecha; (c) resumen 3 x 2 con cifras doradas: Vendido $4.595 (14 reservas), Cobrado $3.575 (78% del total), Por cobrar $1.020, Puestos libres 62 de 155, Mesas sin tocar 7 de 19, Personas dentro 14; (d) pestañas "Planta baja" / "Planta alta VIP" como control segmentado; (e) barra inferior con "Mapa" (ícono naranja) y "Reservas"; (f) nada queda tapado por la barra inferior al desplazarse al final. Cada uno PASS/FAIL. Las cifras de (c) salen de la vista previa: si no coinciden, revisa `fixture.ts` antes que `statItems`.

- [ ] **Step 14: Captura a 1280x800**

Misma URL a 1280x800; nombre `T6-mapa-1280`.
Criterios: (a) encabezado a todo el ancho; (b) pestañas "Mapa" y "Reservas" como pastillas debajo del encabezado; (c) seis cifras en una fila; (d) columna derecha de 400 px reservada para la hoja (con el marcado viejo por ahora). PASS/FAIL.

- [ ] **Step 15: Commit**

```bash
git add src/lib/ui-format.ts tests/ui.test.ts src/components/StateScreen.tsx src/components/MapView.tsx src/components/Stats.tsx src/components/Board.tsx src/components/AppShell.tsx src/components/Main.tsx src/app/globals.css
git commit -m "Encabezado con sello y MOREFEST, secciones Mapa y Reservas, resumen en dorado y pantallas de paso"
```

---

### Task 7: Mapa en papel crema

**Files:**
- Create: `src/lib/ui-map.ts`
- Modify: `tests/ui.test.ts` (import y bloque nuevo)
- Modify: `src/components/FloorMap.tsx` (se reemplaza entero)
- Modify: `src/app/globals.css` (bloque nuevo al final)

- [ ] **Step 1: Escribe las pruebas del mapa**

En `tests/ui.test.ts`, agrega debajo de `import * as ui from '../src/lib/ui-format';`:

```ts
import * as map from '../src/lib/ui-map';
```

y al final del archivo:

```ts
describe('mapa', () => {
  const mesa = (over: Partial<Parameters<typeof map.hitBox>[0] & { code: string; area: 'PB' | 'VIP'; capacity: number }> = {}) => ({
    code: 'PB-03', area: 'PB' as 'PB' | 'VIP', capacity: 4, map_x: 326, map_y: 252, map_w: 52, map_h: 52, map_rot: 0, ...over,
  });

  it('el área de toque nunca baja de 96 unidades: 44 px con el plano a 366 px', () => {
    const b = map.hitBox(mesa());
    expect(b.w).toBe(96);
    expect(b.h).toBe(96);
    expect(b.x + b.w / 2).toBe(326);
    expect(b.y + b.h / 2).toBe(252);
    expect((map.HIT_MIN * 366) / 792).toBeGreaterThanOrEqual(44);
  });
  it('una mesa larga y girada cubre su caja girada más el margen', () => {
    const b = map.hitBox(mesa({ map_x: 472, map_y: 270, map_w: 108, map_h: 30, map_rot: -22 }));
    expect(b.w).toBeCloseTo(129.37, 1);
    expect(b.h).toBe(96);
  });
  it('el anillo de selección deja 10 unidades de aire', () => {
    expect(map.ringBox(mesa({ map_x: 302, map_y: 160, map_w: 125, map_h: 34 }))).toEqual({ x: 229.5, y: 133, w: 145, h: 54 });
  });
  it('código corto, nombres y lectura para lector de pantalla', () => {
    expect(map.shortCode('PB-05')).toBe('05');
    expect(map.shortCode('VIP-06')).toBe('06');
    expect(map.kindName({ area: 'VIP' })).toBe('Sofá');
    expect(map.thisName({ area: 'VIP' })).toBe('este sofá');
    expect(map.thisName({ area: 'PB' })).toBe('esta mesa');
    expect(map.wholeName({ area: 'PB' })).toBe('Mesa entera');
    expect(map.wholeName({ area: 'VIP' })).toBe('Sofá entero');
    expect(map.tableAria(mesa(), 'part', 2)).toBe('Mesa PB-03, Parcial, 2 de 4 puestos vendidos');
  });
  it('al ampliar centra la mesa sin pasarse del borde', () => {
    const s = map.centerScroll({ map_x: 472, map_y: 270 }, 677.1, { w: 366, h: 480 });
    expect(s.left).toBeCloseTo((472 * 677.1) / 792 - 183, 3);
    expect(s.top).toBe(0);
  });
});
```

- [ ] **Step 2: Corre y mira que falle**

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL: no encuentra el módulo `../src/lib/ui-map`.

- [ ] **Step 3: Crea `src/lib/ui-map.ts`**

```ts
import { LABEL } from './logic';
import type { TableRow, TableStatus } from './types';

/** Lado mínimo del área de toque, en unidades del lienzo 792x966. Con el plano a 366 px de ancho
 *  (teléfono de 390 menos márgenes) 96 unidades son 44 px. */
export const HIT_MIN = 96;
const HIT_PAD = 18;
const RING_PAD = 10;

type Geo = Pick<TableRow, 'map_x' | 'map_y' | 'map_w' | 'map_h' | 'map_rot'>;

/** Ancho y alto del rectángulo que contiene una mesa girada. */
export function rotatedBox(t: Geo) {
  const a = (t.map_rot * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  return { w: t.map_w * c + t.map_h * s, h: t.map_w * s + t.map_h * c };
}

/** Área de toque invisible, centrada en la mesa. */
export function hitBox(t: Geo) {
  const b = rotatedBox(t);
  const w = Math.max(b.w + HIT_PAD, HIT_MIN);
  const h = Math.max(b.h + HIT_PAD, HIT_MIN);
  return { x: t.map_x - w / 2, y: t.map_y - h / 2, w, h };
}

/** Anillo de selección y de foco alrededor de la mesa. */
export function ringBox(t: Geo) {
  const b = rotatedBox(t);
  return { x: t.map_x - b.w / 2 - RING_PAD, y: t.map_y - b.h / 2 - RING_PAD, w: b.w + 2 * RING_PAD, h: b.h + 2 * RING_PAD };
}

/** "PB-05" se dibuja "05": la planta ya está en la pestaña. */
export const shortCode = (code: string) => code.replace(/^(PB|VIP)-/, '');

/** En VIP solo se venden sofás de patrocinadores; en planta baja, mesas y la barra. */
export const kindName = (t: Pick<TableRow, 'area'>) => (t.area === 'VIP' ? 'Sofá' : 'Mesa');
export const thisName = (t: Pick<TableRow, 'area'>) => (t.area === 'VIP' ? 'este sofá' : 'esta mesa');
export const wholeName = (t: Pick<TableRow, 'area'>) => (t.area === 'VIP' ? 'Sofá entero' : 'Mesa entera');

export function tableAria(t: Pick<TableRow, 'area' | 'code' | 'capacity'>, s: TableStatus, sold: number) {
  return `${kindName(t)} ${t.code}, ${LABEL[s]}, ${sold} de ${t.capacity} puestos vendidos`;
}

/** Desplazamiento que deja la mesa en el centro del contenedor del plano ampliado. */
export function centerScroll(t: Pick<TableRow, 'map_x' | 'map_y'>, svgWidthPx: number, view: { w: number; h: number }) {
  const k = svgWidthPx / 792;
  return { left: Math.max(0, t.map_x * k - view.w / 2), top: Math.max(0, t.map_y * k - view.h / 2) };
}
```

- [ ] **Step 4: Corre y mira que pase**

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  10 passed (10)`.

- [ ] **Step 5: Reemplaza `src/components/FloorMap.tsx`**

```tsx
'use client';

import { useRef, useState } from 'react';
import { LABEL, soldSeats, tableStatus } from '@/lib/logic';
import type { AreaCode, Reservation, TableRow, TableStatus } from '@/lib/types';
import { centerScroll, hitBox, ringBox, shortCode, tableAria } from '@/lib/ui-map';
import { Icon } from './Icon';

const ORDER: TableStatus[] = ['free', 'part', 'held', 'paid', 'in'];

interface Props {
  area: AreaCode;
  tables: TableRow[];
  reservations: Reservation[];
  selected: string | null;
  onPick: (t: TableRow) => void;
}

/** Plano en papel crema. Cada estado se distingue por trazo o trama además del color (leyenda arriba).
 *  Debajo de cada mesa hay un área de toque invisible de al menos 44 px; la lupa amplía el plano al 185%. */
export function FloorMap({ area, tables, reservations, selected, onPick }: Props) {
  const [zoom, setZoom] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const list = tables.filter((t) => t.area === area);

  function toggleZoom() {
    const on = !zoom;
    setZoom(on);
    const t = list.find((x) => x.id === selected);
    if (!on || !t) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.setTimeout(
      () => {
        const box = scroller.current;
        const plan = svg.current;
        if (!box || !plan) return;
        box.scrollTo({ ...centerScroll(t, plan.clientWidth, { w: box.clientWidth, h: box.clientHeight }), behavior: reduce ? 'auto' : 'smooth' });
      },
      reduce ? 0 : 260,
    );
  }

  function onKey(e: React.KeyboardEvent, t: TableRow) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPick(t);
    }
  }

  return (
    <div className={`map-paper${zoom ? ' zoomed' : ''}`}>
      <ul className="legend" aria-label="Leyenda del plano">
        {ORDER.map((s) => (
          <li key={s}>
            <svg viewBox="0 0 22 14" aria-hidden="true">
              <rect className={`lg-${s}`} x="2" y="2" width="18" height="10" rx="2" />
            </svg>
            {LABEL[s]}
          </li>
        ))}
      </ul>
      <div className="map-scroll" ref={scroller}>
        <svg
          ref={svg}
          className="map-svg"
          viewBox="0 0 792 966"
          role="group"
          aria-label={
            area === 'PB'
              ? 'Plano de la planta baja. Toca una mesa para ver sus reservas.'
              : 'Plano de la planta alta VIP: tres sofás de patrocinadores; el resto es zona de artistas. Toca un sofá para ver sus reservas.'
          }
        >
          <defs>
            <pattern id="hatch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="12" height="12" style={{ fill: 'var(--paper-2)' }} />
              <rect width="3.5" height="12" style={{ fill: 'var(--ink-2)' }} />
            </pattern>
            <pattern id="hatch-lg" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="4" height="4" style={{ fill: 'var(--paper-2)' }} />
              <rect width="1.4" height="4" style={{ fill: 'var(--ink-2)' }} />
            </pattern>
            <pattern id="dots" width="10" height="10" patternUnits="userSpaceOnUse">
              <rect width="10" height="10" style={{ fill: 'var(--paper)' }} />
              <circle cx="5" cy="5" r="2.2" style={{ fill: 'var(--map-part)' }} />
            </pattern>
            <pattern id="dots-lg" width="4" height="4" patternUnits="userSpaceOnUse">
              <rect width="4" height="4" style={{ fill: 'var(--paper)' }} />
              <circle cx="2" cy="2" r="1" style={{ fill: 'var(--map-part)' }} />
            </pattern>
          </defs>
          <rect className="paper-bg" width="792" height="966" />
          <image className="map-img" href={`/plano-${area.toLowerCase()}.jpg`} x="0" y="0" width="792" height="966" preserveAspectRatio="none" />
          <g aria-hidden="true">
            {list.map((t) => {
              const b = hitBox(t);
              return <rect key={t.id} className="t-hit" x={b.x} y={b.y} width={b.w} height={b.h} rx={10} onClick={() => onPick(t)} />;
            })}
          </g>
          <g>
            {list.map((t) => {
              const s = tableStatus(t, reservations);
              const sold = soldSeats(t.id, reservations);
              const ring = ringBox(t);
              const sel = selected === t.id;
              return (
                <g
                  key={t.id}
                  className={`tbl t-${s}${sel ? ' is-sel' : ''}`}
                  role="button"
                  tabIndex={0}
                  aria-label={tableAria(t, s, sold)}
                  aria-current={sel ? 'true' : undefined}
                  onClick={() => onPick(t)}
                  onKeyDown={(e) => onKey(e, t)}
                >
                  <rect className="t-ring" x={ring.x} y={ring.y} width={ring.w} height={ring.h} rx={12} />
                  <g transform={`rotate(${t.map_rot} ${t.map_x} ${t.map_y})`}>
                    {t.shape === 'c' ? (
                      <ellipse className="t-shape" cx={t.map_x} cy={t.map_y} rx={t.map_w / 2} ry={t.map_h / 2} />
                    ) : (
                      <rect className="t-shape" x={t.map_x - t.map_w / 2} y={t.map_y - t.map_h / 2} width={t.map_w} height={t.map_h} rx={6} />
                    )}
                  </g>
                  <text className="t-label" x={t.map_x} y={t.map_y - 9}>
                    {shortCode(t.code)}
                  </text>
                  <text className="t-count" x={t.map_x} y={t.map_y + 13}>
                    {sold}/{t.capacity}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      <button type="button" className="zoom-btn" aria-pressed={zoom} aria-label={zoom ? 'Reducir el plano' : 'Ampliar el plano'} onClick={toggleZoom}>
        <Icon name={zoom ? 'zoomout' : 'zoomin'} size="lg" />
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Agrega al final de `src/app/globals.css`**

```css
/* ---------- mapa en papel crema: estados por trazo y trama además del color ---------- */
.map-paper{position:relative;margin:0 12px;border-radius:14px;background:var(--paper);color:var(--ink);overflow:hidden;isolation:isolate;box-shadow:0 10px 30px var(--shadow-deep)}
.map-paper::after{content:"";position:absolute;inset:0;pointer-events:none;background-image:var(--grain-paper);background-size:180px;opacity:.18;mix-blend-mode:multiply}
.legend{list-style:none;margin:0;padding:10px 12px 4px;display:flex;flex-wrap:wrap;gap:6px 12px;font:500 13px var(--font-ui);color:var(--ink-2);position:relative;z-index:2}
.legend li{display:flex;align-items:center;gap:6px}
.legend svg{width:22px;height:14px}
.map-scroll{position:relative;overflow:auto;max-height:min(480px,62dvh);overscroll-behavior:contain;scrollbar-width:thin}
.map-svg{display:block;width:100%;height:auto;transition:width 240ms var(--ease-out)}
.map-paper.zoomed .map-svg{width:185%}
.map-img{mix-blend-mode:multiply}
@supports not (mix-blend-mode:multiply){.map-img{filter:sepia(.25)}}
.zoom-btn{position:absolute;right:8px;bottom:8px;z-index:3;width:48px;height:48px;border-radius:12px;border:1px solid var(--ink-2);background:var(--paper);color:var(--ink);display:grid;place-items:center;cursor:pointer;box-shadow:0 4px 12px var(--shadow-deep)}
.zoom-btn:focus-visible{outline-color:var(--ink)}
.paper-bg{fill:var(--paper)}
.t-hit{fill:transparent;cursor:pointer}
.tbl{cursor:pointer;outline:none}
.t-shape{stroke-width:3}
.t-free .t-shape{fill:var(--map-free-wash);stroke:var(--map-free)}
.t-part .t-shape{fill:var(--map-part-wash);stroke:var(--map-part);stroke-dasharray:9 6}
.t-held .t-shape{fill:url(#dots);stroke:var(--map-part);stroke-width:3.5}
.t-paid .t-shape{fill:url(#hatch);stroke:var(--ink-2);stroke-width:2.5}
.t-in .t-shape{fill:var(--ink);stroke:var(--ink)}
.t-label{font:600 22px var(--font-ui);fill:var(--ink);stroke:var(--paper);stroke-width:6px;paint-order:stroke;text-anchor:middle;dominant-baseline:central;pointer-events:none}
.t-count{font:500 16px var(--font-mono);fill:var(--ink-2);stroke:var(--paper);stroke-width:5px;paint-order:stroke;text-anchor:middle;dominant-baseline:central;pointer-events:none}
.t-in .t-label,.t-in .t-count{fill:var(--paper);stroke:var(--ink)}
.t-ring{fill:none;stroke:none}
.is-sel .t-ring{stroke:var(--map-sel);stroke-width:5}
.tbl:focus-visible .t-ring{stroke:var(--ink);stroke-width:3;stroke-dasharray:7 5}
.lg-free{fill:var(--map-free-wash);stroke:var(--map-free);stroke-width:2}
.lg-part{fill:var(--map-part-wash);stroke:var(--map-part);stroke-width:2;stroke-dasharray:4 3}
.lg-held{fill:url(#dots-lg);stroke:var(--map-part);stroke-width:2}
.lg-paid{fill:url(#hatch-lg);stroke:var(--ink-2);stroke-width:1.5}
.lg-in{fill:var(--ink);stroke:var(--ink);stroke-width:1.5}
@media (min-width:821px){
  .map-paper{margin:0}
  .map-scroll{max-height:none}
  .map-paper.zoomed .map-scroll{max-height:calc(100dvh - 140px)}
}
```

- [ ] **Step 7: Tipos y pruebas**

Run: `npm run typecheck && npm test`
Expected: sin errores; pruebas todas en verde.

- [ ] **Step 8: Captura a 390x844**

Procedimiento de captura con `http://localhost:3000/vista-previa` y el prototipo `#mapa`; desplázate hasta el plano (`browser_evaluate` con `document.querySelector('.map-paper').scrollIntoView()`) en los dos; nombre `T7-plano-390`.
Criterios: (a) plano sobre papel crema con grano, el croquis multiplicado sin fondo blanco; (b) leyenda con cinco muestras: Disponible (verde lavado), Parcial (naranja discontinuo), Reservada (puntos), Pagada (rayado diagonal), Ocupada (tinta sólida); (c) PB-02 y PB-07 en tinta sólida con números crema; PB-10 y PB-16 discontinuos; PB-01, PB-08 y PB-12 rayados; PB-04, PB-05 y PB-14 con puntos; (d) número corto arriba y "vendidos/capacidad" en mono debajo; (e) botón de lupa abajo a la derecha. Cada uno PASS/FAIL.

- [ ] **Step 9: Toque, zoom y teclado**

Con Playwright a 390x844: `browser_click` en el elemento con nombre "Mesa PB-05, Reservada, 10 de 10 puestos vendidos" (en esta tarea la hoja vieja aparece en la columna; basta con que el anillo ámbar rodee PB-05). Luego `browser_click` en "Ampliar el plano": el plano crece y PB-05 queda a la vista dentro del recuadro. Luego `browser_press_key` `Tab` hasta una mesa: aparece el anillo de tinta discontinuo; `Enter` la selecciona. Pestaña "Planta alta VIP": se ven VIP-05 (rayado), VIP-06 (puntos) y VIP-07 (libre) paralelos a la baranda.
Expected: los cuatro comportamientos PASS.

- [ ] **Step 10: Commit**

```bash
git add src/lib/ui-map.ts tests/ui.test.ts src/components/FloorMap.tsx src/app/globals.css
git commit -m "Mapa en papel crema: estados por trama y trazo con leyenda, toque de 44 px, anillo de selección y lupa"
```

---

### Task 8: Hoja de la mesa (hoja inferior en el celular, columna en escritorio)

**Files:**
- Modify: `src/lib/ui-format.ts` (import y funciones nuevas)
- Modify: `tests/ui.test.ts` (bloque nuevo)
- Create: `src/components/useMedia.ts`
- Create: `src/components/Toast.tsx`
- Create: `src/components/PriceBlock.tsx`
- Create: `src/components/ReservationCard.tsx`
- Create: `src/components/NewReservation.tsx`
- Modify: `src/components/Panel.tsx` (se reemplaza entero)
- Modify: `src/components/Board.tsx` (se reemplaza entero)
- Modify: `src/app/globals.css` (bloque nuevo al final)

Solo vestido: mismas acciones que hoy (precios, pago, llegada, cancelar, nueva reserva). Correo, confirmación y reverso llegan en la Parte 2.

- [ ] **Step 1: Escribe las pruebas de la hoja**

Al final de `tests/ui.test.ts`:

```ts
describe('hoja de la mesa', () => {
  it('estado de reserva en palabras de la puerta', () => {
    expect(ui.RES_LABEL).toEqual({ held: 'Con saldo', paid: 'Pagada', in: 'Llegó' });
  });
  it('barra de puestos: primero los que llegaron, luego vendidos, luego libres', () => {
    expect(ui.seatBar(5, 3, 1)).toEqual(['in', 'on', 'on', '', '']);
    expect(ui.seatBar(2, 0, 0)).toEqual(['', '']);
  });
  it('los abonos se numeran sin contar los reversos', () => {
    expect(ui.payLabels([{ kind: 'payment' }, { kind: 'reversal' }, { kind: 'payment' }])).toEqual(['Abono 1', 'Reverso', 'Abono 2']);
  });
});
```

- [ ] **Step 2: Corre y mira que falle**

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL en "hoja de la mesa": `ui.seatBar is not a function` (y `RES_LABEL` undefined).

- [ ] **Step 3: Agrega las funciones a `src/lib/ui-format.ts`**

Agrega como primera línea del archivo, antes del comentario:

```ts
import type { ResStatus } from './types';
```

y al final del archivo:

```ts
/** Métodos de pago que acepta Alejandro, en el orden en que más los usa. */
export const METHODS = ['Efectivo', 'Zelle', 'Pago móvil', 'Transferencia'];

/** Estado de una reserva en palabras de la puerta. */
export const RES_LABEL: Record<ResStatus, string> = { held: 'Con saldo', paid: 'Pagada', in: 'Llegó' };

/** Barra de puestos de la hoja: primero los que llegaron, luego los vendidos, luego los libres. */
export function seatBar(capacity: number, sold: number, inSeats: number): ('in' | 'on' | '')[] {
  return Array.from({ length: capacity }, (_, i) => (i < inSeats ? 'in' : i < sold ? 'on' : ''));
}

/** Nombre de cada movimiento: los abonos se numeran solos, los reversos no cuentan. */
export function payLabels(payments: { kind: 'payment' | 'reversal' }[]): string[] {
  let n = 0;
  return payments.map((p) => (p.kind === 'reversal' ? 'Reverso' : `Abono ${++n}`));
}
```

- [ ] **Step 4: Corre y mira que pase**

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  13 passed (13)`.

- [ ] **Step 5: Crea `src/components/useMedia.ts`**

```ts
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
```

- [ ] **Step 6: Crea `src/components/Toast.tsx`**

```tsx
'use client';

import { useEffect } from 'react';
import type { Msg } from './actions';
import { Icon } from './Icon';

/** Aviso flotante: se anuncia por aria-live sin robar el foco; 4 s si salió bien, 7 s si hubo error. */
export function Toast({ msg, onDone }: { msg: Msg | null; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onDone, msg.err ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [msg, onDone]);

  return (
    <div className={`toast${msg ? ' show' : ''}${msg?.err ? ' err' : ''}`} role="status" aria-live="polite">
      {msg && (
        <>
          <Icon name={msg.err ? 'alert' : 'info'} />
          <span>{msg.text}</span>
          <button type="button" className="toast-x" aria-label="Cerrar aviso" onClick={onDone}>
            <Icon name="x" size="sm" />
          </button>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 7: Crea `src/components/PriceBlock.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { money } from '@/lib/logic';
import type { TableRow } from '@/lib/types';
import { wholeName } from '@/lib/ui-map';
import type { Actions } from './actions';

interface Props {
  table: TableRow;
  sp: number | null;
  busy: boolean;
  onSave: Actions['savePrices'];
}

/** Precios de la mesa: se leen de un vistazo y se editan a pedido. */
export function PriceBlock({ table, sp, busy, onSave }: Props) {
  const [edit, setEdit] = useState(false);
  const [price, setPrice] = useState(table.price?.toString() ?? '');
  const [seat, setSeat] = useState(table.seat_price?.toString() ?? '');
  const hint = table.price ? (table.price / table.capacity).toFixed(2) : 'Por definir';

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (await onSave(table, Number(price) > 0 ? Number(price) : null, Number(seat) > 0 ? Number(seat) : null)) setEdit(false);
  }

  return (
    <section className="m-block" aria-labelledby="h-precios">
      <h3 className="h3" id="h-precios">
        Precios
      </h3>
      {edit ? (
        <form className="stack" onSubmit={submit}>
          <div className="grid2">
            <div className="field">
              <label htmlFor="pr-mesa">{wholeName(table)}</label>
              <div className="money">
                <span className="unit">$</span>
                <input className="inp" id="pr-mesa" type="number" inputMode="decimal" min="0" step="0.01" value={price} placeholder="Por definir" onChange={(e) => setPrice(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="pr-puesto">Por puesto</label>
              <div className="money">
                <span className="unit">$</span>
                <input className="inp" id="pr-puesto" type="number" inputMode="decimal" min="0" step="0.01" value={seat} placeholder={hint} onChange={(e) => setSeat(e.target.value)} />
              </div>
            </div>
          </div>
          <p className="help">Si dejas el puesto vacío, se calcula dividiendo el total entre los puestos.</p>
          <div className="row2">
            <button type="button" className="btn btn-secondary" onClick={() => setEdit(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              Guardar precios
            </button>
          </div>
        </form>
      ) : (
        <>
          <p className="kv">
            <span>{wholeName(table)}</span>
            <b>{table.price ? money(table.price) : 'Por definir'}</b>
          </p>
          <p className="kv">
            <span>Por puesto</span>
            <b>
              {sp === null ? 'Por definir' : money(sp)}
              {sp !== null && <small> {table.seat_price !== null ? '(fijado)' : '(total ÷ puestos)'}</small>}
            </b>
          </p>
          <button type="button" className="btn btn-ghost btn-inline" onClick={() => setEdit(true)}>
            Editar precios
          </button>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 8: Crea `src/components/ReservationCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { balance, money, paid, resStatus } from '@/lib/logic';
import type { Reservation } from '@/lib/types';
import { METHODS, RES_LABEL, payLabels, plural } from '@/lib/ui-format';
import type { Actions } from './actions';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';

interface Props {
  r: Reservation;
  busy: boolean;
  actions: Actions;
}

/** Una reserva dentro de la hoja: montos, movimientos, cobro, llegada y cancelación. */
export function ReservationCard({ r, busy, actions }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [amount, setAmount] = useState(balance(r).toFixed(2));
  const [method, setMethod] = useState(METHODS[0]);
  const [payError, setPayError] = useState('');
  const bal = balance(r);
  const s = resStatus(r);
  const labels = payLabels(r.payments);

  async function submitPay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Number(amount);
    if (!(v > 0)) return setPayError('Escribe un monto mayor a cero.');
    if (v > bal + 0.001) return setPayError(`El monto pasa el saldo de ${money(bal)}.`);
    setPayError('');
    if (await actions.pay(r, v, method)) setAmount('');
  }

  return (
    <article className="res" aria-labelledby={`rn-${r.id}`}>
      <header className="res-head">
        <div>
          <h4 className="res-name" id={`rn-${r.id}`}>
            {r.name}
          </h4>
          <p className="res-meta">
            {plural(r.guests, 'puesto', 'puestos')} · <span className="nowrap">{r.phone || 'sin WhatsApp'}</span>
          </p>
        </div>
        <div className="res-right">
          <StatusPill status={s} label={RES_LABEL[s]} />
          <code className="res-code">{r.code}</code>
        </div>
      </header>

      <dl className="res-money">
        <div>
          <dt>Total</dt>
          <dd>{money(r.total_price)}</dd>
        </div>
        <div>
          <dt>Pagado</dt>
          <dd>{money(paid(r))}</dd>
        </div>
        <div>
          <dt>Saldo</dt>
          <dd className={bal > 0 ? 'due' : undefined}>{money(bal)}</dd>
        </div>
      </dl>

      {r.payments.length ? (
        <ul className="pays" aria-label="Movimientos de pago">
          {r.payments.map((p, i) => (
            <li className={`pay${p.kind === 'reversal' ? ' rev' : ''}`} key={p.id}>
              <span className="pay-l">
                <b>
                  {p.kind === 'reversal' && <Icon name="undo" size="sm" />}
                  {labels[i]}
                </b>
                <small>{p.method}</small>
              </span>
              <span className="pay-a">{money(p.amount)}</span>
              <span />
            </li>
          ))}
        </ul>
      ) : (
        <p className="help">Sin abonos todavía.</p>
      )}

      {bal > 0 && (
        <form className="subform" noValidate onSubmit={submitPay}>
          <div className="grid2">
            <div className="field">
              <label htmlFor={`pay-amt-${r.id}`}>Monto</label>
              <div className="money">
                <span className="unit">$</span>
                <input
                  className="inp"
                  id={`pay-amt-${r.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={payError ? true : undefined}
                  aria-describedby={payError ? `pay-err-${r.id}` : undefined}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`pay-met-${r.id}`}>Método</label>
              <div className="sel-wrap">
                <select className="inp" id={`pay-met-${r.id}`} value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <Icon name="down" />
              </div>
            </div>
          </div>
          {payError && (
            <p className="err-msg" id={`pay-err-${r.id}`} role="alert">
              <Icon name="alert" size="sm" />
              <span>{payError}</span>
            </p>
          )}
          <button type="submit" className="btn btn-secondary btn-block" disabled={busy}>
            Registrar pago
          </button>
        </form>
      )}

      <div className="res-act">
        {r.checked_in !== null ? (
          <span className="pill st-in">
            <Icon name="users" />
            Ingreso confirmado
          </span>
        ) : (
          <button type="button" className="btn btn-ok" disabled={busy} onClick={() => actions.checkIn(r)}>
            <Icon name="check" />
            Confirmar llegada
          </button>
        )}
        {confirm ? (
          <>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={async () => {
                await actions.cancel(r);
                setConfirm(false);
              }}
            >
              Sí, liberar puestos
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>
              No
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-quiet-danger" disabled={busy} onClick={() => setConfirm(true)}>
            Cancelar reserva
          </button>
        )}
      </div>

      {r.checked_in === null && bal > 0 && (
        <p className="res-note">
          <Icon name="info" />
          <span>Debe {money(bal)}. Se puede dejar entrar; queda el aviso.</span>
        </p>
      )}
    </article>
  );
}
```

- [ ] **Step 9: Crea `src/components/NewReservation.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { TableRow } from '@/lib/types';
import { METHODS, plural } from '@/lib/ui-format';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  table: TableRow;
  free: number;
  sp: number | null;
  busy: boolean;
  onReserve: Actions['reserve'];
}

/** Nueva reserva: mesa entera o por puestos, con selector de puestos de 48 px. */
export function NewReservation({ table, free, sp, busy, onReserve }: Props) {
  const [seats, setSeats] = useState(free);
  const [total, setTotal] = useState(sp ? (sp * free).toFixed(2) : '');
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState('');
  const [nameMissing, setNameMissing] = useState(false);

  function changeSeats(v: number) {
    const n = Math.min(free, Math.max(1, v));
    setSeats(n);
    if (!edited && sp) setTotal((sp * n).toFixed(2));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name')).trim();
    const deposit = Number(f.get('deposit')) || 0;
    const t = Number(total) || 0;
    setNameMissing(!name);
    if (!name) return setError('Escribe el nombre del cliente.');
    if (!(seats >= 1) || seats > free) return setError(`Solo quedan ${free} puestos libres.`);
    if (deposit > t) return setError('El anticipo no puede ser mayor al total.');
    setError('');
    await onReserve(table, { name, phone: String(f.get('phone')).trim(), guests: seats, total: t, deposit, method: String(f.get('method')) });
  }

  return (
    <section className="m-block" aria-labelledby="h-new">
      <div className="m-row">
        <h3 className="h3" id="h-new">
          Nueva reserva
        </h3>
        <span className="muted">{free} libres</span>
      </div>
      <p className="help">Se vende completa o por puestos; admite varias reservas hasta llenarse.</p>
      <form className="stack" noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor="nr-name">
            Cliente <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            className="inp"
            id="nr-name"
            name="name"
            autoComplete="off"
            required
            aria-invalid={nameMissing || undefined}
            aria-describedby={error ? 'nr-err' : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="nr-phone">WhatsApp</label>
          <input className="inp" id="nr-phone" name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="+58 4xx xxx xxxx" />
        </div>
        <div className="nr-seats">
          <span className="lbl-txt" id="nr-seats-l">
            Puestos
          </span>
          <div className="stepper" role="group" aria-labelledby="nr-seats-l">
            <button type="button" className="step-btn" aria-label="Quitar un puesto" disabled={seats <= 1} onClick={() => changeSeats(seats - 1)}>
              <Icon name="minus" />
            </button>
            <output aria-live="polite">{seats}</output>
            <button type="button" className="step-btn" aria-label="Agregar un puesto" disabled={seats >= free} onClick={() => changeSeats(seats + 1)}>
              <Icon name="plus" />
            </button>
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="nr-total">Precio total</label>
            <div className="money">
              <span className="unit">$</span>
              <input
                className="inp"
                id="nr-total"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={total}
                placeholder="0.00"
                onChange={(e) => {
                  setTotal(e.target.value);
                  setEdited(true);
                }}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="nr-dep">Anticipo</label>
            <div className="money">
              <span className="unit">$</span>
              <input className="inp" id="nr-dep" name="deposit" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={0} />
            </div>
          </div>
          <div className="field full">
            <label htmlFor="nr-met">Método del anticipo</label>
            <div className="sel-wrap">
              <select className="inp" id="nr-met" name="method">
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <Icon name="down" />
            </div>
          </div>
        </div>
        {error && (
          <p className="err-msg" id="nr-err" role="alert">
            <Icon name="alert" size="sm" />
            <span>{error}</span>
          </p>
        )}
        {sp === null && <p className="help">El precio aún no está definido: escribe el total a mano.</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          Reservar {plural(seats, 'puesto', 'puestos')}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 10: Reemplaza `src/components/Panel.tsx`**

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { LABEL, forTable, seatPrice, soldSeats, tableStatus } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';
import { plural, seatBar } from '@/lib/ui-format';
import { kindName, thisName } from '@/lib/ui-map';
import type { Actions } from './actions';
import { Icon } from './Icon';
import { NewReservation } from './NewReservation';
import { PriceBlock } from './PriceBlock';
import { ReservationCard } from './ReservationCard';
import { StatusPill } from './StatusPill';

interface Props {
  table: TableRow | null;
  reservations: Reservation[];
  actions: Actions;
  busy: boolean;
  /** Celular: hoja inferior modal sobre la sección. Escritorio: columna fija a la derecha. */
  modal: boolean;
  onClose: () => void;
}

/** Hoja de la mesa. En el celular toma el foco, se cierra con Escape, con la X o tocando fuera, y devuelve el foco a la mesa. */
export function Panel({ table, reservations, actions, busy, modal, onClose }: Props) {
  const title = useRef<HTMLHeadingElement>(null);
  const tableId = table?.id ?? null;

  useEffect(() => {
    if (!tableId || !modal) return;
    const before = document.activeElement as HTMLElement | null;
    title.current?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      if (before?.isConnected) before.focus?.({ preventScroll: true });
    };
  }, [tableId, modal, onClose]);

  if (!table) {
    if (modal) return null;
    return (
      <aside className="sheet sheet-empty" aria-label="Hoja de la mesa">
        <h2 className="h3">Ninguna mesa abierta</h2>
        <p className="help">Toca una mesa del plano, o una reserva de la lista, para ver sus puestos, cobrar o reservar.</p>
      </aside>
    );
  }

  const list = forTable(table.id, reservations);
  const sold = soldSeats(table.id, reservations);
  const free = table.capacity - sold;
  const status = tableStatus(table, reservations);
  const sp = seatPrice(table);
  const inSeats = list.reduce((n, r) => n + (r.checked_in !== null ? r.guests : 0), 0);

  return (
    <>
      {modal && <div className="scrim" onClick={onClose} aria-hidden="true" />}
      <aside className="sheet" role={modal ? 'dialog' : 'region'} aria-modal={modal || undefined} aria-labelledby="sheet-title">
        <div className="sheet-head">
          <div>
            <h2 className="sheet-title" id="sheet-title" tabIndex={-1} ref={title}>
              {kindName(table)} {table.code}
            </h2>
            <span className="sub">
              {table.area === 'PB' ? 'Planta baja' : 'Planta alta VIP'} · {plural(table.capacity, 'puesto', 'puestos')}
            </span>
          </div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar la hoja">
            <Icon name="x" size="lg" />
          </button>
        </div>

        <div className="m-sum">
          <div className="m-sum-row">
            <StatusPill status={status} label={LABEL[status]} />
            <p>
              <b>{sold}</b> vendidos · <b>{free}</b> libres de {table.capacity}
            </p>
          </div>
          <div className="seatbar" role="img" aria-label={`${sold} de ${table.capacity} puestos vendidos, ${inSeats} con llegada confirmada`}>
            {seatBar(table.capacity, sold, inSeats).map((c, i) => (
              <i key={i} className={c || undefined} />
            ))}
          </div>
        </div>

        <PriceBlock key={`${table.id}-${table.price}-${table.seat_price}`} table={table} sp={sp} busy={busy} onSave={actions.savePrices} />

        {list.length > 0 && (
          <>
            <div className="m-h">
              <h3 className="h3">Reservas de {thisName(table)}</h3>
              <span className="muted">{list.length}</span>
            </div>
            {list.map((r) => (
              <ReservationCard key={r.id} r={r} busy={busy} actions={actions} />
            ))}
          </>
        )}

        {free > 0 ? (
          <NewReservation key={`${table.id}-${sold}`} table={table} free={free} sp={sp} busy={busy} onReserve={actions.reserve} />
        ) : (
          <p className="free-note">No quedan puestos libres en {thisName(table)}.</p>
        )}
      </aside>
    </>
  );
}
```

- [ ] **Step 11: Reemplaza `src/components/Board.tsx`**

```tsx
'use client';

import { useCallback, useState } from 'react';
import type { Snapshot } from '@/lib/data';
import type { AreaCode, TableRow } from '@/lib/types';
import { placeName } from '@/lib/ui-format';
import type { Actions, Msg } from './actions';
import { Icon, type IconName } from './Icon';
import { MapView } from './MapView';
import { Panel } from './Panel';
import { ReservationList } from './ReservationList';
import { Toast } from './Toast';
import { useIsMobile } from './useMedia';

export type View = 'mapa' | 'reservas';

const VIEWS: [View, string, IconName][] = [
  ['mapa', 'Mapa', 'map'],
  ['reservas', 'Reservas', 'list'],
];

export interface BoardProps {
  snap: Snapshot;
  email: string;
  live: boolean;
  busy: boolean;
  msg: Msg | null;
  actions: Actions;
  onSaveDate: (value: string) => void;
  onSignOut: () => void;
  onDismissMsg: () => void;
}

/** Panel de Alejandro: encabezado con sello, secciones (barra inferior en el celular, pestañas en escritorio),
 *  hoja de la mesa (hoja inferior o columna) y aviso flotante. */
export function Board({ snap, email, live, busy, msg, actions, onSaveDate, onSignOut, onDismissMsg }: BoardProps) {
  const [view, setView] = useState<View>('mapa');
  const [area, setArea] = useState<AreaCode>('PB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mobile = useIsMobile();
  const selected = snap.tables.find((t) => t.id === selectedId) ?? null;
  const close = useCallback(() => setSelectedId(null), []);

  function pick(t: TableRow) {
    setArea(t.area);
    setSelectedId(t.id);
  }
  function changeArea(a: AreaCode) {
    setArea(a);
    setSelectedId(null);
  }

  return (
    <div className="app">
      <header className="apphead">
        <img className="ah-seal" src="/brand/sello-morella.jpg" alt="" width={40} height={40} />
        <div className="ah-title">
          <h1 className="ah-wm">MOREFEST</h1>
          <p className="ah-sub">Renacer · {placeName(null)}</p>
        </div>
        <span className={`live${live ? '' : ' off'}`}>
          <i aria-hidden="true" />
          {live ? 'En vivo' : 'Sin conexión'}
        </span>
        <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Salir" title={`Salir (${email})`}>
          <Icon name="logout" />
        </button>
      </header>
      <nav className="tabbar" aria-label="Secciones">
        {VIEWS.map(([v, label, icon]) => (
          <button key={v} type="button" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </nav>
      <div className="layout">
        <main className="view" key={view}>
          {view === 'mapa' && (
            <MapView snap={snap} area={area} onArea={changeArea} selectedId={selectedId} onPick={pick} onSaveDate={onSaveDate} />
          )}
          {view === 'reservas' && <ReservationList tables={snap.tables} reservations={snap.reservations} onPick={pick} />}
        </main>
        <Panel table={selected} reservations={snap.reservations} actions={actions} busy={busy} modal={mobile} onClose={close} />
      </div>
      <Toast msg={msg} onDone={onDismissMsg} />
    </div>
  );
}
```

- [ ] **Step 12: Agrega al final de `src/app/globals.css`**

```css
/* ---------- hoja de la mesa: hoja inferior en el celular, columna en escritorio ---------- */
.scrim{position:fixed;inset:0;z-index:25;background:var(--scrim);animation:entrada 180ms var(--ease-out) both}
.sheet{position:fixed;left:0;right:0;bottom:0;z-index:30;max-height:88dvh;overflow-y:auto;overscroll-behavior:contain;padding-bottom:calc(20px + var(--safe-b));border-radius:20px 20px 0 0;background:var(--bg);border-top:1px solid var(--hair);box-shadow:0 -12px 40px var(--shadow-deep);animation:sube 240ms var(--ease-out) both}
.sheet-head{position:sticky;top:0;z-index:2;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:8px;padding:8px 6px 8px 16px;background:var(--bg);border-bottom:1px solid var(--hair);border-radius:20px 20px 0 0}
.sheet-title{margin:0;font:600 22px/1.15 var(--font-display);font-variation-settings:"opsz" 48,"SOFT" 50;outline:none}
.sheet-empty{display:none}
.m-sum{display:flex;flex-direction:column;gap:10px;padding:16px}
.m-sum-row{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}
.m-sum p{margin:0;font-size:15px;color:var(--fg-dim)}
.m-sum p b{color:var(--fg);font-weight:600;font-variant-numeric:tabular-nums}
.seatbar{display:flex;gap:3px;height:10px}
.seatbar i{flex:1;border-radius:2px;background:var(--surface-2);border:1px solid var(--hair)}
.seatbar i.on{background:var(--gold);border-color:var(--gold)}
.seatbar i.in{background:var(--fg-dim);border-color:var(--fg-dim)}
.m-block{display:flex;flex-direction:column;gap:12px;margin:0 16px 14px;padding:14px;border-radius:var(--r-card);background:var(--surface)}
.m-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.kv{display:flex;justify-content:space-between;gap:10px;margin:0;font-size:15px;color:var(--fg-dim)}
.kv b{color:var(--fg);font-weight:600;font-variant-numeric:tabular-nums;text-align:right}
.kv small{color:var(--fg-mute);font-weight:400}
.m-h{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:8px 16px 10px}
.res{display:flex;flex-direction:column;gap:12px;margin:0 16px 12px;padding:14px;border-radius:var(--r-card);background:var(--surface);border:1px solid var(--hair)}
.res-head{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;align-items:start}
.res-name{margin:0;font:600 17px/1.25 var(--font-ui)}
.res-meta{margin:2px 0 0;font-size:14px;color:var(--fg-mute)}
.res-right{display:flex;flex-direction:column;align-items:flex-end;gap:6px}
.res-code{font:500 14px var(--font-mono);letter-spacing:.06em;color:var(--fg-dim)}
.res-money{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:0;padding:10px 0;border-block:1px solid var(--hair)}
.res-money dt{font:500 12px var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--fg-mute)}
.res-money dd{margin:2px 0 0;font:600 17px var(--font-ui);font-variant-numeric:tabular-nums}
.res-money dd.due{color:var(--gold)}
.pays{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.pay{display:grid;grid-template-columns:minmax(0,1fr) auto auto;align-items:center;gap:6px;min-height:44px;font-size:14px;color:var(--fg-dim);border-bottom:1px dashed var(--hair)}
.pay:last-child{border-bottom:0}
.pay b{color:var(--fg);font-weight:600}
.pay-a{font:500 15px var(--font-mono);color:var(--fg);font-variant-numeric:tabular-nums}
.pay.rev .pay-a{color:var(--err)}
.pay.rev .ico{color:var(--err)}
.pay-l{display:flex;flex-direction:column;gap:1px;padding-block:6px;min-width:0}
.pay-l b{display:inline-flex;align-items:center;gap:6px}
.pay-l small{font-size:13px;color:var(--fg-mute)}
.subform{display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:var(--r-ctl);background:var(--surface-2)}
.subform .inp{background:var(--surface)}
.res-act{display:flex;flex-wrap:wrap;gap:8px}
.res-act .btn{flex:1 1 auto}
.res-note{display:flex;gap:8px;align-items:flex-start;margin:0;font-size:14px;color:var(--fg-dim)}
.res-note .ico{color:var(--gold);margin-top:1px}
.stepper{display:flex;align-items:center;gap:6px}
.stepper output{min-width:44px;text-align:center;font:600 22px var(--font-display);color:var(--gold);font-variant-numeric:tabular-nums}
.step-btn{width:48px;height:48px;border-radius:12px;border:1px solid var(--line-strong);background:var(--surface-2);color:var(--fg);display:grid;place-items:center;cursor:pointer}
.step-btn:disabled{opacity:.4;cursor:not-allowed}
.nr-seats{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:6px 6px 6px 14px;border-radius:var(--r-ctl);background:var(--surface-2)}
.nr-seats .lbl-txt{color:var(--fg)}
.free-note{margin:14px 16px 20px;font-size:14px;color:var(--fg-mute)}

/* aviso flotante: encima de la barra inferior en el celular, abajo a la derecha en escritorio */
.toast{position:fixed;left:16px;right:16px;bottom:calc(88px + var(--safe-b));z-index:60;display:flex;gap:10px;align-items:flex-start;padding:12px 8px 12px 16px;border-radius:14px;background:var(--leather);color:var(--fg);font-size:15px;box-shadow:0 12px 30px var(--shadow-deep);opacity:0;transform:translateY(10px);pointer-events:none;transition:opacity 200ms var(--ease-out),transform 200ms var(--ease-out)}
.toast.show{opacity:1;transform:none;pointer-events:auto}
.toast > .ico{color:var(--gold);margin-top:2px}
.toast.err{background:var(--err-wash);border:1px solid var(--err)}
.toast.err > .ico{color:var(--err)}
.toast span{flex:1}
.toast-x{min-width:44px;min-height:44px;margin:-10px 0 -10px auto;display:grid;place-items:center;border:0;border-radius:10px;background:transparent;color:var(--fg-dim);cursor:pointer}

@media (min-width:821px){
  .scrim{display:none}
  .sheet{position:sticky;top:78px;left:auto;right:auto;bottom:auto;z-index:auto;max-height:calc(100dvh - 96px);padding-bottom:16px;border:1px solid var(--hair);border-radius:var(--r-card);box-shadow:none;animation:none}
  .sheet-head{border-radius:var(--r-card) var(--r-card) 0 0}
  .sheet-empty{display:flex;flex-direction:column;gap:8px;padding:20px}
  .toast{left:auto;right:24px;bottom:24px;max-width:420px}
}
```

- [ ] **Step 13: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores.

- [ ] **Step 14: Captura de la hoja a 390x844**

Procedimiento de captura: en `http://localhost:3000/vista-previa`, `browser_click` en "Mesa PB-05, Reservada, 10 de 10 puestos vendidos"; en el prototipo, `#mesa`. Nombre `T8-hoja-390`.
Criterios: (a) la hoja sube desde abajo sobre una cortina oscura y el título "Mesa PB-05" recibe el foco; (b) pastilla "Reservada" con ícono de reloj, "10 vendidos · 0 libres de 10" y barra de puestos dorada; (c) bloque Precios con "Mesa entera" y su monto (`$400.00` antes del plan A, `$400,00` después: `money` pasa a ser alias de `formatMoney`) y "Editar precios"; (d) dos tarjetas: María Fernanda Urdaneta "Pagada" y Rafael Bracho "Con saldo", con código en mono, Total / Pagado / Saldo, movimientos "Abono 1", "Abono 2", "Reverso" en rojo con ícono; (e) en Rafael, el formulario de pago y "Debe $80,00. Se puede dejar entrar; queda el aviso." (o `$80.00` si el plan A aún no entró); (f) "No quedan puestos libres en esta mesa." al final. Cada uno PASS/FAIL.

- [ ] **Step 15: Cierre, foco y nueva reserva**

Con Playwright a 390x844: `browser_press_key` `Escape` cierra la hoja y el foco vuelve a PB-05 (PASS/FAIL); abre "Mesa PB-16, Parcial, 5 de 11 puestos vendidos", baja hasta "Nueva reserva" y captura `T8-nueva-390` contra el prototipo `#nueva`: selector de puestos con − y + de 48 px, "Precio total" que se recalcula al cambiar puestos, "Reservar 6 puestos" (PASS/FAIL); envía el formulario vacío: aparece "Escribe el nombre del cliente." bajo el formulario y el campo Cliente queda en rojo (PASS/FAIL); escribe un nombre y envía: aparece el aviso flotante "Vista previa: reserva de 6 puestos en PB-16 para ..." y se va solo a los 4 s (PASS/FAIL).

- [ ] **Step 16: Captura a 1280x800**

En `http://localhost:3000/vista-previa` a 1280x800 sin selección: la columna derecha dice "Ninguna mesa abierta" (PASS/FAIL). Toca PB-05: la hoja aparece en la columna, sin cortina, el plano sigue visible y PB-05 con anillo ámbar (PASS/FAIL). Nombre `T8-hoja-1280`.

- [ ] **Step 17: Commit**

```bash
git add src/lib/ui-format.ts tests/ui.test.ts src/components/useMedia.ts src/components/Toast.tsx src/components/PriceBlock.tsx src/components/ReservationCard.tsx src/components/NewReservation.tsx src/components/Panel.tsx src/components/Board.tsx src/app/globals.css
git commit -m "Hoja de la mesa: hoja inferior modal en el celular y columna en escritorio, tarjetas de reserva y aviso flotante"
```

---

### Task 9: Reservas: tarjetas en el celular, tabla en escritorio y CSV MOREFEST

**Files:**
- Modify: `src/lib/ui-format.ts` (funciones nuevas al final)
- Modify: `tests/ui.test.ts` (bloque nuevo)
- Modify: `src/components/ReservationList.tsx` (se reemplaza entero)
- Modify: `src/app/globals.css` (bloque nuevo al final)

El contenido del CSV sale de `toCsv` (`src/lib/logic.ts`): la columna `correo` la agrega el plan A (su tarea 7). Esta tarea solo cambia el nombre del archivo, que es de la pantalla.

- [ ] **Step 1: Escribe las pruebas de búsqueda y nombre del CSV**

Al final de `tests/ui.test.ts`:

```ts
describe('lista de reservas', () => {
  const campos = ['PB-05', 'A3F91C', 'María Fernanda Urdaneta', '+58 414 612 3348'];
  it('busca sin acentos ni mayúsculas en mesa, código, nombre y teléfono', () => {
    expect(ui.matchesQuery(campos, 'maria')).toBe(true);
    expect(ui.matchesQuery(campos, 'URDANETA')).toBe(true);
    expect(ui.matchesQuery(campos, 'a3f9')).toBe(true);
    expect(ui.matchesQuery(campos, 'pb-05')).toBe(true);
    expect(ui.matchesQuery(campos, 'zzz')).toBe(false);
  });
  it('encuentra el teléfono aunque se escriba sin espacios', () => {
    expect(ui.matchesQuery(campos, '4146123')).toBe(true);
  });
  it('búsqueda vacía muestra todo', () => {
    expect(ui.matchesQuery(campos, '   ')).toBe(true);
  });
  it('el CSV se nombra con la fecha local, no la UTC', () => {
    expect(ui.csvFileName(new Date(2026, 9, 17, 22, 30))).toBe('morefest-reservas-2026-10-17.csv');
    expect(ui.csvFileName(new Date(2026, 0, 5, 9, 0))).toBe('morefest-reservas-2026-01-05.csv');
  });
});
```

- [ ] **Step 2: Corre y mira que falle**

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL en "lista de reservas": `ui.matchesQuery is not a function`.

- [ ] **Step 3: Agrega al final de `src/lib/ui-format.ts`**

```ts
/** Minúsculas y sin acentos, para buscar "maria" y encontrar "María". */
export function norm(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Búsqueda de las listas: el texto sin acentos en cualquier campo, o desde 3 dígitos dentro de un teléfono. */
export function matchesQuery(fields: (string | null | undefined)[], q: string): boolean {
  const query = norm(q.trim());
  if (!query) return true;
  if (norm(fields.filter(Boolean).join(' ')).includes(query)) return true;
  const digits = query.replace(/\D/g, '');
  return digits.length >= 3 && fields.some((f) => (f ?? '').replace(/\D/g, '').includes(digits));
}

/** Nombre del CSV con la fecha local del equipo: en Maracaibo, después de las 8 p. m. la fecha UTC ya es mañana. */
export function csvFileName(now: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `morefest-reservas-${now.getFullYear()}-${p(now.getMonth() + 1)}-${p(now.getDate())}.csv`;
}
```

- [ ] **Step 4: Corre y mira que pase**

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  17 passed (17)`.

- [ ] **Step 5: Reemplaza `src/components/ReservationList.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { balance, money, paid, resStatus, toCsv } from '@/lib/logic';
import type { Reservation, TableRow } from '@/lib/types';
import { RES_LABEL, csvFileName, matchesQuery, plural } from '@/lib/ui-format';
import { Icon } from './Icon';
import { StatusPill } from './StatusPill';

interface Props {
  tables: TableRow[];
  reservations: Reservation[];
  onPick: (t: TableRow) => void;
}

/** Reservas: buscador y CSV; tarjetas por debajo de 821 px y tabla desde 821 px. Tocar una abre la hoja de su mesa. */
export function ReservationList({ tables, reservations, onPick }: Props) {
  const [q, setQ] = useState('');
  const byId = new Map(tables.map((t) => [t.id, t]));
  const code = (r: Reservation) => byId.get(r.table_id)?.code ?? '';
  const all = [...reservations].sort((a, b) => code(a).localeCompare(code(b)) || a.code.localeCompare(b.code));
  const rows = all.filter((r) => matchesQuery([code(r), r.code, r.name, r.phone], q));
  const seats = reservations.reduce((n, r) => n + r.guests, 0);

  function download() {
    const blob = new Blob(['\ufeff' + toCsv(tables, reservations)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = csvFileName(new Date());
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function open(r: Reservation) {
    const t = byId.get(r.table_id);
    if (t) onPick(t);
  }

  return (
    <section aria-labelledby="reservas-title">
      <div className="view-head">
        <h2 className="h2" id="reservas-title">
          Reservas
        </h2>
        <p className="sub">
          {plural(reservations.length, 'reserva', 'reservas')} · {plural(seats, 'puesto', 'puestos')}
        </p>
      </div>
      <div className="r-tools">
        <div className="search">
          <Icon name="search" />
          <input
            className="inp"
            type="search"
            autoComplete="off"
            placeholder="Nombre, teléfono o código"
            aria-label="Buscar reservas por nombre, teléfono o código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn-secondary" onClick={download}>
          <Icon name="download" />
          CSV
        </button>
      </div>
      <p className="r-count" aria-live="polite">
        {q.trim() ? `${rows.length} de ${all.length} reservas` : 'Ordenadas por mesa. Toca una para abrir su hoja.'}
      </p>

      {!rows.length ? (
        <p className="empty">
          {all.length ? 'Sin resultados. Prueba con el nombre, el teléfono o el código de 6 caracteres.' : 'Todavía no hay reservas. Toca una mesa del plano para crear la primera.'}
        </p>
      ) : (
        <>
          <ul className="rlist">
            {rows.map((r) => {
              const s = resStatus(r);
              const bal = balance(r);
              return (
                <li key={r.id}>
                  <button type="button" className="rrow" onClick={() => open(r)}>
                    <span className="rr-mesa">{code(r)}</span>
                    <span className="rr-main">
                      <b>{r.name}</b>
                      <span>
                        {plural(r.guests, 'puesto', 'puestos')} · <code>{r.code}</code>
                      </span>
                      <span>{r.phone || 'sin WhatsApp'}</span>
                    </span>
                    <span className="rr-side">
                      <StatusPill status={s} label={RES_LABEL[s]} />
                      <span className={`rr-bal${bal > 0 ? ' due' : ''}`}>{bal > 0 ? `Saldo ${money(bal)}` : `Pagado ${money(paid(r))}`}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="rtable-wrap">
            <table className="rtable">
              <thead>
                <tr>
                  <th scope="col">Mesa</th>
                  <th scope="col">Código</th>
                  <th scope="col">Cliente</th>
                  <th scope="col">WhatsApp</th>
                  <th scope="col" className="n">
                    Puestos
                  </th>
                  <th scope="col" className="n">
                    Total
                  </th>
                  <th scope="col" className="n">
                    Pagado
                  </th>
                  <th scope="col" className="n">
                    Saldo
                  </th>
                  <th scope="col">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const s = resStatus(r);
                  const bal = balance(r);
                  return (
                    <tr key={r.id} onClick={() => open(r)}>
                      <td>
                        <button type="button" className="linkish" aria-label={`Abrir ${code(r)}, reserva de ${r.name}`} onClick={(e) => { e.stopPropagation(); open(r); }}>
                          {code(r)}
                        </button>
                      </td>
                      <td>
                        <code>{r.code}</code>
                      </td>
                      <td className="wrap">{r.name}</td>
                      <td>{r.phone ?? '—'}</td>
                      <td className="n">{r.guests}</td>
                      <td className="n">{money(r.total_price)}</td>
                      <td className="n">{money(paid(r))}</td>
                      <td className={`n${bal > 0 ? ' due' : ''}`}>{money(bal)}</td>
                      <td>
                        <StatusPill status={s} label={RES_LABEL[s]} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
```

- [ ] **Step 6: Agrega al final de `src/app/globals.css`**

```css
/* ---------- reservas: tarjetas por debajo de 821 px, tabla desde 821 px ---------- */
.r-tools{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;padding:14px 16px 0}
.r-count{margin:12px 16px 6px;font-size:14px;color:var(--fg-mute)}
.rlist{list-style:none;margin:0;padding:0 16px 16px;display:flex;flex-direction:column;gap:8px}
.rrow{width:100%;display:grid;grid-template-columns:62px minmax(0,1fr) auto;gap:10px;align-items:center;min-height:72px;padding:10px 12px;border-radius:14px;background:var(--surface);border:1px solid var(--hair);text-align:left;cursor:pointer;color:var(--fg)}
.rrow:hover{border-color:var(--line-strong)}
.rr-mesa{font:600 15px var(--font-mono)}
.rr-main{display:flex;flex-direction:column;gap:2px;min-width:0}
.rr-main b{font-weight:600;font-size:15px;line-height:1.25}
.rr-main span{font-size:13px;color:var(--fg-mute)}
.rr-main code{font:500 13px var(--font-mono);color:var(--fg-dim)}
.rr-side{display:flex;flex-direction:column;align-items:flex-end;gap:5px}
.rr-bal{font:500 13px var(--font-mono);color:var(--fg-dim);font-variant-numeric:tabular-nums}
.rr-bal.due{color:var(--gold)}
.rtable-wrap{display:none}
@media (min-width:821px){
  .r-tools{padding-inline:0}
  .r-count{margin-inline:0}
  .rlist{display:none}
  .rtable-wrap{display:block;overflow-x:auto;margin-top:4px;border:1px solid var(--hair);border-radius:var(--r-card);background:var(--surface)}
  .rtable{width:100%;border-collapse:collapse;font-size:14px}
  .rtable th{padding:10px 12px;text-align:left;font:500 12px var(--font-ui);letter-spacing:.06em;text-transform:uppercase;color:var(--fg-mute);border-bottom:1px solid var(--hair);white-space:nowrap}
  .rtable td{padding:6px 12px;border-bottom:1px solid var(--hair);white-space:nowrap}
  .rtable td.wrap{white-space:normal;min-width:140px}
  .rtable tbody tr:last-child td{border-bottom:0}
  .rtable tbody tr{cursor:pointer}
  .rtable tbody tr:hover td{background:var(--surface-2)}
  .rtable .n{text-align:right;font-variant-numeric:tabular-nums}
  .rtable .due{color:var(--gold)}
  .rtable code{font:500 13px var(--font-mono);color:var(--fg-dim)}
  .linkish{min-height:44px;padding:0;border:0;background:none;color:var(--fg);font:600 14px var(--font-mono);cursor:pointer;text-decoration:underline;text-decoration-color:var(--line-strong);text-underline-offset:3px}
}
```

- [ ] **Step 7: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores.

- [ ] **Step 8: Captura a 390x844**

Procedimiento de captura: en `http://localhost:3000/vista-previa` toca "Reservas" en la barra inferior; prototipo `#reservas`. Nombre `T9-reservas-390`.
Criterios: (a) título "Reservas" y "14 reservas · 93 puestos"; (b) buscador con lupa y botón "CSV"; (c) tarjetas de 72 px o más con mesa en mono, nombre, puestos y código, teléfono, pastilla "Con saldo" / "Pagada" / "Llegó" y saldo dorado o "Pagado"; (d) sin desplazamiento horizontal; (e) escribir "maria" deja una tarjeta y "1 de 14 reservas"; (f) tocar la tarjeta abre la hoja de PB-05. Cada uno PASS/FAIL.

- [ ] **Step 9: Captura a 1280x800 y descarga**

A 1280x800 la sección Reservas es una tabla de nueve columnas sin barra horizontal (PASS/FAIL); el código de mesa es un botón subrayado que abre la hoja en la columna derecha (PASS/FAIL). Toca "CSV": Playwright reporta la descarga `morefest-reservas-AAAA-MM-DD.csv` con la fecha de hoy (PASS/FAIL). Nombre `T9-reservas-1280`.

- [ ] **Step 10: Commit**

```bash
git add src/lib/ui-format.ts tests/ui.test.ts src/components/ReservationList.tsx src/app/globals.css
git commit -m "Reservas en tarjetas en el celular y tabla en escritorio, búsqueda sin acentos y CSV morefest-reservas con fecha local"
```

---

# Parte 2: depende del plan A

No empieces esta parte hasta que el plan A esté integrado en `feat/morefest-diseno` (sus tareas 1 a 8 en verde). La tarea 10 lo comprueba.

### Task 10: Adoptar el contrato del plan A (fecha larga, lugar, montos, hora de llegada, roles en la vista previa)

**Files:**
- Modify: `src/lib/ui-format.ts` (funciones nuevas al final)
- Modify: `tests/ui.test.ts` (bloque nuevo)
- Modify: `src/app/vista-previa/fixture.ts` (se reemplaza entero: aserciones por anotaciones)
- Modify: `src/app/vista-previa/Preview.tsx` (se reemplaza entero)
- Modify: `src/app/vista-previa/page.dev.tsx` (se reemplaza entero)
- Modify: `src/components/MapView.tsx`, `src/components/Board.tsx`, `src/components/Main.tsx`, `src/components/PriceBlock.tsx`, `src/components/ReservationCard.tsx`, `src/components/ReservationList.tsx`

- [ ] **Step 1: Comprueba el contrato del plan A**

Run:
```bash
grep -nE "export (function|const) (formatMoney|money|paid|balance|isValidEmail|eventDateLabel|confirmationMessage|mailtoHref|protocolRows|protocolTotals)\b" src/lib/logic.ts
grep -nE "AppRole|ProtocolRow|venue|email|checked_in_at|created_at|reverses_payment_id" src/lib/types.ts
grep -n "role" src/lib/data.ts
grep -n "'correo'" src/lib/logic.ts
```
Expected: aparecen las diez funciones de la primera línea (`money` como `export const money = formatMoney`), todos los nombres de tipos, `role: AppRole | null` en `Snapshot` y la columna `'correo'` en `toCsv`. Si falta cualquiera, detente y avisa: el plan A no está completo.

- [ ] **Step 2: Prueba de la hora de llegada (falla primero)**

Al final de `tests/ui.test.ts`:

```ts
describe('horas de Maracaibo', () => {
  it('hora de llegada en 12 horas, con espacios normales', () => {
    expect(ui.arrivalTime('2026-11-21T00:52:00Z')).toBe('8:52 p. m.');
    expect(ui.arrivalTime('2026-11-20T14:05:00Z')).toBe('10:05 a. m.');
  });
});
```

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL en "horas de Maracaibo": `ui.arrivalTime is not a function`.

- [ ] **Step 3: Agrega al final de `src/lib/ui-format.ts`**

```ts
/** Zona horaria del evento: las horas se muestran como en Maracaibo aunque el equipo esté en otra parte. */
export const TZ = 'America/Caracas';

/** Hora de Maracaibo, "8:52 p. m.". Los navegadores usan espacios finos; se dejan espacios normales. */
export function arrivalTime(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: TZ })
    .format(new Date(iso))
    .replace(/\s/g, ' ');
}
```

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  18 passed (18)`.

- [ ] **Step 4: Reemplaza `src/app/vista-previa/fixture.ts` (anotaciones en vez de `as`)**

```ts
import type { Snapshot } from '@/lib/data';
import type { AreaCode, EventRow, Payment, Reservation, TableRow } from '@/lib/types';

/** Datos de ejemplo de la vista previa: mismos clientes y estados que docs/design/morefest-prototipo.html.
 *  Nada de esto toca la base. */
type Def = [code: string, x: number, y: number, w: number, h: number, rot: number, cap: number, shape?: 'r' | 'c'];

const DEFS: Def[] = [
  ['PB-01', 302, 160, 125, 34, 0, 10], ['PB-02', 125, 318, 60, 60, 0, 4, 'c'], ['PB-03', 326, 252, 52, 52, 0, 4],
  ['PB-04', 360, 327, 108, 30, -33, 10], ['PB-05', 472, 270, 108, 30, -22, 10], ['PB-06', 525, 348, 108, 30, -33, 10],
  ['PB-07', 420, 417, 108, 30, -35, 10], ['PB-08', 600, 397, 105, 30, -60, 10], ['PB-09', 498, 472, 52, 52, 0, 4],
  ['PB-10', 590, 540, 28, 104, 0, 10], ['PB-11', 122, 500, 30, 112, 0, 10], ['PB-12', 122, 690, 30, 112, 0, 10],
  ['PB-13', 692, 422, 28, 96, 0, 10], ['PB-14', 692, 530, 28, 96, 0, 10], ['PB-15', 686, 670, 30, 118, 0, 10],
  ['PB-16', 275, 650, 26, 228, 0, 11],
  ['VIP-05', 280, 445, 96, 40, 48, 4], ['VIP-06', 352, 520, 96, 40, 48, 4], ['VIP-07', 420, 598, 96, 40, 48, 4],
];

const price = (code: string, cap: number) => (code === 'PB-16' ? null : code.startsWith('VIP') ? 600 : cap === 4 ? 180 : 400);

const tables: TableRow[] = DEFS.map(([code, x, y, w, h, rot, cap, shape]) => ({
  id: `t-${code}`,
  code,
  area: (code.startsWith('VIP') ? 'VIP' : 'PB') as AreaCode,
  capacity: cap,
  price: price(code, cap),
  seat_price: code === 'PB-16' ? 35 : null,
  map_x: x,
  map_y: y,
  map_w: w,
  map_h: h,
  map_rot: rot,
  shape: shape ?? 'r',
}));

let pid = 0;
const P = (amount: number, method: string, day: string): Payment => ({
  id: `p${++pid}`,
  amount,
  kind: 'payment',
  method,
  created_at: `${day}T15:00:00Z`,
  reverses_payment_id: null,
});
const REV = (of: Payment, day: string): Payment => ({
  id: `p${++pid}`,
  amount: -of.amount,
  kind: 'reversal',
  method: of.method,
  created_at: `${day}T16:00:00Z`,
  reverses_payment_id: of.id,
});

const R = (
  id: string,
  code: string,
  table: string,
  name: string,
  phone: string | null,
  email: string | null,
  guests: number,
  total: number,
  payments: Payment[],
  cin?: { n: number; at: string },
): Reservation => ({
  id,
  code,
  table_id: `t-${table}`,
  guests,
  total_price: total,
  notes: null,
  name,
  phone,
  email,
  payments,
  checked_in: cin?.n ?? null,
  checked_in_at: cin?.at ?? null,
});

/** Un abono cargado dos veces y corregido con su reverso: el original no se borra. */
const doble = P(80, 'Efectivo', '2026-10-12');

const event: EventRow = { id: 'ev-morefest', name: 'MOREFEST', venue: 'Restaurante VOLTERRA, Maracaibo', event_date: null };

export const FIXTURE: Snapshot = {
  event,
  tables,
  role: 'admin',
  reservations: [
    R('r01', '7C2E19', 'PB-01', 'Héctor Urdaneta', '+58 414 605 2231', null, 10, 400, [P(200, 'Zelle', '2026-10-08'), P(200, 'Pago móvil', '2026-10-15')]),
    R('r02', 'B41D07', 'PB-02', 'Daniela Fuenmayor', '+58 424 610 7782', null, 4, 180, [P(180, 'Efectivo', '2026-10-11')], { n: 4, at: '2026-11-21T00:52:00Z' }),
    R('r03', 'E90A3F', 'PB-04', 'Carmen Elena Ríos', '+58 412 771 0954', null, 10, 400, [P(150, 'Pago móvil', '2026-10-09')]),
    R('r04', 'A3F91C', 'PB-05', 'María Fernanda Urdaneta', '+58 414 612 3348', 'mafer.urdaneta@ejemplo.com', 6, 240, [P(100, 'Pago móvil', '2026-10-10'), P(140, 'Zelle', '2026-10-14')]),
    R('r05', '5D0C8B', 'PB-05', 'Rafael Bracho', '+58 424 338 4106', null, 4, 160, [P(80, 'Efectivo', '2026-10-12'), doble, REV(doble, '2026-10-12')]),
    R('r06', '1F6A2D', 'PB-07', 'Luis Ferrer', '+58 414 220 7813', null, 10, 400, [P(400, 'Transferencia', '2026-10-05')], { n: 10, at: '2026-11-21T00:14:00Z' }),
    R('r07', 'C8E5B0', 'PB-08', 'Valeria Chourio', '+58 412 447 9150', null, 10, 400, [P(200, 'Zelle', '2026-10-07'), P(200, 'Zelle', '2026-10-13')]),
    R('r08', '0B7F44', 'PB-10', 'Andreína Villalobos', '+58 412 958 4410', null, 6, 240, [P(120, 'Pago móvil', '2026-10-16')]),
    R('r09', 'D2A817', 'PB-12', 'Gabriel Añez', '+58 414 884 0561', null, 10, 400, [P(400, 'Efectivo', '2026-10-14')]),
    R('r10', '69C3E2', 'PB-14', 'Óscar Atencio', '+58 424 709 0562', null, 10, 400, [P(200, 'Pago móvil', '2026-10-15')]),
    R('r11', '3E8B5A', 'PB-16', 'José Gregorio Paz', '+58 424 733 1902', null, 3, 105, [P(105, 'Zelle', '2026-10-16')]),
    R('r12', 'F07C21', 'PB-16', 'Mariela Leal', '+58 414 590 2287', null, 2, 70, []),
    R('r13', '8A1D6E', 'VIP-05', 'Patrocinador A (ejemplo)', null, null, 4, 600, [P(600, 'Transferencia', '2026-10-03')]),
    R('r14', '27B9F3', 'VIP-06', 'Patrocinador B (ejemplo)', null, null, 4, 600, [P(300, 'Transferencia', '2026-10-03')]),
  ],
};
```

- [ ] **Step 5: Reemplaza `src/app/vista-previa/Preview.tsx` (rol elegible)**

```tsx
'use client';

import { useCallback, useState } from 'react';
import { Board } from '@/components/Board';
import { Login } from '@/components/Login';
import type { Actions, Msg } from '@/components/actions';
import type { AppRole } from '@/lib/types';
import { FIXTURE } from './fixture';

/** Panel con datos de ejemplo y acciones que solo avisan: nada toca Supabase. */
export function Preview({ pantalla, rol }: { pantalla: 'entrar' | 'panel'; rol: AppRole }) {
  const [msg, setMsg] = useState<Msg | null>(null);
  const dismiss = useCallback(() => setMsg(null), []);
  if (pantalla === 'entrar') return <Login />;

  const aviso = (text: string) => {
    setMsg({ text: `Vista previa: ${text} No se guardó nada.`, err: false });
    return Promise.resolve(true);
  };
  const actions: Actions = {
    reserve: (t, v) => aviso(`reserva de ${v.guests} puestos en ${t.code} para ${v.name}.`),
    pay: (r, amount, method) => aviso(`pago de ${amount} por ${method} para ${r.name}.`),
    checkIn: (r) => aviso(`llegada de ${r.name}.`),
    cancel: (r) => aviso(`cancelación de ${r.name}.`),
    savePrices: (t) => aviso(`precios de ${t.code}.`),
  };

  return (
    <Board
      snap={{ ...FIXTURE, role: rol }}
      email="vista-previa@morefest.local"
      live
      busy={false}
      msg={msg}
      actions={actions}
      onSaveDate={(v) => void aviso(`fecha ${v || 'borrada'}.`)}
      onSignOut={() => void aviso('salir.')}
      onDismissMsg={dismiss}
    />
  );
}
```

- [ ] **Step 6: Reemplaza `src/app/vista-previa/page.dev.tsx`**

```tsx
import type { AppRole } from '@/lib/types';
import { Preview } from './Preview';

const ROLES: Record<string, AppRole> = { admin: 'admin', vendedor: 'seller', puerta: 'door' };

/**
 * Vista previa con datos de ejemplo, solo con `next dev` (ver pageExtensions en next.config.ts).
 *   /vista-previa                panel como admin
 *   /vista-previa?rol=vendedor   ve pagos, no revierte
 *   /vista-previa?rol=puerta     no ve pagos
 *   /vista-previa?p=entrar       pantalla de entrada
 */
export default async function VistaPrevia({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const rol = ROLES[String(sp.rol ?? 'admin')] ?? 'admin';
  return <Preview pantalla={sp.p === 'entrar' ? 'entrar' : 'panel'} rol={rol} />;
}
```

- [ ] **Step 7: Fecha larga en la sección Mapa**

En `src/components/MapView.tsx`, reemplaza `import { fmtDate } from '@/lib/logic';` por `import { eventDateLabel } from '@/lib/logic';`, y reemplaza:

```tsx
          {/* fmtDate existe antes y después del plan A; la tarea 10 lo cambia por eventDateLabel ("Sábado, 14 de noviembre de 2026"). */}
          <b>{fmtDate(date)}</b>
```

por:

```tsx
          <b>{eventDateLabel(date)}</b>
```

- [ ] **Step 8: Lugar del evento bajo el wordmark**

En `src/components/Board.tsx`, reemplaza `<p className="ah-sub">Renacer · {placeName(null)}</p>` por:

```tsx
          <p className="ah-sub">Renacer · {placeName(snap.event.venue)}</p>
```

- [ ] **Step 9: Montos con `formatMoney` en los componentes**

`money` sigue existiendo como alias, pero los componentes pasan al nombre del contrato para que el alias se pueda borrar después (en `logic.ts`, archivo del plan A).

- En `src/components/PriceBlock.tsx`: cambia `import { money } from '@/lib/logic';` por `import { formatMoney } from '@/lib/logic';` y reemplaza todas las apariciones de `money(` por `formatMoney(` (Edit con `replace_all`).
- En `src/components/ReservationCard.tsx`: cambia `import { balance, money, paid, resStatus } from '@/lib/logic';` por `import { balance, formatMoney, paid, resStatus } from '@/lib/logic';` y reemplaza todas las apariciones de `money(` por `formatMoney(`.
- En `src/components/ReservationList.tsx`: cambia `import { balance, money, paid, resStatus, toCsv } from '@/lib/logic';` por `import { balance, formatMoney, paid, resStatus, toCsv } from '@/lib/logic';` y reemplaza todas las apariciones de `money(` por `formatMoney(`.
- En `src/components/Main.tsx`: cambia `import { friendlyError } from '@/lib/logic';` por `import { formatMoney, friendlyError } from '@/lib/logic';` y reemplaza `` `Pago de $${amount.toFixed(2)} registrado.` `` por `` `Pago de ${formatMoney(amount)} registrado.` ``.

Run: `grep -rnE "(^|[^A-Za-z])money\(" src/components | wc -l`
Expected: `0`.

- [ ] **Step 10: Hora de llegada en la tarjeta**

En `src/components/ReservationCard.tsx`, cambia `import { METHODS, RES_LABEL, payLabels, plural } from '@/lib/ui-format';` por `import { METHODS, RES_LABEL, arrivalTime, payLabels, plural } from '@/lib/ui-format';` y reemplaza:

```tsx
          <span className="pill st-in">
            <Icon name="users" />
            Ingreso confirmado
          </span>
```

por:

```tsx
          <span className="pill st-in">
            <Icon name="users" />
            Ingreso confirmado{r.checked_in_at ? ` · ${arrivalTime(r.checked_in_at)}` : ''}
          </span>
```

- [ ] **Step 11: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores.

- [ ] **Step 12: Captura a 390x844**

Procedimiento de captura con `http://localhost:3000/vista-previa`; nombre `T10-mapa-390`.
Criterios: (a) "Renacer · VOLTERRA" bajo el wordmark; (b) fila "Fecha del evento" con "Fecha por anunciar"; (c) en la hoja de PB-05 los montos con coma decimal (`$400,00`, `$240,00`) y el reverso como `-$80,00`; (d) en la hoja de PB-02 la tarjeta de Daniela Fuenmayor dice "Ingreso confirmado · 8:52 p. m."; (e) elige una fecha en el selector: aparece el aviso flotante de la vista previa. Cada uno PASS/FAIL.

- [ ] **Step 13: Commit**

```bash
git add src/lib/ui-format.ts tests/ui.test.ts src/app/vista-previa/fixture.ts src/app/vista-previa/Preview.tsx src/app/vista-previa/page.dev.tsx src/components/MapView.tsx src/components/Board.tsx src/components/Main.tsx src/components/PriceBlock.tsx src/components/ReservationCard.tsx src/components/ReservationList.tsx
git commit -m "Pantallas con el contrato del plan A: fecha larga, lugar, montos venezolanos, hora de llegada y roles en la vista previa"
```

---

### Task 11: Correo del cliente en la nueva reserva y en la hoja

**Files:**
- Create: `src/lib/ui-mail.ts`
- Modify: `tests/ui.test.ts` (import y bloque nuevo)
- Modify: `src/components/actions.ts` (se reemplaza entero)
- Modify: `src/components/NewReservation.tsx` (se reemplaza entero)
- Create: `src/components/EmailRow.tsx`
- Modify: `src/components/ReservationCard.tsx` (import y una línea)
- Modify: `src/components/Main.tsx` (acción `reserve` y nueva `setEmail`)
- Modify: `src/app/vista-previa/Preview.tsx` (acción `setEmail`)
- Modify: `src/app/globals.css` (bloque nuevo al final)

- [ ] **Step 1: Pruebas del error del campo de correo**

En `tests/ui.test.ts`, agrega debajo de `import * as map from '../src/lib/ui-map';`:

```ts
import * as mail from '../src/lib/ui-mail';
```

y al final del archivo:

```ts
describe('correo del cliente', () => {
  it('vacío no es error: el correo es opcional', () => {
    expect(mail.emailError('')).toBe('');
    expect(mail.emailError('   ')).toBe('');
  });
  it('acepta un correo bien escrito, aunque traiga espacios alrededor', () => {
    expect(mail.emailError(' mafer.urdaneta@ejemplo.com ')).toBe('');
  });
  it('rechaza un correo sin dominio con un mensaje que dice cómo arreglarlo', () => {
    expect(mail.emailError('mafer@ejemplo')).toBe('Revisa el correo: debe verse como nombre@correo.com.');
    expect(mail.emailError('mafer urdaneta@ejemplo.com')).toBe('Revisa el correo: debe verse como nombre@correo.com.');
  });
});
```

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL: no encuentra el módulo `../src/lib/ui-mail`.

- [ ] **Step 2: Crea `src/lib/ui-mail.ts`**

```ts
import { isValidEmail } from './logic';

/** Error que va debajo del campo de correo, o '' si está vacío (es opcional) o bien escrito. */
export function emailError(value: string): string {
  const v = value.trim();
  if (!v || isValidEmail(v)) return '';
  return 'Revisa el correo: debe verse como nombre@correo.com.';
}
```

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  21 passed (21)`.

- [ ] **Step 3: Reemplaza `src/components/actions.ts`**

```ts
import type { Reservation, TableRow } from '@/lib/types';

/** Lo que la interfaz le pide a la base. Main lo implementa con Supabase; la vista previa, con avisos. */
export interface Actions {
  /** `email` llega recortado y validado; vacío si no hay. */
  reserve: (
    t: TableRow,
    v: { name: string; phone: string; email: string; guests: number; total: number; deposit: number; method: string },
  ) => Promise<boolean>;
  pay: (r: Reservation, amount: number, method: string) => Promise<boolean>;
  checkIn: (r: Reservation) => Promise<boolean>;
  cancel: (r: Reservation) => Promise<boolean>;
  savePrices: (t: TableRow, price: number | null, seat: number | null) => Promise<boolean>;
  /** null borra el correo. */
  setEmail: (r: Reservation, email: string | null) => Promise<boolean>;
}

/** Aviso con el resultado de una acción. */
export interface Msg {
  text: string;
  err: boolean;
}
```

- [ ] **Step 4: Reemplaza `src/components/NewReservation.tsx` (campo Correo)**

```tsx
'use client';

import { useState } from 'react';
import type { TableRow } from '@/lib/types';
import { METHODS, plural } from '@/lib/ui-format';
import { emailError } from '@/lib/ui-mail';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  table: TableRow;
  free: number;
  sp: number | null;
  busy: boolean;
  onReserve: Actions['reserve'];
}

/** Nueva reserva: mesa entera o por puestos, con selector de puestos de 48 px y correo opcional. */
export function NewReservation({ table, free, sp, busy, onReserve }: Props) {
  const [seats, setSeats] = useState(free);
  const [total, setTotal] = useState(sp ? (sp * free).toFixed(2) : '');
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState('');
  const [nameMissing, setNameMissing] = useState(false);
  const [emailErr, setEmailErr] = useState('');

  function changeSeats(v: number) {
    const n = Math.min(free, Math.max(1, v));
    setSeats(n);
    if (!edited && sp) setTotal((sp * n).toFixed(2));
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const name = String(f.get('name')).trim();
    const email = String(f.get('email') ?? '').trim();
    const deposit = Number(f.get('deposit')) || 0;
    const t = Number(total) || 0;
    setNameMissing(!name);
    if (!name) return setError('Escribe el nombre del cliente.');
    if (!(seats >= 1) || seats > free) return setError(`Solo quedan ${free} puestos libres.`);
    if (deposit > t) return setError('El anticipo no puede ser mayor al total.');
    const badEmail = emailError(email);
    setEmailErr(badEmail);
    if (badEmail) {
      setError('');
      document.getElementById('nr-email')?.focus();
      return;
    }
    setError('');
    await onReserve(table, { name, phone: String(f.get('phone')).trim(), email, guests: seats, total: t, deposit, method: String(f.get('method')) });
  }

  return (
    <section className="m-block" aria-labelledby="h-new">
      <div className="m-row">
        <h3 className="h3" id="h-new">
          Nueva reserva
        </h3>
        <span className="muted">{free} libres</span>
      </div>
      <p className="help">Se vende completa o por puestos; admite varias reservas hasta llenarse.</p>
      <form className="stack" noValidate onSubmit={submit}>
        <div className="field">
          <label htmlFor="nr-name">
            Cliente <span className="req" aria-hidden="true">*</span>
          </label>
          <input
            className="inp"
            id="nr-name"
            name="name"
            autoComplete="off"
            required
            aria-invalid={nameMissing || undefined}
            aria-describedby={error ? 'nr-err' : undefined}
          />
        </div>
        <div className="field">
          <label htmlFor="nr-phone">WhatsApp</label>
          <input className="inp" id="nr-phone" name="phone" type="tel" inputMode="tel" autoComplete="off" placeholder="+58 4xx xxx xxxx" />
        </div>
        <div className="field">
          <label htmlFor="nr-email">Correo (opcional)</label>
          <input
            className="inp"
            id="nr-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="off"
            placeholder="Para enviarle la confirmación"
            aria-invalid={emailErr ? true : undefined}
            aria-describedby={emailErr ? 'nr-email-err' : undefined}
            onBlur={(e) => setEmailErr(emailError(e.target.value))}
            onChange={() => setEmailErr('')}
          />
          {emailErr && (
            <p className="err-msg" id="nr-email-err" role="alert">
              <Icon name="alert" size="sm" />
              <span>{emailErr}</span>
            </p>
          )}
        </div>
        <div className="nr-seats">
          <span className="lbl-txt" id="nr-seats-l">
            Puestos
          </span>
          <div className="stepper" role="group" aria-labelledby="nr-seats-l">
            <button type="button" className="step-btn" aria-label="Quitar un puesto" disabled={seats <= 1} onClick={() => changeSeats(seats - 1)}>
              <Icon name="minus" />
            </button>
            <output aria-live="polite">{seats}</output>
            <button type="button" className="step-btn" aria-label="Agregar un puesto" disabled={seats >= free} onClick={() => changeSeats(seats + 1)}>
              <Icon name="plus" />
            </button>
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label htmlFor="nr-total">Precio total</label>
            <div className="money">
              <span className="unit">$</span>
              <input
                className="inp"
                id="nr-total"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={total}
                placeholder="0.00"
                onChange={(e) => {
                  setTotal(e.target.value);
                  setEdited(true);
                }}
              />
            </div>
          </div>
          <div className="field">
            <label htmlFor="nr-dep">Anticipo</label>
            <div className="money">
              <span className="unit">$</span>
              <input className="inp" id="nr-dep" name="deposit" type="number" inputMode="decimal" min="0" step="0.01" defaultValue={0} />
            </div>
          </div>
          <div className="field full">
            <label htmlFor="nr-met">Método del anticipo</label>
            <div className="sel-wrap">
              <select className="inp" id="nr-met" name="method">
                {METHODS.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
              <Icon name="down" />
            </div>
          </div>
        </div>
        {error && (
          <p className="err-msg" id="nr-err" role="alert">
            <Icon name="alert" size="sm" />
            <span>{error}</span>
          </p>
        )}
        {sp === null && <p className="help">El precio aún no está definido: escribe el total a mano.</p>}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
          Reservar {plural(seats, 'puesto', 'puestos')}
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 5: Crea `src/components/EmailRow.tsx`**

```tsx
'use client';

import { useState } from 'react';
import type { Reservation } from '@/lib/types';
import { emailError } from '@/lib/ui-mail';
import type { Actions } from './actions';
import { Icon } from './Icon';

/** Correo del cliente dentro de la tarjeta: se ve, se agrega, se corrige o se borra (vacío). */
export function EmailRow({ r, busy, onSave }: { r: Reservation; busy: boolean; onSave: Actions['setEmail'] }) {
  const [edit, setEdit] = useState(false);
  const [value, setValue] = useState(r.email ?? '');
  const [error, setError] = useState('');
  const id = `em-${r.id}`;

  if (!edit) {
    return (
      <div className="mail-row">
        <span className="pay-l">
          <b>
            <Icon name="mail" size="sm" />
            Correo
          </b>
          <small>{r.email ?? 'Sin correo'}</small>
        </span>
        <button
          type="button"
          className="mini"
          onClick={() => {
            setValue(r.email ?? '');
            setError('');
            setEdit(true);
          }}
        >
          {r.email ? 'Editar' : 'Agregar'}
        </button>
      </div>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const bad = emailError(value);
    if (bad) {
      setError(bad);
      return;
    }
    if (await onSave(r, value.trim() || null)) setEdit(false);
  }

  return (
    <form className="subform" noValidate onSubmit={submit}>
      <div className="field">
        <label htmlFor={id}>Correo del cliente</label>
        <input
          className="inp"
          id={id}
          type="email"
          inputMode="email"
          autoComplete="off"
          placeholder="nombre@correo.com"
          value={value}
          autoFocus
          onChange={(e) => {
            setValue(e.target.value);
            setError('');
          }}
          onBlur={() => setError(emailError(value))}
          aria-invalid={error ? true : undefined}
          aria-describedby={`${id}-help${error ? ` ${id}-err` : ''}`}
        />
        <p className="help" id={`${id}-help`}>
          Déjalo vacío para borrarlo. Se usa para enviarle la confirmación.
        </p>
        {error && (
          <p className="err-msg" id={`${id}-err`} role="alert">
            <Icon name="alert" size="sm" />
            <span>{error}</span>
          </p>
        )}
      </div>
      <div className="row2">
        <button type="button" className="btn btn-secondary" onClick={() => setEdit(false)}>
          Cancelar
        </button>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          Guardar correo
        </button>
      </div>
    </form>
  );
}
```

- [ ] **Step 6: El correo entra en la tarjeta**

En `src/components/ReservationCard.tsx`, agrega debajo de `import type { Actions } from './actions';`:

```ts
import { EmailRow } from './EmailRow';
```

y reemplaza:

```tsx
      </header>

      <dl className="res-money">
```

por:

```tsx
      </header>

      <EmailRow r={r} busy={busy} onSave={actions.setEmail} />

      <dl className="res-money">
```

- [ ] **Step 7: `Main.tsx` guarda el correo con `set_customer_email`**

En `src/components/Main.tsx`, reemplaza:

```ts
    reserve: (t, v) =>
      run(
        () =>
          sb().rpc('create_reservation', {
            p_table_id: t.id,
            p_customer_name: v.name,
            p_phone: v.phone || null,
            p_guests: v.guests,
            p_total: v.total,
            p_deposit: v.deposit,
            p_method: v.method,
            p_notes: null,
          }),
        `${v.guests} ${v.guests === 1 ? 'puesto reservado' : 'puestos reservados'} para ${v.name}.`,
      ),
```

por:

```ts
    reserve: (t, v) =>
      run(async () => {
        const created = await sb().rpc('create_reservation', {
          p_table_id: t.id,
          p_customer_name: v.name,
          p_phone: v.phone || null,
          p_guests: v.guests,
          p_total: v.total,
          p_deposit: v.deposit,
          p_method: v.method,
          p_notes: null,
        });
        if (created.error || !v.email) return { error: created.error };
        // create_reservation devuelve el uuid de la reserva; el correo va aparte para no cambiarle la firma (spec, sección 7).
        const saved = await sb().rpc('set_customer_email', { p_res: created.data as string, p_email: v.email });
        if (!saved.error) return { error: null };
        return { error: { message: `La reserva quedó creada, pero el correo no se guardó: ${friendlyError(saved.error.message)} Agrégalo desde la hoja.` } };
      }, `${v.guests} ${v.guests === 1 ? 'puesto reservado' : 'puestos reservados'} para ${v.name}.`),
    setEmail: (r, email) =>
      run(
        () => sb().rpc('set_customer_email', { p_res: r.id, p_email: email }),
        email ? `Correo de ${r.name} guardado.` : `Correo de ${r.name} borrado.`,
      ),
```

- [ ] **Step 8: La vista previa responde a `setEmail`**

En `src/app/vista-previa/Preview.tsx`, reemplaza:

```ts
    savePrices: (t) => aviso(`precios de ${t.code}.`),
  };
```

por:

```ts
    savePrices: (t) => aviso(`precios de ${t.code}.`),
    setEmail: (r, email) => aviso(email ? `correo ${email} para ${r.name}.` : `correo de ${r.name} borrado.`),
  };
```

- [ ] **Step 9: Agrega al final de `src/app/globals.css`**

```css
/* ---------- correo del cliente en la tarjeta ---------- */
.mail-row{display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:6px;min-height:44px;font-size:14px;color:var(--fg-dim)}
.mail-row b{color:var(--fg);font-weight:600}
.mail-row small{overflow-wrap:anywhere}
```

- [ ] **Step 10: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores.

- [ ] **Step 11: Captura y comportamiento a 390x844**

En `http://localhost:3000/vista-previa`, abre PB-05; nombre `T11-correo-390`.
Criterios: (a) María Fernanda muestra "Correo / mafer.urdaneta@ejemplo.com" con "Editar"; Rafael muestra "Sin correo" con "Agregar"; (b) "Agregar" abre el campo con foco; escribe `rafael@correo` y toca "Guardar correo": aparece "Revisa el correo: debe verse como nombre@correo.com." debajo del campo y el borde se pone rojo, sin aviso flotante; (c) escribe `rafael@correo.com` y guarda: aviso "Vista previa: correo rafael@correo.com para Rafael Bracho." y el campo se cierra; (d) en PB-16, "Nueva reserva" tiene "Correo (opcional)" entre WhatsApp y Puestos; con nombre y correo `x@y` el envío se detiene con el error bajo el campo de correo. Cada uno PASS/FAIL.

- [ ] **Step 12: Commit**

```bash
git add src/lib/ui-mail.ts tests/ui.test.ts src/components/actions.ts src/components/NewReservation.tsx src/components/EmailRow.tsx src/components/ReservationCard.tsx src/components/Main.tsx src/app/vista-previa/Preview.tsx src/app/globals.css
git commit -m "Correo del cliente: campo opcional al reservar y editable en la hoja, guardado con set_customer_email"
```

---

### Task 12: Confirmación por correo: vista previa, "Enviar confirmación" y "Copiar mensaje"

**Files:**
- Modify: `src/lib/ui-mail.ts` (import y funciones nuevas)
- Modify: `tests/ui.test.ts` (bloque nuevo)
- Modify: `src/components/actions.ts` (se reemplaza entero)
- Create: `src/components/MailBox.tsx`
- Modify: `src/components/ReservationCard.tsx` (se reemplaza entero)
- Modify: `src/components/Panel.tsx` (prop `event`)
- Modify: `src/components/Board.tsx` (pasa `event`)
- Modify: `src/components/Main.tsx` (acción `notify`)
- Modify: `src/app/vista-previa/Preview.tsx` (acción `notify`)
- Modify: `src/app/globals.css` (bloque nuevo al final)

- [ ] **Step 1: Pruebas del estado del botón y del texto copiado**

Al final de `tests/ui.test.ts`:

```ts
describe('confirmación por correo', () => {
  const corto = {
    subject: 'MOREFEST · Confirmación de tu reserva (Mesa PB-05)',
    body: 'Hola, María Fernanda Urdaneta:\n\nTe confirmamos tu reserva para MOREFEST.',
  };
  it('sin correo no hay enlace y el motivo dice qué hacer', () => {
    const s = mail.mailState(null, corto);
    expect(s.href).toBeNull();
    expect(s.reason).toMatch(/Falta el correo del cliente/);
  });
  it('con correo válido arma el enlace mailto', () => {
    const s = mail.mailState('mafer.urdaneta@ejemplo.com', corto);
    expect(s.href).toMatch(/^mailto:mafer\.urdaneta@ejemplo\.com\?subject=/);
    expect(s.reason).toBe('');
  });
  it('un correo guardado mal escrito no abre la app de correo', () => {
    expect(mail.mailState('mafer@ejemplo', corto).href).toBeNull();
  });
  it('si el mensaje no cabe en un enlace, pide copiarlo', () => {
    const s = mail.mailState('mafer.urdaneta@ejemplo.com', { subject: 's', body: 'x'.repeat(2000) });
    expect(s.href).toBeNull();
    expect(s.reason).toMatch(/Copiar mensaje/);
  });
  it('el texto copiado lleva asunto y cuerpo', () => {
    expect(mail.clipboardText(corto)).toBe(`Asunto: ${corto.subject}\n\n${corto.body}`);
  });
});
```

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL en "confirmación por correo": `mail.mailState is not a function`.

- [ ] **Step 2: Agrega a `src/lib/ui-mail.ts`**

Cambia la primera línea `import { isValidEmail } from './logic';` por:

```ts
import { isValidEmail, mailtoHref } from './logic';
```

y agrega al final:

```ts
export interface MailState {
  href: string | null;
  reason: string;
}

/** Estado de "Enviar confirmación": el enlace mailto, o por qué no se puede y qué hacer.
 *  mailtoHref (plan A) solo devuelve null por largo; la falta de correo la decide esta función. */
export function mailState(email: string | null, msg: { subject: string; body: string }): MailState {
  if (!email) return { href: null, reason: 'Falta el correo del cliente: agrégalo arriba para enviarle la confirmación. "Copiar mensaje" sí funciona.' };
  if (!isValidEmail(email)) return { href: null, reason: 'El correo guardado no es válido: corrígelo arriba.' };
  const href = mailtoHref(email, msg);
  if (!href) return { href: null, reason: 'El mensaje es muy largo para abrirlo en tu app de correo. Usa "Copiar mensaje" y pégalo.' };
  return { href, reason: '' };
}

/** Lo que copia "Copiar mensaje": asunto y cuerpo, listo para pegar en el correo o en WhatsApp. */
export const clipboardText = (msg: { subject: string; body: string }) => `Asunto: ${msg.subject}\n\n${msg.body}`;
```

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  26 passed (26)`.

- [ ] **Step 3: Reemplaza `src/components/actions.ts`**

```ts
import type { Reservation, TableRow } from '@/lib/types';

/** Lo que la interfaz le pide a la base. Main lo implementa con Supabase; la vista previa, con avisos. */
export interface Actions {
  /** `email` llega recortado y validado; vacío si no hay. */
  reserve: (
    t: TableRow,
    v: { name: string; phone: string; email: string; guests: number; total: number; deposit: number; method: string },
  ) => Promise<boolean>;
  pay: (r: Reservation, amount: number, method: string) => Promise<boolean>;
  checkIn: (r: Reservation) => Promise<boolean>;
  cancel: (r: Reservation) => Promise<boolean>;
  savePrices: (t: TableRow, price: number | null, seat: number | null) => Promise<boolean>;
  /** null borra el correo. */
  setEmail: (r: Reservation, email: string | null) => Promise<boolean>;
  /** Aviso flotante sin pasar por la base (copiar al portapapeles, abrir el correo). */
  notify: (text: string, err?: boolean) => void;
}

/** Aviso con el resultado de una acción. */
export interface Msg {
  text: string;
  err: boolean;
}
```

- [ ] **Step 4: Crea `src/components/MailBox.tsx`**

```tsx
'use client';

import { confirmationMessage } from '@/lib/logic';
import type { EventRow, Reservation, TableRow } from '@/lib/types';
import { clipboardText, mailState } from '@/lib/ui-mail';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  id: string;
  r: Reservation;
  table: TableRow;
  event: EventRow;
  notify: Actions['notify'];
}

/** Confirmación por correo: vista previa del mensaje, abrir la app de correo de Alejandro o copiar el texto. Nada sale solo. */
export function MailBox({ id, r, table, event, notify }: Props) {
  const msg = confirmationMessage(r, table, event);
  const st = mailState(r.email, msg);
  const why = `${id}-why`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(clipboardText(msg));
      notify('Mensaje copiado. Pégalo en tu correo o en WhatsApp.');
    } catch {
      notify('No se pudo copiar. Mantén presionado el texto de la vista previa para copiarlo.', true);
    }
  }

  return (
    <section className="mailbox" id={id} aria-label={`Confirmación por correo para ${r.name}`}>
      <div className="mail-preview">
        <dl className="mp-head">
          <dt>Para</dt>
          <dd>{r.email ?? 'sin correo'}</dd>
          <dt>Asunto</dt>
          <dd>{msg.subject}</dd>
        </dl>
        <p className="mp-body">{msg.body}</p>
      </div>
      <div className="stack">
        {st.href ? (
          <a className="btn btn-primary btn-block" href={st.href} onClick={() => notify('Se abre tu app de correo con el mensaje listo. Revísalo y envíalo.')}>
            <Icon name="mail" />
            Enviar confirmación
          </a>
        ) : (
          <button type="button" className="btn btn-primary btn-block" disabled aria-describedby={why}>
            <Icon name="mail" />
            Enviar confirmación
          </button>
        )}
        <button type="button" className="btn btn-secondary btn-block" onClick={copy}>
          <Icon name="copy" />
          Copiar mensaje
        </button>
      </div>
      <p className={st.href ? 'help' : 'err-msg'} id={why}>
        {!st.href && <Icon name="info" size="sm" />}
        <span>{st.href ? '"Enviar confirmación" abre tu app de correo con el asunto y el texto ya escritos. Tú decides cuándo enviarla.' : st.reason}</span>
      </p>
    </section>
  );
}
```

- [ ] **Step 5: Reemplaza `src/components/ReservationCard.tsx`**

Incluye lo de las tareas 8, 10 y 11, más el botón "Confirmación por correo".

```tsx
'use client';

import { useState } from 'react';
import { balance, formatMoney, paid, resStatus } from '@/lib/logic';
import type { EventRow, Reservation, TableRow } from '@/lib/types';
import { METHODS, RES_LABEL, arrivalTime, payLabels, plural } from '@/lib/ui-format';
import type { Actions } from './actions';
import { EmailRow } from './EmailRow';
import { Icon } from './Icon';
import { MailBox } from './MailBox';
import { StatusPill } from './StatusPill';

interface Props {
  r: Reservation;
  table: TableRow;
  event: EventRow;
  busy: boolean;
  actions: Actions;
}

/** Una reserva dentro de la hoja: correo, montos, movimientos, cobro, confirmación por correo, llegada y cancelación. */
export function ReservationCard({ r, table, event, busy, actions }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [amount, setAmount] = useState(balance(r).toFixed(2));
  const [method, setMethod] = useState(METHODS[0]);
  const [payError, setPayError] = useState('');
  const bal = balance(r);
  const s = resStatus(r);
  const labels = payLabels(r.payments);
  const mailId = `mail-${r.id}`;

  async function submitPay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Number(amount);
    if (!(v > 0)) return setPayError('Escribe un monto mayor a cero.');
    if (v > bal + 0.001) return setPayError(`El monto pasa el saldo de ${formatMoney(bal)}.`);
    setPayError('');
    if (await actions.pay(r, v, method)) setAmount('');
  }

  return (
    <article className="res" aria-labelledby={`rn-${r.id}`}>
      <header className="res-head">
        <div>
          <h4 className="res-name" id={`rn-${r.id}`}>
            {r.name}
          </h4>
          <p className="res-meta">
            {plural(r.guests, 'puesto', 'puestos')} · <span className="nowrap">{r.phone || 'sin WhatsApp'}</span>
          </p>
        </div>
        <div className="res-right">
          <StatusPill status={s} label={RES_LABEL[s]} />
          <code className="res-code">{r.code}</code>
        </div>
      </header>

      <EmailRow r={r} busy={busy} onSave={actions.setEmail} />

      <dl className="res-money">
        <div>
          <dt>Total</dt>
          <dd>{formatMoney(r.total_price)}</dd>
        </div>
        <div>
          <dt>Pagado</dt>
          <dd>{formatMoney(paid(r))}</dd>
        </div>
        <div>
          <dt>Saldo</dt>
          <dd className={bal > 0 ? 'due' : undefined}>{formatMoney(bal)}</dd>
        </div>
      </dl>

      {r.payments.length ? (
        <ul className="pays" aria-label="Movimientos de pago">
          {r.payments.map((p, i) => (
            <li className={`pay${p.kind === 'reversal' ? ' rev' : ''}`} key={p.id}>
              <span className="pay-l">
                <b>
                  {p.kind === 'reversal' && <Icon name="undo" size="sm" />}
                  {labels[i]}
                </b>
                <small>{p.method}</small>
              </span>
              <span className="pay-a">{formatMoney(p.amount)}</span>
              <span />
            </li>
          ))}
        </ul>
      ) : (
        <p className="help">Sin abonos todavía.</p>
      )}

      {bal > 0 && (
        <form className="subform" noValidate onSubmit={submitPay}>
          <div className="grid2">
            <div className="field">
              <label htmlFor={`pay-amt-${r.id}`}>Monto</label>
              <div className="money">
                <span className="unit">$</span>
                <input
                  className="inp"
                  id={`pay-amt-${r.id}`}
                  type="number"
                  inputMode="decimal"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  aria-invalid={payError ? true : undefined}
                  aria-describedby={payError ? `pay-err-${r.id}` : undefined}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor={`pay-met-${r.id}`}>Método</label>
              <div className="sel-wrap">
                <select className="inp" id={`pay-met-${r.id}`} value={method} onChange={(e) => setMethod(e.target.value)}>
                  {METHODS.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
                <Icon name="down" />
              </div>
            </div>
          </div>
          {payError && (
            <p className="err-msg" id={`pay-err-${r.id}`} role="alert">
              <Icon name="alert" size="sm" />
              <span>{payError}</span>
            </p>
          )}
          <button type="submit" className="btn btn-secondary btn-block" disabled={busy}>
            Registrar pago
          </button>
        </form>
      )}

      <div className="res-act">
        {r.checked_in !== null ? (
          <span className="pill st-in">
            <Icon name="users" />
            Ingreso confirmado{r.checked_in_at ? ` · ${arrivalTime(r.checked_in_at)}` : ''}
          </span>
        ) : (
          <button type="button" className="btn btn-ok" disabled={busy} onClick={() => actions.checkIn(r)}>
            <Icon name="check" />
            Confirmar llegada
          </button>
        )}
        <button type="button" className="btn btn-secondary" aria-expanded={mailOpen} aria-controls={mailId} onClick={() => setMailOpen(!mailOpen)}>
          <Icon name="mail" />
          Confirmación por correo
        </button>
        {confirm ? (
          <>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={async () => {
                await actions.cancel(r);
                setConfirm(false);
              }}
            >
              Sí, liberar puestos
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>
              No
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-quiet-danger" disabled={busy} onClick={() => setConfirm(true)}>
            Cancelar reserva
          </button>
        )}
      </div>

      {mailOpen && <MailBox id={mailId} r={r} table={table} event={event} notify={actions.notify} />}

      {r.checked_in === null && bal > 0 && (
        <p className="res-note">
          <Icon name="info" />
          <span>Debe {formatMoney(bal)}. Se puede dejar entrar; queda el aviso.</span>
        </p>
      )}
    </article>
  );
}
```

- [ ] **Step 6: `Panel` recibe el evento**

En `src/components/Panel.tsx`:
- Reemplaza `import type { Reservation, TableRow } from '@/lib/types';` por `import type { EventRow, Reservation, TableRow } from '@/lib/types';`.
- Reemplaza:
  ```ts
  interface Props {
    table: TableRow | null;
    reservations: Reservation[];
  ```
  por:
  ```ts
  interface Props {
    table: TableRow | null;
    event: EventRow;
    reservations: Reservation[];
  ```
- Reemplaza `export function Panel({ table, reservations, actions, busy, modal, onClose }: Props) {` por `export function Panel({ table, event, reservations, actions, busy, modal, onClose }: Props) {`.
- Reemplaza `<ReservationCard key={r.id} r={r} busy={busy} actions={actions} />` por `<ReservationCard key={r.id} r={r} table={table} event={event} busy={busy} actions={actions} />`.

- [ ] **Step 7: `Board` pasa el evento**

En `src/components/Board.tsx`, reemplaza `<Panel table={selected} reservations={snap.reservations}` por `<Panel table={selected} event={snap.event} reservations={snap.reservations}`.

- [ ] **Step 8: `notify` en `Main.tsx` y en la vista previa**

En `src/components/Main.tsx`, reemplaza:

```ts
      }, `Precios de ${t.code} guardados.`),
  };
```

por:

```ts
      }, `Precios de ${t.code} guardados.`),
    notify: (text, err = false) => setMsg({ text, err }),
  };
```

En `src/app/vista-previa/Preview.tsx`, reemplaza:

```ts
    setEmail: (r, email) => aviso(email ? `correo ${email} para ${r.name}.` : `correo de ${r.name} borrado.`),
  };
```

por:

```ts
    setEmail: (r, email) => aviso(email ? `correo ${email} para ${r.name}.` : `correo de ${r.name} borrado.`),
    notify: (text, err = false) => setMsg({ text, err }),
  };
```

- [ ] **Step 9: Agrega al final de `src/app/globals.css`**

```css
/* ---------- confirmación por correo: vista previa y dos acciones, una sobre otra ---------- */
.mailbox{display:flex;flex-direction:column;gap:12px;padding:12px;border-radius:var(--r-ctl);background:var(--surface-2)}
.mail-preview{border-radius:var(--r-ctl);background:var(--bg);border:1px solid var(--hair);overflow:hidden}
.mp-head{display:grid;grid-template-columns:64px minmax(0,1fr);gap:6px 10px;margin:0;padding:12px 14px;border-bottom:1px solid var(--hair);font-size:14px}
.mp-head dt{color:var(--fg-mute)}
.mp-head dd{margin:0;color:var(--fg);overflow-wrap:anywhere}
.mp-body{margin:0;padding:14px;font:400 15px/1.55 var(--font-ui);color:var(--fg);white-space:pre-wrap;overflow-wrap:anywhere}
```

- [ ] **Step 10: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores.

- [ ] **Step 11: Captura y comportamiento a 390x844**

En `http://localhost:3000/vista-previa`, abre PB-05 y toca "Confirmación por correo" en la tarjeta de María Fernanda; prototipo `#correo`. Nombre `T12-correo-390`.
Criterios: (a) vista previa con "Para mafer.urdaneta@ejemplo.com", el asunto "MOREFEST · Confirmación de tu reserva (Mesa PB-05)" y el cuerpo del plan A con abonos, "Pagado: $240,00" y "Pagado completo"; (b) "Enviar confirmación" naranja a todo el ancho, con `href` que empieza en `mailto:mafer.urdaneta@ejemplo.com?subject=` (compruébalo con `browser_evaluate`: `document.querySelector('.mailbox a').getAttribute('href').slice(0, 40)`); (c) "Copiar mensaje" debajo: al tocarlo sale el aviso "Mensaje copiado..." o, si el navegador de prueba niega el portapapeles, el aviso de error con la indicación de copiar a mano, nunca un fallo silencioso; (d) en la tarjeta de Rafael (sin correo) "Enviar confirmación" está deshabilitado y debajo se lee "Falta el correo del cliente...". Cada uno PASS/FAIL.

- [ ] **Step 12: Commit**

```bash
git add src/lib/ui-mail.ts tests/ui.test.ts src/components/actions.ts src/components/MailBox.tsx src/components/ReservationCard.tsx src/components/Panel.tsx src/components/Board.tsx src/components/Main.tsx src/app/vista-previa/Preview.tsx src/app/globals.css
git commit -m "Confirmación por correo en la hoja: vista previa, Enviar confirmación por mailto y Copiar mensaje; sin correo queda deshabilitado con motivo"
```

---

### Task 13: Revertir un pago (solo admin) y montos ocultos para la puerta

**Files:**
- Create: `src/lib/ui-payments.ts`
- Modify: `tests/ui.test.ts` (import y bloque nuevo)
- Modify: `src/components/actions.ts` (se reemplaza entero)
- Create: `src/components/PayItem.tsx`
- Modify: `src/components/ReservationCard.tsx` (se reemplaza entero)
- Modify: `src/components/Panel.tsx` (prop `role`)
- Modify: `src/components/Board.tsx` (pasa `role`)
- Modify: `src/components/Main.tsx` (acción `reverse`)
- Modify: `src/app/vista-previa/Preview.tsx` (acción `reverse`)
- Modify: `src/app/globals.css` (bloque nuevo al final)

`reverse_payment` ya está blindada en la 0008 (solo admin, un reverso por pago, motivo obligatorio). La pantalla esconde el botón a quien no es admin; si dos personas revierten a la vez, la base rechaza la segunda y `friendlyError` (plan A) dice "Ese pago ya estaba revertido.".

- [ ] **Step 1: Pruebas de permisos y movimientos**

En `tests/ui.test.ts`, agrega debajo de `import * as mail from '../src/lib/ui-mail';`:

```ts
import * as pay from '../src/lib/ui-payments';
import type { Payment } from '../src/lib/types';
```

y al final del archivo:

```ts
describe('pagos y reversos', () => {
  const mov = (id: string, amount: number, over: Partial<Payment> = {}): Payment => ({
    id, amount, kind: amount < 0 ? 'reversal' : 'payment', method: 'Efectivo',
    created_at: '2026-10-12T15:00:00Z', reverses_payment_id: null, ...over,
  });

  it('ven pagos admin y vendedor; revierte solo el admin', () => {
    expect([pay.seesPayments('admin'), pay.seesPayments('seller'), pay.seesPayments('door'), pay.seesPayments(null)]).toEqual([true, true, false, false]);
    expect([pay.mayReverse('admin'), pay.mayReverse('seller'), pay.mayReverse('door'), pay.mayReverse(null)]).toEqual([true, false, false, false]);
  });
  it('un abono revertido queda marcado y ya no se puede revertir', () => {
    const rows = pay.paymentRows([mov('a', 80), mov('b', 80), mov('c', -80, { reverses_payment_id: 'b' })]);
    expect(rows.map((r) => [r.label, r.reversed, r.canReverse])).toEqual([
      ['Abono 1', false, true],
      ['Abono 2', true, false],
      ['Reverso', false, false],
    ]);
  });
  it('fecha corta de un movimiento en hora de Maracaibo', () => {
    expect(pay.payDate('2026-10-15T02:00:00Z')).toBe('14/10');
  });
});
```

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL: no encuentra el módulo `../src/lib/ui-payments`.

- [ ] **Step 2: Crea `src/lib/ui-payments.ts`**

```ts
import type { AppRole, Payment } from './types';
import { TZ, payLabels } from './ui-format';

/** Ven montos y abonos admin y vendedor (espejo de la política read_pay de 0001); la puerta no. */
export const seesPayments = (role: AppRole | null) => role === 'admin' || role === 'seller';

/** Revertir un abono es solo del admin (reverse_payment exige require_role('admin'), 0008). */
export const mayReverse = (role: AppRole | null) => role === 'admin';

export interface PayRow {
  p: Payment;
  label: string;
  reversed: boolean;
  canReverse: boolean;
}

/** Movimientos de una reserva con su nombre y si ya tienen reverso: un reverso por abono (0008). */
export function paymentRows(payments: Payment[]): PayRow[] {
  const reversed = new Set(payments.map((p) => p.reverses_payment_id).filter((id): id is string => id !== null));
  const labels = payLabels(payments);
  return payments.map((p, i) => {
    const done = p.kind === 'payment' && reversed.has(p.id);
    return { p, label: labels[i], reversed: done, canReverse: p.kind === 'payment' && !done };
  });
}

/** Fecha corta de un movimiento en hora de Maracaibo: "14/10". */
export function payDate(iso: string): string {
  return new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', timeZone: TZ }).format(new Date(iso));
}
```

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  29 passed (29)`.

- [ ] **Step 3: Reemplaza `src/components/actions.ts`**

```ts
import type { Payment, Reservation, TableRow } from '@/lib/types';

/** Lo que la interfaz le pide a la base. Main lo implementa con Supabase; la vista previa, con avisos. */
export interface Actions {
  /** `email` llega recortado y validado; vacío si no hay. */
  reserve: (
    t: TableRow,
    v: { name: string; phone: string; email: string; guests: number; total: number; deposit: number; method: string },
  ) => Promise<boolean>;
  pay: (r: Reservation, amount: number, method: string) => Promise<boolean>;
  checkIn: (r: Reservation) => Promise<boolean>;
  cancel: (r: Reservation) => Promise<boolean>;
  savePrices: (t: TableRow, price: number | null, seat: number | null) => Promise<boolean>;
  /** null borra el correo. */
  setEmail: (r: Reservation, email: string | null) => Promise<boolean>;
  /** Aviso flotante sin pasar por la base (copiar al portapapeles, abrir el correo). */
  notify: (text: string, err?: boolean) => void;
  /** Solo admin. El abono no se borra: se suma un movimiento negativo con el motivo. */
  reverse: (p: Payment, reason: string) => Promise<boolean>;
}

/** Aviso con el resultado de una acción. */
export interface Msg {
  text: string;
  err: boolean;
}
```

- [ ] **Step 4: Crea `src/components/PayItem.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { formatMoney } from '@/lib/logic';
import { payDate, type PayRow } from '@/lib/ui-payments';
import type { Actions } from './actions';
import { Icon } from './Icon';

interface Props {
  row: PayRow;
  admin: boolean;
  busy: boolean;
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onReverse: Actions['reverse'];
}

/** Un movimiento de pago. El admin puede revertir un abono una sola vez y con motivo; el abono no se borra. */
export function PayItem({ row, admin, busy, open, onOpen, onClose, onReverse }: Props) {
  const { p } = row;
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const id = `rev-${p.id}`;

  if (p.kind === 'reversal') {
    return (
      <li className="pay rev">
        <span className="pay-l">
          <b>
            <Icon name="undo" size="sm" />
            {row.label}
          </b>
          <small>
            {p.method} · {payDate(p.created_at)}
          </small>
        </span>
        <span className="pay-a">{formatMoney(p.amount)}</span>
        <span />
      </li>
    );
  }

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Escribe el motivo del reverso: queda en el historial.');
      return;
    }
    if (await onReverse(p, reason.trim())) onClose();
  }

  return (
    <>
      <li className={`pay${row.reversed ? ' is-rev' : ''}`}>
        <span className="pay-l">
          <b>{row.label}</b>
          <small>
            {p.method} · {payDate(p.created_at)}
            {row.reversed ? ' · revertido' : ''}
          </small>
        </span>
        <span className="pay-a">{formatMoney(p.amount)}</span>
        {admin && row.canReverse ? (
          <button
            type="button"
            className="mini"
            aria-expanded={open}
            aria-controls={`${id}-form`}
            aria-label={`Revertir ${row.label.toLowerCase()} de ${formatMoney(p.amount)}`}
            onClick={open ? onClose : onOpen}
          >
            Revertir
          </button>
        ) : (
          <span />
        )}
      </li>
      {open && (
        <li>
          <form id={`${id}-form`} className="subform danger" noValidate onSubmit={submit}>
            <div className="field">
              <label htmlFor={id}>Motivo del reverso</label>
              <input
                className="inp"
                id={id}
                value={reason}
                placeholder="Ej.: abono cargado dos veces"
                autoComplete="off"
                autoFocus
                onChange={(e) => {
                  setReason(e.target.value);
                  setError('');
                }}
                aria-invalid={error ? true : undefined}
                aria-describedby={`${id}-help${error ? ` ${id}-err` : ''}`}
              />
              <p className="help" id={`${id}-help`}>
                El abono no se borra: queda en el historial y se suma un movimiento negativo con este motivo.
              </p>
              {error && (
                <p className="err-msg" id={`${id}-err`} role="alert">
                  <Icon name="alert" size="sm" />
                  <span>{error}</span>
                </p>
              )}
            </div>
            <div className="row2">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                No revertir
              </button>
              <button type="submit" className="btn btn-danger" disabled={busy}>
                Revertir {formatMoney(p.amount)}
              </button>
            </div>
          </form>
        </li>
      )}
    </>
  );
}
```

- [ ] **Step 5: Reemplaza `src/components/ReservationCard.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { balance, formatMoney, paid, resStatus } from '@/lib/logic';
import type { AppRole, EventRow, Reservation, TableRow } from '@/lib/types';
import { METHODS, RES_LABEL, arrivalTime, plural } from '@/lib/ui-format';
import { mayReverse, paymentRows, seesPayments } from '@/lib/ui-payments';
import type { Actions } from './actions';
import { EmailRow } from './EmailRow';
import { Icon } from './Icon';
import { MailBox } from './MailBox';
import { PayItem } from './PayItem';
import { StatusPill } from './StatusPill';

interface Props {
  r: Reservation;
  table: TableRow;
  event: EventRow;
  role: AppRole | null;
  busy: boolean;
  actions: Actions;
}

/** Una reserva dentro de la hoja: correo, montos y movimientos (si el rol ve pagos), cobro, reverso (admin),
 *  confirmación por correo, llegada y cancelación. */
export function ReservationCard({ r, table, event, role, busy, actions }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [mailOpen, setMailOpen] = useState(false);
  const [revFor, setRevFor] = useState<string | null>(null);
  const [amount, setAmount] = useState(balance(r).toFixed(2));
  const [method, setMethod] = useState(METHODS[0]);
  const [payError, setPayError] = useState('');
  const bal = balance(r);
  const s = resStatus(r);
  const sees = seesPayments(role);
  const mailId = `mail-${r.id}`;

  async function submitPay(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const v = Number(amount);
    if (!(v > 0)) return setPayError('Escribe un monto mayor a cero.');
    if (v > bal + 0.001) return setPayError(`El monto pasa el saldo de ${formatMoney(bal)}.`);
    setPayError('');
    if (await actions.pay(r, v, method)) setAmount('');
  }

  return (
    <article className="res" aria-labelledby={`rn-${r.id}`}>
      <header className="res-head">
        <div>
          <h4 className="res-name" id={`rn-${r.id}`}>
            {r.name}
          </h4>
          <p className="res-meta">
            {plural(r.guests, 'puesto', 'puestos')} · <span className="nowrap">{r.phone || 'sin WhatsApp'}</span>
          </p>
        </div>
        <div className="res-right">
          <StatusPill status={s} label={RES_LABEL[s]} />
          <code className="res-code">{r.code}</code>
        </div>
      </header>

      <EmailRow r={r} busy={busy} onSave={actions.setEmail} />

      {sees && (
        <>
          <dl className="res-money">
            <div>
              <dt>Total</dt>
              <dd>{formatMoney(r.total_price)}</dd>
            </div>
            <div>
              <dt>Pagado</dt>
              <dd>{formatMoney(paid(r))}</dd>
            </div>
            <div>
              <dt>Saldo</dt>
              <dd className={bal > 0 ? 'due' : undefined}>{formatMoney(bal)}</dd>
            </div>
          </dl>

          {r.payments.length ? (
            <ul className="pays" aria-label="Movimientos de pago">
              {paymentRows(r.payments).map((row) => (
                <PayItem
                  key={row.p.id}
                  row={row}
                  admin={mayReverse(role)}
                  busy={busy}
                  open={revFor === row.p.id}
                  onOpen={() => setRevFor(row.p.id)}
                  onClose={() => setRevFor(null)}
                  onReverse={actions.reverse}
                />
              ))}
            </ul>
          ) : (
            <p className="help">Sin abonos todavía.</p>
          )}

          {bal > 0 && (
            <form className="subform" noValidate onSubmit={submitPay}>
              <div className="grid2">
                <div className="field">
                  <label htmlFor={`pay-amt-${r.id}`}>Monto</label>
                  <div className="money">
                    <span className="unit">$</span>
                    <input
                      className="inp"
                      id={`pay-amt-${r.id}`}
                      type="number"
                      inputMode="decimal"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      aria-invalid={payError ? true : undefined}
                      aria-describedby={payError ? `pay-err-${r.id}` : undefined}
                    />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor={`pay-met-${r.id}`}>Método</label>
                  <div className="sel-wrap">
                    <select className="inp" id={`pay-met-${r.id}`} value={method} onChange={(e) => setMethod(e.target.value)}>
                      {METHODS.map((m) => (
                        <option key={m}>{m}</option>
                      ))}
                    </select>
                    <Icon name="down" />
                  </div>
                </div>
              </div>
              {payError && (
                <p className="err-msg" id={`pay-err-${r.id}`} role="alert">
                  <Icon name="alert" size="sm" />
                  <span>{payError}</span>
                </p>
              )}
              <button type="submit" className="btn btn-secondary btn-block" disabled={busy}>
                Registrar pago
              </button>
            </form>
          )}
        </>
      )}

      <div className="res-act">
        {r.checked_in !== null ? (
          <span className="pill st-in">
            <Icon name="users" />
            Ingreso confirmado{r.checked_in_at ? ` · ${arrivalTime(r.checked_in_at)}` : ''}
          </span>
        ) : (
          <button type="button" className="btn btn-ok" disabled={busy} onClick={() => actions.checkIn(r)}>
            <Icon name="check" />
            Confirmar llegada
          </button>
        )}
        <button type="button" className="btn btn-secondary" aria-expanded={mailOpen} aria-controls={mailId} onClick={() => setMailOpen(!mailOpen)}>
          <Icon name="mail" />
          Confirmación por correo
        </button>
        {confirm ? (
          <>
            <button
              type="button"
              className="btn btn-danger"
              disabled={busy}
              onClick={async () => {
                await actions.cancel(r);
                setConfirm(false);
              }}
            >
              Sí, liberar puestos
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setConfirm(false)}>
              No
            </button>
          </>
        ) : (
          <button type="button" className="btn btn-quiet-danger" disabled={busy} onClick={() => setConfirm(true)}>
            Cancelar reserva
          </button>
        )}
      </div>

      {mailOpen && <MailBox id={mailId} r={r} table={table} event={event} notify={actions.notify} />}

      {sees && r.checked_in === null && bal > 0 && (
        <p className="res-note">
          <Icon name="info" />
          <span>Debe {formatMoney(bal)}. Se puede dejar entrar; queda el aviso.</span>
        </p>
      )}
    </article>
  );
}
```

- [ ] **Step 6: `Panel` recibe el rol**

En `src/components/Panel.tsx`:
- Reemplaza `import type { EventRow, Reservation, TableRow } from '@/lib/types';` por `import type { AppRole, EventRow, Reservation, TableRow } from '@/lib/types';`.
- Reemplaza:
  ```ts
    event: EventRow;
    reservations: Reservation[];
  ```
  por:
  ```ts
    event: EventRow;
    role: AppRole | null;
    reservations: Reservation[];
  ```
- Reemplaza `export function Panel({ table, event, reservations, actions, busy, modal, onClose }: Props) {` por `export function Panel({ table, event, role, reservations, actions, busy, modal, onClose }: Props) {`.
- Reemplaza `<ReservationCard key={r.id} r={r} table={table} event={event} busy={busy} actions={actions} />` por `<ReservationCard key={r.id} r={r} table={table} event={event} role={role} busy={busy} actions={actions} />`.

- [ ] **Step 7: `Board` pasa el rol**

En `src/components/Board.tsx`, reemplaza `<Panel table={selected} event={snap.event} reservations={snap.reservations}` por `<Panel table={selected} event={snap.event} role={snap.role} reservations={snap.reservations}`.

- [ ] **Step 8: Acción `reverse` en `Main.tsx` y en la vista previa**

En `src/components/Main.tsx`, reemplaza:

```ts
    notify: (text, err = false) => setMsg({ text, err }),
  };
```

por:

```ts
    notify: (text, err = false) => setMsg({ text, err }),
    reverse: (p, reason) =>
      run(() => sb().rpc('reverse_payment', { p_payment: p.id, p_reason: reason }), 'Reverso registrado. El abono original sigue en el historial.'),
  };
```

En `src/app/vista-previa/Preview.tsx`, reemplaza:

```ts
    notify: (text, err = false) => setMsg({ text, err }),
  };
```

por:

```ts
    notify: (text, err = false) => setMsg({ text, err }),
    reverse: (p, reason) => aviso(`reverso de ${p.amount} con motivo "${reason}".`),
  };
```

- [ ] **Step 9: Agrega al final de `src/app/globals.css`**

```css
/* ---------- reverso de un abono ---------- */
.pay.is-rev .pay-a{text-decoration:line-through;color:var(--fg-mute)}
.pays .subform{margin:6px 0 10px}
.subform.danger{border:1px solid var(--err)}
```

- [ ] **Step 10: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores.

- [ ] **Step 11: Comportamiento por rol a 390x844**

Captura `T13-reverso-390` contra el prototipo `#mesa` (tarjeta de Rafael Bracho).
- Admin (`/vista-previa`), PB-05: en Rafael, "Abono 2" tachado con "· revertido" y sin botón; "Reverso" en rojo con `-$80,00`; "Abono 1" y los de María Fernanda con "Revertir" (PASS/FAIL). Toca "Revertir" en "Abono 1" de María Fernanda: se abre el formulario con borde rojo y foco en "Motivo del reverso"; enviar vacío muestra "Escribe el motivo del reverso: queda en el historial." bajo el campo (PASS/FAIL); con motivo, aviso "Vista previa: reverso de 100 con motivo ..." y el formulario se cierra (PASS/FAIL).
- Vendedor (`/vista-previa?rol=vendedor`): mismos montos y abonos, ningún "Revertir" (PASS/FAIL).
- Puerta (`/vista-previa?rol=puerta`): sin Total / Pagado / Saldo, sin abonos ni "Registrar pago", sin "Debe..."; siguen correo, "Confirmar llegada", "Confirmación por correo" y "Cancelar reserva" (PASS/FAIL).

- [ ] **Step 12: Commit**

```bash
git add src/lib/ui-payments.ts tests/ui.test.ts src/components/actions.ts src/components/PayItem.tsx src/components/ReservationCard.tsx src/components/Panel.tsx src/components/Board.tsx src/components/Main.tsx src/app/vista-previa/Preview.tsx src/app/globals.css
git commit -m "Revertir abonos desde la hoja, solo admin y con motivo; montos ocultos para el rol puerta"
```

---

### Task 14: Lista de protocolo

**Files:**
- Create: `src/lib/ui-protocol.ts`
- Modify: `tests/ui.test.ts` (import y bloque nuevo)
- Create: `src/components/ProtocolView.tsx`
- Modify: `src/components/Board.tsx` (se reemplaza entero)
- Modify: `src/app/globals.css` (bloque nuevo al final)

- [ ] **Step 1: Pruebas de agrupación y saldo**

En `tests/ui.test.ts`, agrega debajo de `import * as pay from '../src/lib/ui-payments';`:

```ts
import * as proto from '../src/lib/ui-protocol';
```

y al final del archivo:

```ts
describe('protocolo', () => {
  it('agrupa por planta, planta baja primero, sin reordenar dentro del grupo', () => {
    const g = proto.groupByArea([
      { area: 'VIP' as const, n: 1 },
      { area: 'PB' as const, n: 2 },
      { area: 'PB' as const, n: 3 },
    ]);
    expect(g.map((x) => [x.label, x.rows.map((r) => r.n)])).toEqual([
      ['Planta baja', [2, 3]],
      ['Planta alta VIP', [1]],
    ]);
  });
  it('omite las plantas sin reservas', () => {
    expect(proto.groupByArea([{ area: 'PB' as const }]).map((g) => g.area)).toEqual(['PB']);
  });
  it('saldo: raya si el rol no ve pagos, Pagado o el monto', () => {
    expect(proto.saldoText(null)).toBe('—');
    expect(proto.saldoText(0)).toBe('Pagado');
    expect(proto.saldoText(-5)).toBe('Pagado');
    expect(proto.saldoText(120)).toBe('$120,00');
  });
});
```

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL: no encuentra el módulo `../src/lib/ui-protocol`.

- [ ] **Step 2: Crea `src/lib/ui-protocol.ts`**

```ts
import { formatMoney } from './logic';
import type { AreaCode } from './types';

const AREA_LABEL: Record<AreaCode, string> = { PB: 'Planta baja', VIP: 'Planta alta VIP' };

/** Agrupa por planta (planta baja primero) sin cambiar el orden que trae cada fila (protocolRows ya ordena). */
export function groupByArea<T extends { area: AreaCode }>(rows: T[]) {
  return (['PB', 'VIP'] as AreaCode[])
    .map((area) => ({ area, label: AREA_LABEL[area], rows: rows.filter((r) => r.area === area) }))
    .filter((g) => g.rows.length > 0);
}

/** Saldo en protocolo e impresión: "—" si el rol no ve pagos, "Pagado" o el monto pendiente. */
export function saldoText(balance: number | null): string {
  if (balance === null) return '—';
  return balance > 0 ? formatMoney(balance) : 'Pagado';
}
```

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  32 passed (32)`.

- [ ] **Step 3: Crea `src/components/ProtocolView.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { eventDateLabel, protocolRows, protocolTotals } from '@/lib/logic';
import type { AppRole, EventRow, ProtocolRow, Reservation, TableRow } from '@/lib/types';
import { arrivalTime, matchesQuery, plural } from '@/lib/ui-format';
import { seesPayments } from '@/lib/ui-payments';
import { groupByArea, saldoText } from '@/lib/ui-protocol';
import { Icon } from './Icon';

type Order = 'mesa' | 'nombre';

const ORDERS: [Order, string][] = [
  ['mesa', 'Por mesa'],
  ['nombre', 'Por nombre'],
];

interface Props {
  tables: TableRow[];
  reservations: Reservation[];
  event: EventRow;
  role: AppRole | null;
  onPick: (t: TableRow) => void;
}

/** Lista de la puerta, de solo lectura: una fila por reserva, agrupada por planta, por mesa o alfabética.
 *  Tocar una fila abre la hoja de su mesa, donde está "Confirmar llegada". */
export function ProtocolView({ tables, reservations, event, role, onPick }: Props) {
  const [order, setOrder] = useState<Order>('mesa');
  const [q, setQ] = useState('');
  const rows = protocolRows(tables, reservations, order, seesPayments(role));
  const totals = protocolTotals(rows);
  const groups = groupByArea(rows.filter((r) => matchesQuery([r.name, r.tableCode, r.code], q)));
  const pct = totals.expected > 0 ? Math.round((totals.inside / totals.expected) * 100) : 0;
  const byId = new Map(tables.map((t) => [t.id, t]));

  function open(r: ProtocolRow) {
    const t = byId.get(r.tableId);
    if (t) onPick(t);
  }

  return (
    <section aria-labelledby="proto-title">
      <div className="view-head">
        <h2 className="h2" id="proto-title">
          Lista de protocolo
        </h2>
        <p className="sub">{eventDateLabel(event.event_date)}. Toca una fila para abrir su hoja y confirmar la llegada.</p>
      </div>
      <div className="proto-top">
        <p className="proto-count" aria-live="polite">
          <b>{totals.inside}</b>
          <span>
            de {plural(totals.expected, 'persona', 'personas')} {totals.inside === 1 ? 'llegó' : 'llegaron'} · {plural(totals.reservations, 'reserva', 'reservas')}
          </span>
        </p>
        <div className="pmeter" aria-hidden="true">
          <span style={{ width: `${pct}%` }} />
        </div>
        <div className="seg" role="radiogroup" aria-label="Orden de la lista">
          {ORDERS.map(([o, label]) => (
            <button key={o} type="button" role="radio" aria-checked={order === o} onClick={() => setOrder(o)}>
              {label}
            </button>
          ))}
        </div>
        <div className="search">
          <Icon name="search" />
          <input
            className="inp"
            type="search"
            autoComplete="off"
            placeholder="Nombre, mesa o código"
            aria-label="Buscar en la lista por nombre, mesa o código"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>

      {groups.map((g) => (
        <section className="pgroup" key={g.area} aria-labelledby={`pg-${g.area}`}>
          <h3 className="pg-head" id={`pg-${g.area}`}>
            <b>{g.label}</b>
            <small>{plural(g.rows.length, 'reserva', 'reservas')}</small>
          </h3>
          <ul className="plist">
            {g.rows.map((r) => (
              <li key={r.reservationId}>
                <button type="button" className={`prow${r.checkedIn !== null ? ' is-in' : ''}`} onClick={() => open(r)}>
                  <span className="pr-mesa">{r.tableCode}</span>
                  <span className="pr-main">
                    <b>{r.name}</b>
                    <span>
                      {plural(r.guests, 'persona', 'personas')} · <code>{r.code}</code> · <Saldo balance={r.balance} />
                    </span>
                  </span>
                  <Arrival r={r} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      {!groups.length && <p className="empty">{rows.length ? 'Nadie con ese nombre, mesa o código. Revisa cómo se escribe.' : 'Todavía no hay reservas.'}</p>}
    </section>
  );
}

function Saldo({ balance }: { balance: number | null }) {
  if (balance === null) return <span>Saldo —</span>;
  if (balance > 0) {
    return (
      <span className="pr-due">
        <Icon name="clock" size="sm" />
        Debe {saldoText(balance)}
      </span>
    );
  }
  return (
    <span className="pr-ok">
      <Icon name="check" size="sm" />
      Pagado
    </span>
  );
}

function Arrival({ r }: { r: ProtocolRow }) {
  if (r.checkedIn === null) {
    return (
      <span className="pending">
        <span className="box" aria-hidden="true" />
        Pendiente
      </span>
    );
  }
  return (
    <span className="arrived">
      <span>
        <Icon name="check" size="sm" />
        Llegó
      </span>
      {r.checkedInAt && <small>{arrivalTime(r.checkedInAt)}</small>}
    </span>
  );
}
```

- [ ] **Step 4: Reemplaza `src/components/Board.tsx` (tercera sección)**

```tsx
'use client';

import { useCallback, useState } from 'react';
import type { Snapshot } from '@/lib/data';
import type { AreaCode, TableRow } from '@/lib/types';
import { placeName } from '@/lib/ui-format';
import type { Actions, Msg } from './actions';
import { Icon, type IconName } from './Icon';
import { MapView } from './MapView';
import { Panel } from './Panel';
import { ProtocolView } from './ProtocolView';
import { ReservationList } from './ReservationList';
import { Toast } from './Toast';
import { useIsMobile } from './useMedia';

export type View = 'mapa' | 'reservas' | 'protocolo';

const VIEWS: [View, string, IconName][] = [
  ['mapa', 'Mapa', 'map'],
  ['reservas', 'Reservas', 'list'],
  ['protocolo', 'Protocolo', 'clip'],
];

export interface BoardProps {
  snap: Snapshot;
  email: string;
  live: boolean;
  busy: boolean;
  msg: Msg | null;
  actions: Actions;
  onSaveDate: (value: string) => void;
  onSignOut: () => void;
  onDismissMsg: () => void;
}

/** Panel de Alejandro: encabezado con sello, secciones (barra inferior en el celular, pestañas en escritorio),
 *  hoja de la mesa (hoja inferior o columna) y aviso flotante. */
export function Board({ snap, email, live, busy, msg, actions, onSaveDate, onSignOut, onDismissMsg }: BoardProps) {
  const [view, setView] = useState<View>('mapa');
  const [area, setArea] = useState<AreaCode>('PB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const mobile = useIsMobile();
  const selected = snap.tables.find((t) => t.id === selectedId) ?? null;
  const close = useCallback(() => setSelectedId(null), []);

  function pick(t: TableRow) {
    setArea(t.area);
    setSelectedId(t.id);
  }
  function changeArea(a: AreaCode) {
    setArea(a);
    setSelectedId(null);
  }

  return (
    <div className="app">
      <header className="apphead">
        <img className="ah-seal" src="/brand/sello-morella.jpg" alt="" width={40} height={40} />
        <div className="ah-title">
          <h1 className="ah-wm">MOREFEST</h1>
          <p className="ah-sub">Renacer · {placeName(snap.event.venue)}</p>
        </div>
        <span className={`live${live ? '' : ' off'}`}>
          <i aria-hidden="true" />
          {live ? 'En vivo' : 'Sin conexión'}
        </span>
        <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Salir" title={`Salir (${email})`}>
          <Icon name="logout" />
        </button>
      </header>
      <nav className="tabbar" aria-label="Secciones">
        {VIEWS.map(([v, label, icon]) => (
          <button key={v} type="button" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </nav>
      <div className="layout">
        <main className="view" key={view}>
          {view === 'mapa' && (
            <MapView snap={snap} area={area} onArea={changeArea} selectedId={selectedId} onPick={pick} onSaveDate={onSaveDate} />
          )}
          {view === 'reservas' && <ReservationList tables={snap.tables} reservations={snap.reservations} onPick={pick} />}
          {view === 'protocolo' && (
            <ProtocolView tables={snap.tables} reservations={snap.reservations} event={snap.event} role={snap.role} onPick={pick} />
          )}
        </main>
        <Panel
          table={selected}
          event={snap.event}
          role={snap.role}
          reservations={snap.reservations}
          actions={actions}
          busy={busy}
          modal={mobile}
          onClose={close}
        />
      </div>
      <Toast msg={msg} onDone={onDismissMsg} />
    </div>
  );
}
```

- [ ] **Step 5: Agrega al final de `src/app/globals.css`**

```css
/* ---------- lista de protocolo (solo lectura; la fila abre la hoja) ---------- */
.proto-top{display:flex;flex-direction:column;gap:12px;padding:14px 16px 4px}
.proto-count{display:flex;align-items:baseline;flex-wrap:wrap;gap:8px;margin:0;font-size:15px;color:var(--fg-dim)}
.proto-count b{font:600 26px/1 var(--font-display);color:var(--gold);font-variant-numeric:tabular-nums}
.pmeter{height:6px;border-radius:3px;background:var(--surface-2);overflow:hidden}
.pmeter span{display:block;height:100%;background:var(--ok);transition:width 300ms var(--ease-out)}
.pgroup{margin:12px 16px 0;border-radius:var(--r-card);background:var(--surface);border:1px solid var(--hair);overflow:hidden}
.pg-head{display:flex;align-items:baseline;justify-content:space-between;gap:10px;margin:0;padding:10px 14px;background:var(--surface-2);font-size:inherit}
.pg-head b{font:600 17px var(--font-display);font-variation-settings:"opsz" 36,"SOFT" 50}
.pg-head small{font-size:13px;color:var(--fg-mute)}
.plist{list-style:none;margin:0;padding:0}
.prow{width:100%;display:grid;grid-template-columns:56px minmax(0,1fr) auto;gap:10px;align-items:center;min-height:68px;padding:10px 12px 10px 14px;border:0;border-top:1px solid var(--hair);background:transparent;color:var(--fg);font:inherit;text-align:left;cursor:pointer}
.plist li:first-child .prow{border-top:0}
.prow:hover{background:var(--surface-2)}
.pr-mesa{font:600 15px var(--font-mono)}
.pr-main{display:flex;flex-direction:column;gap:3px;min-width:0}
.pr-main b{font-size:16px;font-weight:600;line-height:1.25}
.pr-main > span{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:14px;color:var(--fg-dim)}
.pr-main code{font:500 13px var(--font-mono);color:var(--fg-dim)}
.pr-ok{color:var(--ok);display:inline-flex;align-items:center;gap:4px}
.pr-due{color:var(--gold);display:inline-flex;align-items:center;gap:4px;font-variant-numeric:tabular-nums}
.arrived{display:flex;flex-direction:column;align-items:flex-end;gap:2px;font:600 15px var(--font-ui);color:var(--ok)}
.arrived span{display:inline-flex;align-items:center;gap:4px}
.arrived small{font:500 13px var(--font-mono);color:var(--fg-dim);white-space:nowrap}
.pending{display:inline-flex;align-items:center;gap:6px;font:500 14px var(--font-ui);color:var(--fg-mute)}
.pending .box{width:18px;height:18px;border:1.5px solid var(--line-strong);border-radius:4px}
.prow.is-in .pr-main b{color:var(--fg-dim)}
@media (min-width:821px){
  .proto-top{padding-inline:0}
  .pgroup{margin-inline:0}
}
```

- [ ] **Step 6: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores.

- [ ] **Step 7: Captura a 390x844**

En `http://localhost:3000/vista-previa` toca "Protocolo" en la barra inferior; prototipo `#protocolo`. Nombre `T14-protocolo-390`.
Criterios: (a) barra inferior con tres secciones y "Protocolo" activo; (b) "Lista de protocolo" con "Fecha por anunciar. Toca una fila..."; (c) contador "14 de 93 personas llegaron · 14 reservas" con el 14 en dorado y la barra verde al 15 %; (d) "Por mesa" / "Por nombre" como control segmentado; (e) grupo "Planta baja" con PB-01 ... PB-16 en orden y grupo "Planta alta VIP" con VIP-05 y VIP-06; (f) Daniela Fuenmayor y Luis Ferrer con "Llegó" y su hora (8:52 p. m., 8:14 p. m.); los demás con casilla "Pendiente"; (g) saldos: "Debe $250,00" en Carmen Elena Ríos, "Pagado" en Héctor Urdaneta; (h) "Por nombre" reordena alfabéticamente dentro de cada planta; (i) tocar la fila de Carmen abre la hoja de PB-04 sobre la lista. Cada uno PASS/FAIL.

- [ ] **Step 8: Rol puerta y escritorio**

`/vista-previa?rol=puerta`: cada fila dice "Saldo —" y no hay montos (PASS/FAIL). A 1280x800: la lista ocupa la columna izquierda y la hoja se abre en la columna derecha sin salir de Protocolo (PASS/FAIL). Nombre `T14-protocolo-1280`.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ui-protocol.ts tests/ui.test.ts src/components/ProtocolView.tsx src/components/Board.tsx src/app/globals.css
git commit -m "Lista de protocolo: por planta, orden por mesa o por nombre, llegadas y saldos; la fila abre la hoja de la mesa"
```

---

### Task 15: Protocolo imprimible

**Files:**
- Modify: `src/lib/ui-format.ts` (función nueva al final)
- Modify: `tests/ui.test.ts` (bloque nuevo)
- Create: `src/components/PrintSheet.tsx`
- Modify: `src/components/ProtocolView.tsx` (botón "Imprimir lista")
- Modify: `src/components/Board.tsx` (se reemplaza entero)
- Modify: `src/app/vista-previa/Preview.tsx` y `page.dev.tsx` (se reemplazan enteros: lista larga para probar varias páginas)
- Modify: `src/app/globals.css` (bloque nuevo al final)

- [ ] **Step 1: Prueba del sello de impresión**

Al final de `tests/ui.test.ts`:

```ts
describe('hoja impresa', () => {
  it('sello de impresión con fecha y hora de Maracaibo', () => {
    expect(ui.printStamp(new Date('2026-10-18T01:41:00Z'))).toBe('17/10/2026, 9:41 p. m.');
  });
});
```

Run: `npx vitest run tests/ui.test.ts`
Expected: FAIL en "hoja impresa": `ui.printStamp is not a function`.

- [ ] **Step 2: Agrega al final de `src/lib/ui-format.ts`**

```ts
/** Sello de la hoja impresa: "17/10/2026, 9:41 p. m." en hora de Maracaibo. */
export function printStamp(now: Date): string {
  const day = new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: TZ }).format(now);
  return `${day}, ${arrivalTime(now.toISOString())}`;
}
```

Run: `npx vitest run tests/ui.test.ts`
Expected: PASS, `Tests  33 passed (33)`.

- [ ] **Step 3: Crea `src/components/PrintSheet.tsx`**

```tsx
import { eventDateLabel, protocolRows, protocolTotals } from '@/lib/logic';
import type { AppRole, EventRow, Reservation, TableRow } from '@/lib/types';
import { arrivalTime, plural, printStamp } from '@/lib/ui-format';
import { seesPayments } from '@/lib/ui-payments';
import { groupByArea, saldoText } from '@/lib/ui-protocol';

interface Props {
  event: EventRow;
  tables: TableRow[];
  reservations: Reservation[];
  role: AppRole | null;
  printedAt: Date | null;
}

/** Hoja de protocolo para imprimir: oculta en pantalla y única cosa visible en papel.
 *  Blanco y negro, sin teléfonos ni botones, cabecera repetida en cada página, filas sin partir. */
export function PrintSheet({ event, tables, reservations, role, printedAt }: Props) {
  const rows = protocolRows(tables, reservations, 'mesa', seesPayments(role));
  const totals = protocolTotals(rows);
  return (
    <div className="print-only" aria-hidden="true">
      <article className="print-sheet">
        <header className="ps-head">
          <div>
            <p className="ps-wm">MOREFEST</p>
            <p className="ps-sub">Renacer · Morella Montiel · {event.venue ?? 'Restaurante VOLTERRA, Maracaibo'}</p>
          </div>
          <div className="ps-meta">
            <b>Lista de protocolo</b>
            {eventDateLabel(event.event_date)}
            <br />
            Impresa: {printedAt ? printStamp(printedAt) : ''}
          </div>
        </header>
        <table className="ps-table">
          <thead>
            <tr>
              <th scope="col">Mesa</th>
              <th scope="col">Reserva</th>
              <th scope="col">Código</th>
              <th scope="col" className="n">
                Pers.
              </th>
              <th scope="col" className="n">
                Saldo
              </th>
              <th scope="col">Llegó</th>
            </tr>
          </thead>
          {groupByArea(rows).map((g) => (
            <tbody key={g.area}>
              <tr className="ps-area">
                <th colSpan={6} scope="colgroup">
                  {g.label}
                </th>
              </tr>
              {g.rows.map((r) => (
                <tr key={r.reservationId}>
                  <td className="mono">{r.tableCode}</td>
                  <td>{r.name}</td>
                  <td className="code">{r.code}</td>
                  <td className="n">{r.guests}</td>
                  <td className="n">{saldoText(r.balance)}</td>
                  <td className="when">{r.checkedInAt ? arrivalTime(r.checkedInAt) : r.checkedIn !== null ? 'Sí' : <span className="ps-box" />}</td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
        <footer className="ps-foot">
          <span>
            {plural(totals.reservations, 'reserva', 'reservas')} · {plural(totals.expected, 'persona', 'personas')} · {totals.inside} dentro
          </span>
          <span>Corporación Montiel</span>
        </footer>
      </article>
    </div>
  );
}
```

- [ ] **Step 4: Botón "Imprimir lista" en `ProtocolView.tsx`**

En `src/components/ProtocolView.tsx`:
- Reemplaza:
  ```ts
    role: AppRole | null;
    onPick: (t: TableRow) => void;
  }
  ```
  por:
  ```ts
    role: AppRole | null;
    onPick: (t: TableRow) => void;
    onPrint: () => void;
  }
  ```
- Reemplaza `export function ProtocolView({ tables, reservations, event, role, onPick }: Props) {` por `export function ProtocolView({ tables, reservations, event, role, onPick, onPrint }: Props) {`.
- Reemplaza:
  ```tsx
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </div>
  ```
  por:
  ```tsx
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <button type="button" className="btn btn-secondary btn-block" onClick={onPrint}>
          <Icon name="print" />
          Imprimir lista
        </button>
        <p className="help">Sale en blanco y negro, por mesa, sin teléfonos y con una casilla para marcar a mano. Mejor desde la computadora.</p>
      </div>
  ```

- [ ] **Step 5: Reemplaza `src/components/Board.tsx` (impresión)**

```tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import type { Snapshot } from '@/lib/data';
import type { AreaCode, TableRow } from '@/lib/types';
import { placeName } from '@/lib/ui-format';
import type { Actions, Msg } from './actions';
import { Icon, type IconName } from './Icon';
import { MapView } from './MapView';
import { Panel } from './Panel';
import { PrintSheet } from './PrintSheet';
import { ProtocolView } from './ProtocolView';
import { ReservationList } from './ReservationList';
import { Toast } from './Toast';
import { useIsMobile } from './useMedia';

export type View = 'mapa' | 'reservas' | 'protocolo';

const VIEWS: [View, string, IconName][] = [
  ['mapa', 'Mapa', 'map'],
  ['reservas', 'Reservas', 'list'],
  ['protocolo', 'Protocolo', 'clip'],
];

export interface BoardProps {
  snap: Snapshot;
  email: string;
  live: boolean;
  busy: boolean;
  msg: Msg | null;
  actions: Actions;
  onSaveDate: (value: string) => void;
  onSignOut: () => void;
  onDismissMsg: () => void;
}

/** Panel de Alejandro: encabezado con sello, secciones (barra inferior en el celular, pestañas en escritorio),
 *  hoja de la mesa (hoja inferior o columna), aviso flotante y la hoja de protocolo que sale al imprimir. */
export function Board({ snap, email, live, busy, msg, actions, onSaveDate, onSignOut, onDismissMsg }: BoardProps) {
  const [view, setView] = useState<View>('mapa');
  const [area, setArea] = useState<AreaCode>('PB');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [printedAt, setPrintedAt] = useState<Date | null>(null);
  const mobile = useIsMobile();
  const selected = snap.tables.find((t) => t.id === selectedId) ?? null;
  const close = useCallback(() => setSelectedId(null), []);

  // La hora de impresión se toma justo antes de imprimir, también con Ctrl+P.
  useEffect(() => {
    setPrintedAt(new Date());
    const before = () => flushSync(() => setPrintedAt(new Date()));
    window.addEventListener('beforeprint', before);
    return () => window.removeEventListener('beforeprint', before);
  }, []);

  function print() {
    flushSync(() => setPrintedAt(new Date()));
    window.print();
  }
  function pick(t: TableRow) {
    setArea(t.area);
    setSelectedId(t.id);
  }
  function changeArea(a: AreaCode) {
    setArea(a);
    setSelectedId(null);
  }

  return (
    <div className="app">
      <header className="apphead">
        <img className="ah-seal" src="/brand/sello-morella.jpg" alt="" width={40} height={40} />
        <div className="ah-title">
          <h1 className="ah-wm">MOREFEST</h1>
          <p className="ah-sub">Renacer · {placeName(snap.event.venue)}</p>
        </div>
        <span className={`live${live ? '' : ' off'}`}>
          <i aria-hidden="true" />
          {live ? 'En vivo' : 'Sin conexión'}
        </span>
        <button type="button" className="icon-btn" onClick={onSignOut} aria-label="Salir" title={`Salir (${email})`}>
          <Icon name="logout" />
        </button>
      </header>
      <nav className="tabbar" aria-label="Secciones">
        {VIEWS.map(([v, label, icon]) => (
          <button key={v} type="button" aria-current={view === v ? 'page' : undefined} onClick={() => setView(v)}>
            <Icon name={icon} />
            {label}
          </button>
        ))}
      </nav>
      <div className="layout">
        <main className="view" key={view}>
          {view === 'mapa' && (
            <MapView snap={snap} area={area} onArea={changeArea} selectedId={selectedId} onPick={pick} onSaveDate={onSaveDate} />
          )}
          {view === 'reservas' && <ReservationList tables={snap.tables} reservations={snap.reservations} onPick={pick} />}
          {view === 'protocolo' && (
            <ProtocolView tables={snap.tables} reservations={snap.reservations} event={snap.event} role={snap.role} onPick={pick} onPrint={print} />
          )}
        </main>
        <Panel
          table={selected}
          event={snap.event}
          role={snap.role}
          reservations={snap.reservations}
          actions={actions}
          busy={busy}
          modal={mobile}
          onClose={close}
        />
      </div>
      <Toast msg={msg} onDone={onDismissMsg} />
      <PrintSheet event={snap.event} tables={snap.tables} reservations={snap.reservations} role={snap.role} printedAt={printedAt} />
    </div>
  );
}
```

- [ ] **Step 6: Reemplaza `src/app/vista-previa/Preview.tsx` (lista larga opcional)**

```tsx
'use client';

import { useCallback, useState } from 'react';
import { Board } from '@/components/Board';
import { Login } from '@/components/Login';
import type { Actions, Msg } from '@/components/actions';
import type { Snapshot } from '@/lib/data';
import type { AppRole } from '@/lib/types';
import { FIXTURE } from './fixture';

interface Props {
  pantalla: 'entrar' | 'panel';
  rol: AppRole;
  /** Repite las reservas cuatro veces para probar la impresión en varias páginas. */
  largo: boolean;
}

/** Panel con datos de ejemplo y acciones que solo avisan: nada toca Supabase. */
export function Preview({ pantalla, rol, largo }: Props) {
  const [msg, setMsg] = useState<Msg | null>(null);
  const dismiss = useCallback(() => setMsg(null), []);
  if (pantalla === 'entrar') return <Login />;

  const aviso = (text: string) => {
    setMsg({ text: `Vista previa: ${text} No se guardó nada.`, err: false });
    return Promise.resolve(true);
  };
  const actions: Actions = {
    reserve: (t, v) => aviso(`reserva de ${v.guests} puestos en ${t.code} para ${v.name}.`),
    pay: (r, amount, method) => aviso(`pago de ${amount} por ${method} para ${r.name}.`),
    checkIn: (r) => aviso(`llegada de ${r.name}.`),
    cancel: (r) => aviso(`cancelación de ${r.name}.`),
    savePrices: (t) => aviso(`precios de ${t.code}.`),
    setEmail: (r, email) => aviso(email ? `correo ${email} para ${r.name}.` : `correo de ${r.name} borrado.`),
    notify: (text, err = false) => setMsg({ text, err }),
    reverse: (p, reason) => aviso(`reverso de ${p.amount} con motivo "${reason}".`),
  };

  const base: Snapshot = { ...FIXTURE, role: rol };
  const snap: Snapshot = largo
    ? {
        ...base,
        reservations: [0, 1, 2, 3].flatMap((k) =>
          base.reservations.map((r) => ({ ...r, id: `${r.id}-${k}`, code: k ? `${r.code.slice(0, 5)}${k}` : r.code })),
        ),
      }
    : base;

  return (
    <Board
      snap={snap}
      email="vista-previa@morefest.local"
      live
      busy={false}
      msg={msg}
      actions={actions}
      onSaveDate={(v) => void aviso(`fecha ${v || 'borrada'}.`)}
      onSignOut={() => void aviso('salir.')}
      onDismissMsg={dismiss}
    />
  );
}
```

- [ ] **Step 7: Reemplaza `src/app/vista-previa/page.dev.tsx`**

```tsx
import type { AppRole } from '@/lib/types';
import { Preview } from './Preview';

const ROLES: Record<string, AppRole> = { admin: 'admin', vendedor: 'seller', puerta: 'door' };

/**
 * Vista previa con datos de ejemplo, solo con `next dev` (ver pageExtensions en next.config.ts).
 *   /vista-previa                panel como admin
 *   /vista-previa?rol=vendedor   ve pagos, no revierte
 *   /vista-previa?rol=puerta     no ve pagos
 *   /vista-previa?largo=1        56 reservas, para probar la impresión en varias páginas
 *   /vista-previa?p=entrar       pantalla de entrada
 */
export default async function VistaPrevia({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const rol = ROLES[String(sp.rol ?? 'admin')] ?? 'admin';
  return <Preview pantalla={sp.p === 'entrar' ? 'entrar' : 'panel'} rol={rol} largo={sp.largo === '1'} />;
}
```

- [ ] **Step 8: Agrega al final de `src/app/globals.css`**

```css
/* ---------- imprimible: solo la lista de protocolo, blanco y negro, 12 pt ---------- */
@media print{
  @page{margin:12mm 10mm}
  :root{color-scheme:light}
  body{background:#fff;color:#000}
  .app > :not(.print-only){display:none!important}
  .print-only{display:block}
  .print-sheet{color:#000;background:#fff;font:400 12pt/1.35 var(--font-ui)}
  .ps-head{display:flex;justify-content:space-between;align-items:flex-end;gap:16pt;padding-bottom:8pt;border-bottom:2pt solid #000;break-after:avoid}
  .ps-wm{margin:0;font:800 22pt/1 var(--font-display);font-variation-settings:"opsz" 144,"SOFT" 60;letter-spacing:.03em}
  .ps-sub{margin:4pt 0 0;font-size:11pt}
  .ps-meta{font-size:11pt;text-align:right}
  .ps-meta b{display:block;font-size:12pt;text-transform:uppercase;letter-spacing:.06em}
  .ps-table{width:100%;border-collapse:collapse;margin-top:10pt;font-size:12pt}
  .ps-table thead{display:table-header-group}
  .ps-table th{padding:4pt;border-bottom:1.5pt solid #000;font-size:11pt;text-transform:uppercase;letter-spacing:.04em;text-align:left;white-space:nowrap}
  .ps-table td{padding:5pt 4pt;border-bottom:.75pt solid #999;vertical-align:top}
  .ps-table tr{break-inside:avoid;page-break-inside:avoid}
  .ps-table .ps-area th{padding-top:10pt;border-bottom:1pt solid #000;font-size:12pt;text-transform:none;letter-spacing:0}
  .ps-table .n{text-align:right;font-variant-numeric:tabular-nums}
  .ps-table .mono{font:600 12pt var(--font-mono);white-space:nowrap}
  .ps-table .code{font:500 11pt var(--font-mono)}
  .ps-table .when{white-space:nowrap}
  .ps-box{display:inline-block;width:12pt;height:12pt;border:1.2pt solid #000;border-radius:2pt;vertical-align:middle}
  .ps-foot{display:flex;justify-content:space-between;gap:12pt;margin-top:10pt;padding-top:6pt;border-top:1pt solid #000;font-size:11pt}
}
```

- [ ] **Step 9: Tipos, pruebas y build**

Run: `npm run typecheck && npm test && npm run build`
Expected: los tres sin errores.

- [ ] **Step 10: Impresión emulada con varias páginas**

Con `npm run dev` corriendo, Playwright: `browser_navigate` a `http://localhost:3000/vista-previa?largo=1`, luego `browser_run_code_unsafe` con:

```js
async (page) => {
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: 'C:/tmp/morefest-capturas/T15-protocolo.pdf', format: 'A4', printBackground: false });
  await page.screenshot({ path: 'C:/tmp/morefest-capturas/T15-imprimir-pantalla.png', fullPage: true });
  return 'ok';
}
```

Abre el PDF con `Read` (`pages: "1-3"`).
Criterios: (a) solo la hoja de protocolo, en blanco y negro, sin encabezado de la app, sin barra inferior ni botones; (b) arriba "MOREFEST", "Renacer · Morella Montiel · Restaurante VOLTERRA, Maracaibo", "LISTA DE PROTOCOLO", "Fecha por anunciar" e "Impresa: dd/mm/aaaa, h:mm"; (c) la fila de títulos (Mesa, Reserva, Código, Pers., Saldo, Llegó) se repite arriba de la página 2; (d) ninguna fila partida entre páginas; (e) ningún teléfono en la hoja; (f) casillas vacías en los pendientes y hora en los que llegaron; (g) pie con totales y "Corporación Montiel". Cada uno PASS/FAIL. Si `page.pdf` falla porque el navegador no es headless, usa la captura `T15-imprimir-pantalla.png` para (a), (b), (e), (f) y (g), y marca (c) y (d) NO VERIFICADO con imprimir a PDF a mano desde Chrome (Ctrl+P, "Guardar como PDF").

- [ ] **Step 11: Botón y rol puerta**

En `/vista-previa`, sección Protocolo: "Imprimir lista" abre el diálogo de impresión (en Playwright basta con que no haya error en consola; ciérralo con `Escape`) (PASS/FAIL). Con `/vista-previa?rol=puerta&largo=1` repite el PDF del Step 10: la columna Saldo dice "—" en todas las filas (PASS/FAIL).

- [ ] **Step 12: Commit**

```bash
git add src/lib/ui-format.ts tests/ui.test.ts src/components/PrintSheet.tsx src/components/ProtocolView.tsx src/components/Board.tsx src/app/vista-previa/Preview.tsx src/app/vista-previa/page.dev.tsx src/app/globals.css
git commit -m "Protocolo imprimible: hoja en blanco y negro sin teléfonos, cabecera repetida, filas sin partir y hora de impresión"
```

---

### Task 16: Verificación final

**Files:** ninguno, salvo lo que corrija `design-review` (que hace sus propios commits).

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: `Test Files  5 passed (5)` (`db`, `logic`, `data`, `headers`, `ui`) y `Tests  96 passed (96)`: las 62 del plan A más 1 de cabeceras y 33 de `tests/ui.test.ts` de este plan. Si el plan A terminó con otro número, el total cambia en la misma cantidad; lo que no puede haber es ninguna fallida.

- [ ] **Step 2: Tipos**

Run: `npm run typecheck`
Expected: sin errores.

- [ ] **Step 3: Build de producción**

Run: `npm run build`
Expected: sin errores; en la tabla de rutas aparecen `/`, `/_not-found`, `/apple-icon.png` y `/icon.svg`, y no aparece `/vista-previa`.

- [ ] **Step 4: Cabeceras y rutas en el servidor de producción**

Run (en segundo plano): `npx next start -p 3100`
Luego:
```bash
curl -sI http://localhost:3100/ | grep -i "content-security-policy"
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/vista-previa
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/icon.svg
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3100/brand/morella-lago-1280.jpg
```
Expected: la CSP trae `font-src 'self'` y `style-src 'self' 'unsafe-inline'` y no menciona `fonts.googleapis.com` ni `fonts.gstatic.com`; luego `404`, `200`, `200`. Detén el servidor.

- [ ] **Step 5: Recorrido visual a 390x844 contra el prototipo**

Procedimiento de captura, en este orden y con estos pares (app → prototipo):

| Captura | App | Prototipo |
|---|---|---|
| `F-01-entrar` | `/vista-previa?p=entrar` | `#login` |
| `F-02-mapa` | `/vista-previa` | `#mapa` |
| `F-03-hoja` | PB-05 abierta | `#mesa` |
| `F-04-nueva` | PB-16, "Nueva reserva" | `#nueva` |
| `F-05-correo` | PB-05, "Confirmación por correo" de María Fernanda | `#correo` |
| `F-06-reservas` | sección Reservas | `#reservas` |
| `F-07-protocolo` | sección Protocolo | `#protocolo` |
| `F-08-imprimir` | PDF del Step 10 de la tarea 15 | `#imprimir` |

Criterios generales (cada uno PASS/FAIL en las ocho): paleta espresso y crema sin grises fríos; Fraunces en wordmark y títulos, Inter en la interfaz, IBM Plex Mono en códigos; cifras y saldos en dorado; nada de texto sobre naranja que no sea espresso; controles de 44 px o más; ningún desplazamiento horizontal; foco visible (anillo ámbar) al recorrer con `Tab`; consola sin errores ni `Refused to load`.

- [ ] **Step 6: Recorrido a 1280x800**

Capturas `F-11-entrar-1280`, `F-12-mapa-1280` (con PB-05 abierta en la columna), `F-13-reservas-1280` (tabla) y `F-14-protocolo-1280`. Criterios: pestañas bajo el encabezado, columna derecha de 400 px con la hoja, ancho máximo de 1280 px centrado, sin desplazamiento horizontal. PASS/FAIL.

- [ ] **Step 7: Roles y movimiento reducido**

- `/vista-previa?rol=vendedor`: ve montos, no ve "Revertir". `/vista-previa?rol=puerta`: no ve montos; protocolo con "Saldo —". PASS/FAIL.
- `browser_emulate_media` con `reducedMotion: 'reduce'`: la hoja aparece sin subir y la foto de Entrar sin el zoom de entrada. PASS/FAIL.

- [ ] **Step 8: `design-review`**

Invoca la skill `design-review` sobre `http://localhost:3000/vista-previa` (390x844 y 1280x800) con este plan y el prototipo como referencia. Lo que corrija lo commitea ella; vuelve a correr los Steps 1 a 3 al final.

- [ ] **Step 9: Deja anotado lo que sigue (sin ejecutarlo)**

No hay commit en este paso. Lo que viene, fuera de este plan y en este orden (ver "Después de este plan").

---

## Después de este plan (fuera de alcance, con go de Francisco donde se indica)

1. 🔒 `blindar` sobre la rama (security-review y gate `.claude/gates/blindaje.json` firmado con un sha que exista en GitHub; `.claude/gates/` con `git add -f`).
2. **Aplicar la 0009 en Supabase** (`nymslckxukoqhifpkrgl`, SQL Editor) **antes del merge a `main`**, con go de Francisco, y verificarla con el MCP `supabase` (aviso 1 del plan A: sin la 0009, `loadSnapshot` falla en producción).
3. Merge a `main` y push; en Vercel, confirmar que el deploy quedó Ready y no "Canceled by Ignored Build Step".
4. Verificación en producción con Francisco: entrar con la foto, encabezado MOREFEST, plano, protocolo e impresión desde la computadora; cabeceras con `curl -sI`.
5. Actualizar `STATE.md`, `docs/DECISIONES.md` (vista previa solo de desarrollo; resumen 3 x 2; área de toque de 96 unidades; confirmación dentro de la tarjeta; protocolo de solo lectura) y la página de fbrain del proyecto.
6. Opcional, en archivo del plan A: borrar el alias `money` de `logic.ts` (ya ningún componente lo usa desde la tarea 10).

Vuelta atrás: en Vercel, promover el deploy `b0al54lmb`; en git, `git revert` del merge. La 0009 es aditiva; si hiciera falta, se revierte con una 0010.

## Riesgos

1. **`pageExtensions` sin probar en build hasta la tarea 4.** Si `/vista-previa` aparece en el build de producción, la tarea 4 trae el respaldo (`notFound()` en producción). NO VERIFICADO hasta correrlo.
2. **`next/font` baja las fuentes en el build:** sin internet el build falla. Vercel tiene salida; en local, correr el build con conexión.
3. **El motivo del reverso no se ve en la hoja:** `Payment` del plan A no trae `reason` (la columna existe en `payments`). La fila del reverso muestra método y fecha. Si Alejandro lo pide, se agrega `reason` al snapshot en `data.ts` (archivo del plan A) y una línea en `PayItem`.
4. **"Mesa" en el asunto del correo y "Sofá" en la hoja:** el plan A no tiene `kind` en `TableRow`, así que el correo dice "Mesa VIP-05" aunque la hoja diga "Sofá VIP-05". Igual la barra PB-16 se nombra "Mesa" en pantalla.
5. **Impresión desde el iPhone:** NO VERIFICADO (spec, sección 9). Se recomienda imprimir desde la computadora; el CSV queda de respaldo. El texto de ayuda del protocolo lo dice.
6. **`mix-blend-mode: multiply` del plano en Safari iOS:** el respaldo `filter: sepia(.25)` solo entra si el navegador no soporta `multiply`; si lo soporta pero pinta mal, no hay detección. Verificar en un iPhone real después del deploy.
7. **Bloqueo del fondo con la hoja abierta en iOS:** `overflow: hidden` en `body` no frena del todo el desplazamiento de fondo en Safari; la hoja usa `overscroll-behavior: contain` para minimizarlo.
8. **Correo en tiempo real:** `customers` no está en la publicación de Realtime (aviso 9 del plan A): un correo editado en otro celular aparece en la siguiente recarga (foco o 60 s).
9. **Planes en paralelo sobre la misma rama:** este plan no toca archivos del plan A y viceversa; si se ejecutan a la vez, cada tarea debe hacer `git pull --rebase` antes de commitear para no pisar el historial.
10. **`design-review` puede proponer cambios fuera del prototipo:** sus commits se revisan contra este plan antes de `blindar`.

## Autorrevisión: cobertura de la especificación

| Requisito (spec) | Tarea |
|---|---|
| §4 tokens con nombres del prototipo, papel crema, malva nunca como texto, texto sobre naranja en espresso | 2, 7 |
| §4 `next/font` (Fraunces, Inter, IBM Plex Mono 500) sin `<link>` a Google; CSP a `'self'` | 2, 3 |
| §4 base 16 px, controles de 48 px, foco ámbar de 2 px, movimiento 180 a 240 ms y `prefers-reduced-motion` | 2, 8, 16 |
| §4 montos `es-VE` | plan A (`formatMoney`), 10 |
| §4 fotos en `public/brand/` (máx. 1600 px, calidad 80), originales en `docs/brand/` | 1 |
| §2 y §3 rebautizo: título, metadatos, favicon, textos | 2, 5, 6 (nombre y lugar del evento: plan A) |
| §5 Entrar con `MORELLA_03`, viñeta, marca, pie | 5 |
| §5 encabezado con sello, lugar y fecha editable, en vivo, Salir; seis cifras doradas | 6, 10 |
| §5 mapa: pestañas, papel, cinco estados por trazo o trama, leyenda, selección, 44 px, zoom | 7 |
| §5 hoja inferior en el celular y columna en escritorio | 8 |
| §5 correo del cliente, "Enviar confirmación", "Copiar mensaje", "Revertir" solo admin | 11, 12, 13 |
| §5 nueva reserva con Correo opcional y validado | 11 |
| §5 reservas: tarjetas bajo 820 px, "Llegó" y "Con saldo", CSV `morefest-reservas-AAAA-MM-DD.csv` con correo | 9 (columna correo: plan A) |
| §5 protocolo: por planta, por mesa con interruptor alfabético, totales, la fila abre la hoja | 14 |
| §5 imprimible: blanco y negro, 12 pt, MOREFEST, fecha, hora de impresión, cabecera repetida, filas sin partir, sin botones ni teléfonos | 15 |
| §6 `mailto:` bajo 1.800 caracteres; si se pasa avisa y deja copiar; sin correo, deshabilitado con motivo | 12 (`mailtoHref`: plan A) |
| §8 nada nuevo para `anon`; "Revertir" solo admin; impreso sin teléfonos; `robots: noindex` | 2, 13, 15 |
| §9 casos borde: correo inválido bajo el campo; sin correo; pago ya revertido; reverso sin motivo; sin fecha; `multiply`; iPhone; rol puerta | 11, 12, 13, 10/14/15, 7, Riesgos 5, 13/14/15 |
| §10 capturas a 390x844 y 1280, impresión emulada, `design-review`, decidir `next dev` o vista previa | 4 (Decisión 1), 5 a 15, 16 |
| §11 orden de entrega y vuelta atrás (0009 antes del merge, ajuste del coordinador) | Después de este plan |
