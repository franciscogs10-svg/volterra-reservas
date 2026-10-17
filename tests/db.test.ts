import { readFileSync } from 'node:fs';
import { PGlite } from '@electric-sql/pglite';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';
import { beforeAll, describe, expect, it } from 'vitest';

const sql = (f: string) => readFileSync(new URL(`../supabase/migrations/${f}`, import.meta.url), 'utf8');

let db: PGlite;
let admin: string;
let seller: string;
let tableId: string;

async function as(user: string) {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user]);
}
async function one<T = any>(q: string, p: unknown[] = []): Promise<T> {
  return (await db.query(q, p)).rows[0] as T;
}
/** Ejecuta una consulta como la ve la API de Supabase: rol anon o authenticated, con RLS. */
async function viaApi<T = any>(role: 'anon' | 'authenticated', user: string | null, q: string): Promise<T[]> {
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [user ?? '']);
  await db.exec(`set role ${role}`);
  try {
    return (await db.query(q)).rows as T[];
  } finally {
    await db.exec('reset role');
    await as(admin);
  }
}
async function reserveAt(code: string, seats: number, total: number, deposit: number) {
  const t = (await one<{ id: string }>('select id from tables where code = $1', [code])).id;
  return (await one<{ id: string }>(
    'select create_reservation($1,$2,$3,$4,$5,$6,$7,$8) as id', [t, 'Cliente', null, seats, total, deposit, 'Efectivo', null])).id;
}
async function reserve(seats: number, total = 100, deposit = 0) {
  const r = await one<{ id: string }>(
    'select create_reservation($1, $2, $3, $4, $5, $6, $7, $8) as id',
    [tableId, 'Cliente', '+58 412 000', seats, total, deposit, 'Efectivo', null],
  );
  return r.id;
}

beforeAll(async () => {
  db = new PGlite({ extensions: { pgcrypto } });
  // Piezas que Supabase ya trae
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create schema auth;
    grant usage on schema auth to anon, authenticated;
    create table auth.users (id uuid primary key default gen_random_uuid(), email text, raw_user_meta_data jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create publication supabase_realtime;
  `);
  for (const f of [
    '0001_init.sql',
    '0002_seed.sql',
    '0003_hardening.sql',
    '0004_puestos_sueltos.sql',
    '0005_vip_patrocinadores.sql',
    '0006_sofas_en_el_plano.sql',
    // 0007 es de la rama fix/plano-vip-sofas (0007_sofas_mirando_pantalla.sql); al fusionar va antes de esta.
    '0008_blindaje.sql',
  ]) {
    await db.exec(sql(f));
  }
  admin = (await one<{ id: string }>("insert into auth.users (email) values ('tio@volterra.test') returning id")).id;
  seller = (await one<{ id: string }>("insert into auth.users (email) values ('vendedor@volterra.test') returning id")).id;
  await db.query('update profiles set active = true where id = $1', [seller]); // el admin lo activa
  tableId = (await one<{ id: string }>("select id from tables where code = 'PB-04'")).id; // 10 puestos
  await as(admin);
});

describe('datos iniciales', () => {
  it('carga las 22 mesas del croquis y los puestos sueltos', async () => {
    const r = await one<{ pb: number; vip: number }>(
      `select count(*) filter (where code like 'PB-%')::int as pb, count(*) filter (where code like 'VIP-%')::int as vip from tables where active`,
    );
    expect(r).toEqual({ pb: 16, vip: 3 });
    const s = (await db.query("select code, kind, capacity from tables where active and kind <> 'table' order by code")).rows;
    expect(s).toEqual([
      { code: 'PB-16', kind: 'seat', capacity: 11 },
      { code: 'VIP-05', kind: 'sofa', capacity: 4 },
      { code: 'VIP-06', kind: 'sofa', capacity: 4 },
      { code: 'VIP-07', kind: 'sofa', capacity: 4 },
    ]);
  });

  it('el primer usuario es admin y el segundo vendedor', async () => {
    const rows = (await db.query('select id, role from profiles')).rows as { id: string; role: string }[];
    expect(rows.find((r) => r.id === admin)?.role).toBe('admin');
    expect(rows.find((r) => r.id === seller)?.role).toBe('seller');
  });
});

describe('reserva por puestos', () => {
  it('no deja pasar de la capacidad de la mesa', async () => {
    await reserve(4);
    await expect(reserve(7)).rejects.toThrow(/sin puestos/);
    await reserve(6);
    await expect(reserve(1)).rejects.toThrow(/sin puestos/);
  });

  it('un grupo mayor a la capacidad se rechaza', async () => {
    const other = (await one<{ id: string }>("select id from tables where code = 'PB-02'")).id; // 4 puestos
    await expect(
      one('select create_reservation($1,$2,$3,$4,$5,$6,$7,$8)', [other, 'X', null, 5, 10, 0, 'Efectivo', null]),
    ).rejects.toThrow(/excede capacidad/);
  });

  it('una mesa retirada no se reserva', async () => {
    const retired = (await one<{ id: string }>("select id from tables where code = 'VIP-01'")).id;
    await expect(
      one('select create_reservation($1,$2,$3,$4,$5,$6,$7,$8)', [retired, 'X', null, 1, 10, 0, 'Efectivo', null]),
    ).rejects.toThrow(/retirada/);
  });

  it('cancelar libera los puestos', async () => {
    const id = (await one<{ id: string }>(
      "select id from reservations where table_id = $1 and guests = 6", [tableId])).id;
    await db.query('select cancel_reservation($1, $2)', [id, 'prueba']);
    await reserve(6);
  });

  it('el anticipo no puede superar el total', async () => {
    const other = (await one<{ id: string }>("select id from tables where code = 'PB-09'")).id;
    await expect(
      one('select create_reservation($1,$2,$3,$4,$5,$6,$7,$8)', [other, 'X', null, 2, 50, 80, 'Efectivo', null]),
    ).rejects.toThrow(/anticipo/);
  });
});

describe('pagos', () => {
  it('guarda cada abono como movimiento y calcula el saldo', async () => {
    const t = (await one<{ id: string }>("select id from tables where code = 'PB-03'")).id;
    const res = (await one<{ id: string }>(
      'select create_reservation($1,$2,$3,$4,$5,$6,$7,$8) as id', [t, 'Marcela', null, 4, 120, 50, 'Pago móvil', null])).id;
    await db.query('select add_payment($1, 70, $2, null)', [res, 'Efectivo']);
    const s = await one<{ paid: string; balance: string; pay_status: string }>(
      'select paid, balance, pay_status from reservation_summary where id = $1', [res]);
    expect(Number(s.paid)).toBe(120);
    expect(Number(s.balance)).toBe(0);
    expect(s.pay_status).toBe('paid');
    expect((await db.query('select 1 from payments where reservation_id = $1', [res])).rows).toHaveLength(2);
  });

  it('un pago no se edita ni se borra, se revierte', async () => {
    const p = await one<{ id: string; reservation_id: string }>('select id, reservation_id from payments limit 1');
    await expect(db.query('update payments set amount = 1 where id = $1', [p.id])).rejects.toThrow(/no se editan/);
    await expect(db.query('delete from payments where id = $1', [p.id])).rejects.toThrow(/no se editan/);
    await db.query('select reverse_payment($1, $2)', [p.id, 'error de captura']);
    const sum = await one<{ s: string }>('select sum(amount) as s from payments where reservation_id = $1', [p.reservation_id]);
    expect(Number(sum.s)).toBeLessThan(120);
  });

  it('un pago se revierte una sola vez', async () => {
    const res = await reserveAt('PB-07', 2, 80, 80);
    const p = (await one<{ id: string }>("select id from payments where reservation_id = $1 and kind = 'payment'", [res])).id;
    await db.query('select reverse_payment($1, $2)', [p, 'devolución']);
    await expect(db.query('select reverse_payment($1, $2)', [p, 'otra vez'])).rejects.toThrow(/ya revertido/);
    const sum = await one<{ s: string }>('select sum(amount) as s from payments where reservation_id = $1', [res]);
    expect(Number(sum.s)).toBe(0);
  });

  it('ni por fuera de la función caben dos reversos del mismo pago', async () => {
    const res = await reserveAt('PB-08', 2, 50, 50);
    const p = (await one<{ id: string }>("select id from payments where reservation_id = $1 and kind = 'payment'", [res])).id;
    await db.query('select reverse_payment($1, $2)', [p, 'devolución']);
    await expect(
      db.query(
        `insert into payments (reservation_id, kind, amount, method, reason, created_by, reverses_payment_id)
         values ($1, 'reversal', -50, 'Efectivo', 'carrera', $2, $3)`,
        [res, admin, p],
      ),
    ).rejects.toThrow(/duplicate|unique/);
  });

  it('el reverso exige un motivo escrito', async () => {
    const res = await reserveAt('PB-10', 2, 40, 40);
    const p = (await one<{ id: string }>("select id from payments where reservation_id = $1 and kind = 'payment'", [res])).id;
    await expect(db.query('select reverse_payment($1, $2)', [p, '   '])).rejects.toThrow(/motivo/);
  });
});

describe('ingreso', () => {
  it('confirma llegada una sola vez y no pasa de los puestos', async () => {
    const t = (await one<{ id: string }>("select id from tables where code = 'PB-05'")).id;
    const res = (await one<{ id: string }>(
      'select create_reservation($1,$2,$3,$4,$5,$6,$7,$8) as id', [t, 'Luis', null, 3, 90, 0, 'Efectivo', null])).id;
    await db.query('select check_in($1, 3)', [res]);
    await expect(db.query('select check_in($1, 3)', [res])).rejects.toThrow();
    const t2 = (await one<{ id: string }>("select id from tables where code = 'PB-06'")).id;
    const res2 = (await one<{ id: string }>(
      'select create_reservation($1,$2,$3,$4,$5,$6,$7,$8) as id', [t2, 'Ana', null, 2, 60, 0, 'Efectivo', null])).id;
    await as(seller);
    await expect(db.query('select check_in($1, 2)', [res2])).rejects.toThrow(/forbidden/);
    await as(admin);
    await expect(db.query('select check_in($1, 5)', [res2])).resolves.toBeDefined(); // admin puede forzar
  });

  it('no deja entrar una reserva apartada que no está confirmada', async () => {
    const res = await reserveAt('PB-11', 2, 60, 0);
    // Así nacerán las reservas del link público mientras el pago no se confirme.
    await db.query("update reservations set status = 'held' where id = $1", [res]);
    await expect(db.query('select check_in($1, 2)', [res])).rejects.toThrow(/no confirmada/);
    expect((await db.query('select 1 from check_ins where reservation_id = $1', [res])).rows).toHaveLength(0);
  });
});

describe('permisos y auditoría', () => {
  it('el vendedor no cancela ni revierte pagos', async () => {
    const id = (await one<{ id: string }>('select id from reservations limit 1')).id;
    await as(seller);
    await expect(db.query('select cancel_reservation($1, $2)', [id, 'x'])).rejects.toThrow(/forbidden/);
    await as(admin);
  });

  it('sin sesión la API no lee ninguna tabla', async () => {
    await expect(viaApi('anon', null, 'select * from customers')).rejects.toThrow(/permission denied/);
    await expect(viaApi('anon', null, 'select * from reservation_summary')).rejects.toThrow(/permission denied/);
  });

  it('quien se registra por su cuenta queda sin acceso hasta que el admin lo active', async () => {
    const stranger = (await one<{ id: string }>("insert into auth.users (email) values ('extrano@internet.test') returning id")).id;
    const p = await one<{ role: string; active: boolean }>('select role, active from profiles where id = $1', [stranger]);
    expect(p.active).toBe(false);
    expect(await viaApi('authenticated', stranger, 'select id from customers')).toHaveLength(0);
    expect(await viaApi('authenticated', stranger, 'select id from reservations')).toHaveLength(0);
    expect(await viaApi('authenticated', stranger, 'select id from payments')).toHaveLength(0);
    await as(stranger);
    await expect(reserve(1)).rejects.toThrow(/forbidden/);
    await as(admin);
  });

  it('un vendedor activo sí ve las reservas por la API', async () => {
    expect((await viaApi('authenticated', seller, 'select id from reservations')).length).toBeGreaterThan(0);
  });

  it('un usuario sin perfil no puede reservar', async () => {
    await as('00000000-0000-0000-0000-000000000000');
    await expect(reserve(1)).rejects.toThrow(/forbidden/);
    await as(admin);
  });

  it('deja registro de los cambios', async () => {
    const r = await one<{ n: number }>("select count(*)::int as n from audit_logs where table_name = 'reservations'");
    expect(r.n).toBeGreaterThan(3);
    const p = await one<{ n: number }>("select count(*)::int as n from audit_logs where table_name = 'payments'");
    expect(p.n).toBeGreaterThan(0);
  });
});
