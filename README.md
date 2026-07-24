# Gemel

Angular SPA that compares Israeli provident/pension fund (קופות גמל) yields — by
investment path (see every company's fund on a path like "S&P 500" or "Under 50") or by
company (see one company's yields across every path it offers). Talks to the
[`gemel-api`](../gemel-api) backend, which itself has no database of its own — it proxies
and aggregates live from data.gov.il.

Built on Angular 22: zoneless change detection, standalone components, signals-first
state, `httpResource()` for all reads (this app is entirely read-only — no mutations),
and a facade-per-feature-component pattern.

## Setup

```bash
npm install
```

`src/environments/environment.development.ts` points `ng serve` at
`http://127.0.0.1:8000/api/v1` by default — start `gemel-api` first (see its README) on
that port, or edit this file to match wherever it's actually running.

## Run

```bash
ng serve
```

Open `http://localhost:4200`. Pick "By investment path" or "By company", choose a path
or company, and a yield metric — the comparison table loads live from the backend, which
in turn is pulling straight from data.gov.il.

## Build / test

```bash
ng build
ng test        # unit tests (vitest)
npm run test:e2e   # end-to-end (Playwright) — see below
```

### End-to-end tests

`e2e/` holds a Playwright suite covering the interactive surface of the compare feature:
selection persistence across mode switches, the multiselect dropdowns (search, select-all,
chips), the period multiselect, the graph/table view toggle, the category picker, the
disclaimer modal, the theme toggle, and the loading-height-hold behavior.

These run against a real, live backend — nothing is mocked, since `gemel-api` itself has
no database to seed a fixture into (see the top of this file). Assertions therefore check
structure and behavior ("some item rendered", "the header shows a resolved month") rather
than exact numbers, since real yield data changes over time. Start `gemel-api` on
`:8000` first, then:

```bash
npm run test:e2e       # headless
npm run test:e2e:ui    # Playwright's interactive UI runner
```

By default this targets `http://localhost:4200` and will launch `ng serve` there itself if
nothing's listening yet (`reuseExistingServer` picks up an already-running one). If port
4200 is taken by something else on your machine, point it elsewhere:

```bash
E2E_PORT=4201 npm run test:e2e
```

## Deploy (Vercel)

The Vercel project is connected to this repo with `main` as the Production Branch — a
push to `main` auto-deploys to production, and a push to any other branch (e.g.
`develop`) auto-deploys as its own Preview URL. That's Vercel's native branch model, so
there's nothing extra to configure for the two environments themselves.

What *is* project-specific: `ng build`'s `production` configuration bakes `apiBaseUrl`
into the bundle at build time (see `src/environments/environment.ts`), and that file
defaults to a relative `/api/v1` path that only makes sense behind a reverse proxy —
which Vercel, a static host, doesn't provide. `npm run build:vercel` (the project's
Vercel Build Command, set in `vercel.json`) runs `scripts/write-prod-environment.mjs`
first, which overwrites `environment.ts` with whatever `API_BASE_URL` is set to for the
environment currently building.

So before the first deploy, set `API_BASE_URL` in the Vercel dashboard (Project →
Settings → Environment Variables), scoped separately per Environment — e.g. the
production API's URL for **Production**, and (if you're running a separate `gemel-api`
instance for testing) a different one for **Preview**. The build fails loudly if it's
unset, rather than silently shipping the local-dev relative path.

## Structure

- `core/` — enums, models, and `core/services/data/*` (the only place `httpResource()` /
  `HttpClient` are used, per convention).
- `features/compare/` — the whole product: `compare-by-path` and `compare-by-company`
  sub-components (each with its own facade owning that mode's filter state), and a shared
  `comparison-table` dumb component.

No admin/CRUD feature exists here on purpose — the backend persists nothing of its own,
so there's nothing to manage from this app. Taxonomy corrections (renaming/merging
investment-path labels) happen by editing `gemel-api/config/taxonomy_overrides.yaml`.
