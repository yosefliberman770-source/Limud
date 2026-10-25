#!/usr/bin/env python3 -I
"""Parse downloaded PLS main sicha pages (raw/pls/<slug>.html): title, material links (Google Drive /
firebase), notably 'השיחה-עמודים' (Kehos pages PDF) and 'Sicha-Translation'. Writes raw/pls-pages.json"""
import re, json, glob, html, os
out = {}
for fn in sorted(glob.glob('raw/pls/*.html')):
    slug = os.path.basename(fn)[:-5]
    s = open(fn, encoding='utf-8').read()
    m = re.search(r'<title>(.*?)</title>', s, flags=re.S)
    title = html.unescape(re.sub(r'\s+', ' ', m.group(1))).replace('– Project Likkutei Sichos', '').strip() if m else None
    mats = []
    for m in re.finditer(r'<a ([^>]*)>\s*<img[^>]*src="([^"]+)"', s):
        href = re.search(r'href="([^"]+)"', m.group(1))
        if not href: continue
        h = html.unescape(href.group(1))
        if 'drive.google' in h or 'firebasestorage' in h or h.lower().endswith('.pdf') or 'docs.google' in h:
            mats.append({'href': h, 'icon': m.group(2).split('/')[-1]})
    # dedupe by href+icon
    seen = set(); uniq = []
    for x in mats:
        k = (x['href'], x['icon'])
        if k in seen: continue
        seen.add(k); uniq.append(x)
    # heading text (Hebrew) e.g. "חלק י • לך לך • שיחה א"
    out[slug] = {'url': f'https://projectlikkuteisichos.org/{slug}/', 'title': title, 'materials': uniq}
json.dump(out, open('raw/pls-pages.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for k, v in out.items():
    icons = [x['icon'][:22] for x in v['materials']]
    print(k, '|', v['title'], '|', len(v['materials']), icons[:6])
