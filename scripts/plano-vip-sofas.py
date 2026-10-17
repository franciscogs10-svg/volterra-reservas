"""Redibuja los sofás de patrocinadores (VIP-05, VIP-06, VIP-07) del croquis VIP mirando a la pantalla LED.

Francisco, 2026-10-17: "los sofás van mirando hacia la pantalla LED". El dibujo de d507d22 los tenía con el
largo apuntando a la pantalla (giro -42) y los asientos de lado. Este script parte del plano de d507d22, borra
esos sofás sin tocar la baranda diagonal de la escalera y dibuja cada sofá paralelo a la baranda (giro 48):
espaldar hacia la zona de artistas, asientos abiertos hacia el vacío y la pantalla. Las medidas son las de
supabase/migrations/0007_sofas_mirando_pantalla.sql, así el recuadro del mapa calza con el dibujo.

Uso, desde la raíz del repo (Python con Pillow):
    python -I scripts/plano-vip-sofas.py                  # escribe public/plano-vip.jpg
    python -I scripts/plano-vip-sofas.py --capturas DIR   # además antes.png, despues.png, control.png y sofas-zoom.png
"""
import argparse
import io
import math
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
BASE_REV = 'd507d22'  # plano con los sofás de lado: punto de partida
ORIG_REV = 'a523e1b'  # croquis del arquitecto: referencia de la escalera del lado del vacío
LIENZO = (792, 966)
SS = 4  # el dibujo nuevo se traza a 4x y se reduce con LANCZOS

CENTROS = {'VIP-05': (280, 445), 'VIP-06': (352, 520), 'VIP-07': (420, 598)}
VIEJO = (120, 44, -42)  # ancho, alto, giro de 0006
NUEVO = (96, 40, 48)  # ancho, alto, giro de 0007

# Sofá nuevo en coordenadas locales del recuadro: x a lo largo, y hacia el espaldar (lado de los artistas).
ESPALDAR, BRAZO, RADIO = 10, 6, 3.5

# Borde del lado del piso de la baranda diagonal, ajustado sobre filas limpias del plano: x = A*y + B.
BAR_A, BAR_B = 0.886375, -28.456
MARGEN_BORRADO = 4


def plano(rev):
    data = subprocess.run(['git', 'show', f'{rev}:public/plano-vip.jpg'], cwd=ROOT, capture_output=True, check=True).stdout
    return Image.open(io.BytesIO(data))


def a_global(cx, cy, rot, x, y):
    t = math.radians(rot)
    return cx + x * math.cos(t) - y * math.sin(t), cy + x * math.sin(t) + y * math.cos(t)


def a_local(cx, cy, rot, gx, gy):
    t = math.radians(rot)
    dx, dy = gx - cx, gy - cy
    return dx * math.cos(t) + dy * math.sin(t), -dx * math.sin(t) + dy * math.cos(t)


def dentro(cx, cy, w, h, rot, gx, gy, margen=0.0):
    lx, ly = a_local(cx, cy, rot, gx, gy)
    return abs(lx) <= w / 2 + margen and abs(ly) <= h / 2 + margen


def caja(cx, cy, w, h, rot, margen=0):
    pts = [a_global(cx, cy, rot, sx * (w / 2 + margen), sy * (h / 2 + margen)) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    return pts, (int(min(xs)) - 1, int(min(ys)) - 1, int(max(xs)) + 2, int(max(ys)) + 2)


def perfil_baranda(img):
    """Gris medio de la baranda según la distancia horizontal h a su borde del lado del piso, en filas sin sofás."""
    px, bins = img.load(), {}
    for y in list(range(140, 360)) + list(range(651, 840)):
        xe = BAR_A * y + BAR_B
        for x in range(int(xe) - 4, int(xe) + 6):
            bins.setdefault(round((xe - x) * 4) / 4, []).append(px[x, y])
    tabla = {k: sum(v) / len(v) for k, v in bins.items()}
    return lambda h: tabla[min(tabla, key=lambda k: abs(k - h))]


def borrar_sofas_viejos(base, orig):
    """Blanco dentro de cada sofá viejo del lado del piso; la baranda se repone con su perfil limpio y,
    del lado del vacío, se queda la tinta común a los dos planos (escalones), que es el croquis original."""
    out, perfil = base.copy(), perfil_baranda(base)
    po, pb, pr = out.load(), base.load(), orig.load()
    w, h, rot = VIEJO
    for cx, cy in CENTROS.values():
        _, (x0, y0, x1, y1) = caja(cx, cy, w, h, rot, MARGEN_BORRADO)
        for y in range(y0, y1):
            for x in range(x0, x1):
                if not dentro(cx, cy, w, h, rot, x + 0.5, y + 0.5, MARGEN_BORRADO):
                    continue
                d = BAR_A * y + BAR_B - x  # > 0 del lado del piso
                if d >= 2.5:
                    po[x, y] = 255
                elif d > -1:
                    po[x, y] = round(perfil(d))
                else:
                    po[x, y] = max(pb[x, y], pr[x, y])
    return out


def rect_redondeado(w, h, r, pasos=8):
    pts = []
    for (cx, cy), a0 in (((w / 2 - r, -h / 2 + r), -90), ((w / 2 - r, h / 2 - r), 0), ((-w / 2 + r, h / 2 - r), 90), ((-w / 2 + r, -h / 2 + r), 180)):
        for i in range(pasos + 1):
            a = math.radians(a0 + 90 * i / pasos)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def dibujar_sofas():
    capa = Image.new('L', (LIENZO[0] * SS, LIENZO[1] * SS), 255)
    d = ImageDraw.Draw(capa)
    w, h, rot = NUEVO
    for cx, cy in CENTROS.values():
        def p(x, y):
            gx, gy = a_global(cx, cy, rot, x, y)
            return gx * SS - 0.5, gy * SS - 0.5

        borde = [p(x, y) for x, y in rect_redondeado(w, h, RADIO)]
        d.line(borde + [borde[0]], fill=0, width=5, joint='curve')
        yb, xb = h / 2 - ESPALDAR, w / 2 - BRAZO
        d.line([p(-xb, yb), p(xb, yb)], fill=0, width=4)  # frente del espaldar
        for s in (-1, 1):
            d.line([p(s * xb, yb), p(s * xb, -h / 2)], fill=0, width=4)  # brazos hasta el frente
        for i in (1, 2, 3):
            x = -xb + i * (2 * xb) / 4
            d.line([p(x, yb), p(x, -h / 2)], fill=0, width=3)  # cuatro cojines de asiento
    return capa.resize(LIENZO, Image.LANCZOS)


def verificar(base, final, capa):
    assert final.size == LIENZO, final.size
    w, h, rot = NUEVO
    pc = capa.load()
    for code, (cx, cy) in CENTROS.items():
        _, (x0, y0, x1, y1) = caja(cx, cy, w, h, rot, 4)
        loc = [a_local(cx, cy, rot, x + 0.5, y + 0.5) for y in range(y0, y1) for x in range(x0, x1) if pc[x, y] < 160]
        loc = [(a, b) for a, b in loc if abs(a) <= w / 2 + 4 and abs(b) <= h / 2 + 4]  # sin la tinta del sofá vecino
        lx, ly = [p[0] for p in loc], [p[1] for p in loc]
        print(f'{code}: tinta x [{min(lx):.1f}, {max(lx):.1f}] y [{min(ly):.1f}, {max(ly):.1f}] vs recuadro ±{w / 2} ±{h / 2}')
        assert max(map(abs, lx)) <= w / 2 + 1.5 and max(map(abs, ly)) <= h / 2 + 1.5
        assert min(lx) <= -w / 2 + 1 and max(lx) >= w / 2 - 1 and min(ly) <= -h / 2 + 1 and max(ly) >= h / 2 - 1
    # Nada fuera de los sofás viejos y nuevos cambia.
    pb, pf, fuera = base.load(), final.load(), 0
    for y in range(LIENZO[1]):
        for x in range(LIENZO[0]):
            if pb[x, y] != pf[x, y] and not any(
                dentro(cx, cy, *VIEJO, x + 0.5, y + 0.5, MARGEN_BORRADO + 1) or dentro(cx, cy, *NUEVO, x + 0.5, y + 0.5, 3)
                for cx, cy in CENTROS.values()
            ):
                fuera += 1
    print(f'píxeles cambiados fuera de los sofás: {fuera}')
    assert fuera == 0


def capturas(dirpath, base, final):
    dirpath.mkdir(parents=True, exist_ok=True)
    base.save(dirpath / 'antes.png')
    final.save(dirpath / 'despues.png')
    rgb = final.convert('RGBA')
    over = Image.new('RGBA', rgb.size, (0, 0, 0, 0))
    od = ImageDraw.Draw(over)
    for cx, cy in CENTROS.values():
        pts, _ = caja(cx, cy, *NUEVO)
        od.polygon(pts, fill=(220, 30, 30, 70), outline=(220, 30, 30, 200))
    control = Image.alpha_composite(rgb, over).convert('RGB')
    control.save(dirpath / 'control.png')
    zona, k = (190, 350, 520, 690), 2
    tiles = [im.convert('RGB').crop(zona).resize(((zona[2] - zona[0]) * k, (zona[3] - zona[1]) * k), Image.LANCZOS) for im in (base, final, control)]
    hoja = Image.new('RGB', (sum(t.width for t in tiles) + 20, tiles[0].height), (150, 150, 150))
    for i, t in enumerate(tiles):
        hoja.paste(t, (i * (t.width + 10), 0))
    hoja.save(dirpath / 'sofas-zoom.png')


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument('--out', default=str(ROOT / 'public' / 'plano-vip.jpg'))
    ap.add_argument('--capturas', type=Path)
    args = ap.parse_args()

    sys.stdout.reconfigure(encoding='utf-8')
    base_rgb = plano(BASE_REV).convert('RGB')
    r, g, b = base_rgb.split()
    gris = max(ImageChops.difference(r, g).getextrema()[1], ImageChops.difference(g, b).getextrema()[1])
    print(f'diferencia máxima entre canales del plano base: {gris} (se trabaja en gris)')
    base = base_rgb.convert('L')
    orig = plano(ORIG_REV).convert('L')
    assert base.size == orig.size == LIENZO

    limpio = borrar_sofas_viejos(base, orig)
    capa = dibujar_sofas()
    final = ImageChops.darker(limpio, capa)
    verificar(base, final, capa)
    final.save(args.out, 'JPEG', quality=92)
    print(f'escrito {args.out} {Image.open(args.out).size}')
    if args.capturas:
        capturas(args.capturas, base, final)
        print(f'capturas en {args.capturas}')


if __name__ == '__main__':
    main()
