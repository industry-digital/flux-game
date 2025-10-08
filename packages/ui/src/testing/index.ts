import { createApp, type App } from 'vue';

/**
 * Simple test utilities for UI package
 *
 * Provides minimal testing setup without external dependencies.
 * Consumer projects can use their own testing frameworks.
 */

export interface TestContext {
  app: App;
  cleanup: () => void;
  isMounted: boolean;
}

export function createComposableTestSuite() {
  let testContext: TestContext | null = null;

  const setup = () => {
    // Create a minimal container element for mounting
    const container = document.createElement('div');
    document.body.appendChild(container);

    const app = createApp({
      template: '<div></div>' // Minimal template
    });

    // Mount the app to avoid "not mounted" warnings
    app.mount(container);

    testContext = {
      app,
      isMounted: true,
      cleanup: () => {
        if (testContext?.isMounted) {
          app.unmount();
          testContext.isMounted = false;
        }
        // Clean up the container
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      }
    };
  };

  const teardown = () => {
    if (testContext) {
      testContext.cleanup();
      testContext = null;
    }
  };

  const runWithContext = (fn: () => void) => {
    if (!testContext) {
      throw new Error('Test context not initialized. Call setup() first.');
    }

    // Provide app context for composables
    testContext.app.runWithContext(fn);
  };

  return {
    setup,
    teardown,
    runWithContext
  };
}
