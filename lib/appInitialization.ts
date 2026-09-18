export type AppInitializationResult = 'ready' | 'deferred';

type AppInitializationDependencies = {
  isAppRouteActive: () => boolean;
  configure: () => void;
  migrate: () => Promise<void>;
  seed?: () => void;
  syncNotifications: () => Promise<unknown>;
  onSeedError?: (error: unknown) => void;
  onSyncError?: (error: unknown) => void;
};

export function createAppInitializationController({
  isAppRouteActive,
  configure,
  migrate,
  seed,
  syncNotifications,
  onSeedError,
  onSyncError,
}: AppInitializationDependencies) {
  let configured = false;
  let migrationPromise: Promise<void> | null = null;
  let seeded = false;
  let syncPromise: Promise<void> | null = null;
  let ready = false;

  async function initialize(): Promise<AppInitializationResult> {
    if (ready) return 'ready';
    if (!isAppRouteActive()) return 'deferred';

    if (!configured) {
      configure();
      configured = true;
    }

    migrationPromise ??= migrate();
    await migrationPromise;

    if (!isAppRouteActive()) return 'deferred';

    if (!seeded) {
      seeded = true;
      try {
        seed?.();
      } catch (error) {
        onSeedError?.(error);
      }
    }

    if (!isAppRouteActive()) return 'deferred';

    syncPromise ??= (async () => {
      try {
        await syncNotifications();
      } catch (error) {
        onSyncError?.(error);
      }
    })();
    await syncPromise;
    ready = true;
    return 'ready';
  }

  return { initialize };
}
