#!/usr/bin/env python3 -I
"""body_view.py <vol3> <page>...: render the two text columns of a TR page scan at 3x, right column first (left of image) ... 
Writes raw/body/<vol>-<page>.png (body area only, footnotes included) for a careful second reading of section letters."""
import sys, os
from PIL import Image
os.makedirs('raw/body', exist_ok=True)
VOLDIR = {'010': '010', '011': '011', '012': '012', '013': '013', '014': '014'}
v = sys.argv[1]
for p in sys.argv[2:]:
    im = Image.open(f'raw/tr-img/{v}/{p}.gif').convert('L')
    W, H = im.size
    body = im.crop((0, int(H * 0.10), W, int(H * 0.78)))   # upper body: section letters are in the main text, above the footnotes mostly
    body = body.resize((body.width * 3, body.height * 3), Image.LANCZOS)
    out = f'raw/body/{v}-{p}.png'; body.save(out); print(out, body.size)
