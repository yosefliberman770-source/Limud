#!/usr/bin/env python3 -I
"""confirm.py key=letter,n[,pages] ... : record a second (3x body-crop) visual reading in raw/second-reading.json"""
import json, sys, os
f = 'raw/second-reading.json'
d = json.load(open(f, encoding='utf-8')) if os.path.exists(f) else {}
for a in sys.argv[1:]:
    k, rest = a.split('=', 1); parts = rest.split(',')
    d[k] = {'letter': parts[0], 'n': int(parts[1]), 'page': int(parts[2]) if len(parts) > 2 else None}
json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(d), 'second readings')
