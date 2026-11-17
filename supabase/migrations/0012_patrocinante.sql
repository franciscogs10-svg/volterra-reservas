-- Reserva de patrocinante (2026-11-17). Los patrocinantes ya pagaron con su paquete: no deben nada.
-- Hasta ahora una reserva con total 0 se veía "Con saldo" y una con precio se veía como deuda.
-- set_sponsor marca la reserva (nueva o ya existente) y deja el total igual a lo ya abonado (0 si no hay abonos):
-- así no queda deuda y no se pierde dinero registrado. Admin y vendedor, igual que crear reservas.
alter table reservations add column sponsor boolean not null default false;

create function set_sponsor(p_res uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v reservations%rowtype; v_net numeric;
begin
  perform require_role('admin','seller');
  select * into v from reservations where id = p_res for update;
  if not found then raise exception 'reserva inexistente'; end if;
  if v.status = 'cancelled' then raise exception 'reserva cancelada'; end if;
  if v.sponsor then raise exception 'ya es patrocinante'; end if;
  select coalesce(sum(amount), 0) into v_net from payments where reservation_id = p_res;
  update reservations set sponsor = true, total_price = greatest(v_net, 0) where id = p_res;
end $$;

-- Solo usuarios con sesión: Supabase abre las funciones nuevas a anon por defecto.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function set_sponsor(uuid) from public, anon;
    grant execute on function set_sponsor(uuid) to authenticated;
  end if;
end $$;
