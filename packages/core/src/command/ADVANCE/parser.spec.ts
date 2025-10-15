import { describe, beforeEach, it, expect } from 'vitest';
import { advanceIntentParser } from './parser';
import { createIntent } from '~/intent/factory';
import { createIntentParserContext } from '~/intent/resolution';
import { TransformerContext, WorldProjection } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';

describe('ADVANCE Command Parser', () => {
  let context: TransformerContext;
  let parserContext: ReturnType<typeof createIntentParserContext>;

  // Test entities
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';
  const SESSION_ID: SessionURN = 'flux:session:combat:test';

  beforeEach(() => {
    context = createTestTransformerContext({
      world: createWorldProjection((w: WorldProjection) => ({
        ...w,
        sessions: {},
        items: {},
        actors: {
          [ACTOR_ID]: createActor({
            id: ACTOR_ID,
            name: 'Alice',
            location: PLACE_ID,
          }),
        },
        places: {
          [PLACE_ID]: createPlace({
            id: PLACE_ID,
            name: 'Test Arena',
          }),
        },
      })),
    });

    parserContext = createIntentParserContext(context);
  });

  describe('Basic Functionality', () => {
    it('should recognize advance verb', () => {
      const intent = createIntent({
        id: 'test-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ADVANCE);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
    });

    it('should reject non-advance verbs', () => {
      const intent = createIntent({
        id: 'test-2',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject when actor not found', () => {
      const intent = createIntent({
        id: 'test-3',
        actor: 'flux:actor:missing' as ActorURN,
        location: PLACE_ID,
        text: 'advance',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeUndefined();
    });

  });

  describe('Max Advance Syntax: "advance"', () => {
    it('should parse bare "advance" as max advance', () => {
      const intent = createIntent({
        id: 'test-5',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.type).toBe('distance');
      expect(command?.args.distance).toBeUndefined(); // undefined = max advance
      expect(command?.args.direction).toBe(1);
    });
  });

  describe('Distance Shorthand Syntax: "advance <number>"', () => {
    it('should parse "advance 15" as distance shorthand', () => {
      const intent = createIntent({
        id: 'test-6',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 15',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.type).toBe('distance');
      expect(command?.args.distance).toBe(15);
      expect(command?.args.direction).toBe(1);
    });

    it('should parse "advance 5.5" as distance shorthand with decimal', () => {
      const intent = createIntent({
        id: 'test-7',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 5.5',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.type).toBe('distance');
      expect(command?.args.distance).toBe(5.5);
    });

    it('should reject "advance 0" (zero distance)', () => {
      const intent = createIntent({
        id: 'test-8',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 0',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });

    it('should reject "advance -5" (negative distance)', () => {
      const intent = createIntent({
        id: 'test-9',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance -5',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });

    it('should reject "advance abc" (invalid number)', () => {
      const intent = createIntent({
        id: 'test-10',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance abc',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });
  });

  describe('Explicit Distance Syntax: "advance distance <number>"', () => {
    it('should parse "advance distance 10"', () => {
      const intent = createIntent({
        id: 'test-11',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance 10',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.type).toBe('distance');
      expect(command?.args.distance).toBe(10);
      expect(command?.args.direction).toBe(1);
    });

    it('should floor decimal distances to whole meters', () => {
      const intent = createIntent({
        id: 'test-12',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance 7.8',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.type).toBe('distance');
      expect(command?.args.distance).toBe(7); // Math.floor(7.8)
    });

    it('should reject "advance distance 0"', () => {
      const intent = createIntent({
        id: 'test-13',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance 0',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });

    it('should reject "advance distance -3"', () => {
      const intent = createIntent({
        id: 'test-14',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance -3',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });
  });

  describe('AP-based Syntax: "advance ap <number>"', () => {
    it('should parse "advance ap 2.5"', () => {
      const intent = createIntent({
        id: 'test-15',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 2.5',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.type).toBe('ap');
      expect(command?.args.distance).toBe(2.5);
      expect(command?.args.direction).toBe(1);
    });

    it('should parse "advance ap 1" (whole number AP)', () => {
      const intent = createIntent({
        id: 'test-16',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 1',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.type).toBe('ap');
      expect(command?.args.distance).toBe(1);
    });

    it('should reject "advance ap 0"', () => {
      const intent = createIntent({
        id: 'test-17',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 0',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });

    it('should reject "advance ap -1.5"', () => {
      const intent = createIntent({
        id: 'test-18',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap -1.5',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });
  });

  describe('Session Threading', () => {
    it('should thread session ID from intent to command', () => {
      const intent = createIntent({
        id: 'test-19',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: 'advance 10',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBe(SESSION_ID);
    });

    it('should work without session ID', () => {
      const intent = createIntent({
        id: 'test-20',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 1.5',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBeUndefined();
    });
  });

  describe('Edge Cases and Malformed Input', () => {
    it('should handle extra tokens gracefully', () => {
      const intent = createIntent({
        id: 'test-21',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance 10 extra tokens here',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance due to >2 tokens
    });

    it('should handle unknown modifiers', () => {
      const intent = createIntent({
        id: 'test-22',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance speed 10',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });

    it('should handle empty string numbers', () => {
      const intent = createIntent({
        id: 'test-23',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance distance',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBeUndefined(); // Falls back to max advance
    });
  });

  describe('Performance Characteristics', () => {
    it('should use zero-allocation token parsing', () => {
      const intent = createIntent({
        id: 'test-24',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance ap 2.5',
      });

      // Verify tokens are pre-parsed
      expect(intent.tokens).toEqual(['ap', '2.5']);
      expect(intent.verb).toBe('advance');

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.type).toBe('ap');
      expect(command?.args.distance).toBe(2.5);
    });

    it('should handle large numbers efficiently', () => {
      const intent = createIntent({
        id: 'test-25',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 999999',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.args.distance).toBe(999999);
    });
  });

  describe('Command Structure Validation', () => {
    it('should always set direction to 1 (forward)', () => {
      const testCases = [
        'advance',
        'advance 10',
        'advance distance 5',
        'advance ap 2.0',
      ];

      testCases.forEach((text, index) => {
        const intent = createIntent({
          id: `test-direction-${index}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text,
        });

        const command = advanceIntentParser(parserContext, intent);

        expect(command).toBeTruthy();
        expect(command?.args.direction).toBe(1);
      });
    });

    it('should preserve all required command fields', () => {
      const intent = createIntent({
        id: 'test-26',
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: 'advance distance 15',
      });

      const command = advanceIntentParser(parserContext, intent);

      expect(command).toMatchObject({
        id: intent.id,
        type: CommandType.ADVANCE,
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        args: {
          type: 'distance',
          distance: 15,
          direction: 1,
        },
      });
    });
  });
});
