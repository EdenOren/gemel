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

Deploys to Vercel from `main` (production) and any other branch (preview), with
`API_BASE_URL` injected per-environment at build time — see `scripts/write-prod-environment.mjs`.

## Related

- [`gemel-api`](https://github.com/EdenOren/gemel-api) — the FastAPI backend this app talks to.
