# תורת מנחם — התוועדויות, volumes 1–3: catalogue build report

Generated 2026-10-25. Output: `toras-menachem.json` (same directory). Raw downloads: `raw/`. Scripts: `scripts/`.

## 1. Sources reached

| id | what | result |
|---|---|---|
| chabadlibrary.org `/books/` (ספריית ליובאוויטש) | full digital text of תורת מנחם vols. 1–73 | **primary source, fully crawled for vols. 1–3** (148 TOC units, every one fetched) |
| chabadlibrary.org `/catalog/` (Chabad Library physical catalog, PHP frames) | catalog cards of the printed editions | reached; cards 80376, 80377, 101446, 94009, 91414 give place, year, format and pagination of the printed volumes |
| he.wikipedia.org "תורת מנחם - התוועדויות" | secondary, series/edition context | reached (CC BY-SA) |
| www.hebcal.com converter + yearly calendar API | Hebrew→Gregorian conversion, parsha/festival cross-check | reached; cached in `raw/hebcal-cache.json`, `raw/hebcal-5710.json`, `raw/hebcal-5711.json` |
| chabadpedia.co.il | secondary | **blocked** (Cloudflare 403 both via curl and headless Chromium; `scripts/chabadpedia_playwright.js`). Not retried further. |
| he.chabad.org, lahak.org, hebrewbooks.org, sie.org, otzar770.com | — | not attempted (pre-declared blocked) |
| sefaria.org | — | not used (no Torat Menachem corpus) |

## 2. chabadlibrary.org API (re-runnable)

The reader is an Angular SPA; its bundle (`main.7944696e3492e518.js`) calls three endpoints. Only `api/main` is needed:

```
GET https://chabadlibrary.org/books/api/main?path=<section_id>
    Accept: application/json        (response is brotli-encoded: use curl --compressed)
```

Response shape `{"content": {"tree": [...ancestors...], "type": T, "data": D}, "sections": {...sidebar tree...}}`:

* `type: "children"` — a TOC node. `data` = list of `{id, heading, left:{id, heading}}` where `left.heading` is the printed page number of the unit's first page (strings like `"18א"` are inserted pages).
* `type: "childrenPages"` — a leaf TOC unit (one sicha / maamar / letter). `data.text` = full HTML of all its pages with `<h4 class="page-number" id="…">PRINTED_PAGE</h4>` markers; `data.haoros` = footnotes HTML. The `*` footnotes attached to printed headings are **not** returned.
* `type: "page"` — one page (`nav.next` gives the next page id).

Key ids: `1400000000` = תורת מנחם; `1400090001` = vol. 1 (ה'שי"ת); `1400100001` = vol. 2 (תשי"א ח"א); `1400110001` = vol. 3 (תשי"א ח"ב). Deep link for any node: `https://chabadlibrary.org/books/<id>` (the SPA passes the URL path as `path`). The other endpoints are `api/search?phrase=&section_id=&offset=` and `api/statistics?phrase=`.

Scripts:
* `scripts/crawl_chabadlibrary.py <raw_dir>` — fetches the three volume nodes and every child unit → `raw/cl-api-main-<id>.json`, `raw/manifest.json`.
* `scripts/fetch_catalog_details.py <raw_dir> <search html>…` — fetches catalog detail cards (`index1.php?frame=main&catalog=hcatalog&mode=details&volno=N`) → `raw/catalog/`.
* `scripts/build_catalog.py <research-tm dir>` — parses the texts (page markers, section letters, opening words), applies the hand-curated gathering table, converts dates with hebcal, writes `toras-menachem.json` and `raw/build-stats.json`.

## 3. What an "item" is here (important for interpreting counts)

In the printed תורת מנחם the talks of one farbrengen are **one unit** ("שיחת ש"פ …") whose sichos are numbered internally as sections **א. ב. ג. …** — there is no "שיחה א׳ / שיחה ב׳" subdivision in these volumes. The digital edition's TOC mirrors that: one TOC unit per sicha-unit, maamar, ר"ד, letter or telegram. So:

* `items` = the 148 TOC units (one row per unit, with `sectionCount` / `sectionLabels` = the א, ב, ג … numbering found at paragraph starts; validated as a contiguous run from א).
* `gatherings` = dated events grouping those units. `gathering.kind` separates **farbrengen** (public gathering with a sectioned sicha, and/or a maamar), **short_talk** (ר"ד / brief remarks at a wedding, bris, after Mincha, etc.), **document** (letters, telegrams — not gatherings, kept so every item has a `gatheringId`), **undated** (vol. 2 addenda).
* Maamarim: identified by TOC heading without "שיחת/ר"ד" plus the opening דיבור המתחיל in the text; all 16 are marked "(הנחה בלתי מוגה)" except באתי לגני and היושבת בגנים (edited by the Rebbe). Maamarim have **no numbered sections** in this edition (`sectionCount: 0`); the lettered footnotes inside באתי לגני are footnotes, not sections.

## 4. Coverage

| volume | TOC units fetched | gatherings (farbrengen / short talk / document / undated) | Shabbos-parsha gatherings | sichos (incl. ר"ד) | maamarim | letters | telegrams | reshimos | items with section numbering | total numbered sections |
|---|---|---|---|---|---|---|---|---|---|---|
| vol. 1, תש"י (`tm-5710-01`) | 40 / 40 | 38 (21 / 8 / 9 / 0) | 12 | 29 | 0 | 10 | 0 | 1 | 21 | 258 |
| vol. 2, תשי"א ח"א (`tm-5711-02`) | 56 / 56 | 45 (19 / 12 / 13 / 1) | 13 | 33 | 6 | 11 | 3 | 3 | 27 | 344 |
| vol. 3, תשי"א ח"ב (`tm-5711-03`) | 52 / 52 | 41 (14 / 18 / 9 / 0) | 8 | 32 | 10 | 7 | 3 | 0 | 21 | 306 |
| **total** | **148 / 148** | **124 (54 / 38 / 31 / 1)** | 33 | 94 | **16** | 28 | 6 | 4 | 69 | 908 |

Page coverage of the digital text: vol. 1 pp. 3–227 (missing 223–224), vol. 2 pp. 3–365 (missing 347–348), vol. 3 pp. 3–353 (no gaps). Every item has `pageStart`/`pageEnd` taken from the page markers in its own text (lettered inserted pages are kept in `pageStartLabel`/`pageEndLabel`/`pageLabels`). Every gathering with a Hebrew day has a `gregorianDate` from hebcal; for every Shabbos gathering hebcal's parsha for that date was checked against the TOC heading — **no mismatches**.

## 5. Discrepancies vs. the provisional facts

* **"~67 dated gatherings"**: the two years contain **92 dated spoken events** in the digital TOC (54 farbrengen-kind + 38 short talks), plus 31 dated/undated documents. If only farbrengens with sectioned sichos/maamarim are counted the figure is 54; the "~67" figure matches neither exactly and probably counted a mix. Counts per volume are in §4 and in `raw/build-stats.json`.
* **16 maamarim**: confirmed — exactly 16, all in תשי"א (6 in vol. 2, 10 in vol. 3), none in תש"י. The first is באתי לגני, יו"ד שבט תשי"א (vol. 2 pp. 192–203). Dibburei hamaschil as printed: באתי לגני; היושבת בגנים; ואלה המשפטים; כי תשא; וקבל היהודים; וידבר הוי' אל משה ואל אהרן… זאת חוקת התורה (provisional "וידבר גו׳ זאת חוקת" ✓); והניף ידו על הנהר; ויאמר לו יהונתן מחר חודש (provisional "ויאמר גו׳ מחר חודש" ✓); וספרתם לכם; והתהלכתי בתוככם; אלפיים שנה קדמה תורה; שלח לך אנשים; נתת ליראיך נס להתנוסס; צו את בני ישראל; והי' עקב תשמעון; אתם נצבים. Vol. 3 adds no maamar not in the provisional list.
* **Volume 1 starts on י"ד שבט תש"י**, not י' שבט: the first unit is the Rebbe's remarks on the 4th day of the shiva (and the list of stories told during the shiva); the catalog cards likewise describe vol. 1 as "י"ד שבט – ש"פ נצבים, כ"ז אלול".
* Vol. 2 contains three short telegraphic texts preceding the maamarim כי תשא (pp. 257–258), וקבל היהודים (p. 283) and the הדרן (pp. 349–351) that read like the Rebbe's own outlines (ראשי-פרקים); typed `reshima/outline`, verification `source_imported_needs_crosscheck`, because the heading footnotes that would confirm their nature are not in the API output.
* Vol. 2 addenda unit "הדרן על הש"ס" (pp. 352–365) actually bundles three pieces (הדרן א–ו; outline on עדי קידושין; sicha on עדי קידושין א–ז); the date/occasion of these is not recoverable from this source → gathering `tm-5711-02-g045` is `unverified`.
* Dating quirks recorded in `notes`: letter dated "ערב ש"ק י"ג אלול ה'שי"ת" although 13 Elul 5710 was itself Shabbos; "ר"ח אדר ה'שי"ת" resolved to 30 Shvat (1 Adar was Shabbos); night events (ליל ב' אייר, ליל ל"ג בעומר, ליל שמחת תורה, ליל ב' דפסח, ליל ב' דשבועות, שמחת בית השואבה) carry the Gregorian date of the Hebrew day, with a note that the event was the preceding evening.

## 6. Physical edition facts (from Chabad Library catalog cards; Wikipedia for publisher context)

* Editor/publisher line on all cards: **י"ל ע"י ועד הנחות בלה"ק** (Vaad Hanachos BeLahak). Hebrew Wikipedia: printed by **הוצאת ספרים קה"ת** (Kehot); series began with the later years in תשמ"א and the early years from תשנ"א/תשנ"ג; 130 volumes as of 2025.
* Vol. 1 (תש"י): 1st ed. ארץ ישראל תשנ"ג, 8°, XVI,(3),יד,270,(2) pp.; 2nd ed. "עם תיקונים והוספות" תשס"ב, XX,273,(3) pp.; 4th ed. נ.י. תשס"ט, 12°, (2),20,273,(11) pp. `pageCount` = 273 (body of the 2nd/4th ed.; the inserted pages 18א… in the digital text indicate that edition).
* Vol. 2 (תשי"א ח"א, ר"ה–ו' ניסן): 1st ed. נ.י. תשנ"ד, XXI,345,(2) pp.; 2nd ed. רמלה תשס"ב, 38,365,(3) pp. `pageCount` = 365 (digital text ends p. 365 → matches 2nd ed.).
* Vol. 3 (תשי"א ח"ב, י"א ניסן–ערב ר"ה): 1st ed. רמלה תשנ"ה, XXII,453 pp.; later ed. תשע"ד, 36,476,(12) pp. `pageCount` = 453 is the catalog figure; the digital text ends at p. 353, so ~100 printed pages (indices/addenda) are not represented — **unverified** which.
* **Binding colour: unverified** — no cover image or description was found in any reached source; `bindingColor` is null.

## 7. Licensing notes

* chabadlibrary.org texts are © ועד הנחות בלה"ק / Kehot; the site shows no explicit reuse licence. This catalogue stores only metadata (headings, dates, page numbers, section letters, dibburei hamaschil, first ~120 characters of each unit as an identification aid) — not the texts. The raw API responses in `raw/` are working copies for verification and should not be redistributed.
* Catalog card data (chabadlibrary.org/catalog) is bibliographic metadata.
* Hebrew Wikipedia text: CC BY-SA 4.0 (used for context only). hebcal API: free for non-commercial use with attribution.

## 8. Remaining unverified / not done

* Chabadpedia and lahak.org could not be reached, so there is **no independent secondary TOC** to cross-check chabadlibrary's unit boundaries against the printed book; the catalogue is labelled `verified` only in the sense "verified against the full digital text of chabadlibrary.org", whose pagination matches the printed 2nd editions per the catalog cards.
* Exact sending dates of the 6 telegrams (headings say only "לקראת …"): `hebrewDay: null`, `gregorianDate: null`, `verification: unverified`.
* Occasion/date of the vol. 2 addenda (הדרן, עדי-קידושין sicha) and the nature of the three "outline" texts (see §5).
* Binding colour; the content of printed pages beyond the digitized range (vol. 3 pp. 354–453; the two 2-page gaps in vols. 1–2).
* Section counts are derived from bold paragraph-initial Hebrew numerals in the HTML; the detector was checked for gaps (no label dropped except the signature "מ. שניאורסאהן" in two letters), but it has not been compared page-by-page with a printed copy.
