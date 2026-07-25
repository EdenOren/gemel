<div align="center">

# Gemel (גמל)

**Compare Israeli provident/pension fund yields, live.**

[![Angular](https://img.shields.io/badge/Angular-22-DD0031?style=flat-square&logo=angular&logoColor=white)](https://angular.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![RxJS](https://img.shields.io/badge/RxJS-7.8-B7178C?style=flat-square&logo=reactivex&logoColor=white)](https://rxjs.dev)
[![Playwright](https://img.shields.io/badge/E2E-Playwright-2EAD33?style=flat-square&logo=playwright&logoColor=white)](https://playwright.dev)
[![Vitest](https://img.shields.io/badge/Unit-Vitest-6E9F18?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev)
[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=flat-square&logo=vercel)](https://gemel-gold.vercel.app/)

**[Production](https://gemel-gold.vercel.app/)** · **[Development](https://gemel-d3jyr1dv6-edenoren-gmailcoms-projects.vercel.app/)**

</div>

---

Angular SPA that compares קופות גמל yields either **by investment path** (every
company's fund on a path like "S&P 500") or **by company** (one company's yields across
every path it offers). Zero backend of its own to worry about — data streams live from
[data.gov.il](https://data.gov.il) via the [`gemel-api`](https://github.com/EdenOren/gemel-api)
service.

## Highlights

- ⚡ **Zoneless Angular 22** — signals-first state, standalone components, no `NgModule`
- 🔌 **`httpResource()`-only data layer** — no manual subscriptions, fully read-only app
- 🧩 **Facade-per-feature** architecture keeping components thin and testable
- 📊 Table/graph toggle, searchable multiselects, category picker, light/dark theme
- ✅ Unit tests (Vitest) + a full Playwright E2E suite run against the live backend

## Tech stack

| Layer | Tools |
| --- | --- |
| Framework | Angular 22 (zoneless, standalone, signals) |
| Language | TypeScript |
| Data fetching | `httpResource()` / RxJS |
| Testing | Vitest (unit), Playwright (E2E) |
| Hosting | Vercel |

## Quick start

```bash
npm install
ng serve          # http://localhost:4200 — expects gemel-api on :8000
```

```bash
ng test           # unit tests
npm run test:e2e  # Playwright E2E, against a live gemel-api
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

`gemel-api`'s `GEMEL_CORS_ORIGINS` needs the resulting domain(s) added too — the stable
per-branch alias (`Deployments → a develop deployment → assigned domains`), not the
random per-deployment URL, since a new one is minted on every push to that branch.

## Structure

- `core/` — enums, models, and `core/services/data/*` (the only place `httpResource()` /
  `HttpClient` are used, per convention).
- `features/compare/` — the whole product: `compare-by-path` and `compare-by-company`
  sub-components (each with its own facade owning that mode's filter state), and a shared
  `comparison-table` dumb component.

No admin/CRUD feature exists here on purpose — the backend persists nothing of its own,
so there's nothing to manage from this app. Taxonomy corrections (renaming/merging
investment-path labels) happen by editing `gemel-api/config/taxonomy_overrides.yaml`.
