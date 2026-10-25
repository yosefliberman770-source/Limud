# Verification report

What was checked, against which sources, what is still unverified, and the legal/licensing caveats.
Generated while building the app on 25 Oct 2026. Nothing here is claimed beyond what was actually run.

## 1. Calendar and daily shiurim

| Item | Source(s) | How verified | Status |
|---|---|---|---|
| Hebrew dates, parshiyos, holidays, Shabbos/Yom Tov times | `@hebcal/core` | Anchors asserted in tests: 25 Oct 2026 = י״ד מרחשון תשפ״ז, 17 Jan 2027 = ט׳ שבט, 18 Jan = י׳ שבט, 1 Oct 2027 = כ״ט אלול (Friday), sunset in Brooklyn | computed + tested |
| Daf Yomi (official) | `@hebcal/learning` | Compared with Sefaria's calendar API for every day in the snapshot; the table of 40 masechtos checked against a full cycle. Official cycle enters ערכין on 19 Nov 2026 | tested |
| Personal ערכין track → handoff | simulation in `src/shiurim/dafYomi.ts` | Asserted: 25–28 Oct = ב ע״א, ב ע״ב, ג ע״א, ג ע״ב; 13 Dec = כו ע״ב; **14 Dec 2026 handoff at official כז, both amudim**; no amud skipped or repeated across the merge. The proposed dates in the brief match the canonical schedule, no discrepancy | tested |
| Chitas Chumash aliyos | `@hebcal/leyning`, cross-checked with Sefaria | Every week in the snapshot compared. **One difference found:** Terumah aliyah 2/3 boundary (hebcal ends שני at 25:40, Sefaria at 25:30). Sefaria's division is used (`data/catalogue/aliyot-overrides.json`) | tested, override documented |
| Tehillim monthly (29/30-day months) | `@hebcal/learning` | 29-day month day 29 → 140–150; 30-day month 29 → 140–144 and 30 → 145–150 asserted | tested |
| Tanya yomi (official cycle) | `@hebcal/learning`, cross-checked with Sefaria | 853 days compared; identical except **11 Iyar 5788** (hebcal starts at 46:8, Sefaria at 46:6). hebcal is used; the difference is recorded in the test | one discrepancy open |
| Rambam 3 chapters | `@hebcal/learning`, cross-checked with Sefaria | All snapshot days compared; crossing between halachos asserted; cycle length 339 days | tested |
| Hayom Yom | identified by Hebrew date only | No content is stored. Non-leap years show both Adar entries. Content/links point to chabad.org (not reachable from the build environment) | computed, not cross-checked |
| Ramban aliyos | same divisions as Chitas, own unit ids | Independence from Chitas asserted in tests | tested |

**Not reachable from the build environment:** chabad.org / he.chabad.org (403). The "authoritative daily-study feed" named in the brief was therefore **not** used directly; Sefaria's curated tables and the maintained hebcal library were used instead and compared with each other.

## 2. Toras Menachem 5710–5711 (volumes 1–3)

Primary source: the digital edition at **chabadlibrary.org** (full crawl of all 148 TOC units; method and endpoints in `docs/research/toras-menachem-report.md`, scripts in `scripts/research/`).

* 124 gatherings and documents, 148 items: **94 sichos** (68 with numbered אותיות, 908 sections total, contiguous runs), **16 maamarim**, 28 letters, 6 telegrams, 4 reshimos/outlines.
* **The provisional counts in the brief did not hold.** There are 92 dated spoken events (54 farbrengen-type, 38 short talks) plus 31 documents, not "67 dated groups". Exactly 16 maamarim were confirmed, all in תשי״א (none in תש״י); all 16 dibburim hamaschil match, with two minor wording differences (printed: ויאמר לו יהונתן מחר חודש; וידבר… זאת חוקת התורה).
* Volume 1 begins י״ד שבט תש״י, not י׳ שבט.
* In this edition a farbrengen's sichos are one unit numbered א, ב, ג…; there is no שיחה א׳/ב׳ subdivision. The app models these units with their numbered sections.
* **Maamarim carry no numbered sections** in the digital text (14 of the 16 are unedited transcripts). Tracking uses the printed page labels (verified); the user can enter a section count from their own Sefer HaMaamarim.
* Mapping to תשפ״ז: fixed Hebrew dates and parsha Shabbosos map by rule; plain Adar maps to Adar II in the leap year (explained on the item). Occasions before 25 Oct 2026 go to an evenly spread catch-up lane that ends 30 days before the deadline. 13 of 94 sichos needed the exact-date fallback (e.g. Chol HaMoed days, Rosh Chodesh); 1 item has no date and is flagged.
* Not verified: 6 telegrams lack exact dates; the vol. 2 addenda (pp. 349–365) are undated; three short outline texts are marked `source_imported_needs_crosscheck`; no independent second TOC was reachable (chabadpedia is Cloudflare-blocked). Volume 3's digital text ends at p. 353 of 476 printed pages.
* Printed editions (from Chabad Library catalog cards): published by ועד הנחות בלה״ק; vol. 1 1st ed. תשנ״ג, 2nd תשס״ב; vol. 2 1st תשנ״ד; vol. 3 1st תשנ״ה.

## 3. Likkutei Sichos vols. 10–14

113 sichos enumerated from torahrecordings.com and matched one-for-one against Project Likkutei Sichos' Year-1 schedule (27 / 24 / 18 / 20 / 24). Page ranges are contiguous in every volume. **Section counts were read visually from page scans** (OCR failed on these scans); 105 sichos are `verified` (read twice, or once plus an agreeing English count) and **8 in vol. 12 are `source_imported_needs_crosscheck`**. The two readings were by the same reader, so "verified" means high confidence, not independent proofreading. Full detail, corrections and gaps: `docs/research/likkutei-sichos-report.md`.

Topic lines are missing for part of vols. 10–12 and all of 11; some are editor-written summaries, not printed headings (`topicSource` says which).

## 4. Visual editions (the 3D books)

The shelf uses **photographs the user supplied**, rectified into flat cover and spine textures (`scripts/books/`). The photographed binding is untouched; only volume-specific lettering is repainted in the app's own Hebrew fonts.

| Shelf item | Photo used | What was changed |
|---|---|---|
| ספר חת״ת (includes Hayom Yom) | the user's Chitas photo | nothing |
| תורת מנחם התוועדויות (3 vols.) | Kehot series photo | cover year line and tiny text replaced by ה׳שי״ת / ה׳תשי״א; spine gets the year and volume number (the photographed volume said תשמ״ב) |
| תורת מנחם ספר המאמרים | Kehot photo of the תשמ״א volume | year replaced by **תשי״א** as the user asked |
| לקוטי שיחות 10–14 | vol. 25 Bereishis photo | volume letter (י, יא, יב, יג, יד) and sefer name redrawn |
| משנה תורה (14 vols.) | Eichlers, ספר מדע | sefer name redrawn per volume; spine photo is only ~55 px wide, so it is soft |
| פירוש הרמב״ן על התורה (5 vols.) | Bloom edition photo | sefer name redrawn on the spine; spine photo ~70 px wide |
| תלמוד בבלי (masechtos) | Oz VeHadar | masechta name redrawn on the spine panel |

Caveats: sizes and thicknesses are approximate; one photo stands in for every volume of a series; only the Chitas book is a pure photo. Corner coordinates, hosts and notes: `data/catalogue/book-scans.json`.

## 5. Licensing and rights

* **Book photos are third-party works** (seller and publisher product photos found by web search). They are used only as visual references in a personal, non-distributed build. **Do not publish the app, its web build or the APK publicly without replacing them or getting permission.** The original photos are kept out of git (`assets-src/`); the derived textures in `public/books/` are committed.
* Catalogue data stores bibliographic facts and links only: no Torah text, translations or scans. Sources and their terms are listed in the research reports.
* Fonts: Frank Ruhl Libre, Noto Serif Hebrew, Heebo, David Libre — SIL Open Font License, bundled locally.
* No telemetry, no accounts, no network calls for normal use.

## 6. Still unverified

1. Anything on a real Android device: notifications, exact-alarm behaviour, WebGL frame rate, memory. Only desktop Chromium with a software renderer was available.
2. The Tanya 11 Iyar 5788 discrepancy, and Hayom Yom against chabad.org.
3. Section counts of the 8 Likkutei Sichos vol. 12 items, and the Toras Menachem items marked for cross-check.
4. Whether the user's physical Toras Menachem/Likkutei Sichos printings match the digital TOC page numbers.
5. The user's old tracker files (`toras_menachem_tracker_5787.html` etc.) were not found in this environment; no migration was performed.
