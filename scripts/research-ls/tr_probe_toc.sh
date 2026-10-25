#!/bin/bash
# Probe TR image folders for extra scans (printed table of contents) beyond the sicha pages.
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
cd "$(dirname "$0")/.."
probe(){ d=$1; shift; for n in "$@"; do c=$(curl -sSL -A "$UA" -o /dev/null -w "%{http_code}:%{size_download}" "https://audio.torahrecordings.com/likuteisichosimages/$d/$n.gif"); case "$c" in 200:*) echo "$d/$n ${c#200:}";; esac; done; }
probe 010 $(seq 173 215) $(seq 560 660) $(seq 990 1010)
probe 011 $(seq 188 230) $(seq 560 660) $(seq 990 1010)
probe 012_likuteisichos_vol12 $(seq 138 180) $(seq 560 660) $(seq 990 1010)
probe 013_likuteisichos_vol13 $(seq 128 170) $(seq 560 606) $(seq 611 660)
probe 014 $(seq 171 215) $(seq 560 660) $(seq 990 1010)
echo DONE
