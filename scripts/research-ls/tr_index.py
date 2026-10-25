#!/usr/bin/env python3 -I
"""Parse torahrecordings.com Likkutei Sichos volume index pages (raw/tr-0NN.html)
and print one line per sicha: path | label."""
import re, html, sys, json
out = {}
for v in sys.argv[1:]:
    s = open(f'raw/tr-{v}.html', encoding='utf-8').read()
    s = re.sub(r'<(script|style)[^>]*>.*?</\1>', '', s, flags=re.S)
    items = []
    for m in re.finditer(r'<a[^>]*href="(/likutei-sichos/%s/[^"]*)"[^>]*>(.*?)</a>' % v, s, flags=re.S):
        t = re.sub(r'<[^>]+>', '\n', m.group(2)); t = html.unescape(t)
        lines = [re.sub(r'\s+', ' ', x).strip() for x in t.split('\n')]
        lines = [x for x in lines if x and x != '›']
        items.append({'path': m.group(1), 'lines': lines})
    out[v] = items
    print(f'== vol {v}: {len(items)} entries')
    for it in items:
        print(it['path'], '|', ' || '.join(it['lines']))
json.dump(out, open('raw/tr-index.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
