#!/usr/bin/env python3
"""Compact the raw Sefaria /api/calendars responses into data/daily/sefaria-daily.json.
Usage: python3 -I scripts/build-daily-snapshot.py <raw_dir> <out_json>
Only the items this app needs are kept (parasha + aliyot, Daf Yomi, Rambam 3 chapters, Tanya Yomi).
"""
import json, os, sys, datetime
raw, out = sys.argv[1], sys.argv[2]
days = {}
files = sorted(f for f in os.listdir(raw) if f.endswith('.json'))
for f in files:
    d = f[:-5]
    data = json.load(open(os.path.join(raw, f), encoding='utf-8'))
    rec = {}
    r3 = []
    for it in data.get('calendar_items', []):
        t = it['title']['en']
        if t == 'Parashat Hashavua':
            rec['parsha'] = {'en': it['displayValue']['en'], 'he': it['displayValue']['he'], 'ref': it.get('ref'), 'heRef': it.get('heRef'),
                             'aliyot': (it.get('extraDetails') or {}).get('aliyot')}
        elif t == 'Daf Yomi':
            rec['daf'] = {'en': it['displayValue']['en'], 'he': it['displayValue']['he'], 'ref': it.get('ref')}
        elif t == 'Daily Rambam (3 Chapters)':
            r3.append({'en': it['displayValue']['en'], 'he': it['displayValue']['he'], 'ref': it.get('ref'), 'url': it.get('url')})
        elif t == 'Tanya Yomi':
            rec['tanya'] = {'heDate': it['displayValue']['he'], 'enDate': it['displayValue']['en'], 'ref': it.get('ref'), 'url': it.get('url')}
    if r3:
        rec['rambam3'] = r3
    days[d] = rec
snapshot = {
    'schemaVersion': 1,
    'source': 'https://www.sefaria.org/api/calendars?timezone=America/New_York&diaspora=1',
    'sourceName': 'Sefaria Calendars API',
    'fetchedAt': datetime.datetime.now(datetime.timezone.utc).isoformat(),
    'range': [files[0][:-5], files[-1][:-5]],
    'diaspora': True,
    'timezone': 'America/New_York',
    'verification': 'source_imported_needs_crosscheck',
    'notes': 'Sefaria publishes the Chabad three-chapter Rambam cycle and the Chabad Tanya daily cycle (Moreh Shiur) as curated tables. Chabad.org itself was unreachable from the build environment, so these are cross-checked against @hebcal/learning instead (see tests).',
    'days': days,
}
json.dump(snapshot, open(out, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('days', len(days), 'bytes', os.path.getsize(out))
missing = [d for d, r in days.items() if 'rambam3' not in r or 'tanya' not in r or 'daf' not in r]
print('days missing items:', len(missing), missing[:10])
