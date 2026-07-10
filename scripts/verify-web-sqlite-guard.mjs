#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const dbClientPath = process.argv[2] ? resolve(process.argv[2]) : resolve(root, 'db/client.ts');
const layoutPath = process.argv[3] ? resolve(process.argv[3]) : resolve(root, 'app/_layout.tsx');

const dbClient = readFileSync(dbClientPath, 'utf8');
const layout = readFileSync(layoutPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    console.error(`web-sqlite-guard: ${message}`);
    process.exitCode = 1;
  }
}

const topLevelOpenPattern = /(?:^|\n)\s*(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*SQLite\.openDatabaseSync\(/;
const lazyOpenPattern = /export\s+function\s+getDb\s*\([^)]*\)\s*{[\s\S]*SQLite\.openDatabaseSync\(/;
const webGuardPattern = /Platform\.OS\s*===\s*['"]web['"][\s\S]*Orbit SQLite storage is not available in web preview/;
const fallbackCopyPattern = /Web preview: database not available\. Test on iOS\/Android for full experience\./;

assert(!topLevelOpenPattern.test(dbClient), `${dbClientPath} must not call SQLite.openDatabaseSync at module scope`);
assert(lazyOpenPattern.test(dbClient), `${dbClientPath} should lazy-open SQLite inside getDb()`);
assert(webGuardPattern.test(dbClient), `${dbClientPath} should throw a deliberate web unsupported-storage error before opening SQLite`);
assert(fallbackCopyPattern.test(layout), `${layoutPath} should render the explicit web database fallback copy`);

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log('web-sqlite-guard: OK');
