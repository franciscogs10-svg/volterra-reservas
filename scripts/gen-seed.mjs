// Genera supabase/migrations/0002_seed.sql con las mesas del croquis.
// Coordenadas sobre un lienzo de 792x966: [centroX, centroY, ancho, alto, giro, puestos, forma].
import { writeFileSync } from 'node:fs';

const DEF = {
  PB: [
    [302, 160, 125, 34, 0, 10], [125, 318, 60, 60, 0, 4, 'c'], [326, 252, 52, 52, 0, 4], [360, 327, 108, 30, -33, 10],
    [472, 270, 108, 30, -22, 10], [525, 348, 108, 30, -33, 10], [420, 417, 108, 30, -35, 10], [600, 397, 105, 30, -60, 10],
    [498, 472, 52, 52, 0, 4], [590, 540, 28, 104, 0, 10], [122, 500, 30, 112, 0, 10], [122, 690, 30, 112, 0, 10],
    [692, 422, 28, 96, 0, 10], [692, 530, 28, 96, 0, 10], [686, 670, 30, 118, 0, 10],
  ],
  VIP: [
    [150, 445, 38, 84, 0, 6], [147, 610, 36, 72, 0, 6], [256, 708, 70, 38, 0, 6], [430, 738, 132, 36, 0, 10],
    [280, 445, 125, 30, -42, 10], [352, 520, 125, 30, -42, 10], [420, 598, 125, 30, -42, 10],
  ],
};

const rows = [];
for (const [area, list] of Object.entries(DEF)) {
  list.forEach((d, i) => {
    const code = `${area}-${String(i + 1).padStart(2, '0')}`;
    rows.push(`    ('${area}', '${code}', ${d[5]}, ${d[0]}, ${d[1]}, ${d[2]}, ${d[3]}, ${d[4]}, '${d[6] || 'r'}')`);
  });
}

const sql = `-- Generado por scripts/gen-seed.mjs. No editar a mano.
do $$
declare
  e uuid;
begin
  insert into events (name, venue) values ('VOLTERRA', 'VOLTERRA') returning id into e;
  insert into areas (event_id, code, name) values (e, 'PB', 'Planta baja'), (e, 'VIP', 'Planta alta VIP');
  insert into tables (event_id, area_id, code, capacity, map_x, map_y, map_w, map_h, map_rot, shape)
  select e, a.id, v.code, v.capacity, v.map_x, v.map_y, v.map_w, v.map_h, v.map_rot, v.shape
  from (values
${rows.join(',\n')}
  ) as v(area, code, capacity, map_x, map_y, map_w, map_h, map_rot, shape)
  join areas a on a.event_id = e and a.code = v.area;
end $$;
`;
writeFileSync(new URL('../supabase/migrations/0002_seed.sql', import.meta.url), sql);
console.log(`${rows.length} mesas`);
