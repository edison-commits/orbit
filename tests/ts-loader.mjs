import path from 'node:path';
import { pathToFileURL } from 'node:url';

const projectRoot = path.resolve(import.meta.dirname, '..');

export async function resolve(specifier, context, nextResolve) {
  if (specifier === '@/lib/theme') {
    return {
      shortCircuit: true,
      url: pathToFileURL(path.join(projectRoot, 'tests/theme-shim.mjs')).href,
    };
  }

  if (specifier.startsWith('@/')) {
    return {
      shortCircuit: true,
      url: pathToFileURL(path.join(projectRoot, `${specifier.slice(2)}.ts`)).href,
    };
  }

  return nextResolve(specifier, context);
}
