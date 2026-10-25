"""Vectorise distinctive lettering/ornaments from a rectified blueprint into clean SVG path data (millimetres).
Usage: python3 scripts/trace-art.py <png> <key> <x0,y0,x1,y1> <mode> <mm_w> <mm_h> [min_area_px]
  mode: gold (bright warm ink on dark) | red (saturated red ink) | light (any bright ink) | dark
Output: merged into src/art/glyphs.json as {key: {d, x, y, w, h}} in mm, positioned in the cover's own frame.
The bitmap is only a tracing blueprint; the app ships the resulting vector paths."""
import cv2, numpy as np, sys, json, os
from PIL import Image
png, key, box, mode, mmw, mmh = sys.argv[1:7]
minA = float(sys.argv[7]) if len(sys.argv) > 7 else 14
sig = float(sys.argv[8]) if len(sys.argv) > 8 else 0.55
x0, y0, x1, y1 = [int(v) for v in box.split(',')]
im = Image.open(png).convert('RGB'); W, H = im.size
sx, sy = float(mmw) / W, float(mmh) / H
a = np.array(im).astype(float)[y0:y1, x0:x1]
R, G, B = a[..., 0], a[..., 1], a[..., 2]
if mode == 'gold': m = ((R + G) / 2 - B > 70) & (G > 95)
elif mode == 'red': m = (R - G > 85) & (R > 120) & (G < 105)
elif mode == 'light': m = (R + G + B) / 3 > 115
elif mode.startswith('bright'): m = (R + G + B) / 3 > float(mode.split(':')[1])
elif mode == 'black': m = (R + G + B) / 3 < 24
else: m = (R + G + B) / 3 < 70
m = m.astype(np.uint8) * 255
S = 8
m = cv2.resize(m, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
m = cv2.GaussianBlur(m, (0, 0), S * sig)
_, bw = cv2.threshold(m, 127, 255, cv2.THRESH_BINARY)
cs, hier = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
def path(c):
    p = cv2.approxPolyDP(c, 3.5 * max(0.6, sig / 0.55 * 0.7), True).reshape(-1, 2).astype(float)
    n = len(p)
    if n < 4: return ''
    d = ''
    f = lambda q: ((q[0] / S + x0) * sx, (q[1] / S + y0) * sy)
    for i in range(n):
        p0, p1, p2, p3 = p[(i - 1) % n], p[i], p[(i + 1) % n], p[(i + 2) % n]
        c1 = p1 + (p2 - p0) / 8; c2 = p2 - (p3 - p1) / 8
        if i == 0: d += 'M%.2f %.2f' % f(p1)
        d += 'C%.2f %.2f %.2f %.2f %.2f %.2f' % (*f(c1), *f(c2), *f(p2))
    return d + 'Z'
keep = [c for c in cs if cv2.contourArea(c) > minA * S * S]
parts = [path(c) for c in keep]
d = ''.join(p for p in parts if p)
def bb(c):
    x, y, w, h = cv2.boundingRect(c)
    return {'x': round((x / S + x0) * sx, 2), 'y': round((y / S + y0) * sy, 2), 'w': round(w / S * sx, 2), 'h': round(h / S * sy, 2)}
plist = [dict(d=path(c), **bb(c)) for c in keep if path(c)]
ys, xs = np.where(bw > 0)
out = {'parts': plist, 'd': d, 'x': round((xs.min() / S + x0) * sx, 2), 'y': round((ys.min() / S + y0) * sy, 2), 'w': round((xs.max() - xs.min()) / S * sx, 2), 'h': round((ys.max() - ys.min()) / S * sy, 2)}
f = 'src/art/glyphs.json'
db = json.load(open(f, encoding='utf-8')) if os.path.exists(f) else {}
db[key] = out
json.dump(db, open(f, 'w', encoding='utf-8'), ensure_ascii=False)
print(key, len(parts), 'contours', out['x'], out['y'], out['w'], out['h'], 'mm;', len(d) // 1024, 'KB')
