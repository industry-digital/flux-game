import { createApp, type App } from 'vue';

/**
 * Creates a Vue app instance configured for testing
 *
 * This utility ensures all test apps have consistent configuration,
 * including warning suppression for common test-only warnings.
 */
export function createTestApp(rootComponent = {}): App {
  const app = createApp(rootComponent);

  // Configure warning handler to suppress test-specific warnings
  app.config.warnHandler = (msg: string) => {
    // Suppress unmount warnings that are common in tests
    if (msg.includes('Cannot unmount an app that is not mounted')) {
      return;
    }

    // Suppress lifecycle warnings for composables used outside components
    if (msg.includes('onUnmounted is called when there is no active component instance')) {
      return;
    }

    // For all other warnings, log them as usual
    console.warn(`[Vue warn]: ${msg}`);
  };

  return app;
}

/**
 * Test suite helper for composables that need Vue app context
 *
 * Provides consistent setup/teardown for Vue app instances in tests.
 */
export function createComposableTestSuite() {
  let app: App;

  const setup = () => {
    app = createTestApp();
  };

  const teardown = () => {
    if (app) {
      app.unmount();
    }
  };

  const runWithContext = <T>(fn: () => T): T => {
    return app.runWithContext(fn);
  };

  return {
    setup,
    teardown,
    runWithContext,
    get app() {
      return app;
    }
  };
}
