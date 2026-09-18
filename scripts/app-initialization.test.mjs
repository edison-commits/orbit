import assert from 'node:assert/strict';
import test from 'node:test';

import { createAppInitializationController } from '../lib/appInitialization.ts';

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

function harness({ migration } = {}) {
  const calls = { configure: 0, migrate: 0, seed: 0, sync: 0 };
  let appRouteActive = false;
  const controller = createAppInitializationController({
    isAppRouteActive: () => appRouteActive,
    configure: () => { calls.configure += 1; },
    migrate: async () => {
      calls.migrate += 1;
      await migration?.promise;
    },
    seed: () => { calls.seed += 1; },
    syncNotifications: async () => { calls.sync += 1; },
  });
  return {
    calls,
    controller,
    setAppRouteActive: (active) => { appRouteActive = active; },
  };
}

test('public routes bypass app initialization', async () => {
  const { calls, controller, setAppRouteActive } = harness();

  setAppRouteActive(false);
  assert.equal(await controller.initialize(), 'deferred');
  assert.deepEqual(calls, { configure: 0, migrate: 0, seed: 0, sync: 0 });
});

test('repeated app initialization is single-flight and stays complete', async () => {
  const migration = deferred();
  const { calls, controller, setAppRouteActive } = harness({ migration });

  setAppRouteActive(true);
  const first = controller.initialize();
  const second = controller.initialize();
  assert.deepEqual(calls, { configure: 1, migrate: 1, seed: 0, sync: 0 });

  migration.resolve();
  assert.deepEqual(await Promise.all([first, second]), ['ready', 'ready']);
  assert.equal(await controller.initialize(), 'ready');
  assert.deepEqual(calls, { configure: 1, migrate: 1, seed: 1, sync: 1 });
});

test('navigation to public while migration is pending suppresses notification sync', async () => {
  const migration = deferred();
  const { calls, controller, setAppRouteActive } = harness({ migration });

  setAppRouteActive(true);
  const pending = controller.initialize();
  setAppRouteActive(false);
  migration.resolve();

  assert.equal(await pending, 'deferred');
  assert.deepEqual(calls, { configure: 1, migrate: 1, seed: 0, sync: 0 });

  setAppRouteActive(true);
  assert.equal(await controller.initialize(), 'ready');
  assert.deepEqual(calls, { configure: 1, migrate: 1, seed: 1, sync: 1 });
});

test('app-public-app transition while migration is pending still initializes once', async () => {
  const migration = deferred();
  const { calls, controller, setAppRouteActive } = harness({ migration });

  setAppRouteActive(true);
  const first = controller.initialize();
  setAppRouteActive(false);
  setAppRouteActive(true);
  const second = controller.initialize();
  migration.resolve();

  assert.deepEqual(await Promise.all([first, second]), ['ready', 'ready']);
  assert.deepEqual(calls, { configure: 1, migrate: 1, seed: 1, sync: 1 });
});
