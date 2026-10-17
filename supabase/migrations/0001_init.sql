-- VOLTERRA: esquema Supabase (Postgres)

create extension if not exists pgcrypto;

create type app_role as enum ('admin', 'seller', 'door');
create type reservation_status as enum ('held', 'confirmed', 'cancelled');
create type payment_kind as enum ('payment', 'reversal');

create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text not null,
  role app_role not null default 'seller',
  active boolean not null default true
);

create table events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  venue text,
  event_date date,
  status text not null default 'draft'
);

create table areas (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events,
  code text not null,            -- 'PB', 'VIP'
  name text not null,
  unique (event_id, code)
);

create table tables (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events,
  area_id uuid not null references areas,
  code text not null,            -- 'PB-04'
  kind text not null default 'table',   -- ampliable a 'seat', 'general'
  capacity int not null check (capacity > 0),
  price numeric(10,2) check (price >= 0),   -- null = por definir
  seat_price numeric(10,2) check (seat_price >= 0),  -- null = price / capacity; el admin puede fijarlo
  map_x numeric, map_y numeric, map_w numeric, map_h numeric,   -- centro y tamaño sobre el croquis (792x966)
  map_rot numeric not null default 0,
  shape text not null default 'r',                              -- 'r' rectángulo, 'c' elipse
  unique (event_id, code)
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  phone text,
  whatsapp text,
  notes text,
  created_by uuid references profiles
);
create index on customers (phone);
create index on customers using gin (to_tsvector('simple', full_name));

create table reservations (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(encode(gen_random_bytes(4),'hex'),1,6)),
  event_id uuid not null references events,
  table_id uuid not null references tables,
  customer_id uuid not null references customers,
  seller_id uuid not null references profiles,
  guests int not null check (guests > 0),   -- puestos comprados (una mesa puede tener varias reservas)
  total_price numeric(10,2) not null check (total_price >= 0),
  currency text not null default 'USD',
  status reservation_status not null default 'confirmed',
  notes text,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references profiles
);
-- Bloqueo atómico por puestos: la suma de puestos activos de una mesa no puede pasar su capacidad.
-- Se serializa con un lock sobre la fila de la mesa (también dentro de create_reservation).
create function enforce_table_capacity() returns trigger language plpgsql as $$
declare cap int; used int;
begin
  if new.status = 'cancelled' then return new; end if;
  select capacity into cap from tables where id = new.table_id for update;
  select coalesce(sum(guests),0) into used from reservations
    where table_id = new.table_id and status <> 'cancelled' and id <> new.id;
  if used + new.guests > cap then
    raise exception 'mesa sin puestos suficientes (% libres)', cap - used using errcode = '23505';
  end if;
  return new;
end $$;
create trigger reservations_capacity before insert or update of guests, status, table_id on reservations
  for each row execute function enforce_table_capacity();

create table payments (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references reservations,
  kind payment_kind not null default 'payment',
  amount numeric(10,2) not null,          -- reversal se guarda en negativo
  currency text not null default 'USD',
  fx_rate numeric(12,4),
  method text not null,                   -- efectivo, pago móvil, zelle, ...
  reference text,
  reason text,                            -- obligatorio en reversal
  created_by uuid not null references profiles,
  created_at timestamptz not null default now(),
  check ((kind = 'payment' and amount > 0) or (kind = 'reversal' and amount < 0 and reason is not null))
);

create table check_ins (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null unique references reservations,
  people_in int not null check (people_in > 0),
  checked_by uuid not null references profiles,
  checked_at timestamptz not null default now()
);

create table audit_logs (
  id bigserial primary key,
  table_name text not null,
  row_id text,
  action text not null,
  old_data jsonb,
  new_data jsonb,
  user_id uuid,
  at timestamptz not null default now()
);

-- Vista de estado financiero y de ingreso
create view reservation_summary as
select r.*,
  coalesce(sum(p.amount), 0) as paid,
  r.total_price - coalesce(sum(p.amount), 0) as balance,
  case
    when coalesce(sum(p.amount),0) <= 0 then 'unpaid'
    when coalesce(sum(p.amount),0) < r.total_price then 'partial'
    else 'paid'
  end as pay_status,
  (select people_in from check_ins c where c.reservation_id = r.id) as people_in
from reservations r
left join payments p on p.reservation_id = r.id
group by r.id;

-- Helpers de rol
create function current_role_name() returns app_role
language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid() and active
$$;

-- Falla si no hay sesión, no hay perfil activo o el rol no está permitido.
-- Importante: current_role_name() es null sin perfil y "null not in (...)" no lanza nada.
create function require_role(variadic roles app_role[]) returns app_role
language plpgsql stable security definer set search_path = public as $$
declare r app_role := current_role_name();
begin
  if r is null or not (r = any(roles)) then raise exception 'forbidden'; end if;
  return r;
end $$;

-- Crear reserva + anticipo en una transacción
create function create_reservation(
  p_table_id uuid, p_customer_name text, p_phone text, p_guests int,
  p_total numeric, p_deposit numeric, p_method text, p_notes text
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_table tables%rowtype;
  v_customer uuid;
  v_res uuid;
begin
  perform require_role('admin','seller');
  select * into v_table from tables where id = p_table_id;
  if not found then raise exception 'mesa inexistente'; end if;
  if p_guests > v_table.capacity then raise exception 'excede capacidad'; end if;
  if p_total < 0 or p_deposit > p_total then raise exception 'anticipo mayor al total'; end if;

  insert into customers (full_name, phone, whatsapp, created_by)
  values (p_customer_name, p_phone, p_phone, auth.uid()) returning id into v_customer;

  insert into reservations (event_id, table_id, customer_id, seller_id, guests, total_price, notes)
  values (v_table.event_id, p_table_id, v_customer, auth.uid(), p_guests, p_total, p_notes)
  returning id into v_res;   -- el trigger de capacidad falla si ya no quedan puestos

  if p_deposit > 0 then
    insert into payments (reservation_id, amount, method, created_by)
    values (v_res, p_deposit, p_method, auth.uid());
  end if;
  return v_res;
end $$;

create function add_payment(p_res uuid, p_amount numeric, p_method text, p_ref text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform require_role('admin','seller');
  insert into payments (reservation_id, amount, method, reference, created_by)
  values (p_res, p_amount, p_method, p_ref, auth.uid()) returning id into v_id;
  return v_id;
end $$;

create function reverse_payment(p_payment uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; p payments%rowtype;
begin
  perform require_role('admin');
  select * into p from payments where id = p_payment and kind = 'payment';
  if not found then raise exception 'pago inexistente'; end if;
  insert into payments (reservation_id, kind, amount, currency, method, reason, created_by)
  values (p.reservation_id, 'reversal', -p.amount, p.currency, p.method, p_reason, auth.uid())
  returning id into v_id;
  return v_id;
end $$;

create function cancel_reservation(p_res uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform require_role('admin');
  update reservations set status='cancelled', cancelled_at=now(), cancelled_by=auth.uid(),
    notes = coalesce(notes,'') || ' [cancelada: ' || p_reason || ']'
  where id = p_res;
end $$;

create function check_in(p_res uuid, p_people int)
returns void language plpgsql security definer set search_path = public as $$
declare v reservations%rowtype; cap int; v_role app_role;
begin
  v_role := require_role('admin','door');
  select * into v from reservations where id = p_res and status <> 'cancelled';
  if not found then raise exception 'reserva no activa'; end if;
  select capacity into cap from tables where id = v.table_id;
  if p_people > v.guests and v_role <> 'admin' then
    raise exception 'excede los puestos de la reserva';
  end if;
  insert into check_ins (reservation_id, people_in, checked_by) values (p_res, p_people, auth.uid());
end $$;

-- Auditoría genérica
create function audit() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into audit_logs (table_name, row_id, action, old_data, new_data, user_id)
  values (tg_table_name, case when tg_op = 'DELETE' then old.id::text else new.id::text end, tg_op,
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end, auth.uid());
  return coalesce(new, old);
end $$;

create trigger audit_reservations after insert or update or delete on reservations
  for each row execute function audit();
create trigger audit_payments after insert or update or delete on payments
  for each row execute function audit();
create trigger audit_tables after update on tables
  for each row execute function audit();
create trigger audit_checkins after insert or update or delete on check_ins
  for each row execute function audit();

-- Los pagos son inmutables
create function block_payment_mutation() returns trigger language plpgsql as $$
begin raise exception 'los pagos no se editan ni borran; usar reverse_payment'; end $$;
create trigger payments_immutable before update or delete on payments
  for each row execute function block_payment_mutation();

-- RLS: lectura para usuarios activos; escritura solo vía RPC (security definer) y admin sobre tables
alter table profiles enable row level security;
alter table events enable row level security;
alter table areas enable row level security;
alter table tables enable row level security;
alter table customers enable row level security;
alter table reservations enable row level security;
alter table payments enable row level security;
alter table check_ins enable row level security;
alter table audit_logs enable row level security;

create policy read_all on events for select using (current_role_name() is not null);
create policy read_all on areas for select using (current_role_name() is not null);
create policy read_all on tables for select using (current_role_name() is not null);
create policy read_all on customers for select using (current_role_name() is not null);
create policy read_all on reservations for select using (current_role_name() is not null);
create policy read_pay on payments for select using (current_role_name() in ('admin','seller'));
create policy read_ci on check_ins for select using (current_role_name() is not null);
create policy read_self on profiles for select using (id = auth.uid() or current_role_name() = 'admin');
create policy admin_tables on tables for update using (current_role_name() = 'admin');
create policy admin_events on events for update using (current_role_name() = 'admin');
create policy admin_audit on audit_logs for select using (current_role_name() = 'admin');

-- Realtime para que todos los celulares vean el mismo estado
alter publication supabase_realtime add table reservations, payments, check_ins;

-- Nota: la vista reservation_summary debe crearse con security_invoker = true
alter view reservation_summary set (security_invoker = true);

-- Cada usuario nuevo recibe perfil. El primero es admin; desactiva el registro público en Supabase Auth.
create function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          case when exists (select 1 from profiles) then 'seller'::app_role else 'admin'::app_role end);
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Solo usuarios con sesión pueden llamar a las funciones. Supabase las abre a anon por defecto.
do $$
declare f text;
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    foreach f in array array[
      'create_reservation(uuid,text,text,int,numeric,numeric,text,text)',
      'add_payment(uuid,numeric,text,text)',
      'reverse_payment(uuid,text)',
      'cancel_reservation(uuid,text)',
      'check_in(uuid,int)',
      'require_role(app_role[])',
      'current_role_name()'
    ] loop
      execute format('revoke execute on function %s from public, anon', f);
      execute format('grant execute on function %s to authenticated', f);
    end loop;
  end if;
end $$;
