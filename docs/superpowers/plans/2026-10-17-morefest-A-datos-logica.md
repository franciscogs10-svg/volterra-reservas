# MOREFEST A: datos y lógica. Plan de implementación

> **Para agentes:** SUB-SKILL OBLIGATORIA: usa `superpowers:subagent-driven-development` (recomendada) o `superpowers:executing-plans` para implementar este plan tarea por tarea. Los pasos usan casillas (`- [ ]`) para el seguimiento.

**Objetivo:** dejar listas la base (migración 0009), los tipos, el snapshot y la lógica pura que las pantallas MOREFEST (plan B) necesitan: correo del cliente, mensaje de confirmación con su enlace `mailto:`, lista de protocolo y montos en formato venezolano.

**Arquitectura:** la 0009 es aditiva (nombre y lugar del evento, columna `customers.email` con restricción de formato, función `set_customer_email` con `require_role`). `src/lib/data.ts` lee los campos nuevos y el rol de quien mira; `src/lib/logic.ts` suma funciones puras sin estado ni red, probadas en `tests/logic.test.ts`. Ningún componente cambia en este plan.

**Tecnología:** Postgres de Supabase (probado con PGlite), TypeScript 5.9, Vitest 5, `Intl` de Node 24 / navegador, Next.js 16 (solo para el build final).

**Especificación:** `docs/superpowers/specs/2026-10-17-morefest-identidad-design.md`, secciones 6, 7, 9 y 10.

---

## Antes de empezar

- Trabaja en el worktree `C:\Dev\volterra-reservas-wt-blindaje`, rama `feat/morefest-diseno`. Línea base: `npm test` da **35 pruebas en verde** y `npm run typecheck` sale limpio (VERIFICADO el 2026-10-17).
- **No apliques la 0009 en Supabase** ni hagas push: eso pide go de Francisco y va al final de la entrega (ver aviso 1).
- Archivos de este plan (el plan B no los toca): `supabase/migrations/0009_morefest.sql`, `tests/db.test.ts`, `src/lib/types.ts`, `src/lib/data.ts`, `src/lib/logic.ts`, `tests/logic.test.ts` y el archivo nuevo `tests/data.test.ts`. No toques `src/components`, `src/app`, `public` ni `next.config.ts`.
- Reglas del repo que aplican: una migración aplicada no se edita (la 0009 es nueva); sin borrados ni `drop`; funciones `security definer` con `set search_path = public`, `require_role(...)` como primera instrucción y `execute` solo para `authenticated`; la app usa solo la clave `anon`.
- Este plan se ejecutó completo en una copia de prueba antes de escribirse: las salidas esperadas que ves abajo son las reales (Node 24.14, Vitest 5.0.5, Next 16.4.2).

## Avisos y desviaciones del contrato (leer antes de la tarea 1)

1. **Problema real en el orden de entrega (spec §11).** Desde la tarea 2, `loadSnapshot` pide `customers.email`. Si el código llega a producción antes que la 0009, PostgREST responde "column does not exist" y la app queda en la pantalla de error. La 0009 es compatible con el código actual (solo agrega columna y función, y el encabezado de hoy no muestra `events.name`), así que el orden seguro es: **aplicar la 0009 en Supabase (con go de Francisco) antes del merge a `main`**, no después como dice la §11.
2. **`paidAmount` no se crea.** Ya existen `paid(r)` y `balance(r)` en `logic.ts` y los reversos ya son montos negativos (VERIFICADO, prueba "un reverso baja lo pagado y sube el saldo"). El plan B usa `paid(r)` y `balance(r)`.
3. **Agregados fuera del contrato, todos en archivos de este plan:**
   - `eventDateLabel(d: string | null): string` exportada: `"Sábado, 14 de noviembre de 2026"` o `"Fecha por anunciar"`. Es la que usa el mensaje; sirve al plan B para el encabezado y la hoja impresa (spec §9: "Fecha por anunciar en encabezado, mensaje y protocolo"). `fmtDate` queda igual.
   - `money` pasa a ser un alias de `formatMoney`: las pantallas actuales muestran `$240,00` desde que este plan entra, sin tocar componentes. El plan B puede pasar los imports a `formatMoney` y borrar el alias.
   - `toCsv` agrega la columna `correo` después de `whatsapp` (spec §5, "El CSV incluye el correo"). El nombre del archivo CSV vive en `ReservationList.tsx` y es del plan B.
   - `friendlyError` traduce los errores nuevos: formato de correo, reserva inexistente, pago inexistente, pago ya revertido y reverso sin motivo.
   - Archivo nuevo `tests/data.test.ts` con un cliente de Supabase de mentira para probar el snapshot.
4. **Reversos en el correo: se netean** (spec §6). Un pago revertido y su reverso no se listan, y lo listado suma exactamente "Pagado". Se apoya en la 0008: todo reverso nuevo apunta a su pago (`reverses_payment_id`) y en producción no había reversos viejos.
5. **Canceladas.** `Reservation` no tiene `status`; las canceladas se excluyen en `loadSnapshot` (`.neq('status', 'cancelled')`, VERIFICADO en `data.ts`). Por eso `protocolRows` no filtra y la prueba de "excluye canceladas" vive en `tests/data.test.ts`.
6. **El asunto siempre dice "Mesa"** (`Mesa PB-16`, `Mesa VIP-05`) como fija el contrato: `TableRow` no trae `kind`, así que la barra y los sofás no se nombran distinto. Cambiarlo pediría agregar `kind` a `TableRow` y a `data.ts`; queda como opción, no se hace aquí.
7. **Reserva de una mesa fuera del mapa** (mesa retirada con `active = false`): no sale en `protocolRows`, porque el snapshot solo trae mesas activas y no hay planta que asignarle. Hoy no existe ese caso.
8. **Correo con espacios.** `isValidEmail` valida el texto recortado; la base recorta solo espacios (`btrim`). El plan B debe mandar `valor.trim()` a `set_customer_email`; si llega algo raro, la base lo rechaza y `friendlyError` lo explica.
9. **Tiempo real.** `customers` no está en la publicación `supabase_realtime`: un correo cambiado en un celular llega a los otros en la siguiente recarga (foco o cada 60 s), no al instante. La acción local sí recarga (`run` en `Main.tsx`). Aceptable para un campo que edita solo Alejandro.
10. **`Main.tsx` no necesita ajuste.** Solo lee `snap.event`, `snap.tables` y `snap.reservations`; el typecheck de la tarea 2 lo comprueba (los únicos errores esperados están en `src/lib/data.ts` y en las pruebas).
11. **Para el plan B:** `canSeePayments` es `role === 'admin' || role === 'seller'` (espejo de la política `read_pay` de 0001). Al crear una reserva con correo, valida con `isValidEmail` antes de llamar `create_reservation`, y luego llama `set_customer_email`. `mailtoHref` devuelve `null` solo por largo: la falta de correo la decide la pantalla.

## Mapa de archivos

| Archivo | Responsabilidad | Tarea |
|---|---|---|
| `supabase/migrations/0009_morefest.sql` (nuevo) | Nombre y lugar del evento, `customers.email` con su restricción, `set_customer_email` y sus permisos | 1 |
| `tests/db.test.ts` | Corre la 0009 en el arnés PGlite y la prueba | 1 |
| `src/lib/types.ts` | `AppRole`, `EventRow.venue`, `Payment.created_at` y `reverses_payment_id`, `Reservation.email` y `checked_in_at`, `ProtocolRow` | 2 |
| `src/lib/data.ts` | Snapshot con `role`, `venue`, correo, fecha y enlace de cada pago, hora de llegada | 2 |
| `tests/data.test.ts` (nuevo) | Prueba el snapshot con un cliente de Supabase de mentira | 2 |
| `src/lib/logic.ts` | `formatMoney`, `isValidEmail`, `eventDateLabel`, `confirmationMessage`, `mailtoHref`, `protocolRows`, `protocolTotals`, CSV con correo, errores nuevos | 3 a 7 |
| `tests/logic.test.ts` | Fixtures con los campos nuevos y pruebas de toda la lógica nueva | 2 a 7 |

Conteo de pruebas esperado: 35 → 42 (T1) → 45 (T2) → 48 (T3) → 52 (T4) → 55 (T5) → 60 (T6) → 62 (T7).

---

### Tarea 1: migración 0009 con pruebas PGlite

**Archivos:**
- Crear: `supabase/migrations/0009_morefest.sql`
- Modificar: `tests/db.test.ts:56-67` (lista de migraciones) y final del archivo (pruebas nuevas)

- [ ] **Paso 1: agrega la 0009 a la lista de migraciones del arnés**

En `tests/db.test.ts`, reemplaza:

```ts
    '0008_blindaje.sql',
  ]) {
```

por:

```ts
    '0008_blindaje.sql',
    '0009_morefest.sql',
  ]) {
```

- [ ] **Paso 2: escribe las pruebas de la 0009 al final de `tests/db.test.ts`**

Agrega este bloque después del último `});` del archivo (el que cierra `describe('permisos y auditoría', ...)`). Usa `PB-12`, que ninguna prueba anterior reserva:

```ts
describe('MOREFEST (0009)', () => {
  let res: string;
  let door: string;
  const emailOf = async (id: string) =>
    (await one<{ email: string | null }>(
      'select c.email from customers c join reservations r on r.customer_id = c.id where r.id = $1', [id])).email;

  beforeAll(async () => {
    res = await reserveAt('PB-12', 2, 80, 0);
    door = (await one<{ id: string }>("insert into auth.users (email) values ('puerta@volterra.test') returning id")).id;
    await db.query("update profiles set role = 'door', active = true where id = $1", [door]);
  });

  it('el evento se llama MOREFEST y queda en el restaurante VOLTERRA', async () => {
    expect(await one('select name, venue from events')).toEqual({ name: 'MOREFEST', venue: 'Restaurante VOLTERRA, Maracaibo' });
  });

  it('guarda el correo en minúsculas y sin espacios a los lados', async () => {
    await db.query('select set_customer_email($1, $2)', [res, '  Mafer.Urdaneta@Ejemplo.COM ']);
    expect(await emailOf(res)).toBe('mafer.urdaneta@ejemplo.com');
  });

  it('rechaza un correo sin formato, también por fuera de la función', async () => {
    await expect(db.query('select set_customer_email($1, $2)', [res, 'mafer@ejemplo'])).rejects.toThrow(/customers_email_format/);
    await expect(
      db.query("update customers set email = 'sin arroba' where id = (select customer_id from reservations where id = $1)", [res]),
    ).rejects.toThrow(/customers_email_format/);
    expect(await emailOf(res)).toBe('mafer.urdaneta@ejemplo.com');
  });

  it('null o un texto vacío borran el correo', async () => {
    await db.query('select set_customer_email($1, $2)', [res, null]);
    expect(await emailOf(res)).toBeNull();
    await db.query('select set_customer_email($1, $2)', [res, 'a@b.co']);
    await db.query('select set_customer_email($1, $2)', [res, '   ']);
    expect(await emailOf(res)).toBeNull();
  });

  it('el vendedor sí cambia el correo; la puerta no', async () => {
    await as(seller);
    await db.query('select set_customer_email($1, $2)', [res, 'vendedor@cliente.com']);
    await as(door);
    await expect(db.query('select set_customer_email($1, $2)', [res, 'puerta@cliente.com'])).rejects.toThrow(/forbidden/);
    await as(admin);
    expect(await emailOf(res)).toBe('vendedor@cliente.com');
  });

  it('por la API: sin sesión no se ejecuta; con sesión de vendedor sí', async () => {
    const call = `select set_customer_email('${res}'::uuid, 'api@cliente.com')`;
    await expect(viaApi('anon', null, call)).rejects.toThrow(/permission denied/);
    await viaApi('authenticated', seller, call);
    expect(await emailOf(res)).toBe('api@cliente.com');
  });

  it('una reserva inexistente se rechaza', async () => {
    await expect(
      db.query('select set_customer_email($1, $2)', ['00000000-0000-0000-0000-000000000000', 'a@b.co']),
    ).rejects.toThrow(/reserva inexistente/);
  });
});
```

- [ ] **Paso 3: corre las pruebas de base y confirma que fallan**

Run: `npx vitest run tests/db.test.ts`
Expected: FAIL con `Error: ENOENT: no such file or directory, open '...\supabase\migrations\0009_morefest.sql'` y `Tests  28 skipped (28)`.

- [ ] **Paso 4: escribe la migración**

Crea `supabase/migrations/0009_morefest.sql` con exactamente esto:

```sql
-- MOREFEST (2026-10-17): la app se rebautiza y guarda el correo del cliente.
-- Aditiva: agrega una columna y una función y cambia el nombre del evento. Si hiciera falta volver atrás, se escribe una 0010.

-- 1. Nombre y lugar del evento. Hay un solo evento (sembrado en 0002) y la columna venue existe desde 0001.
update events set name = 'MOREFEST', venue = 'Restaurante VOLTERRA, Maracaibo';

-- 2. Correo del cliente, opcional. El formato se exige en la tabla, no solo en la interfaz.
alter table customers add column email text
  constraint customers_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- 3. Guardar o borrar el correo del cliente de una reserva. No se toca create_reservation:
--    cambiarle la firma crearía una sobrecarga ambigua en PostgREST. La interfaz llama
--    create_reservation y luego set_customer_email si hay correo.
create function set_customer_email(p_res uuid, p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare v_customer uuid;
begin
  perform require_role('admin','seller');
  select customer_id into v_customer from reservations where id = p_res;
  if not found then raise exception 'reserva inexistente'; end if;
  update customers set email = nullif(lower(btrim(p_email)), '') where id = v_customer;
end $$;

-- Solo usuarios con sesión pueden llamarla: Supabase abre las funciones nuevas a anon por defecto.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function set_customer_email(uuid, text) from public, anon;
    grant execute on function set_customer_email(uuid, text) to authenticated;
  end if;
end $$;
```

Notas: `venue` existe desde la 0001 (línea 19), por eso no hay `alter table events`. El bloque de permisos replica el de la 0001 (líneas 298-316). Dentro de un corchete de expresión regular de Postgres, `\s` vale como `[:space:]`.

- [ ] **Paso 5: corre las pruebas de base y confirma que pasan**

Run: `npx vitest run tests/db.test.ts`
Expected: PASS, `Tests  28 passed (28)`.

Comprobación hecha al escribir el plan: si se quita el bloque `do $$ ... $$` de permisos, falla justo "por la API: sin sesión no se ejecuta" (`expected ... /permission denied/ but got 'forbidden'`). La prueba sí cuida los permisos.

- [ ] **Paso 6: confirma la suite completa y que la migración no borra nada**

Run: `npm test`
Expected: `Test Files  3 passed (3)` y `Tests  42 passed (42)`.

Run: `grep -niE '\b(delete|drop)\b' supabase/migrations/0009_morefest.sql; echo "exit=$?"`
Expected: solo `exit=1` (ninguna coincidencia).

- [ ] **Paso 7: commit**

```bash
git add supabase/migrations/0009_morefest.sql tests/db.test.ts
git commit -m "Migración 0009: MOREFEST en el evento, correo del cliente y set_customer_email con pruebas" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 2: tipos y snapshot

**Archivos:**
- Crear: `tests/data.test.ts`
- Modificar: `src/lib/types.ts` (archivo completo), `src/lib/data.ts` (archivo completo), `tests/logic.test.ts:3-13` (fixtures)

- [ ] **Paso 1: escribe la prueba del snapshot**

Crea `tests/data.test.ts`:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { loadSnapshot } from '../src/lib/data';

/** Cliente de Supabase de mentira: anota qué pidió cada tabla y devuelve filas fijas, como las manda PostgREST. */
function fakeSupabase(rows: Record<string, unknown>, role: string | null) {
  const asked: Record<string, string> = {};
  const filters: string[] = [];
  const from = (table: string) => {
    const result = { data: rows[table], error: null };
    const q: any = {
      select: (cols: string) => {
        asked[table] = cols;
        return q;
      },
      eq: () => q,
      neq: (col: string, val: string) => {
        filters.push(`${table}.${col} <> ${val}`);
        return q;
      },
      order: () => q,
      limit: () => q,
      maybeSingle: () => Promise.resolve(result),
      then: (ok: (v: typeof result) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(result).then(ok, ko),
    };
    return q;
  };
  const rpc = (fn: string) => Promise.resolve({ data: fn === 'current_role_name' ? role : null, error: null });
  return { sb: { from, rpc } as unknown as SupabaseClient, asked, filters };
}

const reservation = {
  id: 'r1', code: 'A3F91C', table_id: 't1', guests: 6, total_price: '240.00', notes: null,
  customers: { full_name: 'María Fernanda Urdaneta', phone: '+58 414 612 3348', email: 'mafer@ejemplo.com' },
  payments: [
    { id: 'p1', amount: '100.00', kind: 'payment', method: 'Pago móvil', created_at: '2026-10-10T14:00:00+00:00', reverses_payment_id: null },
    { id: 'p2', amount: '-100.00', kind: 'reversal', method: 'Pago móvil', created_at: '2026-10-11T14:00:00+00:00', reverses_payment_id: 'p1' },
  ],
  check_ins: { people_in: 6, checked_at: '2026-11-15T00:52:00+00:00' },
};
const rows = {
  events: { id: 'e1', name: 'MOREFEST', venue: 'Restaurante VOLTERRA, Maracaibo', event_date: null },
  tables: [{
    id: 't1', code: 'PB-05', capacity: 10, price: '400.00', seat_price: null,
    map_x: '472', map_y: '270', map_w: '108', map_h: '30', map_rot: '-22', shape: 'r', areas: { code: 'PB' },
  }],
  reservations: [reservation],
};

describe('snapshot', () => {
  it('pide el lugar, el correo, la fecha de cada pago, la hora de llegada y deja fuera las canceladas', async () => {
    const { sb, asked, filters } = fakeSupabase(rows, 'door');
    await loadSnapshot(sb);
    expect(asked.events).toBe('id,name,venue,event_date');
    expect(asked.reservations).toContain('customers(full_name,phone,email)');
    expect(asked.reservations).toContain('payments(id,amount,kind,method,created_at,reverses_payment_id)');
    expect(asked.reservations).toContain('check_ins(people_in,checked_at)');
    expect(filters).toContain('reservations.status <> cancelled');
  });

  it('entrega el rol, el lugar, el correo, los pagos con fecha y la llegada', async () => {
    const { sb } = fakeSupabase(rows, 'seller');
    const s = await loadSnapshot(sb);
    expect(s.role).toBe('seller');
    expect(s.event.venue).toBe('Restaurante VOLTERRA, Maracaibo');
    const r = s.reservations[0];
    expect(r.email).toBe('mafer@ejemplo.com');
    expect(r.payments).toEqual([
      { id: 'p1', amount: 100, kind: 'payment', method: 'Pago móvil', created_at: '2026-10-10T14:00:00+00:00', reverses_payment_id: null },
      { id: 'p2', amount: -100, kind: 'reversal', method: 'Pago móvil', created_at: '2026-10-11T14:00:00+00:00', reverses_payment_id: 'p1' },
    ]);
    expect(r.checked_in).toBe(6);
    expect(r.checked_in_at).toBe('2026-11-15T00:52:00+00:00');
  });

  it('sin perfil activo el rol es null; sin correo ni llegada quedan en null', async () => {
    const bare = { ...reservation, customers: { full_name: 'Ana', phone: null }, check_ins: null };
    const { sb } = fakeSupabase({ ...rows, reservations: [bare] }, null);
    const s = await loadSnapshot(sb);
    expect(s.role).toBeNull();
    expect(s.reservations[0].email).toBeNull();
    expect(s.reservations[0].checked_in).toBeNull();
    expect(s.reservations[0].checked_in_at).toBeNull();
  });
});
```

- [ ] **Paso 2: corre la prueba y confirma que falla**

Run: `npx vitest run tests/data.test.ts`
Expected: FAIL, `Tests  3 failed (3)`, con:
- `AssertionError: expected 'id,name,event_date' to be 'id,name,venue,event_date'`
- `AssertionError: expected undefined to be 'seller'`
- `AssertionError: expected undefined to be null`

- [ ] **Paso 3: actualiza los tipos**

Reemplaza todo `src/lib/types.ts` por:

```ts
export type AreaCode = 'PB' | 'VIP';
export type AppRole = 'admin' | 'seller' | 'door';

export interface EventRow {
  id: string;
  name: string;
  venue: string | null;
  event_date: string | null;
}

export interface TableRow {
  id: string;
  code: string;
  area: AreaCode;
  capacity: number;
  price: number | null;
  seat_price: number | null;
  map_x: number;
  map_y: number;
  map_w: number;
  map_h: number;
  map_rot: number;
  shape: 'r' | 'c';
}

export interface Payment {
  id: string;
  amount: number;
  kind: 'payment' | 'reversal';
  method: string;
  created_at: string;
  /** En un reverso, el pago que revierte (0008). Null en los pagos. */
  reverses_payment_id: string | null;
}

export interface Reservation {
  id: string;
  code: string;
  table_id: string;
  guests: number;
  total_price: number;
  notes: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  payments: Payment[];
  checked_in: number | null;
  checked_in_at: string | null;
}

export type TableStatus = 'free' | 'part' | 'held' | 'paid' | 'in';
export type ResStatus = 'held' | 'paid' | 'in';

/** Una fila de la lista de protocolo de la puerta. `balance` es null cuando el rol no ve pagos (puerta). */
export interface ProtocolRow {
  reservationId: string;
  tableId: string;
  tableCode: string;
  area: AreaCode;
  name: string;
  guests: number;
  code: string;
  balance: number | null;
  checkedIn: number | null;
  checkedInAt: string | null;
  notes: string | null;
}
```

- [ ] **Paso 4: corre el typecheck y confirma dónde rompe**

Run: `npm run typecheck`
Expected: FAIL. Los errores salen solo en:
- `src/lib/data.ts(52,9): error TS2322` (al objeto de la reserva le faltan `email` y `checked_in_at`),
- `tests/data.test.ts(64,14)` y `(80,14)`: `Property 'role' does not exist on type 'Snapshot'`,
- `tests/logic.test.ts` (fixtures `res` y `pay` sin los campos nuevos).

Ningún error en `src/components/`: confirma que `Main.tsx` y los demás no necesitan ajuste.

- [ ] **Paso 5: actualiza el snapshot**

Reemplaza todo `src/lib/data.ts` por:

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppRole, AreaCode, EventRow, Payment, Reservation, TableRow } from './types';

export interface Snapshot {
  event: EventRow;
  tables: TableRow[];
  reservations: Reservation[];
  /** Rol de quien mira (current_role_name). Null si su perfil no está activo. La puerta no ve pagos (RLS). */
  role: AppRole | null;
}

type Num = number | string | null;
const num = (v: Num) => (v === null ? null : Number(v));
const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? (v[0] ?? null) : v);

export async function loadSnapshot(sb: SupabaseClient): Promise<Snapshot> {
  const ev = await sb.from('events').select('id,name,venue,event_date').limit(1).maybeSingle();
  if (ev.error) throw ev.error;
  if (!ev.data) throw new Error('No hay un evento cargado. Aplica supabase/migrations/0002_seed.sql.');
  const event = ev.data as EventRow;

  const [tb, rs, rl] = await Promise.all([
    sb
      .from('tables')
      .select('id,code,capacity,price,seat_price,map_x,map_y,map_w,map_h,map_rot,shape,areas(code)')
      .eq('event_id', event.id)
      .eq('active', true)
      .order('code'),
    sb
      .from('reservations')
      .select(
        'id,code,table_id,guests,total_price,notes,customers(full_name,phone,email),' +
          'payments(id,amount,kind,method,created_at,reverses_payment_id),check_ins(people_in,checked_at)',
      )
      .eq('event_id', event.id)
      .neq('status', 'cancelled')
      .order('created_at'),
    sb.rpc('current_role_name'),
  ]);
  if (tb.error) throw tb.error;
  if (rs.error) throw rs.error;
  if (rl.error) throw rl.error;

  const tables: TableRow[] = (tb.data ?? []).map((t: any) => ({
    id: t.id,
    code: t.code,
    area: one<{ code: string }>(t.areas)?.code as AreaCode,
    capacity: t.capacity,
    price: num(t.price),
    seat_price: num(t.seat_price),
    map_x: Number(t.map_x),
    map_y: Number(t.map_y),
    map_w: Number(t.map_w),
    map_h: Number(t.map_h),
    map_rot: Number(t.map_rot),
    shape: t.shape,
  }));

  const reservations: Reservation[] = (rs.data ?? []).map((r: any) => {
    const c = one<{ full_name: string; phone: string | null; email?: string | null }>(r.customers);
    const ci = one<{ people_in: number; checked_at: string }>(r.check_ins);
    return {
      id: r.id,
      code: r.code,
      table_id: r.table_id,
      guests: r.guests,
      total_price: Number(r.total_price),
      notes: r.notes,
      name: c?.full_name ?? 'Sin nombre',
      phone: c?.phone ?? null,
      email: c?.email ?? null,
      payments: (r.payments ?? []).map(
        (p: any): Payment => ({
          id: p.id,
          amount: Number(p.amount),
          kind: p.kind,
          method: p.method,
          created_at: p.created_at,
          reverses_payment_id: p.reverses_payment_id ?? null,
        }),
      ),
      checked_in: ci?.people_in ?? null,
      checked_in_at: ci?.checked_at ?? null,
    };
  });

  return { event, tables, reservations, role: (rl.data as AppRole | null) ?? null };
}
```

Nota: `current_role_name()` existe desde la 0001 y su `execute` está concedido a `authenticated` (0001, líneas 310-313). Devuelve null si el perfil no está activo.

- [ ] **Paso 6: pon los campos nuevos en los fixtures de `tests/logic.test.ts`**

Reemplaza:

```ts
import type { Reservation, TableRow } from '../src/lib/types';

const table = (over: Partial<TableRow> = {}): TableRow => ({
  id: 't1', code: 'PB-04', area: 'PB', capacity: 10, price: null, seat_price: null,
  map_x: 0, map_y: 0, map_w: 10, map_h: 10, map_rot: 0, shape: 'r', ...over,
});
const res = (over: Partial<Reservation> = {}): Reservation => ({
  id: 'r1', code: 'AB12CD', table_id: 't1', guests: 4, total_price: 100, notes: null,
  name: 'Marcela', phone: '+58 412', payments: [], checked_in: null, ...over,
});
const pay = (amount: number) => ({ id: String(Math.random()), amount, kind: 'payment' as const, method: 'Efectivo' });
```

por:

```ts
import type { Payment, Reservation, TableRow } from '../src/lib/types';

const table = (over: Partial<TableRow> = {}): TableRow => ({
  id: 't1', code: 'PB-04', area: 'PB', capacity: 10, price: null, seat_price: null,
  map_x: 0, map_y: 0, map_w: 10, map_h: 10, map_rot: 0, shape: 'r', ...over,
});
const res = (over: Partial<Reservation> = {}): Reservation => ({
  id: 'r1', code: 'AB12CD', table_id: 't1', guests: 4, total_price: 100, notes: null,
  name: 'Marcela', phone: '+58 412', email: null, payments: [], checked_in: null, checked_in_at: null, ...over,
});
const pay = (amount: number, over: Partial<Payment> = {}): Payment => ({
  id: String(Math.random()), amount, kind: 'payment', method: 'Efectivo',
  created_at: '2026-10-12T15:00:00+00:00', reverses_payment_id: null, ...over,
});
```

- [ ] **Paso 7: typecheck y suite completa en verde**

Run: `npm run typecheck`
Expected: PASS, sin salida después de `> tsc --noEmit`.

Run: `npm test`
Expected: `Test Files  4 passed (4)` y `Tests  45 passed (45)`.

- [ ] **Paso 8: commit**

```bash
git add src/lib/types.ts src/lib/data.ts tests/data.test.ts tests/logic.test.ts
git commit -m "Tipos y snapshot MOREFEST: rol, lugar, correo, fecha y enlace de los pagos, hora de llegada" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 3: `formatMoney` e `isValidEmail`

**Archivos:**
- Modificar: `src/lib/logic.ts:11` (la línea de `money`)
- Test: `tests/logic.test.ts` (import y bloque nuevo al final)

Dato medido al escribir el plan: en Node 24.14, `new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' }).format(240)` da `"USD 240,00"` (con espacio duro U+00A0) y `-80` da `"USD-80,00"`. Por eso el monto se arma con `formatToParts`, tomando solo los dígitos y separadores, y se le pone `$` y el signo a mano. Así sale igual en cualquier versión de ICU.

- [ ] **Paso 1: escribe las pruebas**

En `tests/logic.test.ts`, reemplaza:

```ts
import { balance, friendlyError, resStatus, seatPrice, summarize, tableStatus, toCsv } from '../src/lib/logic';
```

por:

```ts
import {
  balance, formatMoney, friendlyError, isValidEmail, money, resStatus, seatPrice, summarize, tableStatus, toCsv,
} from '../src/lib/logic';
```

y agrega al final del archivo:

```ts
describe('montos y correo', () => {
  it('formatea montos al estilo venezolano', () => {
    expect(formatMoney(240)).toBe('$240,00');
    expect(formatMoney(1234.5)).toBe('$1.234,50');
    expect(formatMoney(0)).toBe('$0,00');
    expect(formatMoney(-80)).toBe('-$80,00');
    expect(formatMoney(-0.001)).toBe('$0,00');
    expect(formatMoney(0.1 + 0.2)).toBe('$0,30');
  });
  it('money da el mismo formato, para los componentes que todavía lo importan', () => {
    expect(money(1234.5)).toBe('$1.234,50');
  });
  it('valida el correo con la misma regla que la base', () => {
    expect(isValidEmail('mafer.urdaneta@ejemplo.com')).toBe(true);
    expect(isValidEmail('  Mafer@Ejemplo.COM ')).toBe(true);
    expect(isValidEmail('mafer@ejemplo')).toBe(false);
    expect(isValidEmail('mafer urdaneta@ejemplo.com')).toBe(false);
    expect(isValidEmail('a@@b.co')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});
```

- [ ] **Paso 2: corre y confirma que falla**

Run: `npx vitest run tests/logic.test.ts`
Expected: FAIL, `Tests  3 failed | 11 passed (14)`, con `TypeError: formatMoney is not a function`, `AssertionError: expected '$1234.50' to be '$1.234,50'` y `TypeError: isValidEmail is not a function`.

- [ ] **Paso 3: implementa**

En `src/lib/logic.ts`, reemplaza:

```ts
export const money = (n: number) => `$${n.toFixed(2)}`;
```

por:

```ts
const MONEY = new Intl.NumberFormat('es-VE', { style: 'currency', currency: 'USD' });
const DIGIT_PARTS = new Set(['integer', 'group', 'decimal', 'fraction']);

/** Monto al estilo venezolano: $1.234,50 y -$80,00. Se arma con las partes de Intl porque, según
 *  la versión de ICU, el símbolo sale como "USD", "US$" o "$" y con espacios duros (Node 24 da "USD 240,00"). */
export function formatMoney(n: number): string {
  const digits = MONEY.formatToParts(Math.abs(n))
    .filter((p) => DIGIT_PARTS.has(p.type))
    .map((p) => p.value)
    .join('');
  return `${n < 0 && /[1-9]/.test(digits) ? '-' : ''}$${digits}`;
}

/** Nombre viejo: los componentes actuales lo importan. Cuando el plan B los pase a formatMoney, se borra. */
export const money = formatMoney;

/** Misma regla que la restricción customers_email_format (0009), sobre el texto sin espacios a los lados. */
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/i;
export const isValidEmail = (s: string) => EMAIL.test(s.trim());
```

- [ ] **Paso 4: corre y confirma que pasa**

Run: `npx vitest run tests/logic.test.ts`
Expected: PASS, `Tests  14 passed (14)`.

- [ ] **Paso 5: commit**

```bash
git add src/lib/logic.ts tests/logic.test.ts
git commit -m "Montos en formato venezolano (formatMoney) y validación de correo igual a la de la base" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 4: `eventDateLabel` y `confirmationMessage`

**Archivos:**
- Modificar: `src/lib/logic.ts:1` (import) y final del archivo
- Test: `tests/logic.test.ts` (import y bloques nuevos al final)

Decisiones de esta tarea (spec §6): saludo con el nombre completo; fecha del evento larga en español o "Fecha por anunciar"; fechas de los abonos en `dd/mm/aaaa` en hora de Venezuela (`America/Caracas`, para que un abono de las 10:30 p. m. no salga con el día siguiente); abonos en orden de fecha; los reversos netean (aviso 4); "Pagado completo" solo si el total es mayor que cero y no queda saldo (mismo criterio que `resStatus`).

- [ ] **Paso 1: escribe las pruebas**

En `tests/logic.test.ts`, reemplaza el import de lógica y el de tipos:

```ts
import {
  balance, formatMoney, friendlyError, isValidEmail, money, resStatus, seatPrice, summarize, tableStatus, toCsv,
} from '../src/lib/logic';
import type { Payment, Reservation, TableRow } from '../src/lib/types';
```

por:

```ts
import {
  balance, confirmationMessage, eventDateLabel, formatMoney, friendlyError, isValidEmail, money, resStatus, seatPrice,
  summarize, tableStatus, toCsv,
} from '../src/lib/logic';
import type { EventRow, Payment, Reservation, TableRow } from '../src/lib/types';
```

y agrega al final del archivo:

```ts
const ev = (over: Partial<EventRow> = {}): EventRow => ({
  id: 'e1', name: 'MOREFEST', venue: 'Restaurante VOLTERRA, Maracaibo', event_date: '2026-11-14', ...over,
});

describe('fecha del evento', () => {
  it('en español con el día de la semana, o por anunciar', () => {
    expect(eventDateLabel('2026-11-14')).toBe('Sábado, 14 de noviembre de 2026');
    expect(eventDateLabel(null)).toBe('Fecha por anunciar');
  });
});

describe('mensaje de confirmación', () => {
  const t = table({ code: 'PB-07' });
  const conSaldo = res({
    name: 'José Ángel Añez', code: 'A3F91C', guests: 6, total_price: 300,
    payments: [
      pay(140, { id: 'p2', method: 'Zelle', created_at: '2026-10-14T15:00:00+00:00' }),
      pay(100, { id: 'p1', method: 'Pago móvil', created_at: '2026-10-10T15:00:00+00:00' }),
    ],
  });

  it('asunto con la mesa; cuerpo con abonos en orden de fecha, pagado y saldo', () => {
    const m = confirmationMessage(conSaldo, t, ev());
    expect(m.subject).toBe('MOREFEST · Confirmación de tu reserva (Mesa PB-07)');
    expect(m.body).toBe([
      'Hola, José Ángel Añez:',
      '',
      'Te confirmamos tu reserva para MOREFEST.',
      '',
      'Mesa PB-07, planta baja',
      '6 personas',
      'Sábado, 14 de noviembre de 2026',
      'Restaurante VOLTERRA, Maracaibo',
      'Código de reserva: A3F91C',
      '',
      'Total: $300,00',
      'Abonos:',
      '- 10/10/2026, Pago móvil: $100,00',
      '- 14/10/2026, Zelle: $140,00',
      'Pagado: $240,00',
      'Saldo pendiente: $60,00',
      '',
      'En la puerta te ubicamos por tu nombre o por el código de la reserva.',
      '',
      'Corporación Montiel',
    ].join('\n'));
  });

  it('un pago revertido y su reverso se netean: no se listan y lo listado suma lo pagado', () => {
    const r = res({
      total_price: 200,
      payments: [
        pay(100, { id: 'p1', method: 'Efectivo' }),
        pay(200, { id: 'p2', method: 'Zelle', created_at: '2026-10-13T02:30:00+00:00' }), // 12/10 a las 10:30 p. m. en Maracaibo
        pay(-100, { id: 'p3', kind: 'reversal', method: 'Efectivo', reverses_payment_id: 'p1' }),
      ],
    });
    const { body } = confirmationMessage(r, t, ev());
    expect(body).toContain('Abonos:\n- 12/10/2026, Zelle: $200,00\nPagado: $200,00\nPagado completo\n');
    expect(body).not.toContain('Efectivo');
    expect(body).not.toContain('Saldo pendiente');
  });

  it('sin fecha, sin lugar y sin abonos; en VIP dice planta alta', () => {
    const { body } = confirmationMessage(res({ guests: 1 }), table({ code: 'VIP-05', area: 'VIP' }), ev({ event_date: null, venue: null }));
    expect(body).toContain('Mesa VIP-05, planta alta VIP\n1 persona\nFecha por anunciar\nCódigo de reserva: AB12CD\n');
    expect(body).toContain('Abonos:\n- Sin abonos todavía\nPagado: $0,00\nSaldo pendiente: $100,00\n');
  });
});
```

- [ ] **Paso 2: corre y confirma que falla**

Run: `npx vitest run tests/logic.test.ts`
Expected: FAIL, `Tests  4 failed | 14 passed (18)`, con `TypeError: eventDateLabel is not a function` y tres `TypeError: confirmationMessage is not a function`.

- [ ] **Paso 3: implementa**

En `src/lib/logic.ts`, reemplaza la primera línea:

```ts
import type { Reservation, ResStatus, TableRow, TableStatus } from './types';
```

por:

```ts
import type { AreaCode, EventRow, Reservation, ResStatus, TableRow, TableStatus } from './types';
```

y agrega al final del archivo (después de `friendlyError`):

```ts
const EVENT_DATE = new Intl.DateTimeFormat('es-VE', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
});
const PAY_DATE = new Intl.DateTimeFormat('es-VE', {
  day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Caracas',
});
const AREA_NAME: Record<AreaCode, string> = { PB: 'planta baja', VIP: 'planta alta VIP' };

/** "Sábado, 14 de noviembre de 2026", o "Fecha por anunciar" si el evento no tiene fecha. */
export function eventDateLabel(d: string | null): string {
  if (!d) return 'Fecha por anunciar';
  const s = EVENT_DATE.format(new Date(`${d}T00:00:00Z`));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Correo de confirmación que Alejandro envía desde su propia app de correo (spec, sección 6).
 *  Los reversos netean: un pago revertido y su reverso no se listan, y lo listado suma lo pagado. */
export function confirmationMessage(r: Reservation, table: TableRow, ev: EventRow): { subject: string; body: string } {
  const reversed = new Set(r.payments.map((p) => p.reverses_payment_id));
  const lines = r.payments
    .filter((p) => p.kind === 'payment' && !reversed.has(p.id))
    .sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))
    .map((p) => `- ${PAY_DATE.format(new Date(p.created_at))}, ${p.method}: ${formatMoney(p.amount)}`);
  const bal = balance(r);
  const body = [
    `Hola, ${r.name.trim()}:`,
    '',
    'Te confirmamos tu reserva para MOREFEST.',
    '',
    `Mesa ${table.code}, ${AREA_NAME[table.area]}`,
    `${r.guests} ${r.guests === 1 ? 'persona' : 'personas'}`,
    eventDateLabel(ev.event_date),
    ...(ev.venue ? [ev.venue] : []),
    `Código de reserva: ${r.code}`,
    '',
    `Total: ${formatMoney(r.total_price)}`,
    'Abonos:',
    ...(lines.length ? lines : ['- Sin abonos todavía']),
    `Pagado: ${formatMoney(paid(r))}`,
    r.total_price > 0 && bal <= 0 ? 'Pagado completo' : `Saldo pendiente: ${formatMoney(Math.max(0, bal))}`,
    '',
    'En la puerta te ubicamos por tu nombre o por el código de la reserva.',
    '',
    'Corporación Montiel',
  ].join('\n');
  return { subject: `MOREFEST · Confirmación de tu reserva (Mesa ${table.code})`, body };
}
```

- [ ] **Paso 4: corre y confirma que pasa**

Run: `npx vitest run tests/logic.test.ts`
Expected: PASS, `Tests  18 passed (18)`.

- [ ] **Paso 5: commit**

```bash
git add src/lib/logic.ts tests/logic.test.ts
git commit -m "Mensaje de confirmación MOREFEST: abonos con fecha, reversos neteados, saldo o pagado completo" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 5: `mailtoHref`

**Archivos:**
- Modificar: `src/lib/logic.ts` (final del archivo)
- Test: `tests/logic.test.ts` (import y bloque nuevo al final)

El correo se codifica con `encodeURIComponent` y se le devuelve la `@`, para que un `+`, `&` o `?` en la dirección no rompa el enlace. Medido con el mensaje de la tarea 4 y un correo de 26 letras: sin abonos, 686 caracteres; 3 abonos, 821; 20 abonos, 1.734; con 25 abonos ya pasa de 1.800 y devuelve `null`.

- [ ] **Paso 1: escribe las pruebas**

En `tests/logic.test.ts`, reemplaza:

```ts
  balance, confirmationMessage, eventDateLabel, formatMoney, friendlyError, isValidEmail, money, resStatus, seatPrice,
  summarize, tableStatus, toCsv,
```

por:

```ts
  balance, confirmationMessage, eventDateLabel, formatMoney, friendlyError, isValidEmail, mailtoHref, money, resStatus,
  seatPrice, summarize, tableStatus, toCsv,
```

y agrega al final del archivo:

```ts
describe('enlace de correo', () => {
  const m = confirmationMessage(res({ name: 'José Ángel Añez', payments: [pay(40)] }), table({ code: 'PB-07' }), ev());

  it('codifica asunto y cuerpo, y al decodificar vuelven intactos', () => {
    const href = mailtoHref('mafer.urdaneta@ejemplo.com', m);
    expect(href?.startsWith('mailto:mafer.urdaneta@ejemplo.com?subject=')).toBe(true);
    expect(href).not.toMatch(/\s/);
    const q = new URLSearchParams(href!.split('?')[1]);
    expect(q.get('subject')).toBe(m.subject);
    expect(q.get('body')).toBe(m.body);
  });

  it('un + o un & no rompen el enlace', () => {
    expect(mailtoHref('ana+morefest@ejemplo.com', { subject: 'Hola', body: 'a&b' })).toBe(
      'mailto:ana%2Bmorefest@ejemplo.com?subject=Hola&body=a%26b',
    );
  });

  it('hasta 1.800 caracteres devuelve el enlace; desde 1.801, null', () => {
    const base = 'mailto:a@b.co?subject=s&body='.length; // 29
    expect(mailtoHref('a@b.co', { subject: 's', body: 'x'.repeat(1800 - base) })).toHaveLength(1800);
    expect(mailtoHref('a@b.co', { subject: 's', body: 'x'.repeat(1801 - base) })).toBeNull();
    expect(mailtoHref('mafer.urdaneta@ejemplo.com', m)!.length).toBeLessThan(1000); // un mensaje normal sobra
  });
});
```

- [ ] **Paso 2: corre y confirma que falla**

Run: `npx vitest run tests/logic.test.ts`
Expected: FAIL, `Tests  3 failed | 18 passed (21)`, con tres `TypeError: mailtoHref is not a function`.

- [ ] **Paso 3: implementa**

Agrega al final de `src/lib/logic.ts`:

```ts
/** Enlace mailto con asunto y cuerpo codificados, o null si pasa de 1.800 caracteres: algunos clientes
 *  de correo cortan los enlaces largos, y entonces la interfaz avisa y deja "Copiar mensaje".
 *  El correo debe llegar ya validado con isValidEmail. */
export function mailtoHref(email: string, msg: { subject: string; body: string }): string | null {
  const to = encodeURIComponent(email.trim()).replace(/%40/g, '@');
  const href = `mailto:${to}?subject=${encodeURIComponent(msg.subject)}&body=${encodeURIComponent(msg.body)}`;
  return href.length > 1800 ? null : href;
}
```

- [ ] **Paso 4: corre y confirma que pasa**

Run: `npx vitest run tests/logic.test.ts`
Expected: PASS, `Tests  21 passed (21)`.

- [ ] **Paso 5: commit**

```bash
git add src/lib/logic.ts tests/logic.test.ts
git commit -m "Enlace mailto de la confirmación, con tope de 1.800 caracteres" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 6: `protocolRows` y `protocolTotals`

**Archivos:**
- Modificar: `src/lib/logic.ts:1` (import) y final del archivo
- Test: `tests/logic.test.ts` (import y bloque nuevo al final)

Orden: planta baja antes que VIP; dentro de cada planta, por código de mesa con orden natural (`Intl.Collator('es', { numeric: true })`: PB-2 antes que PB-10) y luego por nombre, o por nombre (`localeCompare('es', { sensitivity: 'base' })`: la Ñ va después de la N, sin distinguir mayúsculas ni acentos) y luego por mesa. Desempate final por código de reserva, para que el orden sea siempre el mismo.

- [ ] **Paso 1: escribe las pruebas**

En `tests/logic.test.ts`, reemplaza:

```ts
  balance, confirmationMessage, eventDateLabel, formatMoney, friendlyError, isValidEmail, mailtoHref, money, resStatus,
  seatPrice, summarize, tableStatus, toCsv,
```

por:

```ts
  balance, confirmationMessage, eventDateLabel, formatMoney, friendlyError, isValidEmail, mailtoHref, money,
  protocolRows, protocolTotals, resStatus, seatPrice, summarize, tableStatus, toCsv,
```

y agrega al final del archivo:

```ts
describe('lista de protocolo', () => {
  const tables = [
    table({ id: 'v5', code: 'VIP-05', area: 'VIP', capacity: 4 }),
    table({ id: 'p10', code: 'PB-10' }),
    table({ id: 'p2', code: 'PB-2' }),
  ];
  const all = [
    res({ id: 'a', code: 'AAA111', table_id: 'p10', name: 'Óscar Atencio', guests: 10, total_price: 400,
      payments: [pay(400)], checked_in: 10, checked_in_at: '2026-11-15T00:14:00+00:00' }),
    res({ id: 'b', code: 'BBB222', table_id: 'v5', name: 'Ana Bracho', guests: 4, total_price: 600,
      payments: [pay(300)], notes: 'Patrocinador' }),
    res({ id: 'c', code: 'CCC333', table_id: 'p2', name: 'Ñeri Paz', guests: 2, total_price: 80 }),
    res({ id: 'd', code: 'DDD444', table_id: 'p10', name: 'carmen Ríos', guests: 3, total_price: 120 }),
    res({ id: 'e', code: 'EEE555', table_id: 'p2', name: 'Nora Leal', guests: 2, total_price: 80 }),
  ];

  it('por mesa: planta baja antes que VIP, PB-2 antes que PB-10 y por nombre dentro de la mesa', () => {
    expect(protocolRows(tables, all, 'mesa', true).map((r) => `${r.tableCode} ${r.name}`)).toEqual([
      'PB-2 Nora Leal', 'PB-2 Ñeri Paz', 'PB-10 carmen Ríos', 'PB-10 Óscar Atencio', 'VIP-05 Ana Bracho',
    ]);
  });

  it('por nombre: alfabético en español (la Ñ va después de la N), sin mirar mayúsculas ni acentos', () => {
    expect(protocolRows(tables, all, 'nombre', true).map((r) => r.name)).toEqual([
      'carmen Ríos', 'Nora Leal', 'Ñeri Paz', 'Óscar Atencio', 'Ana Bracho',
    ]);
  });

  it('cada fila lleva saldo, llegada y notas; sin permiso de pagos el saldo va en null', () => {
    const rows = protocolRows(tables, all, 'mesa', true);
    expect(rows.find((r) => r.code === 'AAA111')).toEqual({
      reservationId: 'a', tableId: 'p10', tableCode: 'PB-10', area: 'PB', name: 'Óscar Atencio', guests: 10,
      code: 'AAA111', balance: 0, checkedIn: 10, checkedInAt: '2026-11-15T00:14:00+00:00', notes: null,
    });
    expect(rows.find((r) => r.code === 'BBB222')).toMatchObject({ balance: 300, notes: 'Patrocinador', checkedIn: null });
    expect(protocolRows(tables, all, 'mesa', false).map((r) => r.balance)).toEqual([null, null, null, null, null]);
  });

  it('una reserva cuya mesa no está en el mapa no sale en la lista', () => {
    expect(protocolRows(tables, [res({ table_id: 'retirada' })], 'mesa', true)).toEqual([]);
  });

  it('totales: reservas, personas esperadas y personas dentro', () => {
    expect(protocolTotals(protocolRows(tables, all, 'mesa', true))).toEqual({ reservations: 5, expected: 21, inside: 10 });
    expect(protocolTotals([])).toEqual({ reservations: 0, expected: 0, inside: 0 });
  });
});
```

- [ ] **Paso 2: corre y confirma que falla**

Run: `npx vitest run tests/logic.test.ts`
Expected: FAIL, `Tests  5 failed | 21 passed (26)`, con cinco `TypeError: protocolRows is not a function`.

- [ ] **Paso 3: implementa**

En `src/lib/logic.ts`, reemplaza la primera línea:

```ts
import type { AreaCode, EventRow, Reservation, ResStatus, TableRow, TableStatus } from './types';
```

por:

```ts
import type { AreaCode, EventRow, ProtocolRow, Reservation, ResStatus, TableRow, TableStatus } from './types';
```

y agrega al final del archivo:

```ts
const AREA_ORDER: Record<AreaCode, number> = { PB: 0, VIP: 1 };
const TABLE_CODE = new Intl.Collator('es', { numeric: true }); // PB-2 antes que PB-10
const byName = (a: ProtocolRow, b: ProtocolRow) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
const byTable = (a: ProtocolRow, b: ProtocolRow) => TABLE_CODE.compare(a.tableCode, b.tableCode);

/** Lista de la puerta: una fila por reserva activa (las canceladas no llegan al snapshot), planta baja
 *  antes que VIP, por mesa o por nombre. Una reserva de una mesa fuera del mapa (retirada) no sale.
 *  Sin permiso de pagos (rol puerta) el saldo va en null: la base no le muestra los abonos. */
export function protocolRows(
  tables: TableRow[], reservations: Reservation[], order: 'mesa' | 'nombre', canSeePayments: boolean,
): ProtocolRow[] {
  const byId = new Map(tables.map((t) => [t.id, t]));
  const rows = reservations.flatMap((r): ProtocolRow[] => {
    const t = byId.get(r.table_id);
    if (!t) return [];
    return [{
      reservationId: r.id, tableId: t.id, tableCode: t.code, area: t.area, name: r.name, guests: r.guests,
      code: r.code, balance: canSeePayments ? balance(r) : null, checkedIn: r.checked_in,
      checkedInAt: r.checked_in_at, notes: r.notes,
    }];
  });
  return rows.sort(
    (a, b) =>
      AREA_ORDER[a.area] - AREA_ORDER[b.area] ||
      (order === 'mesa' ? byTable(a, b) || byName(a, b) : byName(a, b) || byTable(a, b)) ||
      a.code.localeCompare(b.code),
  );
}

export function protocolTotals(rows: ProtocolRow[]): { reservations: number; expected: number; inside: number } {
  return {
    reservations: rows.length,
    expected: rows.reduce((s, r) => s + r.guests, 0),
    inside: rows.reduce((s, r) => s + (r.checkedIn ?? 0), 0),
  };
}
```

- [ ] **Paso 4: corre y confirma que pasa**

Run: `npx vitest run tests/logic.test.ts`
Expected: PASS, `Tests  26 passed (26)`.

- [ ] **Paso 5: commit**

```bash
git add src/lib/logic.ts tests/logic.test.ts
git commit -m "Lista de protocolo: filas por planta, orden por mesa o alfabético y totales de la puerta" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 7: CSV con correo y errores legibles

**Archivos:**
- Modificar: `src/lib/logic.ts` (`toCsv` y `friendlyError`)
- Test: `tests/logic.test.ts` (prueba del CSV existente y bloque `errores`)

- [ ] **Paso 1: escribe las pruebas**

En `tests/logic.test.ts`, dentro de `describe('resumen y CSV', ...)`, reemplaza:

```ts
    expect(csv.split('\n')[0]).toBe('"mesa","reserva","cliente","whatsapp","puestos","total","pagado","saldo","estado"');
  });
```

por:

```ts
    expect(csv.split('\n')[0]).toBe('"mesa","reserva","cliente","whatsapp","correo","puestos","total","pagado","saldo","estado"');
  });
  it('el CSV lleva el correo del cliente, o vacío si no hay', () => {
    expect(toCsv(tables, [res({ email: 'ana@ejemplo.com' })]).split('\n')[1]).toContain('"+58 412","ana@ejemplo.com","4"');
    expect(toCsv(tables, [res()]).split('\n')[1]).toContain('"+58 412","","4"');
  });
```

y dentro de `describe('errores', ...)`, reemplaza:

```ts
    expect(friendlyError('mesa sin puestos suficientes (3 libres)')).toMatch(/Ya no quedan puestos/);
  });
});
```

por:

```ts
    expect(friendlyError('mesa sin puestos suficientes (3 libres)')).toMatch(/Ya no quedan puestos/);
  });
  it('traduce los errores del correo y del reverso', () => {
    expect(friendlyError('new row for relation "customers" violates check constraint "customers_email_format"')).toBe(
      'El correo no tiene un formato válido. Revisa que tenga @ y un dominio.',
    );
    expect(friendlyError('reserva inexistente')).toBe('Esa reserva ya no existe. Revisa el mapa.');
    expect(friendlyError('pago inexistente')).toBe('Ese pago ya no existe. Revisa la reserva.');
    expect(friendlyError('pago ya revertido')).toBe('Ese pago ya estaba revertido.');
    expect(friendlyError('el reverso exige motivo')).toBe('Escribe el motivo del reverso.');
  });
});
```

- [ ] **Paso 2: corre y confirma que falla**

Run: `npx vitest run tests/logic.test.ts`
Expected: FAIL, `Tests  3 failed | 25 passed (28)`: "exporta CSV con comillas escapadas" (encabezado sin `correo`), "el CSV lleva el correo del cliente" y "traduce los errores del correo y del reverso".

- [ ] **Paso 3: implementa el CSV**

En `src/lib/logic.ts`, dentro de `toCsv`, reemplaza:

```ts
  const rows = [['mesa', 'reserva', 'cliente', 'whatsapp', 'puestos', 'total', 'pagado', 'saldo', 'estado']];
  [...all]
    .sort((a, b) => (code.get(a.table_id) ?? '').localeCompare(code.get(b.table_id) ?? ''))
    .forEach((r) =>
      rows.push([
        code.get(r.table_id) ?? '',
        r.code,
        r.name,
        r.phone ?? '',
        String(r.guests),
```

por:

```ts
  const rows = [['mesa', 'reserva', 'cliente', 'whatsapp', 'correo', 'puestos', 'total', 'pagado', 'saldo', 'estado']];
  [...all]
    .sort((a, b) => (code.get(a.table_id) ?? '').localeCompare(code.get(b.table_id) ?? ''))
    .forEach((r) =>
      rows.push([
        code.get(r.table_id) ?? '',
        r.code,
        r.name,
        r.phone ?? '',
        r.email ?? '',
        String(r.guests),
```

- [ ] **Paso 4: implementa los errores**

En `friendlyError`, reemplaza:

```ts
  if (/excede los puestos/.test(message)) return 'No pueden entrar más personas que los puestos de la reserva.';
  if (/duplicate|unique/.test(message)) return 'Esta acción ya estaba registrada.';
```

por:

```ts
  if (/excede los puestos/.test(message)) return 'No pueden entrar más personas que los puestos de la reserva.';
  if (/customers_email_format/.test(message)) return 'El correo no tiene un formato válido. Revisa que tenga @ y un dominio.';
  if (/reserva inexistente/.test(message)) return 'Esa reserva ya no existe. Revisa el mapa.';
  if (/pago inexistente/.test(message)) return 'Ese pago ya no existe. Revisa la reserva.';
  if (/ya revertido/.test(message)) return 'Ese pago ya estaba revertido.';
  if (/exige motivo/.test(message)) return 'Escribe el motivo del reverso.';
  if (/duplicate|unique/.test(message)) return 'Esta acción ya estaba registrada.';
```

Nota: si dos personas revierten el mismo pago a la vez y gana la restricción única de la 0008, el mensaje sigue siendo "Esta acción ya estaba registrada." (regla `duplicate|unique`, sin cambios).

- [ ] **Paso 5: corre y confirma que pasa**

Run: `npx vitest run tests/logic.test.ts`
Expected: PASS, `Tests  28 passed (28)`.

- [ ] **Paso 6: commit**

```bash
git add src/lib/logic.ts tests/logic.test.ts
git commit -m "CSV con el correo del cliente y errores legibles para correo y reverso" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Tarea 8: verificación final

**Archivos:** ninguno (solo comprobación).

- [ ] **Paso 1: suite completa**

Run: `npm test`
Expected: `Test Files  4 passed (4)` y `Tests  62 passed (62)` (las 35 de antes siguen en verde; 28 de base, 28 de lógica, 3 de snapshot, 3 de cabeceras).

- [ ] **Paso 2: tipos**

Run: `npm run typecheck`
Expected: PASS, sin salida después de `> tsc --noEmit`.

- [ ] **Paso 3: build de producción**

Run: `npm run build`
Expected: `✓ Compiled successfully`, `Finished TypeScript`, `✓ Generating static pages using 4 workers (3/3)` y las rutas `○ /` y `○ /_not-found`. No hace falta `.env.local`: el cliente de Supabase se crea en el navegador.

- [ ] **Paso 4: alcance y reglas**

Run: `git diff --name-only eb30f2d..HEAD -- src/lib supabase tests`
Expected: estos siete. Si el plan B ya corrió en esta rama puede aparecer además alguna prueba suya (por ejemplo `tests/headers.test.ts`), pero ningún otro archivo de `src/lib` ni de `supabase`:

```
src/lib/data.ts
src/lib/logic.ts
src/lib/types.ts
supabase/migrations/0009_morefest.sql
tests/data.test.ts
tests/db.test.ts
tests/logic.test.ts
```

Run: `grep -rn service_role src; echo "exit=$?"`
Expected: solo `exit=1` (la clave de servicio no entra al código).

- [ ] **Paso 5: deja anotado lo que sigue (sin ejecutarlo)**

No hay commit en esta tarea. Lo que viene después, fuera de este plan: el plan B (pantallas) consume este contrato; antes del merge a `main`, aplicar la 0009 en el SQL Editor del proyecto Supabase `nymslckxukoqhifpkrgl` con go de Francisco (aviso 1) y verificar con el MCP `supabase` que quedó aplicada; luego `blindar` y deploy.

---

## Cobertura de la especificación

| Requisito | Dónde |
|---|---|
| §6 asunto `MOREFEST · Confirmación de tu reserva (Mesa PB-07)` | T4 |
| §6 saludo, mesa y personas, fecha o "por anunciar", total, abonos con fecha y método, reversos neteados, pagado, saldo o "Pagado completo", firma | T4 |
| §6 `mailto:` con `encodeURIComponent` y tope de 1.800 | T5 |
| §6 sin correo: botón deshabilitado | Plan B (la pantalla decide; `isValidEmail` de T3) |
| §7 `update events` nombre y lugar | T1 |
| §7 `customers.email` con `check` de formato | T1 |
| §7 `set_customer_email` con rol, `security definer`, `search_path`, `execute` solo `authenticated`, normaliza o `null` | T1 |
| §7 `data.ts` lee correo, `venue`, pagos con fecha y `reverses_payment_id` | T2 |
| §9 correo inválido rechazado en interfaz y base | T1 (base), T3 (`isValidEmail`), T7 (mensaje) |
| §9 pago ya revertido, reverso sin motivo | T7 (mensajes; la base ya lo exige desde la 0008) |
| §9 sin fecha de evento: "Fecha por anunciar" | T4 (`eventDateLabel`) |
| §9 rol `door` sin pagos: saldo "—" | T6 (`balance: null`) y T2 (`role` en el snapshot) |
| §10 PGlite: nombre y lugar, normaliza, rechaza, rol vendedor sí, puerta y anónimo no, `null` borra | T1 |
| §10 lógica: mensaje (abonos, reversos, saldo, sin fecha, acentos), protocolo (orden por mesa y alfabético, saldo, llegada, canceladas), montos `es-VE` | T3, T4, T6; canceladas en T2 (`tests/data.test.ts`) |
| §10 typecheck y build | T2, T8 |
| §5 CSV con correo | T7 (nombre del archivo: plan B) |
| §4 montos `$240,00` con `Intl.NumberFormat('es-VE')` | T3 |
