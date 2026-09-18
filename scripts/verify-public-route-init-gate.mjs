#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const layoutPath = process.argv[2] ? resolve(process.argv[2]) : resolve(root, 'app/_layout.tsx');
const layout = readFileSync(layoutPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`public-route-init-gate: ${message}`);
    process.exitCode = 1;
  }
}

assert(/import\s*{[^}]*usePathname[^}]*}\s*from\s*['"]expo-router['"]/.test(layout), 'layout must read the active Expo Router pathname');

for (const route of ['/landing', '/privacy', '/support', '/contact']) {
  assert(layout.includes(`'${route}'`) || layout.includes(`"${route}"`), `public route ${route} must be explicitly allowlisted`);
}

assert(/const\s+isPublicRoute\s*=/.test(layout), 'layout must identify public routes');
assert(/useEffect\(\(\)\s*=>\s*{[\s\S]*?if\s*\(isPublicRoute\)\s*{?\s*return;?[\s\S]*?runMigrations\(\)/.test(layout), 'public routes must skip migrations and reminder startup');
assert(/},\s*\[isPublicRoute\]\s*\)/.test(layout), 'initialization must react when navigation crosses the public/app boundary');
assert(/if\s*\(!isPublicRoute\s*&&\s*initError\)/.test(layout), 'public routes must bypass the initialization error gate');
assert(/if\s*\(!isPublicRoute\s*&&\s*!isReady\)/.test(layout), 'public routes must bypass the initialization readiness gate');

if (process.exitCode) process.exit(process.exitCode);
console.log('public-route-init-gate: OK');
