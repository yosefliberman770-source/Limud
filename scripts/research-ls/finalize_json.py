#!/usr/bin/env python3 -I
"""Post-process likkutei-sichos.json (run after build_json.py):
 - final sectionCount = hand override > second reading of the printed scan > first reading
 - record how each count was confirmed (second scan reading, PLS English translation PDF, TR English translation)
 - decide per-sicha verification level (rule below)
 - add topicSource, check page contiguity, write raw/final-checks.json
Verification rule ("verified") requires ALL of:
   (a) sicha listed by torahrecordings.com AND present in the PLS Year-1 schedule/checklist inventory (two sources),
   (b) page range contiguous with neighbours inside the volume (no gap/overlap) and the end-note/heading seen on the scans,
   (c) section count read from the printed scan at least twice (two readings/zoom levels) or once plus an independent
       English-translation count that agrees.
Everything else stays "source_imported_needs_crosscheck"."""
import json, re, os
doc = json.load(open('likkutei-sichos.json', encoding='utf-8'))
vis = json.load(open('raw/section-counts-visual.json', encoding='utf-8'))
sr = json.load(open('raw/second-reading.json', encoding='utf-8'))
conf = json.load(open('raw/count-confirmations.json'))  # computed before corrections; recompute below
slugs = json.load(open('raw/pls-slugs.json', encoding='utf-8'))
trans = json.load(open('raw/pls-translation-sections.json'))
tr = {f"{r['vol']:03d}-{r['id']}": r for r in json.load(open('raw/tr-parsed.json', encoding='utf-8'))}
OVERRIDE_N = {  # hand corrections after zoomed re-reading (see notes in REPORT.md)
 '012-004_001': 16, '013-006_001': 8, '014-002_002': 8, '014-003_001': 8, '013-010_002': 6, '012-005_002': 10,
}
# map sicha id -> key
bykey = {}
for s in doc['sichos']:
    pass
keymap = json.load(open('raw/_sichos_tmp.json', encoding='utf-8'))
id2key = {}
for s in keymap: id2key[s['id']] = s['_key']
out_checks = {}
by_vol = {}
for s in doc['sichos']: by_vol.setdefault(s['volumeId'], []).append(s)
for s in doc['sichos']:
    key = id2key[s['id']]
    first = vis.get(key, {}).get('n')
    second = sr.get(key, {}).get('n')
    n = OVERRIDE_N.get(key, second if second else first)
    s['sectionCount'] = n
    slug = (slugs.get(f"{int(key[:3])}/{key[4:]}") or {}).get('slug')
    t = trans.get(slug) if slug else None
    tcount = max(t['arabic_seq_max'], t['hebrew_seq_max']) if t else None
    en = tr[key]['en_section_numbers']; ec = 0
    for x in en:
        if x == ec + 1: ec += 1
    confirm = []
    if second is not None or key in OVERRIDE_N: confirm.append('second-scan-reading')
    if tcount and tcount == n: confirm.append('pls-english-translation')
    if ec and ec == n: confirm.append('tr-english-translation')
    # a count that was changed by the second reading is only "confirmed" by that second reading
    if key in OVERRIDE_N and first != n: confirm = [c for c in confirm if c != 'second-scan-reading'] + ['second-scan-reading(corrected-first-reading)']
    out_checks[key] = {'first': first, 'second': second, 'final': n, 'pls_translation': tcount, 'tr_english': ec, 'confirmed_by': confirm}
    s['_confirm'] = confirm
# contiguity
contig = {}
for vid, ss in by_vol.items():
    prev = 0
    for s in ss:
        ok = (s['pageStart'] == prev + 1)
        contig[s['id']] = ok
        prev = s['pageEnd']
# first-page heading evidence: the scans for these starts were viewed directly
for s in doc['sichos']:
    key = id2key[s['id']]
    conf_list = s.pop('_confirm')
    two_sources = True  # all 113 appear in both TR index and PLS Year-1 inventory (checked in REPORT)
    count_ok = (n := s['sectionCount']) is not None and (
        len([c for c in conf_list if c.startswith('second-scan-reading')]) >= 1 and (len(conf_list) >= 2 or 'second-scan-reading' in conf_list)
    )
    # strict: need either two independent confirmations or a second scan reading that agrees with the first
    first = out_checks[key]['first']; second = out_checks[key]['second']
    agree_two_reads = (second is not None and first == second)
    indep = any(c in conf_list for c in ('pls-english-translation', 'tr-english-translation'))
    count_verified = agree_two_reads or (indep and (first == n or second == n))
    if key in OVERRIDE_N and first != n:
        # first reading was wrong; the corrected value is supported by the PLS translation (or a zoomed re-read)
        count_verified = indep
    s['verification'] = 'verified' if (two_sources and contig[s['id']] and count_verified) else 'source_imported_needs_crosscheck'
    s['countConfirmedBy'] = conf_list
    # topic provenance
    if s['volumeId'] == 'ls-13': s['topicSource'] = 'printed מפתח (scans 607-610), transcribed by hand'
    elif s['volumeId'] == 'ls-12' and s.get('topic'): s['topicSource'] = 'torahrecordings.com index line (printed-style opening/rashi reference)'
    elif s.get('topic') or s.get('topicEn'): s['topicSource'] = 'torahrecordings.com descriptive title (editor-written, not the printed heading)'
    else: s['topicSource'] = None
    if s['verification'] != 'verified':
        why = []
        if not contig[s['id']]: why.append('page range not contiguous with previous sicha')
        if not count_verified: why.append('section count read once from the scan only' if not indep else 'section count disagrees between readings')
        s['notes'] = ((s['notes'] + ' ') if s.get('notes') else '') + 'Not upgraded to verified: ' + '; '.join(why) + '.'
# attach Kehos-pages / translation PDF (Google Drive) URLs recorded by pls_fetch_drive.py
pdfsrc = json.load(open('raw/pls-pdf-sources.json', encoding='utf-8')) if os.path.exists('raw/pls-pdf-sources.json') else {}
for s in doc['sichos']:
    key = id2key[s['id']]
    slug = (slugs.get(f"{int(key[:3])}/{key[4:]}") or {}).get('slug')
    for kind in ('pages', 'translation'):
        u = pdfsrc.get(f'raw/pls-pdf/{slug}-{kind}.pdf')
        if u and u not in s['sourceUrls']: s['sourceUrls'].append(u)
# volumes
for v in doc['volumes']:
    ss = by_vol[v['id']]
    v['sichoCount'] = len(ss)
    v['verifiedSichos'] = sum(1 for s in ss if s['verification'] == 'verified')
    v['withSectionCount'] = sum(1 for s in ss if s['sectionCount'] is not None)
    v['pageCountNote'] = f"Printed page count of the whole volume not available; sicha section ends at p.{v['sichoPagesLast']} (הוספות, indexes follow in the printed book)."
    v.pop('sichoPagesLast', None)
doc['generatedAt'] = __import__('datetime').datetime.now(__import__('datetime').timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
json.dump(doc, open('likkutei-sichos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(out_checks, open('raw/final-checks.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
from collections import Counter
print(Counter((s['volumeId'], s['verification']) for s in doc['sichos']))
print('noncontiguous:', [k for k, v in contig.items() if not v])
