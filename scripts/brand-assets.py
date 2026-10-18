"""Genera las imágenes de marca de MOREFEST desde los originales de docs/brand/.

Salidas:
- public/brand/morella-lago-1280.jpg y public/brand/morella-lago-800.jpg: MORELLA_03 (Morella saliendo
  del lago), fondo de la pantalla Entrar. El original mide 1280x1280; la especificación pide máximo
  1600 px y calidad 80, así que no se agranda. La de 800 px es para teléfonos (srcset).
- public/brand/sello-morella.jpg: sello circular del encabezado, 240x240, desde MORELLA_01 con el
  recorte del prototipo aprobado (cuadrado de 280 px con esquina en 745,40).
- src/app/apple-icon.png: 180x180, monograma M crema sobre espresso con anillo dorado; mismos
  polígonos que src/app/icon.svg.

Las salidas no llevan EXIF: Pillow no lo copia si no se le pide.

Uso, desde la raíz del repo (Python con Pillow):
    python -I scripts/brand-assets.py              # escribe las cuatro imágenes
    python -I scripts/brand-assets.py --verificar  # además las compara con las del prototipo
"""
import argparse
import base64
import io
import re
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parent.parent
ORIGINALES = ROOT / 'docs' / 'brand'
PROTOTIPO = ROOT / 'docs' / 'design' / 'morefest-prototipo.html'
SALIDA = ROOT / 'public' / 'brand'
APPLE_ICON = ROOT / 'src' / 'app' / 'apple-icon.png'

CALIDAD = 80
LAGO_MAX = 1600
LAGO_ANCHOS = (1280, 800)
SELLO_CAJA = (745, 40, 1025, 320)  # izquierda, arriba, derecha, abajo sobre MORELLA_01 (1280x951)
SELLO_LADO = 240

ESPRESSO = (20, 12, 8)
CREMA = (243, 230, 211)
DORADO = (247, 200, 115)
ANILLO = (32, 28.5, 1.5)  # centro, radio y grosor sobre la grilla de 64 de icon.svg
M = [
    [(15, 18), (17, 18), (17, 46), (15, 46)],          # asta izquierda, fina
    [(15, 18), (21, 18), (33.5, 46), (30.5, 46)],      # diagonal gruesa
    [(30.5, 46), (32.5, 46), (47, 18), (45, 18)],      # diagonal fina
    [(44, 18), (49.5, 18), (49.5, 46), (44, 46)],      # asta derecha, gruesa
    [(11.5, 18), (21, 18), (21, 19.4), (11.5, 19.4)],  # remates
    [(43, 18), (53, 18), (53, 19.4), (43, 19.4)],
    [(11.5, 44.6), (20.5, 44.6), (20.5, 46), (11.5, 46)],
    [(40.5, 44.6), (53, 44.6), (53, 46), (40.5, 46)],
]


def guardar_jpeg(img, ruta):
    img.save(ruta, 'JPEG', quality=CALIDAD, optimize=True, progressive=True)
    print(f'{ruta.relative_to(ROOT).as_posix()}: {img.width}x{img.height}, {ruta.stat().st_size // 1024} KB')


def lago():
    src = Image.open(ORIGINALES / 'MORELLA_03.jpg').convert('RGB')
    for ancho in LAGO_ANCHOS:
        w = min(ancho, src.width, LAGO_MAX)
        img = src if w == src.width else src.resize((w, round(src.height * w / src.width)), Image.LANCZOS)
        guardar_jpeg(img, SALIDA / f'morella-lago-{ancho}.jpg')


def sello():
    src = Image.open(ORIGINALES / 'MORELLA_01.jpg').convert('RGB')
    guardar_jpeg(src.crop(SELLO_CAJA).resize((SELLO_LADO, SELLO_LADO), Image.LANCZOS), SALIDA / 'sello-morella.jpg')


def apple_icon(lado=180, ss=4):
    e = lado * ss / 64
    img = Image.new('RGB', (lado * ss, lado * ss), ESPRESSO)
    d = ImageDraw.Draw(img)
    c, r, g = (v * e for v in ANILLO)
    ro = r + g / 2
    d.ellipse((c - ro, c - ro, c + ro, c + ro), outline=DORADO, width=round(g))
    for poligono in M:
        d.polygon([(x * e, y * e) for x, y in poligono], fill=CREMA)
    img = img.resize((lado, lado), Image.LANCZOS)
    img.save(APPLE_ICON, 'PNG', optimize=True)
    print(f'{APPLE_ICON.relative_to(ROOT).as_posix()}: {img.width}x{img.height}')


def diferencia(a, b):
    """Diferencia media en gris (0 a 255) entre dos imágenes del mismo tamaño."""
    return ImageStat.Stat(ImageChops.difference(a.convert('L'), b.convert('L'))).mean[0]


def verificar():
    html = PROTOTIPO.read_text(encoding='utf-8')
    datos = re.findall(r'data:image/jpeg;base64,([A-Za-z0-9+/=]+)', html)
    entrada, sello_proto = (Image.open(io.BytesIO(base64.b64decode(b))) for b in datos[:2])  # orden: entrada, sello, planos
    casos = [
        ('sello', Image.open(SALIDA / 'sello-morella.jpg').resize(sello_proto.size, Image.LANCZOS), sello_proto, 4.0),
        ('entrada', Image.open(SALIDA / 'morella-lago-1280.jpg').resize(entrada.size, Image.LANCZOS), entrada, 3.0),
    ]
    ok = True
    for nombre, nuevo, ref, tope in casos:
        dif = diferencia(nuevo, ref)
        print(f'{nombre}: diferencia media {dif:.2f} (tope {tope}) {"PASS" if dif < tope else "FAIL"}')
        ok = ok and dif < tope
    return ok


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Genera las imágenes de marca de MOREFEST.')
    ap.add_argument('--verificar', action='store_true', help='compara con las imágenes embebidas en el prototipo')
    args = ap.parse_args()
    SALIDA.mkdir(parents=True, exist_ok=True)
    lago()
    sello()
    apple_icon()
    if args.verificar and not verificar():
        sys.exit(1)
