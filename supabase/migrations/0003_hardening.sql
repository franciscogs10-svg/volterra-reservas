-- Endurecimiento de permisos: RLS ya protege, esto quita los permisos que la app no usa.

alter function enforce_table_capacity() set search_path = public;
alter function block_payment_mutation() set search_path = public;

do $$
declare t text;
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    -- Las funciones de disparador no se llaman desde la API.
    revoke execute on function audit() from public, anon, authenticated;
    revoke execute on function handle_new_user() from public, anon, authenticated;
    revoke execute on function enforce_table_capacity() from public, anon, authenticated;
    revoke execute on function block_payment_mutation() from public, anon, authenticated;

    -- Sin sesión no se toca nada.
    revoke all on all tables in schema public from anon;

    -- Con sesión solo se lee; las escrituras pasan por las funciones (security definer).
    foreach t in array array['profiles','events','areas','tables','customers','reservations',
                             'payments','check_ins','audit_logs','reservation_summary'] loop
      execute format('revoke all on %I from authenticated', t);
      execute format('grant select on %I to authenticated', t);
    end loop;
    -- Única escritura directa: el admin edita precios, fecha y estado (policies admin_tables y admin_events).
    grant update on tables, events to authenticated;
  end if;
end $$;
