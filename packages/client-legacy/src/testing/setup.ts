import { config } from '@vue/test-utils';

// Override console.warn to suppress Vue warnings during tests
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  const message = args.join(' ');

  // Suppress specific Vue warnings that are expected in tests
  if (message.includes('[Vue warn]: Cannot unmount an app that is not mounted')) {
    return;
  }

  if (message.includes('[Vue warn]: onUnmounted is called when there is no active component instance')) {
    return;
  }

  // For all other warnings, use the original warn function
  originalWarn.apply(console, args);
};

// Also configure Vue's global warning handler as a backup
config.global.config.warnHandler = (msg: string) => {
  // Suppress test-specific warnings
  if (msg.includes('Cannot unmount an app that is not mounted')) {
    return;
  }

  if (msg.includes('onUnmounted is called when there is no active component instance')) {
    return;
  }

  // For other warnings, use console.warn (which will go through our override)
  console.warn(`[Vue warn]: ${msg}`);
};
