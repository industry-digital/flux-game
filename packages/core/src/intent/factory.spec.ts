import { describe, it, expect, vi } from 'vitest';
import { createIntent } from './factory';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';

describe('Intent Factory', () => {
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';
  const SESSION_ID: SessionURN = 'flux:session:combat:test';

  describe('createIntent', () => {
    it('should create basic intent from text input', () => {
      const intent = createIntent({
        id: 'test-intent-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      expect(intent).toMatchObject({
        id: 'test-intent-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
        normalized: 'attack bob',
        verb: 'attack',
        tokens: ['bob'],
        uniques: new Set(['bob']),
      });
      expect(intent.ts).toBeTypeOf('number');
      expect(intent.session).toBeUndefined();
    });

    it('should include session ID when provided', () => {
      const intent = createIntent({
        id: 'test-intent-2',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: 'advance 10',
      });

      expect(intent.session).toBe(SESSION_ID);
      expect(intent.verb).toBe('advance');
      expect(intent.tokens).toEqual(['10']);
    });

    it('should normalize text and extract tokens correctly', () => {
      const intent = createIntent({
        id: 'test-intent-3',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '  ATTACK   Bob   WITH   SWORD  ',
      });

      expect(intent.normalized).toBe('attack   bob   with   sword');
      expect(intent.verb).toBe('attack');
      expect(intent.tokens).toEqual(['bob', 'with', 'sword']);
      expect(intent.uniques).toEqual(new Set(['bob', 'with', 'sword']));
    });

    it('should filter out short tokens', () => {
      const intent = createIntent({
        id: 'test-intent-4',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'go to a big room',
      });

      // 'a' should be filtered out (length < 2), but 'to' has length 2 so it stays
      expect(intent.tokens).toEqual(['to', 'big', 'room']);
      expect(intent.uniques).toEqual(new Set(['to', 'big', 'room']));
    });

    it('should handle empty text gracefully', () => {
      const intent = createIntent({
        id: 'test-intent-5',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '   ',
      });

      expect(intent.normalized).toBe('');
      expect(intent.verb).toBeUndefined();
      expect(intent.tokens).toEqual([]);
      expect(intent.uniques).toEqual(new Set());
    });

    it('should use provided dependencies', () => {
      const mockTimestamp = vi.fn(() => 12345);
      const mockUniqid = vi.fn(() => 'mock-id');

      const intent = createIntent(
        {
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: 'test command',
        },
        {
          timestamp: mockTimestamp,
          uniqid: mockUniqid,
        }
      );

      expect(mockTimestamp).toHaveBeenCalled();
      expect(mockUniqid).toHaveBeenCalled();
      expect(intent.id).toBe('mock-id');
      expect(intent.ts).toBe(12345);
    });

    it('should use default dependencies when not provided', () => {
      const intent = createIntent({
        id: 'explicit-id',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'test command',
      });

      // Should use explicit ID, not generate one
      expect(intent.id).toBe('explicit-id');
      // Should generate timestamp
      expect(intent.ts).toBeTypeOf('number');
      expect(intent.ts).toBeGreaterThan(0);
    });
  });

  describe('session threading', () => {
    it('should preserve session ID through intent creation', () => {
      const combatSessionId: SessionURN = 'flux:session:combat:simulator';

      const intent = createIntent({
        id: 'combat-intent',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: combatSessionId,
        text: 'advance 15',
      });

      expect(intent.session).toBe(combatSessionId);
      expect(intent.verb).toBe('advance');
      expect(intent.tokens).toEqual(['15']);
    });

    it('should handle different session types', () => {
      const workbenchSessionId: SessionURN = 'flux:session:workbench:test';

      const intent = createIntent({
        id: 'workbench-intent',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: workbenchSessionId,
        text: 'use workbench',
      });

      expect(intent.session).toBe(workbenchSessionId);
    });
  });
});
