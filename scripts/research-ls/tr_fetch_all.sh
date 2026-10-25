#!/bin/bash
# Download every torahrecordings.com sicha page for LS vols 10-14 into raw/tr/<vol>/<id>.html
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
cd "$(dirname "$0")/.."
python3 -I -c "
import json
d=json.load(open('raw/tr-index.json'))
for v,items in d.items():
    for it in items: print(it['path'])
" | while read p; do
  v=$(echo "$p" | cut -d/ -f3); id=$(echo "$p" | cut -d/ -f4)
  mkdir -p raw/tr/$v
  [ -s raw/tr/$v/$id.html ] || curl -sSL -A "$UA" "https://www.torahrecordings.com$p" -o raw/tr/$v/$id.html
  echo "$p $(wc -c < raw/tr/$v/$id.html)"
  sleep 0.3
done
