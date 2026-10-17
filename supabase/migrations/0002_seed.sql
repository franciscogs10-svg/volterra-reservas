-- Generado por scripts/gen-seed.mjs. No editar a mano.
do $$
declare
  e uuid;
begin
  insert into events (name, venue) values ('VOLTERRA', 'VOLTERRA') returning id into e;
  insert into areas (event_id, code, name) values (e, 'PB', 'Planta baja'), (e, 'VIP', 'Planta alta VIP');
  insert into tables (event_id, area_id, code, capacity, map_x, map_y, map_w, map_h, map_rot, shape)
  select e, a.id, v.code, v.capacity, v.map_x, v.map_y, v.map_w, v.map_h, v.map_rot, v.shape
  from (values
    ('PB', 'PB-01', 10, 302, 160, 125, 34, 0, 'r'),
    ('PB', 'PB-02', 4, 125, 318, 60, 60, 0, 'c'),
    ('PB', 'PB-03', 4, 326, 252, 52, 52, 0, 'r'),
    ('PB', 'PB-04', 10, 360, 327, 108, 30, -33, 'r'),
    ('PB', 'PB-05', 10, 472, 270, 108, 30, -22, 'r'),
    ('PB', 'PB-06', 10, 525, 348, 108, 30, -33, 'r'),
    ('PB', 'PB-07', 10, 420, 417, 108, 30, -35, 'r'),
    ('PB', 'PB-08', 10, 600, 397, 105, 30, -60, 'r'),
    ('PB', 'PB-09', 4, 498, 472, 52, 52, 0, 'r'),
    ('PB', 'PB-10', 10, 590, 540, 28, 104, 0, 'r'),
    ('PB', 'PB-11', 10, 122, 500, 30, 112, 0, 'r'),
    ('PB', 'PB-12', 10, 122, 690, 30, 112, 0, 'r'),
    ('PB', 'PB-13', 10, 692, 422, 28, 96, 0, 'r'),
    ('PB', 'PB-14', 10, 692, 530, 28, 96, 0, 'r'),
    ('PB', 'PB-15', 10, 686, 670, 30, 118, 0, 'r'),
    ('VIP', 'VIP-01', 6, 150, 445, 38, 84, 0, 'r'),
    ('VIP', 'VIP-02', 6, 147, 610, 36, 72, 0, 'r'),
    ('VIP', 'VIP-03', 6, 256, 708, 70, 38, 0, 'r'),
    ('VIP', 'VIP-04', 10, 430, 738, 132, 36, 0, 'r'),
    ('VIP', 'VIP-05', 10, 280, 445, 125, 30, -42, 'r'),
    ('VIP', 'VIP-06', 10, 352, 520, 125, 30, -42, 'r'),
    ('VIP', 'VIP-07', 10, 420, 598, 125, 30, -42, 'r')
  ) as v(area, code, capacity, map_x, map_y, map_w, map_h, map_rot, shape)
  join areas a on a.event_id = e and a.code = v.area;
end $$;
