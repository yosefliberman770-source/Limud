#!/usr/bin/env python3 -I
"""Download, for each PLS sicha page, the Google-Drive hosted 'Kehos pages' (השיחה-עמודים / sicha-amudim)
PDF and the English 'Sicha Translation' PDF into raw/pls-pdf/<slug>-{pages,translation}.pdf"""
import json, re, subprocess, os, time
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
pages = json.load(open('raw/pls-pages.json', encoding='utf-8'))
def kind(icon):
    i = icon.lower()
    if 'עמודים' in icon or 'amudim' in i or 'thesicha-layout' in i or 'sicha-layout' in i: return 'pages'
    if 'translation' in i or 'sicha-transl' in i: return 'translation'
    return None
log = {}
for slug, v in pages.items():
    for m in v['materials']:
        k = kind(m['icon'])
        if not k: continue
        out = f'raw/pls-pdf/{slug}-{k}.pdf'
        if os.path.exists(out) and os.path.getsize(out) > 1000: 
            log[out] = m['href']; continue
        h = m['href']
        mm = re.search(r'/d/([A-Za-z0-9_-]+)', h) or re.search(r'[?&]id=([A-Za-z0-9_-]+)', h)
        if 'drive.google' in h and mm:
            url = f'https://drive.google.com/uc?export=download&id={mm.group(1)}'
        else:
            url = h
        r = subprocess.run(['curl', '-sSL', '-A', UA, '-o', out, '-w', '%{http_code} %{content_type}', url], capture_output=True, text=True)
        ok = os.path.exists(out) and open(out, 'rb').read(5) == b'%PDF-'
        print(slug, k, r.stdout, 'PDF' if ok else 'NOTPDF', flush=True)
        if not ok:
            try: os.remove(out)
            except FileNotFoundError: pass
        else:
            log[out] = h
        time.sleep(0.5)
json.dump(log, open('raw/pls-pdf-sources.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
