-- Blindaje antes de abrir ventas (2026-10-17). Tres defectos confirmados con pruebas:
-- 1. Quien se registraba por su cuenta en Supabase Auth quedaba como vendedor activo.
-- 2. check_in dejaba entrar reservas apartadas ('held') sin confirmar.
-- 3. reverse_payment permitía revertir dos veces el mismo pago (y con motivo vacío).

-- 1. Nadie entra solo: el primer usuario sigue siendo admin; los demás nacen inactivos
--    y el admin los activa (ver README, "Usuarios del equipo").
create or replace function handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_first boolean := not exists (select 1 from profiles);
begin
  insert into profiles (id, full_name, role, active)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
          case when v_first then 'admin'::app_role else 'seller'::app_role end,
          v_first);
  return new;
end $$;

-- 2. Solo entra una reserva confirmada.
create or replace function check_in(p_res uuid, p_people int)
returns void language plpgsql security definer set search_path = public as $$
declare v reservations%rowtype; v_role app_role;
begin
  v_role := require_role('admin','door');
  select * into v from reservations where id = p_res;
  if not found or v.status = 'cancelled' then raise exception 'reserva no activa'; end if;
  if v.status <> 'confirmed' then raise exception 'reserva no confirmada'; end if;
  if p_people > v.guests and v_role <> 'admin' then
    raise exception 'excede los puestos de la reserva';
  end if;
  insert into check_ins (reservation_id, people_in, checked_by) values (p_res, p_people, auth.uid());
end $$;

-- 3. Cada reverso apunta al pago que revierte, y un pago se revierte una sola vez.
--    La restricción única lo garantiza aunque dos personas reviertan a la vez.
alter table payments add column reverses_payment_id uuid unique references payments;
-- not valid: no revisa filas viejas (en producción no había reversos al 2026-10-17), sí todas las nuevas.
alter table payments add constraint payments_reversal_link
  check ((kind = 'reversal') = (reverses_payment_id is not null)) not valid;

create or replace function reverse_payment(p_payment uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; p payments%rowtype;
begin
  perform require_role('admin');
  if coalesce(btrim(p_reason), '') = '' then raise exception 'el reverso exige motivo'; end if;
  select * into p from payments where id = p_payment and kind = 'payment';
  if not found then raise exception 'pago inexistente'; end if;
  if exists (select 1 from payments where reverses_payment_id = p_payment) then
    raise exception 'pago ya revertido';
  end if;
  insert into payments (reservation_id, kind, amount, currency, method, reason, created_by, reverses_payment_id)
  values (p.reservation_id, 'reversal', -p.amount, p.currency, p.method, btrim(p_reason), auth.uid(), p_payment)
  returning id into v_id;
  return v_id;
end $$;
