#!/usr/bin/env python3
"""Draw a labelled coordinate grid over a region of a source photo (to pick perspective-correction corners).
Usage: python3 -I scripts/books/grid.py <image> <x0,y0,x1,y1> <out.png> [step=50]"""
import sys
from PIL import Image, ImageDraw, ImageFont
src, box, out = sys.argv[1], [int(v) for v in sys.argv[2].split(',')], sys.argv[3]
step = int(sys.argv[4]) if len(sys.argv) > 4 else 50
im = Image.open(src).convert('RGB').crop(box)
d = ImageDraw.Draw(im)
x0, y0 = box[0], box[1]
try: f = ImageFont.load_default(size=13)
except TypeError: f = ImageFont.load_default()
gx = (x0 // step + 1) * step
while gx < box[2]:
    X = gx - x0; major = gx % (step * 2) == 0
    d.line([(X, 0), (X, im.height)], fill=(255, 40, 40) if major else (255, 200, 0), width=1)
    d.text((X + 2, 2), str(gx), fill=(255, 255, 0), font=f); gx += step
gy = (y0 // step + 1) * step
while gy < box[3]:
    Y = gy - y0; major = gy % (step * 2) == 0
    d.line([(0, Y), (im.width, Y)], fill=(255, 40, 40) if major else (255, 200, 0), width=1)
    d.text((2, Y + 2), str(gy), fill=(255, 255, 0), font=f); gy += step
im.save(out)
print(out, im.size)
