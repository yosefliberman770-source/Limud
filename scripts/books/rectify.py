#!/usr/bin/env python3
"""Perspective-correct the cover and spine of each user-supplied book photo into flat textures.

The source photos are the user's own reference photos (see data/catalogue/book-scans.json for provenance and
licensing notes). Corner coordinates (TL, TR, BR, BL in source-image pixels) were picked by eye with
scripts/books/grid.py. Run: python3 -I scripts/books/rectify.py  → writes assets-src/books/rect/*.png (lossless
intermediates used by scripts/books/build_textures.py).
"""
import os, sys, json
import numpy as np, cv2

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'assets-src/books')
OUT = os.path.join(SRC, 'rect')
os.makedirs(OUT, exist_ok=True)

# key: (source file, cover quad, spine quad, cover size, spine size)
BOOKS = {
    'shas': ('shas-ozvehadar.jpg', [(145, 452), (752, 454), (752, 1614), (143, 1478)], [(754, 455), (880, 456), (880, 1612), (754, 1616)], (724, 1024), (190, 1024)),
    'chitas': ('chitas.jpg', [(50, 482), (845, 462), (848, 1812), (52, 1765)], [(848, 462), (1000, 468), (1000, 1800), (848, 1812)], (735, 1024), (290, 1024)),
    'tm': ('tm-hisvaaduyos.jpg', [(413, 393), (1028, 383), (1038, 1272), (448, 1306)], [(255, 350), (385, 345), (385, 1112), (258, 1100)], (724, 1024), (250, 1024)),
    'ls': ('ls-vol25.jpg', [(195, 308), (505, 292), (505, 850), (122, 862)], [(528, 272), (618, 272), (620, 853), (525, 853)], (724, 1024), (220, 1024)),
    'maamarim': ('tm-maamarim.jpg', [(100, 498), (855, 415), (860, 1880), (115, 1765)], [(862, 410), (948, 414), (948, 1890), (864, 1896)], (724, 1024), (260, 1024)),
    'ramban': ('ramban.jpg', [(78, 428), (878, 415), (882, 1676), (80, 1640)], [(886, 412), (955, 418), (955, 1672), (886, 1678)], (724, 1024), (210, 1024)),
    'rambam': ('rambam-mishneh-torah.jpg', [(122, 588), (832, 590), (832, 1690), (125, 1625)], [(835, 582), (890, 584), (890, 1690), (835, 1692)], (690, 1024), (260, 1024)),
}

def warp(img, quad, size):
    w, h = size
    src = np.array(quad, dtype=np.float32)
    dst = np.array([(0, 0), (w, 0), (w, h), (0, h)], dtype=np.float32)
    M = cv2.getPerspectiveTransform(src, dst)
    return cv2.warpPerspective(img, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)

if __name__ == '__main__':
    only = sys.argv[1:] or list(BOOKS)
    for k in only:
        f, cq, sq, cs, ss = BOOKS[k]
        img = cv2.imread(os.path.join(SRC, f))
        cv2.imwrite(os.path.join(OUT, f'{k}-cover.png'), warp(img, cq, cs))
        cv2.imwrite(os.path.join(OUT, f'{k}-spine.png'), warp(img, sq, ss))
        print('rectified', k)
