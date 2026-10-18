-- MOREFEST (2026-10-17): la app se rebautiza y guarda el correo del cliente.
-- Aditiva: agrega una columna y una función y cambia el nombre del evento. Si hiciera falta volver atrás, se escribe una 0010.

-- 1. Nombre y lugar del evento. Hay un solo evento (sembrado en 0002) y la columna venue existe desde 0001.
update events set name = 'MOREFEST', venue = 'Restaurante VOLTERRA, Maracaibo';

-- 2. Correo del cliente, opcional. El formato se exige en la tabla, no solo en la interfaz.
alter table customers add column email text
  constraint customers_email_format check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$');

-- Auditoría: un cambio de correo o teléfono deja rastro, como las demás tablas (0001).
create trigger audit_customers after insert or update or delete on customers
  for each row execute function audit();

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
