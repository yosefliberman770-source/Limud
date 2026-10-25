#!/usr/bin/env python3 -I
"""Compare section counts: visual reading of printed scans vs PLS translation PDF vs TR English translation."""
import json, re
vis = json.load(open('raw/section-counts-visual.json', encoding='utf-8'))
tr = {f"{r['vol']:03d}-{r['id']}": r for r in json.load(open('raw/tr-parsed.json', encoding='utf-8'))}
slugs = json.load(open('raw/pls-slugs.json', encoding='utf-8'))
trans = json.load(open('raw/pls-translation-sections.json'))
agree = 0; total = 0
for key, v in vis.items():
    vol, sid = key.split('-'); slug = slugs.get(f"{int(vol)}/{sid}", {}).get('slug')
    t = trans.get(slug) if slug else None
    tcount = max(t['arabic_seq_max'], t['hebrew_seq_max']) if t else None
    en = tr[key]['en_section_numbers']; encount = 0
    for n in en:
        if n == encount + 1: encount += 1
    marks = []
    if tcount: marks.append(f"PLS-transl={tcount}{'✓' if tcount == v['n'] else '✗'}")
    if encount: marks.append(f"TR-en={encount}{'✓' if encount == v['n'] else '✗'}")
    ok = (tcount == v['n']) or (encount == v['n'])
    total += 1; agree += ok
    print(key, slug or '-', 'visual', v['n'], ' '.join(marks), '' if ok else '   <-- no independent agreement')
print('agreement', agree, '/', total)
