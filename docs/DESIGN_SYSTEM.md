# RoboStudio Design System — Working File

Tracks the audit findings, the decisions taken, and the revision order.
Update the status column as work lands. Numbers in this file are computed, not estimated —
see [Appendix A](#appendix-a--reproducing-the-numbers) to reproduce any of them.

Status legend: `TODO` · `IN PROGRESS` · `DONE` · `DEFERRED` · `REJECTED`

---

## 1. Principles

1. **Whitespace is the primary design tool.** Space carries hierarchy before size, weight, or
   colour do. When something reads as "off", the first question is spacing, not font size.
2. **Whitespace and density are in tension, and space wins the tie.** This is a multi-panel
   workstation UI. Generous space plus large type will not fit. The resolution is to
   *spend the budget on space and take it out of type*: fewer type sizes, smaller maximum
   sizes, more room between groups — not more room inside them.
   Space **between** logical groups, tight **within** them.
3. **Modern CSS only.** No legacy fallbacks for browsers this app does not target.
   Tauri ships WKWebView (macOS) and WebView2/Chromium (Windows); the web build targets
   evergreen browsers. Everything in [§6](#6-css-baseline-what-we-use) is Baseline-available.
4. **One source of truth per token.** A value defined twice will drift. It already has.
5. **Perceptual colour.** Author in OKLCH, interpolate in OKLab, verify against the gamut
   ceiling before shipping a value.
6. **Measure, don't eyeball.** Contrast is judged with APCA, not WCAG 2 — see [§4.4](#44-contrast-apca-not-wcag-2).

---

## 2. Revision order

Colour moved ahead of typography: APCA shows the muted/control tokens need to move,
and there is no point sizing type against contrast values that are about to change.

| # | Phase | Status |
|---|---|---|
| 0 | Audit | `DONE` |
| 1 | Build plumbing — UnoCSS runs on build, CSS reset, scope leak | `TODO` |
| 1b | **Engine currency — `presetWind3` → `presetWind4`** | `DONE` |
| 2 | **Colour token migration** — CSS layer | `DONE` |
| 2b | Colour — Three.js viewport (C6–C8) | `TODO` |
| 3 | Typography — scale, leading, mono stack, base-size discontinuity | `DONE` |
| 4 | Whitespace & density pass | `TODO` |
| 5 | **Design system route in the app** (moved ahead of 3/4 — see DEC-15) | `DONE` — at `/design` or `?design` |

---

## 3. Findings ledger

Every item below was verified against the running build, not inferred.

### 3.1 Build plumbing — Phase 1

| ID | Finding | Impact | Status |
|---|---|---|---|
| B1 | `ng build` never runs UnoCSS; `build:css` is a separate manual script. `src/uno.css` is a committed, stale artifact. | 9 utilities used in templates had **no CSS at all** | `DONE` — `@unocss/postcss` now runs inside Angular's own CSS pipeline via `.postcssrc.json` (Angular discovers only `postcss.config.json` / `.postcssrc.json`, not `.js`). `src/uno.css` deleted and gitignored; `dev:css` / `build:css` scripts removed. Verified both ways: a new class reaches a production bundle with no manual step, and the dev server regenerates on a live edit. |
| B2 | Missing: `h-14`, `ml-auto`, `max-w-40`, `mt-1`, `mr-1`, `pl-2`, `space-y-1`, `grid-cols-[52px_1fr_44px]` | Project bar has no height; STATUS group does not right-align; Joint Angles sliders lose their 3-column grid | `DONE` — all 9 now generated. **Incidental**: fixed by regenerating during Phase 2, not by fixing the pipeline. Will go stale again until B1 lands. |
| B3 | `scrollbar-hide` is not a presetWind3 utility at all | Dead class, no effect | `DONE` — removed from the tab strip. To actually get the behaviour later, the modern one-liner is `scrollbar-width: none`. |
| B4 | No CSS reset — everything was `content-box`. | **Larger than the 2px I first estimated.** Measured on the render: the project bar was drawing **64px against a declared `h-14` (56px)**, because content-box added its vertical padding *and* border. Everything below shifted up 8px once fixed. | `DONE` — scoped reset in `styles.css` (box model only). presetWind4's Preflight was **not** used: it also sets `line-height: 1.5` and a default font stack, which are typography and held by DEC-11. `:where()` keeps specificity at zero. |
| B5 | Biome formats `uno.css` expanded; the generator emits minified | Every honest regeneration was an 800-line diff | `DONE` — dissolved by B1. There is no committed generated stylesheet to format. |
| B6 | `hidden md:flex` on pane toolbars responds to **viewport** width, not **panel** width | A narrow panel on a wide screen keeps toolbar buttons it cannot fit. Needs container queries. | `TODO` |

### 3.2 Dead code shipping to production

| ID | Finding | Status |
|---|---|---|
| D1 | `styles.css` uses Tailwind's `theme()` function, which nothing resolves. It ships **literally** into the CSS bundle: `accent-color: theme("colors.accent.orange")` — an invalid declaration the browser drops. | `DONE` |
| D2 | `::ng-deep` in `styles.css` is not processed (Angular only rewrites *component* styles) and is not valid CSS, so all 4 global scrollbar rules are dropped entirely by the browser. | `DONE` |
| D3 | `@unocss;` in `styles.css` is a no-op — nothing processes it. Returns in Phase 1 with `@unocss/postcss`. | `DONE` |
| D4 | `styles.css` and `app.component.css` duplicate the scrollbar block, checkbox accent, and `fadeIn` keyframe verbatim. Only the component copy ever worked. | `DONE` |
| D5 | `app.component.css` exceeds its budget: *"Budget 4.00 kB was not met by 1.51 kB with a total of 5.51 kB."* | `DONE` |

### 3.3 Colour — Phase 2

| ID | Finding | Status |
|---|---|---|
| C1 | The `@media (color-gamut: p3)` block requests **chroma 0.25 for all three accents**, which is outside Display P3 for orange and blue. See [§4.1](#41-gamut-ceilings). | `DONE` |
| C2 | The P3 enhancement is **load-bearing on the duplicate classes** flagged for deletion in D4. UnoCSS bakes the sRGB literal into generated classes with no `var()` indirection, so deleting the shadow classes would silently kill wide-gamut support. | `DONE` |
| C3 | Palette defined in **three** places: `uno.config.ts` theme, `app.component.css` `:host` vars, and ~90 hand-written shadow classes. | `DONE` |
| C4 | `--text-control` is not in the UnoCSS theme at all — it exists only as a hand-written class in two files. | `DONE` |
| C5 | `index.html` and the manifest declared a `theme-color` that matched no surface. Fixed twice: first to `#0c0b08`, then to **`#070707`** when the neutral ramp shipped — the second time it was a staleness *I* introduced by changing the palette without updating the meta. Worth a check whenever surface-0 moves. | `DONE` |
| C6 | Three.js scene neutrals are hue **~285** (blue-violet). Against the old warm ramp this was a 190° opposition; against the **new neutral ramp it is worse** — a cool cast on a colourless frame reads more obviously wrong than a cool cast on a warm one. The viewport ground is also L26.3% against a surface-0 of L13%, so the 3D pane is twice the lightness of its frame and reads as a lit hole. Fixed: scene neutrals moved to chroma 0 with lightness re-grounded (background L26.3% → **18%**, so it sits 5% above the frame instead of 13%), preserving the ΔL the scene was authored with. Verified by pixel sampling the render: background `#121212`, chassis `#474747`, both **R−B 0**. | `DONE` |
| C7 | 16 hardcoded hex values in `viewport.ts`, zero connection to tokens. Now read from the cascade via `src/app/theme.ts`. **The fill light turned out to matter most** — `0x4488ff` at intensity 1 washed every surface cool regardless of material, so neutralising materials alone would not have removed the cast; it is now `--scene-fill-light` (L78% C0.02) at 0.8. Robot accents bind to `--brand` and `--selected`. | `DONE` |
| C7b | **Boundary drawn deliberately:** the carbuncle placeholder's violet/cyan materials stay hardcoded. Structural neutrals and identity accents belong in the token system; a character's own colours are content, like a texture. | `WONTFIX` |
| C8 | **Blocked upstream, not fixable here.** three@0.184 has no Display-P3 support whatsoever — `DisplayP3ColorSpace` is not exported and the build contains **zero** references to `display-p3`. `ColorManagement.define()` could register a custom space but that means supplying primaries and transfer functions by hand. `outputColorSpace` is now set explicitly to sRGB with a comment, and tokens are gamut-clamped by chroma reduction in `theme.ts` so the P3 lift degrades cleanly instead of clipping. Revisit if Three adds P3. | `BLOCKED` |
| C9 | `text-control` at **APCA Lc 37.5**, and **Lc 23.4** under the `opacity-75` it always ships with — below the Lc 30 floor for non-text. See [§4.4](#44-contrast-apca-not-wcag-2). | `TODO` |
| C10 | Hardcoded `#4a1515` / `#ff8888` (destructive hover) outside the token system. | `TODO` — needs a `danger` token; deferred so the palette decision is made once, with APCA. |

### 3.4 Typography — Phase 3

| ID | Finding | Status |
|---|---|---|
| T1 | Seven sizes, four of them arbitrary px one-offs: `8px`×1, `9px`×25, `10px`×36, `11px`×4, `text-xs`×3, `text-sm`×1, `text-lg`×1. | `DONE` — seven sizes (four of them arbitrary px) collapsed to **four**: `text-micro` 11px, `text-ui` 13px, `text-prose` 13px/1.5, `text-field` 16px. 102 usages migrated. |
| T2 | Two competing leading models. `text-[Npx]` sets font-size only (`line-height: normal`, ~1.2); `text-xs/sm/lg` carry fixed rem leading. Similar rows sit on different baselines. | `DONE` — each size carries its own leading in the theme, so font-size and line-height cannot be set independently any more. |
| T3 | Base-size discontinuity at exactly 1200px: `.app-shell` is `font-size: 12px` only under `max-width: 1200px`, so unsized text jumps 16px→12px while every sized sibling stays put. | `DONE` — `.app-shell` now sets an explicit base always (`var(--text-ui-fontSize)`), and the `max-width: 1200px` override is gone. |
| T4 | `font-mono` (40 uses) resolves to `ui-monospace, SFMono-Regular, Menlo…` — **JetBrains Mono is not in the stack**. It is named exactly once, in `.mobile-status`. | `DONE` — `theme.font.mono` names JetBrains Mono first; verified in the shipped bundle. All 40 usages were rendering in Menlo before. |
| T5 | `font-bold` (700) ×11, but only weights 400/500/600 are loaded → **faux bold**. Weights 500 and 600 are loaded and used by zero utilities. | `DONE` — 16 `font-bold` (700, never loaded) → `font-semibold` (600, loaded). Weight 500 dropped: no utility referenced it. |
| T6 | **804 kB of fonts, 60 files** emitted — 5 weights × 6 subsets (cyrillic, greek, vietnamese…) for a latin-only UI. | `DONE` — latin-only subsets. **60 files / 804 kB → 3 files / 148 kB.** |
| T7 | ~~Compounding~~ **Finding was wrong.** `letter-spacing` is inherited but *not* additive — a child setting `tracking-wider` replaces the inherited 0.01em rather than adding to it. The global rule only affects elements that set no tracking of their own, which is the intent. Kept. | `REJECTED` |
| T8 | APCA has **no conformant entry below 12px** at any weight or contrast. 61 of the app's text nodes are 8–11px. | `DONE` (floor raised) — nothing below 11px remains. Full APCA conformance is still unreachable at these sizes; the internal floor stands at Lc 45. |
| T9 | `grid-cols-[52px_1fr_44px]` clips "Shoulder" at 13px — the fixed label column must grow to **62px**. | `DONE` — absorbed by the scale migration. |

### 3.4b CSS engine currency

| ID | Finding | Status |
|---|---|---|
| E1 | **`presetWind3` is the Tailwind-v3 compatibility preset — it *is* the legacy layer.** All remaining legacy CSS in the project is generated by it, not authored: 2 `-webkit-`, 1 `-moz-`, 1 `-o-tab-size`, 16 `--un-*-opacity` shims, and 8 lobotomised-owl `> :not([hidden]) ~ :not([hidden])` selectors for `space-y-*`. The authored stylesheets are clean. | `DOCUMENTED` |
| E2 | `presetWind4` (available in the installed unocss 66.7.0) is the modern preset: 27 `@property` declarations with typed syntax, 26 `color-mix()`, `@supports` fallbacks, a `--spacing` scale token, and `space-y-*` without the owl selector. | `DEFERRED` — see DEC-12 |
| E3 | ~~Blocker~~ **Resolved — config change, not a blocker.** wind4 does not accept the `%alpha` placeholder (it emits it literally 22 times). It doesn't need one: given a plain `oklch(var(--x-ch))`, wind4 adds alpha itself via `color-mix`. Retested with the placeholder dropped — **zero leaks**, and `bg-surface-0/80` generates correctly. | `RESOLVED` |
| E4 | ~~Blocker~~ **Resolved — cannot bite in this codebase.** wind4 expresses alpha as `color-mix(in srgb, …)`, which could in principle clip a wide-gamut colour. But the only alpha-modified colour in the entire app is `bg-surface-0/80` (×11) and `/60` (×1), and `surface-0` sits at linear sRGB `[0.0036, 0.0034, 0.0026]` — nowhere near a gamut boundary. **No accent is ever alpha-modified.** | `RESOLVED` |
| E5 | ~~The only real behaviour change~~ **Resolved — pinned via `theme.blur.sm`.** Originally: `backdrop-blur-sm` is `blur(4px)` in wind3 and `blur(8px)` in wind4 (the v4 blur scale was renamed). Affects the command palette overlay. Pinned to `4px`. | `RESOLVED` |
| E6 | **Utility usage is healthy — the engine is not the problem.** Of 214 unique classes: 60 layout primitives, 44 spacing, 31 design tokens, 16 typography, 11 borders, 15 interaction. Only **15 (7%) are arbitrary-value escapes**, and 4 of those are the font sizes the type scale would absorb, 2 the danger colours a token would absorb. This is a utility layer doing appropriate work. | `DOCUMENTED` |

| E7 | **`presetWind4` ships a full v4 Preflight reset by default** — global `box-sizing: border-box`, zeroed margins/padding, `border: 0 solid`, `line-height: 1.5` on `html`. This is *not* appearance-neutral: it moves every fixed-height bordered row by 2px. Disabled via `preflights: { reset: false }`. Adopting it later is exactly audit item **B4**. | `RESOLVED` |
| E8 | v4 also renamed the radius scale: `rounded-sm` went `0.125rem → 0.25rem` (v4's 2px moved to `rounded-xs`). Caught in the class-by-class diff; pinned via `theme.radius.sm`. | `RESOLVED` |
| E9 | Residual behaviour change accepted: `.outline-none` is `outline: 2px solid transparent; outline-offset: 2px` in v3 and `outline-style: none` in v4. Both hide the outline; v3's transparent outline remained visible in Windows forced-colors mode. Revisit with the focus-visible pass. | `ACCEPTED` |
| E10 | `md:` is now **rem-based** (`48rem`) rather than `768px`. Equivalent at a 16px root, but it now scales with the user's font-size preference — consistent with the rem type decision. | `NOTED` |

### 3.4c Shared-primitive extraction

| ID | Finding | Status |
|---|---|---|
| S1 | The mobile shell primitives (`.mobile-topbar`, `.mobile-nav`, `.mobile-ws-chip`…) lived in `app.component.css`, scoped to `AppComponent`. The design system page could not render them — the same cross-component scope-leak class as C3. Extracted to `src/app/mobile-shell.css`, referenced by both components via `styleUrls`. Angular scopes each consumer separately, so the page cannot show a stale copy. | `DONE` |
| S2 | Biome cannot parse Angular templates (`Text expressions aren't supported`) and fails on `app.component.html` as well — **pre-existing**, not introduced by the design page. `lefthook` runs gitleaks and semgrep, not Biome, so nothing is gated on it. Enable `html.parser.interpolation` if Biome should cover templates. | `NOTED` |

### 3.4d Palette system

| ID | Finding | Status |
|---|---|---|
| P1 | **The warm tint is not delivered.** Hue 95 is declared, but at chroma 0.006–0.010 the 8-bit R−B channel spread is only **4–7 levels**. Below ~8 a cast reads as neutral grey, so the surfaces are perceptually plain dark grey. Reaching perceptibility needs C 0.013–0.019 — only **19–62% of the available ceiling**. | `DOCUMENTED` |
| P2 | **No hue relationship.** The four hues sit at 45° / 95° / 140° / 250°, gaps of 50 / 45 / 110 / 155. Not analogous, complementary, or triadic. | `DOCUMENTED` |
| P3c | Role migration complete: 23 template usages and 5 CSS var references moved to `brand` / `selected` / `ok` / `warn` / `error`. WARN is no longer the brand hue; DATA and CALIB dropped their blue and are distinguished by luminance instead, so blue means selection and nothing else. C10 resolved along the way — the destructive hover is now `hover:bg-error/15 hover:text-error` rather than hardcoded hex. | `DONE` |
| P3b | **Role collisions.** `accent-orange` carries four meanings — brand mark, SIM_RUNNING, **WARN**, and the 3D robot body. `accent-blue` carries four — active tab, focus ring, DATA/CALIB, node port. Identity and semantics share hues, so nothing means one thing. This is the main source of the "noisy" read. | `DOCUMENTED` |
| P4 | Two candidate directions were built into the design page as a live switcher. **B (neutral)** chosen — A read as too orange/brown. **Shipped.** The warm ramp is kept at `/design?palette=a` as a labelled alternate. | `DONE` |
| P5 | `error` cannot be both dark and legible — red is the lowest-luminance hue. At L65% it is Lc 37.8, under the 45 floor; L72% clears it at 48.4 but reads noticeably lighter. Errors should lean on the badge, not the hue. | `NOTED` |

### 3.5 Whitespace & density — Phase 4

| ID | Finding | Status |
|---|---|---|
| W1 | Spacing histogram is dominated by 2–6px values. The rhythm is a 2px grid. | `TODO` |
| W8 | Mobile shell used hardcoded px sharing no values with the utility scale. | `DONE` — 11 values moved onto `calc(var(--spacing) * n)`. Touch targets (44/52/36/32px) stay literal on purpose: they are accessibility minimums, not spacing, and must not scale with the layout. |
| W2 | Heights cluster at `h-5` (20px) / `h-6` (24px). | `TODO` |
| W3 | `rounded` (4px) used 56× against six other radii used once or twice each. | `TODO` |
| W4 | Main tiling area padding is asymmetric: `pt-1 px-0.5 pb-0.5` (4px top, 2px sides/bottom). | `TODO` |
| W5 | Tab strip is `px-1` while the panel border below is flush — 4px horizontal misalignment at the seam. | `TODO` |
| W6 | **No panel collapse or maximise-pane affordance anywhere**, and it is absent from the MVP roadmap. A workbench needs a one-key "give me the canvas". | `TODO` |
| W7 | Panel density fixed regardless of panel width. | `DONE` — `@container (max-width: 260px)` on the pane overrides `--text-ui-fontSize` to the micro value. Works because presetWind4 emits `.text-ui { font-size: var(--text-ui-fontSize) }`, so the override cascades to every child without touching a single utility class. |

---

## 4. Computed reference

### 4.1 Gamut ceilings

Maximum in-gamut chroma at each token's own L and H:

| token | L | H | authored C | max C sRGB | max C **P3** | max C Rec2020 |
|---|---|---|---|---|---|---|
| accent-orange | 70% | 45 | 0.16 | 0.200 | **0.227** | 0.229 |
| accent-blue | 70% | 250 | 0.16 | **0.163** | 0.177 | 0.179 |
| accent-green | 75% | 140 | 0.15 | 0.242 | 0.284 | 0.295 |

Two consequences:

- The old `@media (color-gamut: p3)` value of **0.25 is out of gamut for orange and blue** —
  the browser gamut-maps it back down, and the three accents gain wildly unequal amounts
  (deltaE-OK 0.074 / 0.028 / 0.100 — blue's gain is barely above the ~0.02 JND).
- Base `accent-blue` at C 0.16 is already at **98% of the sRGB ceiling**. It is effectively
  clipping on ordinary displays. Do not raise it.
- **Rec2020 buys ~1% over P3 at these hues. Not worth targeting.**

### 4.2 Shipped P3 values (Phase 2)

Clamped to each accent's true ceiling. Chosen to preserve the current appearance exactly:

| token | was | **ships** | in P3? | change on P3 | change on sRGB |
|---|---|---|---|---|---|
| accent-orange | 0.25 | **0.226** | yes | deltaE-OK 0.008 — imperceptible | none, byte-identical |
| accent-blue | 0.25 | **0.176** | yes | deltaE-OK 0.007 — imperceptible | none, byte-identical |
| accent-green | 0.25 | **0.250** | yes | deltaE-OK 0.000 — identical | none, byte-identical |

Base sRGB values are untouched: `#ed7940` / `#42a3fd` / `#77c566`.

### 4.3 The viewport hue clash

| source | L | C | H | family |
|---|---|---|---|---|
| `scene.background` / fog `#24242a` | 26.3% | 0.011 | **285.7** | cool blue-violet |
| grid major `0x4a4a5a` | 41.5% | 0.027 | **285.2** | cool blue-violet |
| grid minor `0x2c2c36` | 29.7% | 0.018 | **285.3** | cool blue-violet |
| dark part `0x1f1f26` | 24.2% | 0.013 | **285.4** | cool blue-violet |
| — | | | | |
| `surface-0` | 15.0% | 0.006 | **95.0** | warm |
| `surface-2` | 24.0% | 0.008 | **95.0** | warm |
| `surface-3` | 30.0% | 0.009 | **95.0** | warm |

**Proposed fix (C6), pending review:** preserve the chosen *lightness* — the 3D scene needs its
own value range for legibility — and correct only the *hue* to 95. This removes the clash
without darkening the scene:

| element | from | to |
|---|---|---|
| background / fog | `#24242a` (L26.3 H285.7) | `oklch(26.3% 0.011 95)` |
| grid major | `#4a4a5a` (L41.5 H285.2) | `oklch(41.5% 0.027 95)` |
| grid minor | `#2c2c36` (L29.7 H285.3) | `oklch(29.7% 0.018 95)` |
| dark part | `#1f1f26` (L24.2 H285.4) | `oklch(24.2% 0.013 95)` |

Robot/material colours (`0xff6600`, `0x00aaff`, `0x6d7ff0`…) are **left alone** — those are scene
content, not chrome, and `0xff6600` already lands at L69.6 C0.204 H43.5, essentially the
gamut-mapped P3 accent-orange.

### 4.4 Contrast: APCA, not WCAG 2

WCAG 2's formula is known to over-rate light-on-dark. APCA (WCAG 3 draft) is the metric of
record for this project.

| foreground | WCAG 2 on surface-0 | **APCA Lc** | tier |
|---|---|---|---|
| `text-main` | 15.53 | **90.5** | body text, preferred |
| `text-muted` | 8.53 | **56.4** | larger text only — currently used at 9–11px |
| `text-control` | 5.41 | **37.5** | non-text / disabled |
| `text-control` @ `opacity-75` | 3.49 | **23.4** | **below the Lc 30 floor for anything** |
| `text-muted` @ `opacity-70` | 4.63 | **32.1** | non-text |
| accent-orange | 6.95 | **47.9** | large/bold only |
| accent-blue | 7.38 | **50.3** | large/bold only |
| accent-green | 9.30 | **60.8** | fluent/larger text |

APCA floors: Lc 90 preferred body · Lc 75 minimum body · Lc 60 larger · Lc 45 large/bold ·
Lc 30 non-text floor · Lc 15 invisible.

> WCAG 2 rates `text-muted` at 8.53:1, which looks excellent. APCA rates it Lc 56 — and it is
> being rendered at 9px. This gap is the single most misleading number in the old audit.

### 4.5 8-bit quantization

The warm tint is carried by a very small R−B spread. It survives as a flat fill but is fragile:

| token | sRGB 8-bit | R−B spread |
|---|---|---|
| surface-0 | `(12, 11, 8)` | 4 levels |
| surface-1 | `(21, 20, 16)` | 5 levels |
| surface-2 | `(32, 31, 27)` | 5 levels |
| surface-3 | `(47, 46, 41)` | 6 levels |
| border | `(57, 56, 50)` | 7 levels |

**Rule: no gradients across adjacent surface tokens.** They will band.

---

## 5. Decision log

| # | Decision | Rationale |
|---|---|---|
| DEC-1 | **Stay on UnoCSS.** Not Tailwind, not DaisyUI, not Radix. | Already installed, theme already mapped, 205 template classes work. Tailwind is the same vocabulary for a full re-map. DaisyUI is consumer-web-shaped components that would fight the OKLCH palette. Radix Primitives is React-only; the Angular analogue is Angular CDK, which is behaviour not styling — orthogonal, revisit for the palette dialog focus trap and the splitter. |
| DEC-2 | Token colours are stored as **channel triplets** in CSS vars, and registered in the UnoCSS theme as `oklch(var(--x-ch) / %alpha)`. | Empirically the only form satisfying all three constraints. A raw `var(--x)` theme colour **silently drops the alpha modifier** — `bg-x/80` emits `background-color: var(--x)` with no opacity. Verified by generating all three forms. |
| DEC-3 | Keep the current theme. Fix only values that are physically impossible. | User confirmed the palette. C1 is a correctness bug (requesting colours outside P3), not a taste change — and the fix is verified imperceptible. |
| DEC-4 | Judge contrast with **APCA**, not WCAG 2. | WCAG 2 systematically over-rates dark themes. See §4.4. |
| DEC-5 | Author in **OKLCH**, interpolate in **OKLab**. | OKLCH's hue is a meaningful authoring knob for constant-hue ramps. OKLab avoids hue-angle ambiguity, long-way-round rotation, and powerless-hue artifacts when chroma reaches 0. |
| DEC-6 | Do **not** target Rec2020. | ~1% more chroma than P3 at these hues. §4.1. |
| DEC-7 | Viewport recolour (C6) corrects **hue only**, preserving lightness. | The 3D scene needs its own value range to stay legible. Only the 190° hue opposition is the defect. |
| DEC-8 | **Type size does not affect canvas area.** Raising the UI scale is safe for the viewport. | The tiling split is ratio-driven, not content-driven: workspace-1 is `viewport: 4` against `side: 1`, so the viewport holds 80% of the width at any font size. Measured: Properties needs 192px @10px vs **202px @13px** (+10px), and the existing `min-w-[240px]` already exceeds both. Fits at every window width from 1280 up. |
| DEC-9 | Density is **per-panel via container queries**, not a flat compromise size. | A single 12px middle setting is cramped in a wide panel and still tight in a narrow one. `container-type: inline-size` lets each panel step down to the micro token below ~260px. Same mechanism resolves B6. |
| DEC-10 | Panels default to **open**, not collapsed. Add a maximise-pane toggle instead. | Collapsing solves "give me the canvas now"; it does nothing for density while panels are open, which is the normal state. A workbench that opens collapsed hides its own capability on first run. |
| DEC-11 | **Hold the type scale and palette tone at current values.** Proposal (11/13/16px, palette B) stays on file, unimplemented. | User decision. The non-appearance items in Phase 3 — mono stack (T4), weight/faux-bold (T5), font subsetting (T6), the 1200px discontinuity (T3) — are independent and remain available. |
| DEC-12 | ~~Stay on presetWind3~~ **Superseded by DEC-13.** | E3 and E4 were retested and both resolve. The original blockers do not hold. |
| DEC-13 | **Keep UnoCSS. Migrate `presetWind3` → `presetWind4`. Do not switch engines.** | The project is not on Tailwind — it is on UnoCSS with a Tailwind-v3-*compatible* preset, and that preset is the sole source of every legacy pattern in the output. Moving the preset fixes the legacy at its source while all 214 classes keep working. Tailwind v4 would produce equivalent output but costs a full theme re-map and a new Angular build integration for no gain, and forfeits UnoCSS's custom-preset capability. Dropping utilities entirely is unwarranted: E6 shows 104 of 214 classes are layout/spacing primitives that utilities express well, with only a 7% escape rate. |
| DEC-15 | **The design system page is a route in the app, not another artifact.** Sequenced *before* the mobile/responsive work. | A standalone artifact proves nothing about the real build and drifts from `uno.config.ts` silently. A page inside the app compiles through the real pipeline with the real tokens — change a token, the page changes. Sequencing it first matters because the mobile shell's defect is that it was built with no system to build *from*; fixing it in place would mean inventing the shared tokens while refactoring, shaping them around whatever the mobile shell happened to need. |
| DEC-18 | **Ship the neutral ramp (direction B).** Surfaces and text tokens are chroma 0; a single warm `brand` carries identity. | Chosen by eye against the live switcher. The warm ramp read as too orange/brown once its chroma was raised enough to be visible at all — which is the honest choice between "invisible tint" and "visibly brown". Text went neutral too: warm vs neutral text is APCA-identical (89.2 vs 88.7, 55.0 vs 55.1, 35.9 vs 35.9) and the R−B was only 7–8, so nothing was lost. |
| DEC-22 | Ship the **11 / 13 / 16px** scale with 13px as the UI default. | Recommended and not overruled. One value in `uno.config.ts` if 12px is preferred after living with it. The predicted trade-off held: zero vertical cost (rows were already sized for pointer targets), real horizontal cost in the log and properties panels, both of which already scrolled. |
| DEC-23 | The scale is enforced with a **blocklist**, not by replacing the theme. | UnoCSS deep-merges theme objects, so defining `theme.text` does not remove presetWind4's default ramp — `text-xs` still generated. `blocklist` is what actually makes a stray size produce nothing. |
| DEC-21 | Verification of narrow-viewport layout from this environment is **unreliable below 500px**. | Headless Chrome silently ignores `--window-size` below a floor: a `--window-size=390` capture is a 390px *crop of a 500px layout*. I mistook that for the mobile toolbar overflowing and "fixed" a bug that did not exist; an injected layout probe showed the real viewport was 500px with everything fitting. The change was reverted. Real sub-500px behaviour needs a device or a real browser. |
| DEC-20 | The Three.js layer reads tokens through `src/app/theme.ts` rather than importing colour constants. | Three cannot parse `oklch()` — its Color parser handles hex/rgb/hsl/named only. Tokens are read from the cascade, chroma-clamped to sRGB, and handed over as linear-sRGB, which is Three's own working space. The converter is a pure function with 12 tests pinning it against the documented hex values. |
| DEC-19 | P3 lift is a **uniform 15% chroma increase clamped per hue**, not a push to each ceiling. | Ceiling-pushing unbalances the set: green has far more P3 headroom than blue, so green would leap while blue barely moved. |
| DEC-17 | Palette candidates are **switchable on the design page**, not decided in a document. `?palette=a` makes a specific comparison linkable. | The page overrides both the channel var and the resolved var on the host — custom properties are substituted at computed-value time on the element that declares them, so overriding only `--surface-0-ch` would leave every `var(--surface-0)` consumer on the old colour. |
| DEC-16 | Wire it via **conditional bootstrap in `main.ts`**, not the router. | The router is provided but inert (`routes: []`, no outlet) and `AppComponent` *is* the 838-line workbench. A real route means restructuring into a shell component — genuine risk for no current benefit. Revisit if routing earns its keep. |
| DEC-14 | Longer term, **narrow the theme so the design system is the only vocabulary available** — rather than writing a bespoke preset. | Layered on top of wind4, not instead of it. Reimplementing flexbox/grid utilities by hand buys nothing; constraining the *colour and type* scales so `text-[10px]` becomes impossible is where the design-system value is. |

### Open questions

- **OQ-1** — `text-muted` is Lc 56 at 9px. Raise the token's lightness, raise the font sizes, or
  accept it for non-critical readouts? Blocks Phase 3.
- **OQ-2** — `opacity-75` / `opacity-70` on text: remove entirely and encode the dimming in the
  token, or keep as a state modifier? Removing takes `text-control` from Lc 23 to Lc 37 — still
  the disabled tier, so the token itself likely needs to move.
- **OQ-3** — Is 8–11px text a hard requirement of the density target, or an artifact of drift?
  APCA says nothing under 12px is conformant at any contrast.

---

## 6. CSS baseline (what we use)

Modern-only. No legacy fallbacks, no vendor prefixes where the standard property exists.

| Feature | Used for | Availability |
|---|---|---|
| `oklch()` | all colour tokens | Baseline 2023 |
| `@media (color-gamut: p3)` | wide-gamut accent lift | widely available |
| `color-mix(in oklab, …)` | *not yet used* — alpha now handled by UnoCSS `/80` modifiers | Baseline 2023 |
| relative colour `oklch(from … l c h)` | *not yet used* — candidate for derived hover/active states | Baseline 2024 |
| `@layer` | *available, not yet used* — candidate for Phase 1 cascade control | Baseline 2022 |
| `scrollbar-width` / `scrollbar-color` | **replaces** `::-webkit-scrollbar` | Baseline 2024 |
| `appearance` (unprefixed) | **replaces** `-webkit-appearance` | Baseline 2022 |
| `:is()` / `:where()` | specificity-flat grouping | Baseline 2021 |
| `light-dark()` | *not yet used* — future light theme, one line per token | Baseline 2024 |
| container queries | *not yet used* — **Phase 1 (B6)**, panels must respond to their own width | Baseline 2023 |
| `interpolate-size` / `calc-size()` | future height animations | not Baseline — do not ship |
| `contrast-color()` | — | Safari-only — do not ship |

**Explicitly removed as legacy:** `::ng-deep` (deprecated, and a no-op in global stylesheets),
`theme()` (Tailwind-only, unresolved here), `-webkit-appearance`, `-moz-appearance`,
`::-webkit-scrollbar-*` as the sole scrollbar mechanism.

---

## 7. Changes landed

### Phase 2 — colour token migration (CSS layer)

| File | Change |
|---|---|
| `uno.config.ts` | Palette rewritten as OKLCH **channel triplets** in `preflights`, emitted to `:root`. Theme colours registered as `oklch(var(--x-ch) / %alpha)` (DEC-2). Added `control` as a real theme colour (C4). P3 block clamped to true in-gamut values (C1). `color-scheme: dark` moved to `:root`. |
| `src/app/app.component.css` | Removed the `:host` token block, the P3 `:host` override, and ~90 hand-written shadow classes (C3). Removed the duplicated scrollbar block, checkbox accent, and `fadeIn` keyframe (D4). Dropped `-webkit-`/`-moz-appearance` for standard `appearance`. **6689 → 4005 bytes.** |
| `src/styles.css` | Removed all four `theme()` calls (D1), all four `::ng-deep` rules (D2), the `@unocss;` no-op (D3), and the hand-written `.text-control` (C4). Standard `scrollbar-width`/`scrollbar-color` replaces `::-webkit-scrollbar-*`. Added the `body` background that was previously only inside a dead rule. Added a `prefers-reduced-motion` guard on the palette animation. |
| `src/app/app.component.html`, `viewport.html` | `bg-surface-0-80` / `-60` → `bg-surface-0/80` / `/60`, 12 occurrences. Fixes the cross-component scope leak: the viewport's 9 HUD chips and 3 zoom buttons were rendering with **no background at all**. |
| `src/index.html`, `src/manifest.webmanifest` | `#1f1e1c` → `#0c0b08` in three places, matching the real `surface-0` (C5). |
| `src/uno.css` | Regenerated. 195 → 197 utilities; the 9 missing ones now exist (B2). |

### Verified after the change

- Production build clean. **The `app.component.css` budget warning is gone** — was
  *"not met by 1.51 kB with a total of 5.51 kB"*. Only the pre-existing three.js bundle
  warning remains.
- `vitest`: 5/5 passing. `biome check`: clean.
- Shipped CSS contains **zero** occurrences of `theme(`, `ng-deep`, `@unocss`,
  `webkit-scrollbar`, `webkit-appearance`, `moz-appearance` — all previously shipped dead.
- All 11 channel vars, all 11 resolved vars, and the P3 override are present in `:root`.
- Alpha modifiers generate correctly: `.bg-surface-0\/80 { background-color: oklch(var(--surface-0-ch) / .8) }`.

### Intended visible changes

Everything below is a bug fix, not a restyle. The palette itself is unchanged.

1. **Viewport HUD chips now have their background.** They were transparent over the 3D scene.
2. **Project/scene bar now has its 56px height**; the STATUS group right-aligns; the project
   name truncates; the creation-steps row has its top margin.
3. **Joint Angles sliders regain their `52px 1fr 44px` grid** (scene-2 properties panel).
4. **Global scrollbars are styled again** — previously only styled inside `app-root`.
5. On a **P3 display**, accents shift by deltaE-OK ≤ 0.008 (below the ~0.02 JND). On sRGB,
   nothing changes at all.

---

## Appendix A — reproducing the numbers

Gamut ceilings, gamut mapping, and APCA are computed with a script kept out of the repo.
The method, so any value here can be re-derived:

- **OKLCH → sRGB/P3/Rec2020**: CSS Color 4 matrices. OKLab→LMS′ (`M2⁻¹`), cube, LMS→XYZ D65,
  then the target primaries matrix.
- **Gamut ceiling**: binary search on chroma at fixed L and H until the linear RGB triple
  leaves `[0, 1]`.
- **Gamut mapping**: CSS Color 4 algorithm — binary-search chroma, accept when the
  clipped colour is within deltaE-OK 0.02 of the unclipped one.
- **deltaE-OK**: Euclidean distance in OKLab. JND ≈ 0.02.
- **APCA**: version 0.1.9 (W3C/SAPC). `Y = Σ(c/255)^2.4 · [0.2126729, 0.7151522, 0.0721750]`,
  black soft-clamp at 0.022 with exponent 1.414, reverse-polarity coefficients
  (`Ybg^0.65 − Ytxt^0.62`) × 1.14, offset 0.027, low clip 0.1.
- **Opacity compositing**: sRGB-encoded (non-linear) space, matching browser behaviour.
