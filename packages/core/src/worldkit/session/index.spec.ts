import { describe, it, expect } from 'vitest';
import { createSessionId, parseSessionStrategyFromUrn } from './index';
import { SessionStrategy } from '~/types/session';
import { SessionURN } from '~/types/taxonomy';

describe('Session ID utilities', () => {
  describe('createSessionId', () => {
    it('should create workbench session ID with default key', () => {
      const sessionId = createSessionId(SessionStrategy.WORKBENCH);

      expect(sessionId).toMatch(/^flux:session:workbench:[A-Za-z0-9]+$/);
    });

    it('should create combat session ID with default key', () => {
      const sessionId = createSessionId(SessionStrategy.COMBAT);

      expect(sessionId).toMatch(/^flux:session:combat:[A-Za-z0-9]+$/);
    });

    it('should create session ID with custom key', () => {
      const customKey = 'test-key-123';
      const sessionId = createSessionId(SessionStrategy.WORKBENCH, customKey);

      expect(sessionId).toBe('flux:session:workbench:test-key-123');
    });
  });

  describe('parseSessionStrategyFromUrn', () => {
    describe('valid session URNs', () => {
      it('should parse workbench strategy', () => {
        const sessionId = 'flux:session:workbench:abc123' as SessionURN;
        const strategy = parseSessionStrategyFromUrn(sessionId);

        expect(strategy).toBe(SessionStrategy.WORKBENCH);
      });

      it('should parse combat strategy', () => {
        const sessionId = 'flux:session:combat:xyz789' as SessionURN;
        const strategy = parseSessionStrategyFromUrn(sessionId);

        expect(strategy).toBe(SessionStrategy.COMBAT);
      });

      it('should parse strategy with long key', () => {
        const sessionId = 'flux:session:workbench:very-long-session-key-with-many-characters' as SessionURN;
        const strategy = parseSessionStrategyFromUrn(sessionId);

        expect(strategy).toBe(SessionStrategy.WORKBENCH);
      });

      it('should parse strategy with short key', () => {
        const sessionId = 'flux:session:combat:x' as SessionURN;
        const strategy = parseSessionStrategyFromUrn(sessionId);

        expect(strategy).toBe(SessionStrategy.COMBAT);
      });

      it('should parse strategy with key containing colons', () => {
        const sessionId = 'flux:session:workbench:key:with:colons' as SessionURN;
        const strategy = parseSessionStrategyFromUrn(sessionId);

        expect(strategy).toBe(SessionStrategy.WORKBENCH);
      });
    });

    describe('edge cases', () => {
      it('should parse strategy without key (no trailing colon)', () => {
        const sessionId = 'flux:session:combat' as SessionURN;
        const strategy = parseSessionStrategyFromUrn(sessionId);

        expect(strategy).toBe(SessionStrategy.COMBAT);
      });

      it('should parse strategy with empty key', () => {
        const sessionId = 'flux:session:workbench:' as SessionURN;
        const strategy = parseSessionStrategyFromUrn(sessionId);

        expect(strategy).toBe(SessionStrategy.WORKBENCH);
      });
    });

    describe('round-trip consistency', () => {
      it('should maintain consistency between create and parse for workbench', () => {
        const originalStrategy = SessionStrategy.WORKBENCH;
        const sessionId = createSessionId(originalStrategy, 'test-key');
        const parsedStrategy = parseSessionStrategyFromUrn(sessionId);

        expect(parsedStrategy).toBe(originalStrategy);
      });

      it('should maintain consistency between create and parse for combat', () => {
        const originalStrategy = SessionStrategy.COMBAT;
        const sessionId = createSessionId(originalStrategy, 'test-key');
        const parsedStrategy = parseSessionStrategyFromUrn(sessionId);

        expect(parsedStrategy).toBe(originalStrategy);
      });

      it('should maintain consistency with generated keys', () => {
        const strategies = [SessionStrategy.WORKBENCH, SessionStrategy.COMBAT];

        for (const strategy of strategies) {
          const sessionId = createSessionId(strategy);
          const parsedStrategy = parseSessionStrategyFromUrn(sessionId);

          expect(parsedStrategy).toBe(strategy);
        }
      });
    });

    describe('performance characteristics', () => {
      it('should handle many session IDs efficiently', () => {
        const sessionIds = [
          'flux:session:workbench:key1',
          'flux:session:combat:key2',
          'flux:session:workbench:very-long-key-with-many-characters',
          'flux:session:combat:short',
          'flux:session:workbench:key:with:colons:in:it',
        ] as SessionURN[];

        const expectedStrategies = [
          SessionStrategy.WORKBENCH,
          SessionStrategy.COMBAT,
          SessionStrategy.WORKBENCH,
          SessionStrategy.COMBAT,
          SessionStrategy.WORKBENCH,
        ];

        // Test that all parse correctly
        for (let i = 0; i < sessionIds.length; i++) {
          const strategy = parseSessionStrategyFromUrn(sessionIds[i]);
          expect(strategy).toBe(expectedStrategies[i]);
        }
      });
    });
  });
});
