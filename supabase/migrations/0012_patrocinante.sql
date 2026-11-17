-- Reserva de patrocinante (2026-11-17). Los patrocinantes ya pagaron con su paquete: no deben nada.
-- Hasta ahora una reserva con total 0 se veía "Con saldo" y una con precio se veía como deuda.
-- set_sponsor marca la reserva y deja el total igual a lo ya abonado (0 si no hay abonos): no queda deuda
-- y no se pierde dinero registrado. Quién y cuándo quedan en sponsor_by y sponsor_at (y en audit_logs).
-- Permisos: el admin marca cualquier reserva. El vendedor solo la suya y sin abonos (es el paso de crear una
-- reserva de patrocinante); así no puede borrar la deuda de una mesa ya cobrada.
-- Se puede correr de nuevo sin error (if not exists / or replace).
alter table reservations add column if not exists sponsor boolean not null default false;
alter table reservations add column if not exists sponsor_by uuid references profiles;
alter table reservations add column if not exists sponsor_at timestamptz;

create or replace function set_sponsor(p_res uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v reservations%rowtype; v_net numeric; v_role app_role;
begin
  v_role := require_role('admin','seller');
  select * into v from reservations where id = p_res for update;
  if not found then raise exception 'reserva inexistente'; end if;
  if v.status = 'cancelled' then raise exception 'reserva cancelada'; end if;
  if v.sponsor then raise exception 'ya es patrocinante'; end if;
  select coalesce(sum(amount), 0) into v_net from payments where reservation_id = p_res;
  if v_role <> 'admin' and (v.seller_id <> auth.uid() or v_net <> 0) then raise exception 'forbidden'; end if;
  update reservations set sponsor = true, total_price = greatest(v_net, 0), sponsor_by = auth.uid(), sponsor_at = now()
  where id = p_res;
end $$;

-- Solo usuarios con sesión: Supabase abre las funciones nuevas a anon por defecto.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function set_sponsor(uuid) from public, anon;
    grant execute on function set_sponsor(uuid) to authenticated;
  end if;
end $$;
