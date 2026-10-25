# Design system

A calm, scholarly library: a dark navy room, warm wood, ivory paper for everything you log on, near-black ink, and brass used sparingly.
Tokens live in `src/design/tokens.css`; components use only tokens.

## Principles
1. **The seforim are the interface.** The home screen is a physical bookshelf of the user's real books; nothing decorative competes with it.
2. **Paper is where work happens.** The learning log is real DOM on ivory paper (crisp text, large hit targets), not a texture. The 3D animation is only the entrance.
3. **Truthful states.** Verified, computed, manual and unverified data look different (dashed "לבדיקה" chip); empty states say what is missing.
4. **No gamification.** No streaks, flames, badges or confetti. Progress is bars and counts; participation strips show done / partial / not marked.
5. **Fast first.** Every screen can be reached without the cinematic: "היום" shortcut, shorter/off motion, 2D shelf.

## Color
| Role | Token | Value |
|---|---|---|
| Room | `--c-room-900…500` | `#0b0f18` → `#273243` |
| Wood | `--c-wood-900…500` | `#2a1a10` → `#7a5133` |
| Paper (log) | `--c-paper-50…400` | `#fbf7ee` → `#c9b995` |
| Ink | `--c-ink-900…300` | `#15110c` → `#8c8272` |
| Brass (scarce) | `--c-brass-500/400/300` | `#b08d57`, `#c9a86a`, `#dcc08a` |
| Done / overdue / current | `--c-done`, `--c-overdue`, `--c-current` | `#3f7a5a`, `#a04b3c`, `#b08d57` |

Brass appears only on: the current/next item, the primary button, brass "learn today" clips on shelved books, collection nameplates, and the active nav tab. State is never color-only: every chip has text and checkboxes have a glyph.
Light theme and high-contrast overrides are defined under `[data-theme='light']` and `[data-contrast='high']`.

## Typography
* **Frank Ruhl Libre** — headings, titles, checklist labels (traditional sefer feel, excellent gershayim and nikud support).
* **Noto Serif Hebrew** — display fallback and wide glyph coverage.
* **Heebo** — UI chrome, captions, numbers.
* David Libre bundled as an alternate. All OFL, shipped locally (`public/fonts`), variable weights, Hebrew + Latin subsets only.
* Mixed Hebrew/English/numbers use `unicode-bidi: isolate` (`.ltr`, `.bidi`); dates and ranges are isolated so they never reorder. Search normalizes geresh/gershayim and quote marks.
* Scale `--fs-xs … --fs-3xl` multiplied by `--text-scale` (normal / large 1.15 / xlarge 1.3).

## Space, shape, motion
* 4-pt spacing (`--s-1…16`), radii 6/10/16/22, touch target ≥ 48 px (`--tap`).
* Motion tokens: `--ease-out` (cubic-bezier .22,1,.36,1), 140/260/480 ms. `prefers-reduced-motion` and the in-app motion setting collapse all durations; the OS preference is the default.
* Shadows are soft and warm; paper surfaces have a faint gutter shadow on the spine side and ruled lines at 32 px.

## 3D shelf
* Real photographs rectified into cover and spine textures; volume-specific lettering redrawn with the app fonts (`src/library3d/scanOverlays.ts`).
* Hebrew sets run right → left. Same-series volumes share dimensions. A volume with something to learn today is pulled 0.9 cm forward and carries a small brass clip.
* Lighting: warm key light + hemisphere; the room dims and hazes while a book is presented (cheap stand-in for depth of field). Contact shadows are baked blobs; real shadow maps only on the high quality tier.
* Choreography: one progress value `p ∈ [0,4]` drives slide-out → present → hinged cover → folio fan; the pose is a pure function of `p`, so interruptions can never strand a book (`src/library3d/machine.ts`, `pose.ts`, tested).
* Rendering: on-demand frame loop, shared geometry per book, DPR capped (1.5 on low), textures at 55% on the low tier.

## Components
Bottom navigation (5), date line (weekday · Hebrew date · parsha · civil date, "אחרי השקיעה" chip), work row (expand to compact log), checkbox row (28 px box in a 48 px row), progress bar (6–8 px), chip (done/current/overdue/scheduled/verify), segmented control, toggle, toast with undo, confirm overlay for "mark all".
