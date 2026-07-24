# Future features — not scheduled, just tracked

Ideas raised during development that are worth doing later but weren't asked
for yet. Nothing here should be built without an explicit go-ahead.

## 1. Export comparison to Excel

Let the user download the current comparison (whichever rows are on screen
right now, in the current mode/filters/periods) as an `.xlsx` file.

- Purely client-side: the data driving the table is already fetched into the
  page (see `ComparisonGroupViewModel`/`ComparisonRowViewModel` in
  `compare-view.model.ts`), so this is a format-and-download step, not a new
  API call.
- A small library like `sheetjs`/`xlsx` (or `exceljs` if styling matters) can
  build the workbook in-browser; trigger via a Blob + `<a download>`.
- One sheet per group (category/company), or one flat sheet with a group
  column — worth deciding once we see real output.
- Columns: fund name, company/path (whichever is the secondary dimension),
  one column per selected period type, stale flag.
- Button placement: likely next to wherever the table/graph view toggle
  lands (see #2) — both are per-comparison actions, natural to group
  together.

## 2. Table view vs. graph view toggle — done

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

## 3. Persist dark/light choice across sessions

Already implemented — noting it here only so it doesn't get re-proposed.
`ThemeService` (`core/services/platform/theme.service.ts`) reads
`localStorage['gemel:theme']` on `init()` before falling back to
`matchMedia('(prefers-color-scheme: dark)')`, and `toggle()` persists back
to the same key. No further work needed unless testing turns up a bug.

## 4. Dropdown trigger shows selected items as chips, not text summary — done

Implemented: `MultiselectDropdown` now renders each selected option as a
chip in the trigger (`multiselect-dropdown.ts`/`.html`), width-measured via
a hidden mirror row + `afterRenderEffect` so the fitted count is correct
before first paint (no flash-then-collapse), with overflow collapsing into
a single `+N` chip styled identically to the rest. Kept here only as a
pointer in case the approach needs revisiting.

## 5. Sticky selection summary while scrolled

When the result list is long enough to scroll, the filters row (mode,
category, paths/companies, periods) scrolls out of view, so there's no
reminder of what's actually being compared while looking at rows further
down.

Idea: once the page is scrolled past the filters, show a slim sticky bar
at the top summarizing the current selection — mode (by path / by
company), selected category, a compact rendering of selected
paths/companies (probably needs the same "chips + overflow +N" treatment
as the dropdown trigger, see #4, just read-only), and selected periods.

Notes for later:
- Should be read-only display, not another set of controls — clicking it
  probably just scrolls back up to the real filters rather than trying to
  duplicate their interactivity.
- Only show/stick once scrolled past the real filters row (e.g. via
  `IntersectionObserver` on the filters block, same idea already used
  elsewhere in the app for measurement-driven behavior).
- Likely lives in `compare.html`, since it needs the shared
  `CompareSelectionFacade` state regardless of by-path/by-company mode.
