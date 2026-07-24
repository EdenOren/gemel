// This file is overwritten at build time on Vercel by scripts/write-prod-environment.mjs
// (reads API_BASE_URL, set per-Environment in the Vercel dashboard) — the value below
// only applies to a plain local `ng build`, where it assumes the app is served behind a
// reverse proxy alongside gemel-api on the same origin.
export const environment = {
  production: true,
  apiBaseUrl: '/api/v1',
};
