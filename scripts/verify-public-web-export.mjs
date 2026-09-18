#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const exportDir = resolve(process.argv[2] ?? '/tmp/orbit-export-web');

function fail(message) {
  console.error(`public-web-export: ${message}`);
  process.exitCode = 1;
}

if (!existsSync(resolve(exportDir, 'index.html'))) {
  fail(`${exportDir} does not contain index.html`);
} else {
  const textFiles = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir)) {
      const path = resolve(dir, entry);
      const stat = statSync(path);
      if (stat.isDirectory()) visit(path);
      else if (/\.(?:html|js|json|map)$/.test(entry)) textFiles.push(path);
    }
  };
  visit(exportDir);
  const exportedText = textFiles.map((path) => readFileSync(path, 'utf8')).join('\n');

  const routeMarkers = new Map([
    ['/landing', 'Keep your people in orbit.'],
    ['/privacy', 'Orbit privacy'],
    ['/support', 'Orbit support'],
    ['/contact', 'Talk with the Orbit team'],
  ]);

  for (const [route, marker] of routeMarkers) {
    if (!exportedText.includes(marker)) fail(`${route} screen marker is missing from the Expo Router web export`);
  }
}

if (process.exitCode) process.exit(process.exitCode);
console.log('public-web-export: OK');
