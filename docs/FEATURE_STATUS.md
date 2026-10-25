# Feature status

Legend — **A** implemented + automated tests · **V** implemented, verified visually in desktop Chromium (software WebGL), not on a device · **U** implemented, not tested · **P** partial · **N** not implemented.
Last test run: 97 tests in 7 files, all passing (`npm test`). A debug APK builds (`cd android && ./gradlew assembleDebug`); it has **not** been installed on a phone.

## Calendar and schedules
| Feature | Status | Notes |
|---|---|---|
| Hebrew/Gregorian dates, parsha weeks, holidays, Israel/Diaspora | A | hebcal; leap years, Adar I/II, double parshiyos tested |
| Sunset vs civil-day boundary (assignment date) | A | setting; יו״ד שבט begins evening of 17 Jan, civil day 18 Jan |
| Shabbos/Yom Tov rest windows (with and without location) | A | candle lighting → havdalah; conservative fallback |
| Chitas: Chumash, Tehillim, Tanya | A | cross-checked with Sefaria; Terumah override and one Tanya difference documented |
| Hayom Yom (inside the Chitas book) | A | identified by Hebrew date; no text |
| Rambam 3 chapters (one box per chapter, crosses halachos) | A | |
| Daf Yomi: personal ערכין track, handoff 14 Dec 2026, official after | A | no skipped/repeated amud; missed days do not shift the official timeline |
| Ramban aliyos (independent of Chitas) | A | |
| Maamarim schedule with fixed anchors, collision-free, before יו״ד שבט | A | editable windows with warnings |
| Toras Menachem sicha targets (occasion → תשפ״ז, one week lead, catch-up lane) | A | explanation shown for non-exact mappings |
| Likkutei Sichos weekly sets, festival sichos, double parshiyos | A | |

## Data
| Feature | Status | Notes |
|---|---|---|
| Toras Menachem vols. 1–3 catalogue (94 sichos, 16 maamarim) | A | validated; some items flagged for cross-check |
| Likkutei Sichos vols. 10–14 catalogue (113 sichos) | A | 8 vol. 12 items flagged |
| SQLite (sql.js) persistence, migrations, event log, undo, corrections | A | IndexedDB on web, file on Android (**Android file store U**) |
| Backup / restore (merge or replace), human-readable export | A | native share sheet **U** |
| Source-validation tests (duplicates, labels, provenance, ordering) | A | `npm run validate:data` |

## Interface
| Feature | Status | Notes |
|---|---|---|
| 3D shelf with vector-recreated books (cover, spine, back), scroll, due markers | V | `docs/BOOK_DESIGNS.md`; frame/raster cost on a phone **not measured** |
| 2D fallback shelf with the same vector spines | V | |
| Open/close choreography, state machine, interruption safety | A (math, machine) / V (visual) | frame time on a phone **not measured** |
| Learning log on paper: per-אות checkboxes, next, mark all with confirm, undo toast, notes, manual section count | V | |
| Per-book navigators (TM volumes, Sefer HaMaamarim, LS, Chitas, Rambam, Ramban, Shas masechtos) | V | |
| Today, Week, Calendar, Progress, Search, History, Settings | V | |
| 2D fallback shelf (no WebGL) | U | code path exists; not screenshot-checked |
| Reduced motion / short / off; quality tiers; text size; contrast; light theme | P | settings work; light theme and high contrast not visually audited |
| Accessibility: roles, labels, keyboard on checkboxes, live region for book state | P | not run with TalkBack |
| Landscape / tablet layouts | P | scene refits by aspect; not tuned |
| English helper labels | P | navigation only |

## Notifications
| Feature | Status | Notes |
|---|---|---|
| Planner: maamar daily (name + position), sicha start/target, LS Sunday + Thursday, daily shiurim, Shabbos policy, DST, dedupe, skip-when-done | A | |
| Native scheduling via Capacitor, channels, deep links, boot persistence permission | U | not exercised on a device |
| Exact-alarm limitation handling | P | warning shown when Android reports it is not allowed |
| Notification completion actions | N | by design notifications never complete anything; the only action is "open" |

## Not implemented / open
* Migration of the old tracker files — they were not available here. Export/import path is documented in Settings.
* A cached "daily schedule" table with TTL: schedules are computed locally and a Sefaria snapshot (Sept 2026 – Dec 2028) is used only for tests.
* Covers are vector recreations from photos of *similar* editions (one blueprint per series, not the exact 5710/5711 and LS 10–14 volumes); display lettering uses stand-in fonts and ornaments are simplified — see `docs/BOOK_DESIGNS.md`.
* Measured performance on the Galaxy S22 Ultra.
