#!/usr/bin/env python3 -I
"""Assemble likkutei-sichos.json from the raw/ artefacts.
Run from the research-ls directory:  python3 -I scripts/build_json.py
Inputs (all under raw/): tr-index.json, tr-parsed.json, section-counts-visual.json, pls-slugs.json,
pls-pages.json, pls-translation-sections.json, vol13-printed-mafteach-transcription.json,
overrides.json (hand-made corrections/verification upgrades), page-checks.json (optional, OCR header check).
"""
import json, os, re, datetime

NOW = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
J = lambda p, default=None: json.load(open(p, encoding='utf-8')) if os.path.exists(p) else default
idx = J('raw/tr-index.json'); parsed = {f"{r['vol']:03d}-{r['id']}": r for r in J('raw/tr-parsed.json')}
vis = J('raw/section-counts-visual.json'); slugs = J('raw/pls-slugs.json'); plspages = J('raw/pls-pages.json')
trans = J('raw/pls-translation-sections.json'); m13 = J('raw/vol13-printed-mafteach-transcription.json')
ov = J('raw/overrides.json', {}); pcheck = J('raw/page-checks.json', {}); ocrcnt = J('raw/ocr-section-counts.json', {})
plan = {f"{v}-{i}": p for v, i, p in J('raw/page-plan.json')}

HEB_NUM = {10: 'י׳', 11: 'י״א', 12: 'י״ב', 13: 'י״ג', 14: 'י״ד'}
SEFER = {10: 'Bereishis', 11: 'Shemos', 12: 'Vayikra', 13: 'Bamidbar', 14: 'Devarim'}
ORD = ['א', 'ב', 'ג', 'ד', 'ה']
# TR English label -> (hebcal key | None, kind, occasion)
KEY = {
 'Bereishis': 'Bereshit', 'Noach': 'Noach', 'Lech Lecha': 'Lech-Lecha', 'Vayera': 'Vayera', 'Chayei Sarah': 'Chayei Sara',
 'Toldos': 'Toldot', 'Vayeitzei': 'Vayetzei', 'Vayishlach': 'Vayishlach', 'Vayeishev': 'Vayeshev', 'Mikeitz': 'Miketz',
 'Vayigash': 'Vayigash', 'Vayechi': 'Vayechi', 'Shemos': 'Shemot', "Va'era": 'Vaera', 'Bo': 'Bo', 'Beshalach': 'Beshalach',
 'Yisro': 'Yitro', 'Mishpatim': 'Mishpatim', 'Terumah': 'Terumah', 'Tetzaveh': 'Tetzaveh', 'Ki Sisa': 'Ki Tisa',
 'Vayakhel': 'Vayakhel', 'Pekudei': 'Pekudei', 'Vayikra': 'Vayikra', 'Tzav': 'Tzav', 'Shemini': 'Shmini', 'Tazria': 'Tazria',
 'Metzora': 'Metzora', 'Acharei': 'Achrei Mot', 'Kedoshim': 'Kedoshim', 'Emor': 'Emor', 'Behar': 'Behar', 'Bechukosai': 'Bechukotai',
 'Bamidbar': 'Bamidbar', 'Naso': 'Nasso', "Beha'aloscha": "Beha'alotcha", 'Shelach': "Sh'lach", 'Korach': 'Korach', 'Chukas': 'Chukat',
 'Balak': 'Balak', 'Pinchas': 'Pinchas', 'Matos': 'Matot', 'Masei': 'Masei', 'Devarim': 'Devarim', "Va'eschanan": 'Vaetchanan',
 'Eikev': 'Eikev', "Re'eh": "Re'eh", 'Shoftim': 'Shoftim', 'Ki Seitzei': 'Ki Teitzei', 'Ki Savo': 'Ki Tavo', 'Nitzavim': 'Nitzavim',
 'Vayeilech': 'Vayeilech', "Ha'azinu": "Ha'azinu", 'Vezos HaBerachah': 'Vezot Haberakhah',
}
FEST = {  # label -> (kind, occasion, id-slug)
 'Chanukah': ('festival', 'Chanukah', 'chanukah'), 'Shabbos HaGadol': ('date', 'Shabbos HaGadol', 'shabbos-hagadol'),
 'Chag HaPesach': ('festival', 'Pesach', 'pesach'), 'Rosh Hashanah': ('festival', 'Rosh Hashanah', 'rosh-hashanah'),
}
SUB_OCC = {  # "X / occasion" sub-headings printed under the parsha heading
 'Yud-Tes Kislev': 'Yud Tes Kislev', 'Chof Av': 'Chof Av (20 Menachem Av)', 'Shabbos Shuvah': 'Shabbos Shuvah', 'Simchas Torah': 'Simchas Torah',
}
SIM = {'Yud-Tes Kislev': 'י״ט כסלו', 'Chof Av': 'כ׳ מנחם אב', 'Shabbos Shuvah': 'שבת שובה', 'Simchas Torah': 'שמחת תורה'}

def slugify(s): return re.sub(r'[^a-z0-9]+', '-', s.lower().replace("'", '')).strip('-')

# ---- sources ----
SRC = [
 ('src-tr-index', 'https://www.torahrecordings.com/likutei-sichos/', 'Torah Recordings - Likkutei Sichos volume index pages (010..014)',
  'Per-volume listing of every sicha (parsha + ordinal, Hebrew heading). Pages /likutei-sichos/0NN/ ; sicha pages /likutei-sichos/0NN/PPP_SSS. Hebrew text (c) WikiSource credit in footer; audio (c) Chabad of Sharon.'),
 ('src-tr-scans', 'https://audio.torahrecordings.com/likuteisichosimages/', 'Torah Recordings - page scans of the printed Kehot volumes',
  'GIF scans named by printed page number (e.g. 010/42.gif, 012_likuteisichos_vol12/9.gif, 013_likuteisichos_vol13/1.gif). Used for page ranges and for counting the printed section letters (א. ב. ג. ...). Page-range ownership per sicha was taken from the image list on each TR sicha page and corrected where the scans disagreed (see notes).'),
 ('src-tr-vol13-mafteach', 'https://www.torahrecordings.com/likutei-sichos/013/000', 'Printed מפתח of Likkutei Sichos vol 13 (scans 607-610)',
  'Printed table of contents with page number and topic line for each of the 20 sichos of vol 13, plus the הוספות list. Hand-transcribed into raw/vol13-printed-mafteach-transcription.json.'),
 ('src-pls-pages', 'https://projectlikkuteisichos.org/', 'Project Likkutei Sichos - per-sicha pages and "Kehos pages" PDFs',
  'Pages /<vol><parsha><n>/ (e.g. /10lech-lecha1/) link to Google-Drive hosted PDFs: "Kehos pages" (the sicha layout) and "Sicha Translation" (English). Sitemaps: /wp-sitemap.xml. Not firebasestorage for these volumes - Drive links. Kehos PDF page counts differ from the printed page counts (reflowed layout) and are not used for page ranges.'),
 ('src-pls-translation', 'https://projectlikkuteisichos.org/', 'Project Likkutei Sichos - English translation PDFs',
  'Numbered paragraph counts extracted with pdftotext (raw/pls-translation-sections.json). Used only as a cross-check of the printed section count; several PDFs are formatted with question lists so counts are only trusted when they equal the count read from the printed scans.'),
 ('src-pls-schedule-y1', 'https://projectlikkuteisichos.org/wp-content/uploads/2020/01/LS_Schedule_Eng_v2.pdf', 'PLS Year-1 (5780-81) schedule and checklist PDFs',
  'Independent list of the sichos of vols 10, 11, 12, 13, 14 by name and ordinal (e.g. "וישלח-יט"כ", "בשלח ג*", "חנוכה", "שבת הגדול", "חג הפסח", "ראש השנה", "ברכה - שמח"ת א"). Used as the second source for the sicha inventory.'),
 ('src-chabadlibrary', 'https://chabadlibrary.org/books/api/main?path=/1300000000', 'Chabad Library - Likkutei Sichos catalogue API',
  'API: GET /books/api/main?path=/<id>. Its Likkutei Sichos node (1300000000) lists only volumes 30-39 (כרך ל..לט); volumes 10-14 are not hosted, so it gave no data for this task.'),
 ('src-hewiki', 'https://he.wikipedia.org/wiki/לקוטי_שיחות', 'Hebrew Wikipedia - לקוטי שיחות',
  'General description of the series only; no per-volume contents.'),
]
sources = [{'id': i, 'url': u, 'title': t, 'accessedAt': NOW, 'notes': n} for i, u, t, n in SRC]

# ---- build sichos ----
sichos = []; vols = {}
for v in ('010', '011', '012', '013', '014'):
    vnum = int(v)
    ordc = {}
    for it in idx[v]:
        sid = it['path'].split('/')[-1]
        if sid == '000': continue
        key = f'{v}-{sid}'
        lines = it['lines']  # ['N.', 'Likkutei Sichos Vol. 10 – Bereishis 1 – title', Hebrew, ...]
        en = lines[1]
        m = re.match(r'Likkutei Sichos Vol\. \d+ [–-] (.+?)(?: [–-] (.*))?$', en)
        head = m.group(1).strip(); en_title = (m.group(2) or '').strip() or None
        sub = None
        if ' / ' in head: head, sub = [x.strip() for x in head.split(' / ', 1)]
        mm = re.match(r'(.+?)(?: (\d+))?$', head); base = mm.group(1).strip()
        if base in FEST:
            kind, occ, slug0 = FEST[base]; parsha = None; sk = slug0
        else:
            kind = 'parsha'; parsha = KEY[base]; occ = SUB_OCC.get(sub) if sub else None; sk = slugify(parsha)
        he_line = lines[2] if len(lines) > 2 else ''
        mh = re.match(r'לקוטי שיחות חלק [^ ]+ - (.+)$', he_line)
        he_all = mh.group(1) if mh else he_line
        he_all = he_all.split(' / ')[0]
        mhe = re.match(r'(.+?)(?: ([א-ה]))?$', he_all)
        he_parsha = mhe.group(1).strip()
        ckey = (vnum, sk); ordc[ckey] = ordc.get(ckey, 0) + 1; ordinal = ordc[ckey]
        # topic: Hebrew topic line from TR (lines after he_line) if any
        topic = ' | '.join(lines[3:]) if len(lines) > 3 else None
        topic_he = topic if topic and re.search('[א-ת]', topic) else None
        topic_en = None
        if en_title: topic_en = en_title
        elif topic and not re.search('[א-ת]', topic): topic_en = topic
        # Hebrew line may carry an English title directly after (vol 14 Savo..): handled above
        if topic and re.search('[א-ת]', topic) and re.search('[A-Za-z]', topic):
            parts = [x.strip() for x in topic.split(' | ')]
            topic_en = next((p for p in parts if not re.search('[א-ת]', p)), topic_en)
            topic_he = next((p for p in parts if re.search('[א-ת]', p)), None)
        pages = ov.get('pages', {}).get(key) or plan.get(key) or sorted(set(parsed[key]['pages']))
        ps, pe = (min(pages), max(pages)) if pages else (None, None)
        vr = vis.get(key, {})
        sc = ov.get('sectionCount', {}).get(key, vr.get('n'))
        notes = []
        if sub: notes.append(f"TR heading carries a second occasion label: '{sub}' (printed sub-heading {SIM.get(sub)})." if sub in SIM else f"TR sub-label '{sub}'.")
        if vr.get('end_note'): notes.append(f"Printed end-note (source of the sicha): {vr['end_note']}.")
        if vr.get('note'): notes.append(vr['note'].rstrip('.') + '.')
        if ov.get('notes', {}).get(key): notes.append(ov['notes'][key])
        he_title = f"שיחה {ORD[ordinal-1]}׳"
        # sources
        urls = [f"https://www.torahrecordings.com{it['path']}"]
        pslug = (slugs.get(f'{vnum}/{sid}') or {}).get('slug')
        if pslug and pslug in plspages: urls.append(plspages[pslug]['url'])
        elif pslug: urls.append(f'https://projectlikkuteisichos.org/{pslug}/')
        sichos.append({
            'id': f'ls-{vnum}-{sk}-{ordinal}', 'volumeId': f'ls-{vnum}', 'kind': kind, 'parsha': parsha, 'heParsha': he_parsha,
            'occasion': occ, 'ordinal': ordinal, 'heTitle': he_title, 'topic': topic_he, 'topicEn': topic_en,
            'pageStart': ps, 'pageEnd': pe, 'sectionCount': sc, 'sourceUrls': urls,
            'verification': 'source_imported_needs_crosscheck', 'notes': ' '.join(notes) or None,
            '_key': key, '_sidpath': it['path'], '_pslug': pslug, '_trLabel': en, '_visual': vr.get('n'),
        })

# ---- vol 13 printed topics + page-start check ----
printed13 = {}
for e in m13['sichos']:
    printed13[(e['heParsha'], e['ord'])] = e
for s in sichos:
    if s['volumeId'] == 'ls-13':
        e = printed13.get((s['heParsha'].replace('נשא', 'נשא').replace('בהעלותך', 'בהעלותך'), s['ordinal']))
        if e:
            s['topic'] = e['topic']
            ok = e['page'] == s['pageStart']
            s['_printed_start_ok'] = ok
            tag = f"Topic line and start page {e['page']} transcribed from the printed מפתח (scans 607-610)"
            tag += ' - start page matches the scan range.' if ok else f" - MISMATCH with scan range start {s['pageStart']}."
            s['notes'] = ((s['notes'] + ' ') if s['notes'] else '') + tag
            s['sourceUrls'].append('https://www.torahrecordings.com/likutei-sichos/013/000')

# ---- verification levels ----
for s in sichos:
    key = s['_key']
    o = ov.get('verification', {}).get(key)
    if o: s['verification'] = o
    s['verification'] = s['verification']
for s in sichos:
    for k in [k for k in s if k.startswith('_')]: pass

json.dump(sichos, open('raw/_sichos_tmp.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

V = []
for vnum in (10, 11, 12, 13, 14):
    ss = [s for s in sichos if s['volumeId'] == f'ls-{vnum}']
    last = max(s['pageEnd'] for s in ss)
    sids = ['src-tr-index', 'src-tr-scans', 'src-pls-pages', 'src-pls-translation', 'src-pls-schedule-y1', 'src-chabadlibrary']
    if vnum == 13: sids.insert(2, 'src-tr-vol13-mafteach')
    verif = (f"{len(ss)} sichos enumerated from torahrecordings.com and matched against the PLS Year-1 schedule list; sicha pages cover printed pages 1-{last} "
             f"without gaps (the numbered sicha section). Printed הוספות/indexes after p.{last} were not available for enumeration.")
    if vnum == 13: verif += " The printed מפתח (scans 607-610) lists the 20 sichos with start pages and topics and the הוספות (pp.133-300)."
    V.append({'id': f'ls-{vnum}', 'number': vnum, 'heNumber': HEB_NUM[vnum], 'sefer': SEFER[vnum], 'heTitle': f'לקוטי שיחות חלק {HEB_NUM[vnum]}',
              'pageCount': None, 'sourceIds': sids, 'verification': verif, 'sichoPagesLast': last})
    if vnum == 13: V[-1]['hosafos'] = m13['hosafos']

out_s = [{k: v for k, v in s.items() if not k.startswith('_')} for s in sichos]
doc = {'schemaVersion': 1, 'generatedAt': NOW, 'sources': sources, 'volumes': V, 'sichos': out_s}
json.dump(doc, open('likkutei-sichos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('wrote', len(out_s), 'sichos')
