-- Guardas de dinero y cancelación (2026-10-17). Cierra los hallazgos H1, H2, H3 y H10 del diagnóstico:
-- add_payment aceptaba sobrepago y pagos a reservas canceladas (y dos celulares a la vez podían sobrepagar),
-- cancel_reservation aceptaba doble cancelación y motivo vacío, y create_reservation aceptaba nombre en blanco.
-- Decisión de Francisco (2026-10-17): al cancelar una reserva con abonos, Alejandro decide cada vez:
--   cancel_reservation  = "retener el abono" (la mesa se libera y el dinero sigue contando en lo cobrado)
--   cancel_and_refund   = "devolver el abono" (cada abono queda revertido y sale de lo cobrado)
-- La migración no borra nada. Si hiciera falta volver atrás, una 0011 restaura las funciones de la 0001, 0005 y 0008.

-- 1. Abonos: la fila de la reserva se bloquea para que dos celulares a la vez no sobrepaguen.
create or replace function add_payment(p_res uuid, p_amount numeric, p_method text, p_ref text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v reservations%rowtype; v_net numeric;
begin
  perform require_role('admin','seller');
  select * into v from reservations where id = p_res for update;
  if not found then raise exception 'reserva inexistente'; end if;
  if v.status = 'cancelled' then raise exception 'reserva cancelada'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'monto inválido'; end if;
  if coalesce(btrim(p_method), '') = '' then raise exception 'falta el método de pago'; end if;
  select coalesce(sum(amount), 0) into v_net from payments where reservation_id = p_res;
  if v_net + p_amount > v.total_price then raise exception 'el abono supera el saldo'; end if;
  insert into payments (reservation_id, amount, method, reference, created_by)
  values (p_res, p_amount, btrim(p_method), p_ref, auth.uid()) returning id into v_id;
  return v_id;
end $$;

-- 2. Revertir un pago: misma lógica de la 0008, más el bloqueo de la reserva para serializarlo
--    con add_payment y con la cancelación.
create or replace function reverse_payment(p_payment uuid, p_reason text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; p payments%rowtype; v_locked uuid;
begin
  perform require_role('admin');
  if coalesce(btrim(p_reason), '') = '' then raise exception 'el reverso exige motivo'; end if;
  select * into p from payments where id = p_payment and kind = 'payment';
  if not found then raise exception 'pago inexistente'; end if;
  select id into v_locked from reservations where id = p.reservation_id for update;
  if exists (select 1 from payments where reverses_payment_id = p_payment) then
    raise exception 'pago ya revertido';
  end if;
  insert into payments (reservation_id, kind, amount, currency, method, reason, created_by, reverses_payment_id)
  values (p.reservation_id, 'reversal', -p.amount, p.currency, p.method, btrim(p_reason), auth.uid(), p_payment)
  returning id into v_id;
  return v_id;
end $$;

-- 3. Cancelar reteniendo los abonos: los pagos no se tocan.
create or replace function cancel_reservation(p_res uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v reservations%rowtype;
begin
  perform require_role('admin');
  if coalesce(btrim(p_reason), '') = '' then raise exception 'la cancelación exige motivo'; end if;
  select * into v from reservations where id = p_res for update;
  if not found then raise exception 'reserva inexistente'; end if;
  if v.status = 'cancelled' then raise exception 'reserva ya cancelada'; end if;
  update reservations set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
    notes = coalesce(notes, '') || ' [cancelada: ' || btrim(p_reason) || ']'
  where id = p_res;
end $$;

-- 4. Cancelar devolviendo los abonos: en una sola transacción revierte cada pago que no esté revertido
--    y después cancela la reserva.
create function cancel_and_refund(p_res uuid, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v reservations%rowtype; p payments%rowtype;
begin
  perform require_role('admin');
  if coalesce(btrim(p_reason), '') = '' then raise exception 'la cancelación exige motivo'; end if;
  select * into v from reservations where id = p_res for update;
  if not found then raise exception 'reserva inexistente'; end if;
  if v.status = 'cancelled' then raise exception 'reserva ya cancelada'; end if;
  for p in
    select * from payments
    where reservation_id = p_res and kind = 'payment'
      and not exists (select 1 from payments r where r.reverses_payment_id = payments.id)
    order by created_at, id
  loop
    insert into payments (reservation_id, kind, amount, currency, method, reason, created_by, reverses_payment_id)
    values (p_res, 'reversal', -p.amount, p.currency, p.method, 'Devuelto al cancelar: ' || btrim(p_reason), auth.uid(), p.id);
  end loop;
  update reservations set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
    notes = coalesce(notes, '') || ' [cancelada: ' || btrim(p_reason) || ']'
  where id = p_res;
end $$;

-- 5. Reservar: el nombre del cliente no puede quedar en blanco. Misma firma y cuerpo que la 0005.
create or replace function create_reservation(
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
  if coalesce(btrim(p_customer_name), '') = '' then raise exception 'falta el nombre'; end if;
  select * into v_table from tables where id = p_table_id;
  if not found then raise exception 'mesa inexistente'; end if;
  if not v_table.active then raise exception 'mesa retirada'; end if;
  if p_guests > v_table.capacity then raise exception 'excede capacidad'; end if;
  if p_total < 0 or p_deposit > p_total then raise exception 'anticipo mayor al total'; end if;

  insert into customers (full_name, phone, whatsapp, created_by)
  values (btrim(p_customer_name), p_phone, p_phone, auth.uid()) returning id into v_customer;

  insert into reservations (event_id, table_id, customer_id, seller_id, guests, total_price, notes)
  values (v_table.event_id, p_table_id, v_customer, auth.uid(), p_guests, p_total, p_notes)
  returning id into v_res;   -- el trigger de capacidad falla si ya no quedan puestos

  if p_deposit > 0 then
    insert into payments (reservation_id, amount, method, created_by)
    values (v_res, p_deposit, p_method, auth.uid());
  end if;
  return v_res;
end $$;

-- Solo usuarios con sesión pueden llamar a la función nueva (las reemplazadas conservan sus permisos).
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function cancel_and_refund(uuid, text) from public, anon;
    grant execute on function cancel_and_refund(uuid, text) to authenticated;
  end if;
end $$;
