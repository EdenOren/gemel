# Future features — not scheduled, just tracked

Ideas raised during development that are worth doing later but weren't asked
for yet. Nothing here should be built without an explicit go-ahead.

## 1. Table view vs. graph view toggle — done

Implemented: a new `ComparisonTable` component (dense table, one row per
fund, one column per selected period type) alongside the existing
`ComparisonBed` graph. Both read the same `ComparisonGroupViewModel[]` via
a shared `buildRenderedGroups()` util (`utils/rendered-comparison.util.ts`)
extracted out of `comparison-bed.ts` so sort order / "no data" bucketing /
period labels can't drift between the two views. A small icon toggle
(`compare.html`, `.compare__view-toggle`) sits flex-end between the filter
row and the results, backed by `CompareSelectionFacade.viewMode` (new
`ViewMode` enum) so the choice is shared across by-path/by-company mode
switches the same way category/paths/companies/periods already are.
Not persisted to localStorage — kept in-memory only per session, since
that wasn't asked for.

While verifying this, found and fixed an unrelated bug it happened to
surface: `CompareSelectionFacade.companies`/`.paths` read `resource.value()`
directly, which re-throws if the resource is in an error state — an
errored companies fetch was crashing the whole reactive graph (including
the unrelated paths dropdown) instead of just leaving companies empty.
Now guarded via `.error()` before reading `.value()`.

## 2. Persist dark/light choice across sessions

Already implemented — noting it here only so it doesn't get re-proposed.
`ThemeService` (`core/services/platform/theme.service.ts`) reads
`localStorage['gemel:theme']` on `init()` before falling back to
`matchMedia('(prefers-color-scheme: dark)')`, and `toggle()` persists back
to the same key. No further work needed unless testing turns up a bug.

## 3. Dropdown trigger shows selected items as chips, not text summary — done

Implemented: `MultiselectDropdown` now renders each selected option as a
chip in the trigger (`multiselect-dropdown.ts`/`.html`), width-measured via
a hidden mirror row + `afterRenderEffect` so the fitted count is correct
before first paint (no flash-then-collapse), with overflow collapsing into
a single `+N` chip styled identically to the rest. Kept here only as a
pointer in case the approach needs revisiting.

## 4. Sticky selection summary while scrolled + scroll-to-top button — done

Implemented. Once the filter controls scroll out of view, a slim fixed bar
slides in at the top summarizing the current comparison (mode, category,
selected paths/companies as chips with a `+N` overflow, selected periods),
and a round scroll-to-top button appears at the bottom inline-end corner.
Both are read-only; clicking either scrolls back to the top.

- Shared visibility signal `Compare.scrolledPastFilters`, set from a single
  `IntersectionObserver` (in a constructor `effect()` with
  `onCleanup(() => observer.disconnect())`) watching a new
  `.compare__filters-region` wrapper (`compare.html`) around the category
  picker / period switch / dropdowns. Zoneless — the signal write is the CD
  trigger, same pattern as the `ResizeObserver` in `multiselect-dropdown.ts`.
  Both the bar and the button live in `compare.html` under one
  `@if (scrolledPastFilters())`, not in global `app.html`, since compare is
  the only route (see the earlier rationale — promote to a service only if a
  second scrollable route appears).
- New dumb `SelectionSummaryBar`
  (`features/compare/components/selection-summary-bar/`), takes plain-string
  inputs resolved by computeds in `compare.ts` (`modeLabel`, `categoryLabel`,
  `summaryItemLabels`, `periodLabels`) — no facade changes. Went with the
  count-summary option (first 2 chips + `+N`, CSS ellipsis), not the
  dropdown's pixel-measured chip fitting, which exists to avoid mid-click
  reflow that doesn't apply to a read-only bar.
- Stacking: bar at `z-index: 25` (over the brand header it replaces, under
  the `z-index: 30` theme toggle), with inline-end padding reserved so the
  toggle stays clickable. Enter animations on both, disabled under
  `prefers-reduced-motion`; the scroll itself is `'auto'` vs `'smooth'` by
  the same media check `onModeChange` uses. Periods pills drop out below
  `$breakpoint-sm`.
- Tests: `e2e/sticky-summary.spec.ts` (live backend, structural assertions
  per the README) — bar/button absent at top, both appear after scrolling
  with the bar showing the mode label + item chips, and clicking either the
  button or the bar returns to the top and removes them. No unit spec was
  added: the label-resolution computeds live on `Compare`, which pulls in the
  whole httpResource data layer, and the repo has no mock/fixture harness for
  that (only the trivial `app.spec.ts`); the e2e already exercises the same
  resolution against real data, matching the README's "no database to seed"
  testing stance.

## 5. Sticky bar refinements — arrow out, theme toggle in, logo stays in corner — done

Implemented as planned below. One addition beyond the plan: a
`.compare__header--scrolled` class (bound to `scrolledPastFilters()` in
`compare.html`) hides the tagline subtitle while scrolled, so the logo floats
over the thin bar as a compact wordmark rather than a two-line block. The
bar's inline-start reserve is a commented `148px` (following the existing
`76px` fixed-header precedent in `compare.scss`). Everything below matches
what shipped.

Decision taken: the brand logo **stays pinned in its corner** (persistent,
floating above the bar), not moved into the bar.

### Remove the arrow, keep click-to-top

- Delete the `&__arrow` SVG from `selection-summary-bar.html` and its scss.
  The whole-bar "click scrolls back to the top" behavior stays.
- Consequence: the bar can no longer be a single `<button>` wrapping
  everything, because the theme toggle (a `<button>`) now lives inside it and
  nested interactive controls are invalid HTML. Restructure so `:host` is the
  fixed flex container, with the summary content as its own
  `<button class="selection-summary-bar__summary" (click)="activate.emit()">`
  (flex: 1) and the toggle as a sibling at the inline-end. Clicking the
  summary scrolls up; clicking the toggle only toggles the theme — which is
  the behavior you'd want anyway.

### Theme toggle into the bar

The toggle is currently always-on global chrome in `app.html`/`app.scss`
(fixed top inline-end, `z-index: 30`). Its markup + `ThemeService` wiring
needs to appear in the bar's inline-end slot when scrolled, and in the corner
when not — without duplicating the sun/moon SVGs.

- **Extract a `ThemeToggle` component**
  (`shared/components/theme-toggle/`): injects `ThemeService`, owns the
  `isDark` read, the `toggle()` call, both SVGs, and the aria-label swap
  (`'עבור למצב בהיר'` / `'עבור למצב כהה'`) — all lifted verbatim out of
  `app.ts`/`app.html`. Keep the class `app-theme-toggle` on the corner
  instance so `e2e/theme-toggle.spec.ts` (which selects `.app-theme-toggle`)
  keeps passing without edits.
- **Remove it from `app.html`.** As with the scroll-top button (item #4),
  this moves a nominally-global control into the compare route; compare is
  the app's only route, so that's consistent — promote to a shared shell
  concern only if a second route ever appears.
- **Render it from `compare.html` in two mutually-exclusive spots**, both
  driven by the existing `scrolledPastFilters()` signal:
  - not scrolled → `@if (!scrolledPastFilters())`, fixed corner, unchanged
    `.app-theme-toggle` styling (top inline-end, z-30).
  - scrolled → projected into the bar's inline-end. Prefer content
    projection so `SelectionSummaryBar` stays a dumb, string-only component:
    the bar exposes an inline-end `<ng-content select="[bar-end]">`, and
    `compare.html` passes `<app-theme-toggle bar-end />` into it. The bar
    never learns about theming.
  - In-bar, the toggle drops its floating chrome (own surface/shadow/round
    fixed positioning) and sits inline as a flat icon button, taking the slot
    the arrow used to occupy.

### Logo — revised: moved into the bar

Originally shipped with the logo kept floating in its corner over the bar
(the "keep in corner" choice). In practice that read as a separate mark
pasted on top of the bar rather than part of it, so it was moved **into** the
bar:

- The corner brand header (`.compare__header`) and corner theme toggle are
  now both wrapped in `@if (!scrolledPastFilters())` in `compare.html` — they
  belong to the un-scrolled top only. Its `z-index` reverted to the original
  `20` (no longer needs to sit above the bar, since the two never coexist).
- `SelectionSummaryBar` carries its own compact logo at the inline-start: a
  20px favicon + the "מדד גמל" wordmark (`font-size-sm`, weight 800, matching
  the bar's own text scale), sat inside the summary button so clicking it
  still scrolls back to top. The wordmark hides below `$breakpoint-sm`,
  leaving just the icon.
- The bar's inline-start padding reservation is gone (the logo is a real
  inline child now, not a floating element to clear); the bar is back to a
  symmetric `padding-inline`.

### Testing

- `e2e/theme-toggle.spec.ts`: existing corner-toggle tests keep passing via
  the retained `.app-theme-toggle` selector (that instance still renders at
  the un-scrolled top).
- `e2e/sticky-summary.spec.ts`: after scrolling — corner toggle gone and the
  in-bar `.theme-toggle--bar` flips the theme; corner header gone and the
  bar's own `.selection-summary-bar__logo` is visible; no arrow; clicking the
  summary region (not the toggle) returns to top. Each scroll-dependent test
  self-skips when the run's live data was too short to overflow the viewport.

Out of scope: everything from #4's out-of-scope list still holds.
