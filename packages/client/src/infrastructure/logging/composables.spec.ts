import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useLogger } from './composables';
import { createComposableTestSuite } from '~/testing';

describe('useLogger', () => {
  const testSuite = createComposableTestSuite();

  beforeEach(() => {
    testSuite.setup();
  });

  afterEach(() => {
    testSuite.teardown();
  });

  it('should return the default logger', () => {
    testSuite.runWithContext(() => {
      const logger = useLogger();
      expect(logger).toBeDefined();
      expect(logger.debug).toBeTypeOf('function');
      expect(logger.info).toBeTypeOf('function');
      expect(logger.warn).toBeTypeOf('function');
      expect(logger.error).toBeTypeOf('function');
    });
  });
});
