#!/usr/bin/env python3 -I
"""crop_cols.py <vol3> <page> [...]: write 3.5x column crops (right/left, body area) of a TR page scan
to raw/crops/<vol>-<page>-R.png / -L.png, to disambiguate section letters (ה vs ח etc.)."""
import sys, os
from PIL import Image
os.makedirs('raw/crops', exist_ok=True)
v = sys.argv[1]
for p in sys.argv[2:]:
    im = Image.open(f'raw/tr-img/{v}/{p}.gif').convert('L')
    W, H = im.size
    top, bot = int(H * 0.08), int(H * 0.72)
    mid = W // 2
    for name, box in (('R', (mid - 10, top, W, bot)), ('L', (0, top, mid + 10, bot))):
        c = im.crop(box); c = c.resize((int(c.width * 3.5), int(c.height * 3.5)), Image.LANCZOS)
        out = f'raw/crops/{v}-{p}-{name}.png'; c.save(out); print(out, c.size)
