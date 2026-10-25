#!/usr/bin/env python3 -I
"""Render TR page scans at 2x grayscale PNG: single_page.py <vol3> <page> [<page>...] -> raw/single/<vol>-<page>.png"""
import sys, os
from PIL import Image
os.makedirs('raw/single', exist_ok=True)
v = sys.argv[1]
for p in sys.argv[2:]:
    im = Image.open(f'raw/tr-img/{v}/{p}.gif').convert('L')
    im = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    out = f'raw/single/{v}-{p}.png'; im.save(out); print(out, im.size)
