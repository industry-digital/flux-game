import { describe, beforeEach, it, expect, vi } from 'vitest';
import { resolveIntent, getAvailableParsers, createIntentParserContext } from './resolution';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';

describe('Intent Resolution', () => {
  let context: TransformerContext;

  // Create test actors and place
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const TARGET_ID: ActorURN = 'flux:actor:test:bob';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';

  beforeEach(() => {
    context = createTestTransformerContext({
      world: {
        sessions: {},
        items: {},
        actors: {
          [ACTOR_ID]: createActor({
            id: ACTOR_ID,
            name: 'Alice',
            location: PLACE_ID,
          }),
          [TARGET_ID]: createActor({
            id: TARGET_ID,
            name: 'Bob',
            location: PLACE_ID,
          }),
        },
        places: {
          [PLACE_ID]: createPlace({
            id: PLACE_ID,
            name: 'Test Arena',
          }),
        },
      },
    });
  });

  describe('resolveIntent', () => {
    it('should resolve attack intent to ATTACK command', () => {
      const command = resolveIntent(context, ACTOR_ID, 'attack bob');

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ATTACK);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
      expect(command?.args).toHaveProperty('target');
    });

    it('should resolve target intent to TARGET command', () => {
      const command = resolveIntent(context, ACTOR_ID, 'target bob');
      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.TARGET);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
      expect(command?.args).toHaveProperty('target');
    });

    it('should resolve defend intent to DEFEND command', () => {
      const command = resolveIntent(context, ACTOR_ID, 'defend');

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.DEFEND);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
    });

    it('should resolve advance intent to ADVANCE command', () => {
      const command = resolveIntent(context, ACTOR_ID, 'advance 5m');

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ADVANCE);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
      expect(command?.args).toHaveProperty('distance', 5);
    });

    it('should resolve retreat intent to RETREAT command', () => {
      const command = resolveIntent(context, ACTOR_ID, 'retreat distance 3');

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.RETREAT);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
      expect(command?.args).toHaveProperty('distance', 3);
    });

    it('should return null for unrecognized intents', () => {
      const command = resolveIntent(context, ACTOR_ID, 'dance a jig');

      expect(command).toBeNull();
    });

    it('should handle empty intent text', () => {
      const command = resolveIntent(context, ACTOR_ID, '');

      expect(command).toBeNull();
    });

    it('should handle whitespace-only intent text', () => {
      const command = resolveIntent(context, ACTOR_ID, '   ');

      expect(command).toBeNull();
    });

    it('should handle missing actor', () => {
      const command = resolveIntent(context, 'flux:actor:nonexistent' as ActorURN, 'attack bob');

      expect(command).toBeNull();
    });

    it('should use actor location when location not provided', () => {
      const command = resolveIntent(context, ACTOR_ID, 'defend');

      expect(command).toBeTruthy();
      expect(command?.location).toBe(PLACE_ID); // Should use actor's location
    });

    it('should propagate trace from intent to command', () => {
      const command = resolveIntent(context, ACTOR_ID, 'attack bob');

      expect(command).toBeTruthy();
      expect(command?.trace).toBeTruthy();
      expect(typeof command?.trace).toBe('string');
    });

    it('should include proper command metadata', () => {
      const command = resolveIntent(context, ACTOR_ID, 'attack bob');

      expect(command).toBeTruthy();
      expect(command?.id).toBeTruthy();
      expect(command?.ts).toBeTruthy();
      expect(command?.__type).toBe('command');
      expect(typeof command?.id).toBe('string');
      expect(typeof command?.ts).toBe('number');
    });
  });

  describe('createIntentParserContext', () => {
    it('should create proper parser context from transformer context', () => {
      const parserContext = createIntentParserContext(context);

      expect(parserContext).toHaveProperty('world');
      expect(parserContext).toHaveProperty('uniqid');
      expect(parserContext).toHaveProperty('timestamp');
      expect(parserContext).toHaveProperty('resolveActor');
      expect(parserContext).toHaveProperty('resolveItem');
      expect(parserContext).toHaveProperty('resolvePlace');

      expect(parserContext.world).toBe(context.world);
      expect(typeof parserContext.uniqid).toBe('function');
      expect(typeof parserContext.timestamp).toBe('function');
    });
  });

  describe('getAvailableParsers', () => {
    it('should return array of parsers', () => {
      const parsers = getAvailableParsers();

      expect(Array.isArray(parsers)).toBe(true);
      expect(parsers.length).toBeGreaterThan(0);

      // Each parser should be a function
      parsers.forEach(parser => {
        expect(typeof parser).toBe('function');
      });
    });

    it('should return consistent parsers on multiple calls', () => {
      const parsers1 = getAvailableParsers();
      const parsers2 = getAvailableParsers();

      expect(parsers1).toBe(parsers2); // Should be the same cached array
      expect(parsers1.length).toBe(parsers2.length);
    });
  });

  describe('error handling', () => {
    it('should handle parser errors gracefully', () => {
      // Mock a context that might cause parser errors
      const errorContext = createTestTransformerContext({
        world: {
          actors: {}, // Empty actors might cause some parsers to fail
          places: {},
          items: {},
          sessions: {},
        },
      });

      const command = resolveIntent(errorContext, ACTOR_ID, 'attack nonexistent');

      // Should not throw, should return null
      expect(command).toBeNull();
    });

    it('should declare errors for invalid inputs', () => {
      const errorSpy = vi.spyOn(context, 'declareError');

      resolveIntent(context, ACTOR_ID, '');

      expect(errorSpy).toHaveBeenCalledWith(
        'Intent text cannot be empty',
        'intent-resolution'
      );
    });
  });

  describe('intent parsing edge cases', () => {
    it('should handle case-insensitive verbs', () => {
      const command1 = resolveIntent(context, ACTOR_ID, 'ATTACK bob');
      const command2 = resolveIntent(context, ACTOR_ID, 'attack bob');

      expect(command1?.type).toBe(command2?.type);
    });

    it('should handle extra whitespace', () => {
      const command = resolveIntent(context, ACTOR_ID, '  attack   bob  ');

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ATTACK);
    });

    it('should parse numeric values in intents', () => {
      const command = resolveIntent(context, ACTOR_ID, 'advance distance 10');
      expect(command).toBeTruthy();
      expect(command?.args).toHaveProperty('distance', 10);
    });
  });
});
