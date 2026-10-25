# סדר הלימוד — Usability, performance & simplicity overhaul: report

Baseline: git tag `baseline-before-overhaul` (rollback point). Every number below comes from scripts in `scripts/qa/` that you can re-run;
raw results are in `docs/overhaul/`. **All measurements are from headless Chromium with software WebGL (SwiftShader) on a server CPU — not an Android device.**
Absolute frame times are not representative of a Galaxy S22 Ultra; counts (canvases, draw calls, textures, long tasks, memory) are meaningful and comparable between builds.
No Android emulator or device was available in this environment (no KVM), so **nothing was run on Android.**

## 1. The most serious problems found

1. **The shelf locked itself after the first book was closed** (pre-existing bug). The controller compared against a stale snapshot, so the "active book" was never cleared: scrolling stayed disabled and no other book could be tapped until the app restarted. Fixed (`useBookController.ts`) and covered by journey B.
2. **Opening the library blocked the main thread for ~10 s** (software-GL harness): ≈2.8 s of it was one SQL statement per unit (thousands) when computing which books are "due today", and the rest was ≈490 canvases, 357 geometries and per-book materials built at mount.
3. **Spine art for rows below the fold could stay flat maroon** after a jump or fast scroll: the raster queue was first-in-first-out (top rows and cover prefetches first), and books checked a camera one frame stale. Fixed.
4. **Date and page ranges displayed backwards in Hebrew** ("54–49", end date before start date) on Today, Progress, Calendar, Week, Search and the logs.
5. The learning log buried the checklist under five metadata rows, seven buttons, and two confirmation dialogs for actions the undo toast already makes reversible.
6. Developer vocabulary in the main UI: "קבוע", catalogue counts, "אותיות לא אומתו", verification statements in the Progress hero, a "preview date" control and 3D quality levels in the default Settings view.

## 2. Interactions simplified (no capability removed)

| Before | After |
|---|---|
| Log: metadata (date, occasion, pages, verification, source note) above the list | One collapsed "פרטים ומקור" (still there, with the manual-sections fix) |
| Log: primary action at the bottom after the whole list | "סמן עמ׳ 232 כנלמד" directly under the progress bar |
| Log: "סמן הכל" and "נקה" asked for confirmation | No dialog; each shows an undo toast (and is undoable) |
| Log: 7 footer buttons | One "עוד" (mark all, clear, note, source, close) |
| Log opened at the top of long lists | Scrolls to the next unfinished unit |
| Today: two countdown lines under the daily bar | Moved to Progress; Today is just the assignments |
| Today card: "0/5 המשך: אות א עד …" run together | "המשך: אות א" on its own line, "0 מתוך 5", deadline chip |
| Daily row button "המשך הלימוד" (misleading — the units are right there) | "פרטים" |
| Progress hero: verification sentences | Collapsed "פרטי אימות"; hero shows only learning facts + the י׳ שבט countdown |
| Settings opened on display options | All sections collapsed; ordered תזכורות, גיבוי ושחזור, תצוגה, לוח שנה, מסלולים, לוח המאמרים, אודות; technical options under "מתקדם"; "איכות תלת־ממדית" renamed "מראה הספריה" (אוטומטי / מלא / חסכוני / שטוח) |
| Shelf ignored taps for ~2.5 s while a book returned; opening could not be skipped | Taps are accepted while a book returns (queued); closing is ~2× faster than opening; a tap during the opening skips to the log |

Navigation is unchanged: the five tabs are the right set (library, today, calendar, progress, settings), search/history live under Progress, week is reached from Calendar/Today.

## 3. Performance: bottlenecks and fixes

| Bottleneck (measured) | Fix |
|---|---|
| One SQL statement per unit in `isCompleted` (~2.8 s CPU on opening the library; also slowed Today, Week, Calendar, notifications) | One `SELECT` per program, cached until the database is written (`writeVersion`), so it can never be stale; tests prove it follows complete / undo / restore |
| ≈5 canvases per book at mount (489) | Paper, page-edge and plain-binding textures and their materials are shared across all books; flat colour placeholder until the vector art arrives |
| 143 geometries | Shared per size |
| 623 draw calls (three.js issues one call per face group; every box had 6) | Consecutive same-material faces merged into one group: 311 calls, identical triangles, identical look |
| All ~90 spines rasterised immediately | Only books within two rows of the viewport; priority queue (nearest first, tapped book immediately, prefetch last and parked when far); covers prefetched in idle time for nearby books only |
| Re-rasterising SVGs every launch | Persistent IndexedDB cache keyed by a hash of the SVG (auto-invalidates on design edits); top rows fully textured 8.9 s cold → 3.5 s warm |
| Texture/GPU memory on leaving the library | Shared assets disposed on unmount; opened-book GPU textures stay flat across repeated opens |
| Rendering while idle | Already on-demand; confirmed: **0 renders per 3 s when nothing happens** (a few renders for ≈seconds after load while art arrives) |

| Measure | Before | After | After, 4× CPU throttle |
|---|---|---|---|
| Today ready (cold start, ms) | 1204 | 515 | 2085 |
| Library: first rendered frame (ms) | 8884 | 1239 | 3665 |
| Library: main-thread long tasks while opening (ms) | 10624 | 3038 | 6076 |
| Canvases created when the library opens | 489 | 70 | 63 |
| Draw calls per frame | 623 | 311 | 311 |
| GPU textures after load | 201 | 51 | 44 |
| GPU geometries after load | 143 | 99 | 99 |
| Median open-book → sheet ready (ms, 12 opens) | 1205 | 1178 | 3256 |

Notes: "Median open-book → sheet ready" did **not** improve in this harness (dominated by the animation and software GL); the user-visible improvements there are that the shelf no longer locks, re-opening works immediately, and the opening can be skipped. Software-GL scroll frame times (~350 ms/frame) are CPU-rasterisation artefacts of the harness and are not reported as a result. No claim is made that 60 FPS or the 100 ms tap target is met on a phone — that was not measured.

## 4. What was preserved (verified)

* `data/` is **byte-identical** to the baseline (`docs/overhaul/data-baseline.sha256`; `sha256sum -c` → all OK; `git diff baseline-before-overhaul -- data` is empty).
* Database schema unchanged (one migration, `SCHEMA_VERSION` 1); no data migration was needed.
* `tests/fixtures/baseline-user.db` is a frozen user database (18 events across Maamarim, Toras Menachem, Likkutei Sichos, Chitas, Rambam, Daf; an undo; a late completion; notes, bookmark, custom sections, notification rule, schedule override). `tests/migration.test.ts` opens it with the new code and checks every record, reopens after a write, and round-trips backup → restore.
* `tests/golden.test.ts`: 19 golden snapshots of daily shiurim (14 dates through the project end), the maamar windows and four Likkutei Sichos weeks — the verified schedules cannot change silently.
* All 139 automated tests pass (calendar, shiurim, scheduling, db, notifications, 3D machine, data validation, art, migration, golden).

## 5. Verification

**Tested and passed (automated, headless Chromium, production build):**
journeys in `scripts/qa/journeys.cjs` — A daily learning (2 taps from Today to mark the next unit; stored once; survives restart; progress shown), B shelf (real touch on a spine opens the sheet 4/4 times in a row; route back; GPU textures flat after the first open; no console errors), C late completion (intended date 2026‑10‑25 vs completion time 2026‑10‑27 kept distinct), D correction (toast undo, uncheck, append-only history, Progress agrees), E no-internet (every external host blocked: 0 requests, records survive restart), F first-time user (five plain-Hebrew tabs, library first with a one-tap Today shortcut, Today lists assignments immediately). `scripts/qa/e2e.cjs` also passes. A click-through of 311 controls (`controls-audit.cjs`) found no dead control; the 21 it flagged were active tabs, already-selected options and calendar cells whose effect it cannot detect, and the checkbox and "עוד" cases were re-tested directly.

**Implemented but not verified on a device:** everything on Android — frame rate, touch latency, memory, WebView behaviour, the IndexedDB cache inside the Capacitor WebView, notifications and exact alarms, and an actual in-place APK upgrade. The APK is signed with this machine's debug key and `versionCode` is raised from 1 to 2 (0.2.0), which is what an in-place upgrade needs; if the phone has an APK signed with a different debug key, Android will refuse the update and installing would require uninstalling first (which deletes the app's data — export a backup from Settings first).

**Not done / incomplete:**
* No usability test with real people; "first-time user" is an automated heuristic, not a person.
* The shelf composition (spacing, labels, camera) was inspected but deliberately **not redesigned**; the lower Shas rows are long scrolls of similar spines.
* Cover fidelity limits listed in `docs/BOOK_DESIGNS.md` (stand-in fonts, simplified ornaments, blurry Rambam/Ramban spines) are unchanged.
* The old photo textures and the previous APK are still in earlier git commits.
* Items still unverified from the original project: Tanya for 11 Iyar 5788 and Hayom Yom against chabad.org; 8 section counts in Likkutei Sichos vol. 12; the old tracker files were never found.

## 6. Screenshots

`docs/screenshots/final-shelf.png`, `final-today.png`, `final-log.png`, `final-progress.png`, `o-shelf-low.png` / `o-shelf-low2.png` (before the queue fix), and the cover sheets `final-covers-1.png`, `final-covers-2.png`.
