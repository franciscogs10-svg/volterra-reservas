-- Planta alta VIP: cada sofá es de 6 personas, no de 4 (Alejandro, 2026-11-20).
-- Primero la capacidad; luego, un sofá vendido entero (una sola reserva activa con los 4 puestos de antes)
-- pasa a 6 puestos para que siga ocupado entero y no quede como "parcial". Se puede correr de nuevo sin efecto.
update tables set capacity = 6 where code in ('VIP-05', 'VIP-06', 'VIP-07') and capacity <> 6;

update reservations r set guests = 6
where r.status <> 'cancelled' and r.guests = 4
  and r.table_id in (select id from tables where code in ('VIP-05', 'VIP-06', 'VIP-07'))
  and (select count(*) from reservations o where o.table_id = r.table_id and o.status <> 'cancelled') = 1;
