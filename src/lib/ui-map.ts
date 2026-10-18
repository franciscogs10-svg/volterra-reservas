import { LABEL } from './logic';
import type { TableRow, TableStatus } from './types';

/** Lado mínimo del área de toque, en unidades del lienzo 792x966. Con el plano a 366 px de ancho
 *  (teléfono de 390 menos márgenes) 96 unidades son 44 px. */
export const HIT_MIN = 96;
const HIT_PAD = 18;
const RING_PAD = 10;

type Geo = Pick<TableRow, 'map_x' | 'map_y' | 'map_w' | 'map_h' | 'map_rot'>;

/** Ancho y alto del rectángulo que contiene una mesa girada. */
export function rotatedBox(t: Geo) {
  const a = (t.map_rot * Math.PI) / 180;
  const c = Math.abs(Math.cos(a));
  const s = Math.abs(Math.sin(a));
  return { w: t.map_w * c + t.map_h * s, h: t.map_w * s + t.map_h * c };
}

/** Área de toque invisible, centrada en la mesa. */
export function hitBox(t: Geo) {
  const b = rotatedBox(t);
  const w = Math.max(b.w + HIT_PAD, HIT_MIN);
  const h = Math.max(b.h + HIT_PAD, HIT_MIN);
  return { x: t.map_x - w / 2, y: t.map_y - h / 2, w, h };
}

/** Anillo de selección y de foco alrededor de la mesa. */
export function ringBox(t: Geo) {
  const b = rotatedBox(t);
  return { x: t.map_x - b.w / 2 - RING_PAD, y: t.map_y - b.h / 2 - RING_PAD, w: b.w + 2 * RING_PAD, h: b.h + 2 * RING_PAD };
}

/** ¿El punto cae dentro de la forma real de la mesa (girada)? */
function insideShape(t: Geo, x: number, y: number) {
  const a = (-t.map_rot * Math.PI) / 180;
  const dx = x - t.map_x;
  const dy = y - t.map_y;
  const lx = dx * Math.cos(a) - dy * Math.sin(a);
  const ly = dx * Math.sin(a) + dy * Math.cos(a);
  return Math.abs(lx) <= t.map_w / 2 && Math.abs(ly) <= t.map_h / 2;
}

const dist2 = (t: Geo, x: number, y: number) => (t.map_x - x) ** 2 + (t.map_y - y) ** 2;

function nearest<T extends Geo>(list: T[], x: number, y: number): T | null {
  let best: T | null = null;
  for (const t of list) if (!best || dist2(t, x, y) < dist2(best, x, y)) best = t;
  return best;
}

/** Qué mesa abre un toque en el punto (x, y) del lienzo. Si cae sobre la forma real de una mesa, esa mesa;
 *  si solo cae en áreas de toque que se cruzan, la de centro más cercano. Nunca decide el orden de dibujo. */
export function resolveTouch<T extends Geo>(tables: T[], x: number, y: number): T | null {
  const onShape = tables.filter((t) => insideShape(t, x, y));
  if (onShape.length) return nearest(onShape, x, y);
  const b = (t: T) => hitBox(t);
  const inBox = tables.filter((t) => {
    const h = b(t);
    return x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h;
  });
  return nearest(inBox, x, y);
}

/** "PB-05" se dibuja "05": la planta ya está en la pestaña. */
export const shortCode = (code: string) => code.replace(/^(PB|VIP)-/, '');

/** En VIP solo se venden sofás de patrocinadores; en planta baja, mesas y la barra. */
export const kindName = (t: Pick<TableRow, 'area'>) => (t.area === 'VIP' ? 'Sofá' : 'Mesa');
export const thisName = (t: Pick<TableRow, 'area'>) => (t.area === 'VIP' ? 'este sofá' : 'esta mesa');
export const wholeName = (t: Pick<TableRow, 'area'>) => (t.area === 'VIP' ? 'Sofá entero' : 'Mesa entera');

export function tableAria(t: Pick<TableRow, 'area' | 'code' | 'capacity'>, s: TableStatus, sold: number) {
  return `${kindName(t)} ${t.code}, ${LABEL[s]}, ${sold} de ${t.capacity} puestos vendidos`;
}

/** Desplazamiento que deja la mesa en el centro del contenedor del plano ampliado. */
export function centerScroll(t: Pick<TableRow, 'map_x' | 'map_y'>, svgWidthPx: number, view: { w: number; h: number }) {
  const k = svgWidthPx / 792;
  return { left: Math.max(0, t.map_x * k - view.w / 2), top: Math.max(0, t.map_y * k - view.h / 2) };
}
