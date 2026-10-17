-- Planta alta VIP: el lado izquierdo y la zona de abajo pasan a ser de los artistas (sin mesas a la venta)
-- y las tres mesas diagonales se convierten en sofás de 4 puestos para patrocinadores.
-- Las mesas retiradas no se borran: quedan inactivas, fuera del mapa y sin poder reservarse.
alter table tables add column active boolean not null default true;

update tables set active = false where code in ('VIP-01', 'VIP-02', 'VIP-03', 'VIP-04', 'VIP-08');
update tables set kind = 'sofa', capacity = 4 where code in ('VIP-05', 'VIP-06', 'VIP-07');

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
  select * into v_table from tables where id = p_table_id;
  if not found then raise exception 'mesa inexistente'; end if;
  if not v_table.active then raise exception 'mesa retirada'; end if;
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
