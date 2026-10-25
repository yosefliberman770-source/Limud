#!/usr/bin/env python3 -I
"""Parse the PLS Year-1 (5780-81) schedule + checklist PDFs text (raw/pls-sched/LS_Schedule_Eng_v2.txt,
checklist-2020-drive.txt) into (chelek, sicha-label) rows. Writes raw/pls-sched-year1.json"""
import re, json, collections
def clean(t): return re.sub('[‪-‮‎‏⁦-⁩]', '', t)
rows = []
# schedule: columns  sicha | chelek | date | parsha  (one or two groups per line)
t = clean(open('raw/pls-sched/LS_Schedule_Eng_v2.txt', encoding='utf-8').read())
for line in t.split('\n'):
    cells = [c.strip() for c in re.split(r'\s{2,}', line.strip()) if c.strip()]
    # walk cells: find pattern [sicha, chelek(י|יא|יב|יג|יד), date, parsha]
    i = 0
    while i + 1 < len(cells):
        if re.fullmatch(r'י[אבגד]?', cells[i + 1]) and not re.search(r'תש', cells[i]):
            rows.append({'src': 'schedule', 'chelek': cells[i + 1], 'sicha': cells[i].lstrip('*').strip(), 'date': cells[i + 2] if i + 2 < len(cells) else None, 'week': cells[i + 3] if i + 3 < len(cells) else None, 'star': cells[i].startswith('*')})
            i += 4
        else:
            i += 1
t2 = clean(open('raw/pls-sched/checklist-2020-drive.txt', encoding='utf-8').read())
for line in t2.split('\n'):
    cells = [c.strip() for c in re.split(r'\s{2,}', line.strip()) if c.strip()]
    i = 0
    while i + 1 < len(cells):
        m = re.fullmatch(r'☐\s*(י[אבגד]?)', cells[i + 1])
        if m:
            rows.append({'src': 'checklist', 'chelek': m.group(1), 'sicha': cells[i]}); i += 2
        else:
            i += 1
json.dump(rows, open('raw/pls-sched-year1.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for src in ('schedule', 'checklist'):
    print('=====', src)
    by = collections.OrderedDict()
    for r in rows:
        if r['src'] == src: by.setdefault(r['chelek'], []).append(r['sicha'] + ('*' if r.get('star') else ''))
    for k, v in by.items(): print(k, len(v), ' | '.join(v))
