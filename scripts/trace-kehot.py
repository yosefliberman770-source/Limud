"""Vectorise the supplied Kehot mark (black line art on white) into smooth SVG path data -> src/art/kehotLogo.ts.
The bitmap is only a tracing blueprint; the app ships the resulting vector path, never the bitmap."""
import cv2, numpy as np, sys
from PIL import Image
src = sys.argv[1]
im = Image.open(src).convert('RGBA')
bg = Image.new('RGBA', im.size, (255, 255, 255, 255)); bg.alpha_composite(im)
g = np.array(bg.convert('L'))
S = 6
g = cv2.resize(g, None, fx=S, fy=S, interpolation=cv2.INTER_CUBIC)
g = cv2.GaussianBlur(g, (0, 0), S * 0.35)
_, bw = cv2.threshold(g, 128, 255, cv2.THRESH_BINARY_INV)   # ink = 255
ys, xs = np.where(bw > 0); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
cs, hier = cv2.findContours(bw, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
def smooth(c):
    p = cv2.approxPolyDP(c, 2.2, True).reshape(-1, 2).astype(float)
    n = len(p)
    if n < 4: return None
    d = ''
    for i in range(n):  # closed Catmull-Rom -> cubic Bezier
        p0, p1, p2, p3 = p[(i - 1) % n], p[i], p[(i + 1) % n], p[(i + 2) % n]
        c1 = p1 + (p2 - p0) / 9; c2 = p2 - (p3 - p1) / 9
        if i == 0: d += 'M%.1f %.1f' % ((p1[0]-x0)/S, (p1[1]-y0)/S)
        d += 'C%.1f %.1f %.1f %.1f %.1f %.1f' % tuple(v for q, o in ((c1, 0), (c2, 0), (p2, 0)) for v in ((q[0]-x0)/S, (q[1]-y0)/S))
    return d + 'Z'
parts = [s for c in cs if cv2.contourArea(c) > 6 * S * S * 0.5 for s in [smooth(c)] if s]
w, h = (x1 - x0 + 1) / S, (y1 - y0 + 1) / S
path = ''.join(parts)
open('src/art/kehotLogo.ts', 'w', encoding='utf-8').write(
 "/* Kehot publisher mark, vector-traced (scripts/trace-kehot.py) from the logo supplied by the user. Ink = filled, even-odd. */\n"
 f"export const KEHOT_LOGO = {{ w: {w:.1f}, h: {h:.1f}, d: '{path}' }} as const;\n")
print(len(parts), 'contours', round(w,1), round(h,1), len(path)//1024, 'KB')
