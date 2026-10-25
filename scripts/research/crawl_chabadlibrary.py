#!/usr/bin/env python3 -I
"""Crawl chabadlibrary.org Toras Menachem volumes 1-3 via its JSON API.

API (discovered from main.*.js bundle of the Angular SPA at https://chabadlibrary.org/books/):
  GET https://chabadlibrary.org/books/api/main?path=<section_id>
    -> {"content": {"tree":[...], "type": "children"|"childrenPages"|"page", "data": ...}, "sections": {...}}
  Responses are brotli-encoded (content-encoding: br); curl --compressed handles it.
  Deep link for a node in the SPA: https://chabadlibrary.org/books/<section_id>
  Volume ids: 1400090001 (vol 1, 5710), 1400100001 (vol 2, 5711/1), 1400110001 (vol 3, 5711/2)
Usage: python3 -I crawl_chabadlibrary.py <raw_dir>
"""
import json, os, subprocess, sys, time

RAW = sys.argv[1]
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
VOLS = ["1400090001", "1400100001", "1400110001"]

def fetch(sid):
    out = os.path.join(RAW, f"cl-api-main-{sid}.json")
    if os.path.exists(out) and os.path.getsize(out) > 0:
        try:
            return json.load(open(out, encoding="utf-8"))
        except Exception:
            pass
    for attempt in range(4):
        r = subprocess.run(["curl", "-sS", "-m", "90", "--compressed", "-A", UA,
                            "-H", "Accept: application/json",
                            f"https://chabadlibrary.org/books/api/main?path={sid}", "-o", out],
                           capture_output=True, text=True)
        try:
            d = json.load(open(out, encoding="utf-8"))
            time.sleep(0.4)
            return d
        except Exception as e:
            print("retry", sid, attempt, r.stderr[:200], file=sys.stderr)
            time.sleep(2 + 2 * attempt)
    raise SystemExit(f"failed {sid}")

manifest = {}
for vid in VOLS:
    v = fetch(vid)
    kids = v["content"]["data"]
    manifest[vid] = {"heading": v["content"]["tree"][-1]["heading"], "children": []}
    for k in kids:
        d = fetch(str(k["id"]))
        c = d["content"]
        entry = {"id": k["id"], "heading": k["heading"], "left": k.get("left"),
                 "type": c["type"], "textLen": len(c["data"]["text"]) if isinstance(c["data"], dict) else None}
        # if the node itself has children (deeper nesting), record them
        if c["type"] == "children":
            entry["children"] = c["data"]
        manifest[vid]["children"].append(entry)
        print(vid, k["id"], c["type"], entry["textLen"], k["heading"], file=sys.stderr)
json.dump(manifest, open(os.path.join(RAW, "manifest.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("done", {v: len(m["children"]) for v, m in manifest.items()})
