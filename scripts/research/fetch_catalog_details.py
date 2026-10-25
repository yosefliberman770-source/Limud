#!/usr/bin/env python3 -I
"""Fetch Chabad Library (physical) catalog detail cards for search results.
Search:  https://chabadlibrary.org/catalog/index1.php?frame=content&catalog=hcatalog&mode=browse&field=TITLE&search=<q>
Details: https://chabadlibrary.org/catalog/index1.php?frame=main&catalog=hcatalog&mode=details&volno=<volno>
Usage: python3 -I fetch_catalog_details.py <raw_dir> <search_result_html>...
"""
import re, sys, os, subprocess, html, time
raw = sys.argv[1]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
vols = {}
for f in sys.argv[2:]:
    s = open(f, encoding="utf-8", errors="replace").read()
    for m in re.finditer(r"volno=(\d+)[^']*'>\s*([^<]+?)\s*</a>", s):
        vols[m.group(1)] = html.unescape(m.group(2).strip())
for v, title in vols.items():
    out = os.path.join(raw, "catalog", f"volno-{v}.html")
    if not os.path.exists(out):
        subprocess.run(["curl", "-sS", "-m", "60", "--compressed", "-A", UA, "-o", out,
                        f"https://chabadlibrary.org/catalog/index1.php?frame=main&catalog=hcatalog&mode=details&volno={v}"])
        time.sleep(0.3)
    s = open(out, encoding="utf-8", errors="replace").read()
    t = re.sub(r"<script.*?</script>", "", s, flags=re.S)
    t = html.unescape(re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " | ", t)))
    t = re.sub(r"(\s*\|\s*)+", " | ", t)
    print(v, "::", title, "::", t[:700])
    print()
