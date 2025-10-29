import { describe, it, expect, vi } from 'vitest';
import { createIntent } from './factory';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';

describe('Intent Factory', () => {
  const ACTOR_ID: ActorURN = 'flux:actor:alice';
  const PLACE_ID: PlaceURN = 'flux:place:arena';
  const SESSION_ID: SessionURN = 'flux:session:combat';

  describe('createIntent', () => {
    it('should create basic intent from text input', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      expect(intent).toMatchObject({
        id: expect.any(String),
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
        normalized: 'attack bob',
        prefix: 'attack',
        tokens: ['bob'],
        uniques: new Set(['bob']),
      });

      expect(intent.ts).toBeTypeOf('number');
      expect(intent.session).toBeUndefined();
    });

    it('should include session ID when provided', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: 'advance 10',
      });

      expect(intent.session).toBe(SESSION_ID);
      expect(intent.prefix).toBe('advance');
      expect(intent.tokens).toEqual(['10']);
    });

    it('should normalize text and extract tokens correctly', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '  ATTACK   Bob   WITH   SWORD  ',
      });

      expect(intent.normalized).toBe('attack   bob   with   sword');
      expect(intent.prefix).toBe('attack');
      expect(intent.tokens).toEqual(['bob', 'with', 'sword']);
      expect(intent.uniques).toEqual(new Set(['bob', 'with', 'sword']));
    });

    it('should filter out short tokens', () => {
      const intent = createIntent({
        id: 'testintent4',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'go to a big room',
      });

      // 'a' should be filtered out (length < 2), but 'to' has length 2 so it stays
      expect(intent.tokens).toEqual(['to', 'big', 'room']);
      expect(intent.uniques).toEqual(new Set(['to', 'big', 'room']));
    });

    it('should preserve numeric tokens including single digits', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 1 distance 15 x 2.5 a',
      });

      // Numbers (1, 15, 2.5) should be preserved, short non-numeric tokens (x, a) filtered out
      expect(intent.tokens).toEqual(['ap', '1', 'distance', '15', '2.5']);
      expect(intent.uniques).toEqual(new Set(['ap', '1', 'distance', '15', '2.5']));
    });

    it('should handle empty text gracefully', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '   ',
      });

      expect(intent.normalized).toBe('');
      expect(intent.prefix).toBe('');
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
        id: 'explicitid',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'test command',
      });

      // Should use explicit ID, not generate one
      expect(intent.id).toBe('explicitid');
      // Should generate timestamp
      expect(intent.ts).toBeTypeOf('number');
      expect(intent.ts).toBeGreaterThan(0);
    });
  });

  describe('session threading', () => {
    it('should preserve session ID through intent creation', () => {
      const combatSessionId: SessionURN = 'flux:session:combat:test-1234';

      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: combatSessionId,
        text: 'advance 15',
      });

      expect(intent.session).toBe(combatSessionId);
      expect(intent.prefix).toBe('advance');
      expect(intent.tokens).toEqual(['15']);
    });

    it('should handle different session types', () => {
      const workbenchSessionId: SessionURN = 'flux:session:workbench';

      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: workbenchSessionId,
        text: 'use workbench',
      });

      expect(intent.session).toBe(workbenchSessionId);
    });
  });

  describe('option parsing', () => {
    it('should parse key-value options with equals syntax', () => {
      const intent = createIntent({
        id: 'testoptions1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob --weapon=sword --damage=10',
      });

      expect(intent.prefix).toBe('attack');
      expect(intent.tokens).toEqual(['bob']);
      expect(intent.options).toEqual({
        weapon: 'sword',
        damage: '10',
      });
    });

    it('should parse credit command with memo option', () => {
      const intent = createIntent({
        id: 'testcredit1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: '@credit flux:actor:alice gold 100 --memo="Gift from the queen"',
      });

      expect(intent.prefix).toBe('@credit');
      expect(intent.tokens).toEqual(['flux:actor:alice', 'gold', '100']);
      expect(intent.options).toEqual({
        memo: 'Gift from the queen',
      });
    });

    it('should parse boolean flags without equals syntax', () => {
      const intent = createIntent({
        id: 'testoptions2',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 10 --stealth --fast',
      });

      expect(intent.prefix).toBe('advance');
      expect(intent.tokens).toEqual(['10']);
      expect(intent.options).toEqual({
        stealth: true,
        fast: true,
      });
    });

    it('should handle mixed options and arguments', () => {
      const intent = createIntent({
        id: 'testoptions3',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'craft sword --material=steel --quantity=2 --enchanted from iron ore',
      });

      expect(intent.prefix).toBe('craft');
      expect(intent.tokens).toEqual(['sword', 'from', 'iron', 'ore']);
      expect(intent.options).toEqual({
        material: 'steel',
        quantity: '2',
        enchanted: true,
      });
    });

    it('should handle empty option values', () => {
      const intent = createIntent({
        id: 'testoptions4',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'search --filter= --verbose',
      });

      expect(intent.prefix).toBe('search');
      expect(intent.tokens).toEqual([]);
      expect(intent.options).toEqual({
        filter: '',
        verbose: true,
      });
    });

    it('should handle no options gracefully', () => {
      const intent = createIntent({
        id: 'testoptions5',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'simple command with args',
      });

      expect(intent.prefix).toBe('simple');
      expect(intent.tokens).toEqual(['command', 'with', 'args']);
      expect(intent.options).toBeUndefined();
    });

    it('should ignore malformed options', () => {
      const intent = createIntent({
        id: 'testoptions6',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'test -- --valid=option regular arg',
      });

      expect(intent.prefix).toBe('test');
      expect(intent.tokens).toEqual(['--', 'regular', 'arg']);
      expect(intent.options).toEqual({
        valid: 'option',
      });
    });

    it('should strip quotes from option values and preserve case', () => {
      const intent = createIntent({
        id: 'testquotestripping',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'command --double="Double Quoted" --single=\'Single Quoted\' --unquoted=no-quotes --empty=""',
      });

      expect(intent.prefix).toBe('command');
      expect(intent.tokens).toEqual([]);
      expect(intent.options).toEqual({
        double: 'Double Quoted',
        single: 'Single Quoted',
        unquoted: 'no-quotes',
        empty: '',
      });
    });
  });

  describe('input validation', () => {
    describe('actor URN validation', () => {
      it('should accept valid actor URNs', () => {
        const validActors = [
          'flux:actor:alice',
          'flux:actor:bob123',
          'flux:actor:alice-the-great',
          'flux:actor:player-1',
          'flux:actor:ABC123def',
        ];

        validActors.forEach(actor => {
          expect(() => createIntent({
            actor: actor as ActorURN,
            location: PLACE_ID,
            text: 'test',
          })).not.toThrow();
        });
      });

      it('should reject invalid actor URNs', () => {
        const invalidActors = [
          'flux:actor:', // Empty identifier
          'flux:actor:-alice', // Leading hyphen
          'flux:actor:alice-', // Trailing hyphen
          'flux:actor:alice--bob', // Double hyphen (SQL injection risk)
          'flux:actor:alice_bob', // Underscore not allowed
          'flux:actor:alice bob', // Space not allowed
          'flux:actor:alice;DROP', // SQL injection attempt
          'flux:actor:alice\'OR\'1', // SQL injection attempt
          'flux:actor:alice"test', // Quote injection
          'flux:actor:alice<script>', // XSS attempt
          'flux:actor:alice/../../etc', // Path traversal
          'invalid:actor:alice', // Wrong namespace
          'flux:place:alice', // Wrong type
          'alice', // Missing flux prefix
          '', // Empty string
        ];

        invalidActors.forEach(actor => {
          expect(() => createIntent({
            actor: actor as ActorURN,
            location: PLACE_ID,
            text: 'test',
          })).toThrow('Invalid actor URN');
        });
      });
    });

    describe('location URN validation', () => {
      it('should accept valid location URNs', () => {
        const validLocations = [
          'flux:place:tavern',
          'flux:place:dungeon-1',
          'flux:place:fire-temple',
          'flux:place:room123',
        ];

        validLocations.forEach(location => {
          expect(() => createIntent({
            actor: ACTOR_ID,
            location: location as PlaceURN,
            text: 'test',
          })).not.toThrow();
        });
      });

      it('should reject invalid location URNs', () => {
        const invalidLocations = [
          'flux:place:', // Empty identifier
          'flux:place:-tavern', // Leading hyphen
          'flux:place:tavern-', // Trailing hyphen
          'flux:place:tavern--room', // Double hyphen
          'flux:place:tavern_room', // Underscore
          'flux:place:tavern room', // Space
          'flux:place:tavern;DROP', // SQL injection
          'flux:actor:tavern', // Wrong type
          'tavern', // Missing flux prefix
        ];

        invalidLocations.forEach(location => {
          expect(() => createIntent({
            actor: ACTOR_ID,
            location: location as PlaceURN,
            text: 'test',
          })).toThrow('Invalid location URN');
        });
      });
    });

    describe('session URN validation', () => {
      it('should accept valid session URNs', () => {
        const validSessions = [
          'flux:session:combat',
          'flux:session:workbench',
          'flux:session:combat-123',
          'flux:session:session1',
        ];

        validSessions.forEach(session => {
          expect(() => createIntent({
            actor: ACTOR_ID,
            location: PLACE_ID,
            session: session as SessionURN,
            text: 'test',
          })).not.toThrow();
        });
      });

      it('should reject invalid session URNs', () => {
        const invalidSessions = [
          'flux:session:', // Empty identifier
          'flux:session:-combat', // Leading hyphen
          'flux:session:combat-', // Trailing hyphen
          'flux:session:combat--session', // Double hyphen
          'flux:session:combat_session', // Underscore
          'flux:session:combat session', // Space
          'flux:session:combat;DROP', // SQL injection
          'flux:actor:combat', // Wrong type
          'combat', // Missing flux prefix
        ];

        invalidSessions.forEach(session => {
          expect(() => createIntent({
            actor: ACTOR_ID,
            location: PLACE_ID,
            session: session as SessionURN,
            text: 'test',
          })).toThrow('Invalid session URN');
        });
      });

      it('should allow undefined session', () => {
        expect(() => createIntent({
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: 'test',
        })).not.toThrow();
      });
    });

    describe('intent ID validation', () => {
      it('should accept valid BASE62 IDs', () => {
        const validIds = [
          'abc123',
          'ABC123def',
          '0123456789',
          'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        ];

        validIds.forEach(id => {
          expect(() => createIntent({
            id,
            actor: ACTOR_ID,
            location: PLACE_ID,
            text: 'test',
          })).not.toThrow();
        });
      });

      it('should reject invalid intent IDs', () => {
        const invalidIds = [
          'abc-123', // Hyphen not allowed in BASE62
          'abc_123', // Underscore not allowed
          'abc 123', // Space not allowed
          'abc@123', // Special character
          'abc.123', // Period not allowed
          'abc/123', // Slash not allowed
          'abc;DROP', // SQL injection attempt
          'abc\'test', // Quote not allowed
          '', // Empty string
        ];

        invalidIds.forEach(id => {
          expect(() => createIntent({
            id,
            actor: ACTOR_ID,
            location: PLACE_ID,
            text: 'test',
          }), `Expected "${id}" to be rejected`).toThrow('Invalid intent ID');
        });
      });

      it('should allow undefined ID (auto-generated)', () => {
        expect(() => createIntent({
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: 'test',
        })).not.toThrow();
      });
    });

    describe('timestamp validation', () => {
      it('should accept valid timestamps', () => {
        const validTimestamps = [
          0,
          Date.now(),
          1234567890,
          Number.MAX_SAFE_INTEGER,
        ];

        validTimestamps.forEach(ts => {
          expect(() => createIntent({
            ts,
            actor: ACTOR_ID,
            location: PLACE_ID,
            text: 'test',
          })).not.toThrow();
        });
      });

      it('should reject invalid timestamps', () => {
        const invalidTimestamps = [
          'not-a-number' as any,
          NaN,
          Infinity,
          -Infinity,
          null as any,
          {} as any,
          [] as any,
        ];

        invalidTimestamps.forEach(ts => {
          expect(() => createIntent({
            ts,
            actor: ACTOR_ID,
            location: PLACE_ID,
            text: 'test',
          })).toThrow('Invalid timestamp');
        });
      });

      it('should allow undefined timestamp (auto-generated)', () => {
        expect(() => createIntent({
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: 'test',
        })).not.toThrow();
      });
    });
  });
});
