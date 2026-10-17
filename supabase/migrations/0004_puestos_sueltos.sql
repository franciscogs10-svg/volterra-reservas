-- Puestos que se venden sueltos y no estaban en el seed: la barra de planta baja y los dos sillones de VIP.
insert into tables (event_id, area_id, code, kind, capacity, map_x, map_y, map_w, map_h, map_rot, shape)
select a.event_id, a.id, v.code, 'seat', v.capacity, v.map_x, v.map_y, v.map_w, v.map_h, 0, 'r'
from (values
  ('PB',  'PB-16',  11, 275, 650, 26, 228),
  ('VIP', 'VIP-08',  2, 150, 267, 50,  80)
) as v(area, code, capacity, map_x, map_y, map_w, map_h)
join areas a on a.code = v.area;
