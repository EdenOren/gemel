# Shared comparison cache — avoid refetching on mode switch

## Problem

`CompareByPath` and `CompareByCompany` are two separate components swapped by the
`@switch` in `compare.html`. Angular destroys one and creates the other on every tab
click. Each has its own facade (`CompareByPathFacade` / `CompareByCompanyFacade`) that
independently calls `ComparisonService.byPathGroups()` / `byCompanyGroups()` the moment
it's constructed, using whatever `selectedPathIds` / `selectedCompanyIds` /
`selectedPeriodTypes` are currently on the shared `CompareSelectionFacade`.

Since category/paths/companies/periods are already shared across both modes (see
`compare-selection.facade.ts`), switching modes very often re-describes almost the same
comparison, just grouped differently — but today it always triggers a fresh round of
HTTP requests, because neither facade knows the other one already has usable data.

## Why the data actually overlaps

- `/compare/by-path/{pathId}` rows already carry `company_legal_id` / `company_name`
  per fund.
- `/compare/by-company/{companyId}` rows already carry `path_id` / `path_label`
  per fund.

So a by-path fetch for a given path effectively contains every company's data for that
path, and a by-company fetch for a given company contains every path's data for that
company. Today both endpoints are called *pre-filtered* (`company_ids=` / `path_ids=`
querystring) to the other dimension's current selection — which is exactly what breaks
reuse, because a fetch made under one filter combination isn't valid for another.

## Core assumption

Yield data is immutable for the lifetime of a session — data.gov.il is refreshed
out-of-band (monthly reports), never live, and this app has no write path of its own.
So a value fetched once is valid **for the rest of the session, full stop**: once
every id×periodType the current selection needs has been loaded, switching modes,
re-selecting a previously-picked path/company, or toggling a filter back and forth
should never cause another network call. There is no staleness case to design for.

## Design

### 1. Stop filtering server-side; filter client-side instead

Fetch each selected path with **no** `company_ids` filter (all companies for that
path), and each selected company with **no** `path_ids` filter (all paths for that
company). Apply the secondary-dimension filter (`selectedCompanyIds` while in path
mode, `selectedPathIds` while in company mode) on the client, on the already-fetched
rows.

Immediate win, independent of mode switching: today, changing the secondary filter
dropdown re-fetches from the API. `MultiselectDropdown` already defers its
`selectionChange` emit until the menu closes, so this pairs naturally — closing the
filter dropdown would become an instant client-side re-render, not a network round trip.

### 2. Cache raw rows per (dimension, id, periodType)

New root-provided service, `ComparisonCacheService` (or folded into the existing
`ComparisonService`):

```ts
type CacheKey = `path:${string}:${PeriodType}` | `company:${number}:${PeriodType}`;

interface CachedFundRow {
  fundId: number;
  fundName: string;
  pathId: string;
  pathLabel: string;
  companyId: number;
  companyName: string;
  value: number | null;
  valuePeriod: number | null;
  isStale: boolean;
}
```

- `getPathRows(pathId, periodType)` — cache hit → `of(rows)`; miss → fetch
  `/compare/by-path/{pathId}?period_type=X`, normalize, cache, return.
- `getCompanyRows(companyId, periodType)` — mirror, via `/compare/by-company/{id}`.
- Cache is a simple in-memory `Map`, unbounded, never evicted or expired — permanent
  for the session per the assumption above. Cleared only by a full page reload.
- **In-flight request dedup**: cache the pending `Observable` itself (via `shareReplay`
  or an equivalent), not just the resolved rows. If `getPathRows(x, y)` is called again
  while the first request for `x,y` is still in flight (e.g. two paths' fetches kick off
  in the same `forkJoin` and happen to both need the same id — or the user flips modes
  again before the first load finished), the second caller gets the same in-flight
  request instead of firing a duplicate.

### 3. Cross-mode derivation

Before fetching for the *current* mode, check whether the *other* dimension's cache
already has full coverage:

- Entering by-company mode: if every id in `selectedPathIds` has a cached
  `path:{id}:{periodType}` entry for every selected period type, derive the by-company
  groups by pooling those cached rows, filtering to `selectedCompanyIds`, and grouping
  by `companyId` — **no HTTP call**.
- Entering by-path mode: mirror, using `company:{id}:{periodType}` cache coverage.
- On a cache miss (partial or no coverage), fall back to today's behavior — fetch
  whatever's missing per id. No regression versus the current implementation, just an
  added fast path for the common case (both dimensions already populated, e.g. the
  scenario that prompted this).

`byPathGroups()` / `byCompanyGroups()` keep their existing signatures; the derive-vs-fetch
decision is internal to `ComparisonService`, so facades and components don't change.

## Open question to verify before building

Fetching a path with **no** company filter returns *all* companies' funds for that
path — need to sanity-check response size stays reasonable for the biggest categories
(the "עוד" overflow category had ~40 paths in one category earlier this session, so a
single path's full company list should be checked, not assumed small).

## Files touched

- New: `src/app/core/services/data/comparison-cache.service.ts`
- Modify: `src/app/core/services/data/comparison.service.ts` — route through the cache
  before hitting HTTP, populate it on fetch, apply client-side secondary-filter.
- No changes to facades, components, or templates.

## Out of scope for this pass

- Cross-session persistence (localStorage/etc.) — in-memory only, matches the app's
  existing no-DB, session-only architecture. Nothing to invalidate, so nothing to design
  there either.
