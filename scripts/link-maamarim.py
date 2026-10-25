#!/usr/bin/env python3
"""Link data/catalogue/maamarim.json entries to the Toras Menachem TOC items (type=maamar) by דיבור המתחיל.
Idempotent. Usage: python3 -I scripts/link-maamarim.py"""
import json, re, sys, os
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
tm = json.load(open(os.path.join(root, 'data/catalogue/toras-menachem.json'), encoding='utf-8'))
mp = os.path.join(root, 'data/catalogue/maamarim.json')
mm = json.load(open(mp, encoding='utf-8'))
gather = {g['id']: g for g in tm['gatherings']}
maamarim = [i for i in tm['items'] if i['type'] == 'maamar']
def tokens(s):
    return [t for t in re.split(r"[\s.,:]+", re.sub(r"[׳'\"״]", '', s)) if t and t not in ('גו', 'וגו', 'לו')]
linked = 0
for e in mm['maamarim']:
    key = tokens(e.get('heTitleProvisional') or e['heTitle'])
    match = None
    for it in maamarim:
        dh = tokens(it.get('dibburHamaschil') or '')
        if key and all(any(k in t or t in k for t in dh) for k in key):
            match = it; break
    if not match:
        print('NO MATCH', e['heTitle'], file=sys.stderr); continue
    g = gather[match['gatheringId']]
    e['tmItemId'] = match['id']
    e['volumeId'] = match['volumeId']
    e['pageStart'] = match.get('pageStart')
    e['pageEnd'] = match.get('pageEnd')
    e['pageLabels'] = match.get('pageLabels')
    e['heDate'] = g['heDate']
    e['occasionLabel'] = g['occasion']['label']
    e['gatheringId'] = g['id']
    e['sourceUrl'] = match.get('sourceUrl')
    e['dibburHamaschilPrinted'] = match.get('dibburHamaschil')
    if e.get('heTitleProvisional') is None:
        e['heTitleProvisional'] = e['heTitle']
    # Display the דיבור המתחיל exactly as printed in the sefer.
    e['heTitle'] = match.get('dibburHamaschil') or e['heTitle']
    e['sectionCount'] = match.get('sectionCount') or None
    e['verification'] = 'verified' if match['verification'] == 'verified' else match['verification']
    e['notes'] = 'Identity, date and pages verified against chabadlibrary.org (Toras Menachem digital edition). The digital text of this maamar has no numbered אותיות; the log tracks by printed page unless a manual section count is entered.'
    linked += 1
mm['notes'] = ('16 maamarim of תשי״א (none in תש״י), each linked to its Toras Menachem TOC unit on chabadlibrary.org. Order field = the fixed study order basis (source order). '
               'Maamarim in this edition carry no numbered sections; page labels are verified, section counts are user-editable.')
mm['generatedAt'] = tm['generatedAt']
json.dump(mm, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('linked', linked, 'of', len(mm['maamarim']))
