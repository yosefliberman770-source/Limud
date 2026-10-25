#!/bin/bash
# Download every TR page-scan gif referenced by the sicha pages (raw/tr-parsed.json) into raw/tr-img/<vol>/<n>.gif
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
cd "$(dirname "$0")/.."
grep -ohE 'likuteisichosimages/[^"]+\.gif' raw/tr/*/*.html | sort -u | while read p; do
  v=$(echo "$p" | cut -d/ -f2 | cut -c1-3); n=$(basename "$p")
  mkdir -p raw/tr-img/$v
  [ -s raw/tr-img/$v/$n ] || curl -sSL -A "$UA" "https://audio.torahrecordings.com/$(echo "$p" | sed 's#//#/#g')" -o raw/tr-img/$v/$n
  echo "$v/$n $(wc -c < raw/tr-img/$v/$n)"
done
