#!/usr/bin/env python3 -I
"""OCR every TR page scan (raw/tr-img/<vol>/<n>.gif) with tesseract (heb), 2x upscaled, psm 4.
Writes raw/ocr/<vol>-<n>.txt. Skips pages already done. Usage: ocr_pages.py [vol ...]"""
import os, sys, glob, subprocess, tempfile
from PIL import Image
os.makedirs('raw/ocr', exist_ok=True)
vols = sys.argv[1:] or ['010', '011', '012_likuteisichos_vol12', '013_likuteisichos_vol13', '014']
for v in sorted(os.listdir('raw/tr-img')):
    if not os.path.isdir(f'raw/tr-img/{v}'): continue
    if sys.argv[1:] and v not in sys.argv[1:]: continue
    for fn in sorted(glob.glob(f'raw/tr-img/{v}/*.gif'), key=lambda f: int(os.path.basename(f)[:-4]) if os.path.basename(f)[:-4].isdigit() else 0):
        n = os.path.basename(fn)[:-4]
        out = f'raw/ocr/{v}-{n}'
        if os.path.exists(out + '.txt'): continue
        try:
            im = Image.open(fn).convert('L'); im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
        except Exception as e:
            print('bad image', fn, e); continue
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as t:
            im.save(t.name); tmp = t.name
        r = subprocess.run(['tesseract', tmp, out, '-l', 'heb', '--psm', '4'], capture_output=True, text=True)
        os.remove(tmp)
        print(v, n, 'ok' if r.returncode == 0 else r.stderr[:100], flush=True)
