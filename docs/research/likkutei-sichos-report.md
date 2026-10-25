# לקוטי שיחות חלקים י׳–י״ד — catalogue build report

Compiled from the research subagent's final report (the agent was not permitted to write this file itself). Output data: `data/catalogue/likkutei-sichos.json`. Re-runnable scripts: `scripts/research-ls/` (run `build_json.py`, then `finalize_json.py`; raw downloads are intentionally not committed).

## Coverage

| Vol | Sefer | Sichos | Printed pages | Section counts | `verified` |
|---|---|---|---|---|---|
| 10 (י׳) | Bereishis | 27 | 1–172 | 27/27 (200 sections) | 27 |
| 11 (י״א) | Shemos | 24 | 1–187 | 24/24 (193) | 24 |
| 12 (י״ב) | Vayikra | 18 | 1–137 | 18/18 (142) | 10 |
| 13 (י״ג) | Bamidbar | 20 | 1–127 | 20/20 (135) | 20 |
| 14 (י״ד) | Devarim | 24 | 1–170 | 24/24 (172) | 24 |

Page ranges are contiguous with no gaps or overlaps in every volume (checked programmatically). Festival/date sichos found: vol 10 Chanukah and Vayishlach-1 (י״ט כסלו); vol 12 Shabbos HaGadol and Pesach; vol 14 Eikev-1 (Chof Av), Rosh Hashanah, Ha'azinu-1 (Shabbos Shuvah), Vezos Haberachah-1 (Simchas Torah). Vol 11 has none that are labelled as such in the sources, so none were invented.

## Sources

1. **torahrecordings.com** (primary): volume index `/likutei-sichos/0NN/`, sicha pages `/likutei-sichos/0NN/PPP_SSS`, page scans under `audio.torahrecordings.com/likuteisichosimages/`.
2. **projectlikkuteisichos.org** (second source): WordPress sitemap `/wp-sitemap.xml`; per-sicha slugs such as `/10lech-lecha1/`; links to Google Drive PDFs.
3. **PLS Year-1 schedule PDFs** for an independent inventory by name and ordinal.
4. chabadlibrary.org: its Likkutei Sichos node lists only vols 30–39, so it gave nothing for 10–14. chabadpedia returned 403, Sefaria has no Likkutei Sichos, he.wikisource was rate limited.

TR and the PLS Year-1 lists match one-for-one (27/24/18/20/24).

## Method and status levels

Pages were confirmed on the scans from the running head and the closing end-note. Section counts were read by the agent from the last section letter on the printed scan (Kehot conventions: 10 = יו״ד, 14 = י״ד, 15 = ט״ו, 16 = ט״ז; sub-points "א) ב)" are not sections) and re-read on a separate zoomed crop; where PLS or TR English translations agreed, that counted as an independent check.

* `verified` (105): in both TR and PLS inventories, page range contiguous and seen on scans, count read twice with agreement or once plus an agreeing English count.
* `source_imported_needs_crosscheck` (8, all in vol 12: Pesach, Tazria-1/2, Metzora, Achrei, Kedoshim, Emor-1/2): count rests on one scan reading.
* Both readings were done by the same agent, so `verified` means high confidence, not authoritative proofreading.

## Corrections applied

* TR image lists were wrong for vol 11 Bo-1 (real range 34–41), vol 14 Re'eh-2 (53–63; p.64 starts Shoftim-1) and vol 12 Bechukosai-2 (129–137).
* Section counts changed on re-reading: vol 12 Pesach 15→16 (flagged), vol 13 Chukas-1 5→8, vol 14 Va'eschanan-2 5→8, vol 14 Eikev-1 5→8, vol 13 Masei-2 7→6.
* English translations sometimes differ from the Hebrew print (for example Bamidbar-1 7 vs 6, Naso-2 8 vs 5, Ha'azinu-2 2 vs 7); the printed Hebrew wins.
* Vol 10 Toldos-1 (pp. 72–79) ends its text on p.77; pp. 77–79 are a הוספה to a footnote.

## Gaps

* Topic lines are missing for vol 10 sichos 11–27, all of vol 11, and vol 12 Vayikra–Kedoshim. Vol 13's topics come from the printed מפתח; vol 10's first ten and vol 14's are editor-written summaries (`topicSource` says which). They must not be shown as printed headings without relabelling.
* Hebrew OCR returned empty text on the scans, so all counts were read visually. A working OCR re-run would be the best independent check.
* PLS pages were not located for 31 sichos (mostly vols 11–12); those carry only the TR URL.
* All five volumes have `pageCount: null` (printed הוספות/indexes not available).

## Licensing

The JSON stores bibliographic facts (parsha, ordinal, page range, section counts, a few topic lines) and links only. It holds no sicha text, translations or scans, which belong to Kehot and the Rebbe's estate.
