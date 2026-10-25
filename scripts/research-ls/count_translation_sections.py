#!/usr/bin/env python3 -I
"""Count numbered sections in PLS English 'Sicha Translation' PDFs (raw/pls-pdf/<slug>-translation.pdf).
Accepts Arabic (1., 2., ...) or Hebrew-letter (א., ב., ...) markers at line start; keeps the longest
sequential run starting at 1. Writes raw/pls-translation-sections.json"""
import glob, re, subprocess, json, os
HEB = ['א','ב','ג','ד','ה','ו','ז','ח','ט','י','יא','יב','יג','יד','טו','טז','יז','יח','יט','כ']
def seq_max(markers):
    best = 0; cur = 0
    for m in markers:
        if m == cur + 1: cur += 1; best = max(best, cur)
        elif m == 1: cur = 1; best = max(best, 1)
    return best
out = {}
for pdf in sorted(glob.glob('raw/pls-pdf/*-translation.pdf')):
    slug = os.path.basename(pdf)[:-len('-translation.pdf')]
    txt = subprocess.run(['pdftotext', '-layout', pdf, '-'], capture_output=True, text=True).stdout
    txt = re.sub('[​‎‏‪-‮﻿]', '', txt)
    arab, heb = [], []
    for line in txt.split('\n'):
        m = re.match(r'\s{0,16}[*•]?\s*(\d{1,2})[.)]\s+\S', line)
        if m: arab.append(int(m.group(1)))
        m2 = re.match(r'\s{0,16}([א-ת]{1,2})[.)]\s+\S', line)
        if m2 and m2.group(1) in HEB: heb.append(HEB.index(m2.group(1)) + 1)
    pm = re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout)
    out[slug] = {'arabic_seq_max': seq_max(arab), 'hebrew_seq_max': seq_max(heb), 'pdf_pages': int(pm.group(1)) if pm else None, 'chars': len(txt)}
json.dump(out, open('raw/pls-translation-sections.json', 'w'), indent=1)
for k, v in out.items(): print(k, v)
