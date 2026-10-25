#!/usr/bin/env python3
"""Documented manual corrections applied on top of the crawled Toras Menachem catalogue. Idempotent.
Each patch is listed with its reason so the provenance stays transparent."""
import json, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
p = os.path.join(root, 'data/catalogue/toras-menachem.json')
d = json.load(open(p, encoding='utf-8'))
patches = []
for it in d['items']:
    # tm-5711-02-g045-s02: one digital node holds two separately numbered pieces (הדרן על הש״ס א–ו; עדי קידושין א–ז).
    if it['id'] == 'tm-5711-02-g045-s02' and it.get('sectionRuns') and len(it['sectionRuns']) == 2 and it['sectionLabels'][0] == 'א' and ':' not in it['sectionLabels'][0]:
        r1, r2 = it['sectionRuns']
        labels = [f'הדרן: {l}' for l in it['sectionLabels'][:r1['count']]] + [f'עדי קידושין: {l}' for l in it['sectionLabels'][r1['count']:]]
        it['sectionLabels'] = labels
        it['notes'] = (it.get('notes') or '') + ' [patch-catalogue] Labels prefixed per piece to keep unit ids unique.'
        patches.append(it['id'])
json.dump(d, open(p, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('patched', patches)
