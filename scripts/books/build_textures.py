#!/usr/bin/env python3
"""Clean the rectified photo textures (blank out volume-specific lettering) and export web textures.

Input : assets-src/books/rect/*.png   (from scripts/books/rectify.py)
Output: public/books/<key>-cover.jpg, <key>-spine.jpg
The cleaned areas are redrawn at runtime (src/library3d/scanOverlays.ts) with the app's real Hebrew fonts so each
volume carries its own correct label. Everything else is the photographed binding, untouched.
"""
import os
import numpy as np, cv2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
RECT = os.path.join(ROOT, 'assets-src/books/rect')
OUT = os.path.join(ROOT, 'public/books')
os.makedirs(OUT, exist_ok=True)

# (x0, y0, x1, y1) boxes in rectified pixel space.
# mode 'grad'    : vertical gradient between the text-free rows just above/below the box (flat backgrounds)
# mode 'inpaint' : remove only the gold/pale lettering pixels and inpaint them from the surroundings (keeps leather grain)
# mode 'solid'   : flat colour
CLEAN = {
    'tm-cover': [((200, 555, 545, 665), 'grad')],
    'tm-spine': [((45, 505, 245, 705), 'grad')],
    'ls-cover': [((290, 362, 440, 462), 'grad')],
    'ls-spine': [((40, 438, 175, 498), 'grad'), ((30, 652, 195, 722), 'grad')],
    'rambam-spine': [((28, 195, 252, 455), 'solid')],
    'maamarim-cover': [((225, 535, 470, 610), 'inpaint')],
    'maamarim-spine': [((60, 150, 258, 460), ('sample', (66, 160, 96, 440)))],
    'ramban-spine': [((40, 252, 215, 492), ('sample', (46, 262, 70, 480))), ((40, 512, 215, 628), ('sample', (46, 522, 70, 618))), ((40, 652, 215, 772), ('sample', (46, 662, 70, 764)))],
}
SOLID = {'rambam-spine': (22, 19, 17)}
SHARPEN = {'tm-cover', 'tm-spine', 'ls-cover'}

def lettering_mask(img, box):
    x0, y0, x1, y1 = box
    roi = img[y0:y1, x0:x1].astype(np.int32)
    b, g, r = roi[..., 0], roi[..., 1], roi[..., 2]
    # light (gold / cream / white-ish) pixels that are clearly brighter than the dark leather
    lum = (r + g + b) / 3
    m = ((lum > 110) & ((r - b) > 18)) | (lum > 170)
    m = m.astype(np.uint8) * 255
    return cv2.dilate(m, np.ones((7, 7), np.uint8), iterations=1)

def clean(img, key):
    for box, mode in CLEAN.get(key, []):
        x0, y0, x1, y1 = box
        x1 = min(x1, img.shape[1]); y1 = min(y1, img.shape[0])
        h, w = y1 - y0, x1 - x0
        if mode == 'inpaint':
            full = np.zeros(img.shape[:2], np.uint8)
            full[y0:y1, x0:x1] = lettering_mask(img, box)
            img = cv2.inpaint(img, full, 4, cv2.INPAINT_TELEA)
            continue
        if isinstance(mode, tuple) and mode[0] == 'sample':
            sx0, sy0, sx1, sy1 = mode[1]
            col = np.median(img[sy0:sy1, sx0:sx1].reshape(-1, 3), axis=0)
            patch = np.empty((h, w, 3), np.float32); patch[:] = col
        elif mode == 'solid':
            patch = np.empty((h, w, 3), np.float32); patch[:] = SOLID[key]
        else:
            top = np.median(img[max(0, y0 - 14):y0 - 3, x0:x1].reshape(-1, 3), axis=0)
            bot = np.median(img[y1 + 3:y1 + 14, x0:x1].reshape(-1, 3), axis=0)
            t = np.linspace(0, 1, h, dtype=np.float32)[:, None, None]
            patch = (top[None, None, :] * (1 - t) + bot[None, None, :] * t) * np.ones((1, w, 1), np.float32)
        mask = np.zeros((h, w), np.float32)
        cv2.rectangle(mask, (4, 4), (w - 5, h - 5), 1.0, -1)
        mask = cv2.GaussianBlur(mask, (0, 0), 3)[..., None]
        patch = np.clip(patch + np.random.default_rng(7).normal(0, 2.0, patch.shape), 0, 255)
        img[y0:y1, x0:x1] = (img[y0:y1, x0:x1] * (1 - mask) + patch * mask).astype(np.uint8)
    return img

def sharpen(img):
    blur = cv2.GaussianBlur(img, (0, 0), 1.6)
    return cv2.addWeighted(img, 1.6, blur, -0.6, 0)

for f in sorted(os.listdir(RECT)):
    if not f.endswith('.png'):
        continue
    key = f[:-4]
    img = cv2.imread(os.path.join(RECT, f))
    img = clean(img, key)
    if key in SHARPEN:
        img = sharpen(img)
    cv2.imwrite(os.path.join(OUT, key + '.jpg'), img, [cv2.IMWRITE_JPEG_QUALITY, 88])
    print('wrote', key + '.jpg', img.shape[1], 'x', img.shape[0], os.path.getsize(os.path.join(OUT, key + '.jpg')) // 1024, 'KB')
