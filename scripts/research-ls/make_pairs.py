#!/usr/bin/env python3 -I
"""Compose, for each sicha, its last two page scans (TR gifs) side by side (later page on the left, RTL)
at 1.5x into raw/pairs/<vol>-<id>-<p1>-<p2>.png for visual section counting. Arg: optional 'first' to make
first-page images instead (raw/firsts/)."""
import json, os, sys
from PIL import Image
mode = sys.argv[1] if len(sys.argv) > 1 else 'last'
parsed = json.load(open('raw/tr-parsed.json', encoding='utf-8'))
FIX = {('11', '003_001'): list(range(34, 42))}  # TR page lists 14-23 erroneously duplicated from Vaera 1
os.makedirs('raw/pairs', exist_ok=True); os.makedirs('raw/firsts', exist_ok=True)
for r in parsed:
    v = f"{r['vol']:03d}"
    pages = FIX.get((v, r['id']), sorted(set(r.get('pages', []))))
    pages = [p for p in pages if os.path.exists(f'raw/tr-img/{v}/{p}.gif')]  # TR lists 012/138-140 but server 404s
    if not pages or r['id'] == '000': continue
    sel = pages[-2:] if mode == 'last' else pages[:1]
    ims = []
    for p in sel:
        fn = f'raw/tr-img/{v}/{p}.gif'
        if not os.path.exists(fn): print('missing', fn); break
        im = Image.open(fn).convert('L'); s = 1.5 if mode == 'last' else 2.0
        ims.append(im.resize((int(im.width * s), int(im.height * s))))
    if len(ims) != len(sel): continue
    W = sum(i.width for i in ims) + 20 * (len(ims) - 1); H = max(i.height for i in ims)
    out = Image.new('L', (W, H), 255); x = 0
    for im in reversed(ims):  # RTL: later page on the left
        out.paste(im, (x, 0)); x += im.width + 20
    name = f"{v}-{r['id']}-" + '-'.join(map(str, sel)) + '.png'
    out.save(f"raw/{'pairs' if mode=='last' else 'firsts'}/{name}")
    print(name, out.size)
