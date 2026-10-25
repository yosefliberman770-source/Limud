#!/usr/bin/env python3 -I
"""Parse downloaded torahrecordings.com sicha pages (raw/tr/<vol>/<id>.html).
Extract: page-image numbers (printed page range), numbered sections in the English
translation tab (<p><strong>N.</strong>), Hebrew/English titles, mp3 url. Writes raw/tr-parsed.json"""
import re, html, json, os, glob
idx = json.load(open('raw/tr-index.json', encoding='utf-8'))
out = []
for v, items in idx.items():
    for it in items:
        sid = it['path'].split('/')[-1]
        fn = f'raw/tr/{v}/{sid}.html'
        rec = {'vol': int(v), 'id': sid, 'path': it['path'], 'url': 'https://www.torahrecordings.com' + it['path'], 'index_lines': it['lines']}
        if not os.path.exists(fn):
            rec['error'] = 'missing'; out.append(rec); continue
        s = open(fn, encoding='utf-8').read()
        s = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', s, flags=re.S)
        # page images
        imgs = re.findall(r'likuteisichosimages/([^/"]+)/+([^"/ ]+?)\.(?:gif|jpg|png)', s)
        pages = []
        for vol_, name in imgs:
            m = re.fullmatch(r'(\d+)', name)
            if m: pages.append(int(m.group(1)))
            else: rec.setdefault('odd_images', []).append(name)
        rec['pages'] = pages
        # title block
        m = re.search(r'<h1[^>]*>(.*?)</h1>', s, flags=re.S)
        rec['h1'] = html.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', m.group(1)))).strip() if m else None
        m = re.search(r'<meta name="description" content="([^"]*)"', s)
        rec['meta_description'] = html.unescape(m.group(1)) if m else None
        # English translation sections
        m = re.search(r'id="shiur-secondary-content".*?</article>', s, flags=re.S)
        sec = m.group(0) if m else ''
        nums = [int(x) for x in re.findall(r'<p>\s*<strong>\s*(\d+)\.\s*</strong>', sec)]
        rec['en_section_numbers'] = nums
        rec['en_text_len'] = len(re.sub(r'<[^>]+>', '', sec))
        # Hebrew text pane? look for hebrew section letters like <strong>א.</strong>
        m2 = re.search(r'id="shiur-content".*?</div>\s*</div>', s, flags=re.S)
        cont = m2.group(0) if m2 else ''
        heb = re.findall(r'<(?:strong|b)>\s*([א-ת]{1,3})\.\s*</(?:strong|b)>', cont)
        rec['he_section_letters'] = heb
        rec['content_has_text'] = len(re.sub(r'<[^>]+>', '', cont).strip()) > 200
        out.append(rec)
json.dump(out, open('raw/tr-parsed.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for r in out:
    p = r.get('pages', [])
    pr = f"{min(p)}-{max(p)}" if p else '-'
    ns = r.get('en_section_numbers', [])
    ok = ns == list(range(1, len(ns) + 1))
    print(r['vol'], r['id'], 'pages', pr, f'n={len(p)}', '| en_secs', len(ns), 'seq' if ok else f'NONSEQ {ns}', '| he', len(r.get('he_section_letters', [])), '| odd', r.get('odd_images'), '| txt', r.get('content_has_text'))
