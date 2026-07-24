// Vercel-only prebuild step: overwrites src/environments/environment.ts with the
// API_BASE_URL configured for whichever Vercel Environment (Production/Preview) is
// building, since Angular's `production` configuration has no other way to vary a
// baked-in constant per deployment. Local `ng build`/`ng serve` never run this — they
// keep using the checked-in environment.ts / environment.development.ts as-is.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const apiBaseUrl = process.env.API_BASE_URL;
if (!apiBaseUrl) {
  console.error(
    'API_BASE_URL is not set. Add it in the Vercel project\'s Environment Variables ' +
      '(scoped per Environment — Production and Preview can point at different APIs) ' +
      'before building.',
  );
  process.exit(1);
}

const here = dirname(fileURLToPath(import.meta.url));
const target = resolve(here, '../src/environments/environment.ts');

writeFileSync(
  target,
  `export const environment = {\n  production: true,\n  apiBaseUrl: '${apiBaseUrl}',\n};\n`,
);

console.log(`wrote ${target} with apiBaseUrl=${apiBaseUrl}`);
