-- Deshacer una llegada marcada por error (2026-11-10).
-- Hasta ahora una reserva con "Confirmar llegada" no se podía corregir ni cancelar, y Alejandro tenía que pedir ayuda.
-- Solo el admin. La fila de check_ins se quita (queda en la auditoría por el disparador audit_checkins) y la reserva
-- vuelve a poder marcar llegada, cancelarse o seguir cobrándose. No toca pagos.
create function undo_check_in(p_res uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v reservations%rowtype;
begin
  perform require_role('admin');
  select * into v from reservations where id = p_res for update;
  if not found then raise exception 'reserva inexistente'; end if;
  if v.status = 'cancelled' or not exists (select 1 from check_ins where reservation_id = p_res) then
    raise exception 'sin llegada confirmada';
  end if;
  delete from check_ins where reservation_id = p_res;
end $$;

-- Solo usuarios con sesión: Supabase abre las funciones nuevas a anon por defecto.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke execute on function undo_check_in(uuid) from public, anon;
    grant execute on function undo_check_in(uuid) to authenticated;
  end if;
end $$;
