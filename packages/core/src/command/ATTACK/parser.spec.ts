import { describe, it, expect, beforeEach } from 'vitest';
import { attackIntentParser } from './handler';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { createTestActor } from '~/testing/world-testing';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createEntityResolverApi } from '~/intent/resolvers';
import { IntentParserContext } from '~/types/handler';
import { createPlace } from '~/worldkit/entity/place';
import { createIntent } from '~/intent';

describe('ATTACK Intent Parser', () => {
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const TARGET_ID: ActorURN = 'flux:actor:test:bob';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';

  let context: IntentParserContext;

  beforeEach(() => {
    const baseContext = createTestTransformerContext({
      world: {
        actors: {
          [ACTOR_ID]: createTestActor({
            id: ACTOR_ID,
            name: 'Alice',
            location: PLACE_ID,
          }),
          [TARGET_ID]: createTestActor({
            id: TARGET_ID,
            name: 'Bob',
            location: PLACE_ID,
          }),
        },
        places: {
          [PLACE_ID]: createPlace({
            id: PLACE_ID,
            name: 'Test Arena',
            description: { base: 'A test arena' },
          }),
        },
        items: {},
        sessions: {},
      },
    });

    // Create IntentParserContext with entity resolvers
    const resolvers = createEntityResolverApi(baseContext.world);
    context = {
      ...baseContext,
      ...resolvers,
    };
  });

  describe('verb recognition', () => {
    it('should recognize "attack" verb', () => {
      const intent = createIntent({
        id: 'test-intent-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ATTACK);
    });

    it('should recognize "attack" with variations', () => {
      const variations = ['attack', 'attacks', 'attacking'];

      for (const verb of variations) {
        const intent = createIntent({
          id: `test-intent-${verb}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: `${verb} bob`,
        });

        const command = attackIntentParser(context, intent);
        expect(command).toBeTruthy();
        expect(command?.type).toBe(CommandType.ATTACK);
      }
    });

    it('should reject non-attack verbs', () => {
      const nonAttackVerbs = ['defend', 'move', 'look', 'cast', 'heal'];

      for (const verb of nonAttackVerbs) {
        const intent = createIntent({
          id: `test-intent-${verb}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
          text: `${verb} bob`,
        });

        const command = attackIntentParser(context, intent);
        expect(command).toBeUndefined();
      }
    });
  });

  describe('target resolution', () => {
    it('should resolve target by exact name "bob"', () => {
      const intent = createIntent({
        id: 'test-intent-exact',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeTruthy();
      expect(command?.args.target).toBe(TARGET_ID);
    });

    it('should resolve target by case-insensitive name "Bob"', () => {
      const intent = createIntent({
        id: 'test-intent-case',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack Bob',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeTruthy();
      expect(command?.args.target).toBe(TARGET_ID);
    });

    it('should resolve target by partial name "bo"', () => {
      const intent = createIntent({
        id: 'test-intent-partial',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bo',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeTruthy();
      expect(command?.args.target).toBe(TARGET_ID);
    });

    it('should return undefined for unknown target', () => {
      const intent = createIntent({
        id: 'test-intent-unknown',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack charlie',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeUndefined();
    });

    it('should return undefined when no target specified', () => {
      const intent = createIntent({
        id: 'test-intent-no-target',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('location validation', () => {
    it('should succeed when attacker and target are in same location', () => {
      const intent = createIntent({
        id: 'test-intent-same-location',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeTruthy();
      expect(command?.location).toBe(PLACE_ID);
    });

    it('should return undefined when target is in different location', () => {
      const differentPlaceId: PlaceURN = 'flux:place:test:other-arena';

      // Add target to different location
      context.world.actors[TARGET_ID] = createTestActor({
        id: TARGET_ID,
        name: 'Bob',
        location: differentPlaceId,
      });

      const intent = createIntent({
        id: 'test-intent-different-location',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('actor validation', () => {
    it('should return undefined when attacker actor not found', () => {
      const missingActorId: ActorURN = 'flux:actor:test:missing';

      const intent = createIntent({
        id: 'test-intent-missing-actor',
        actor: missingActorId,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeUndefined();
    });
  });

  describe('command structure', () => {
    it('should create properly structured ATTACK command', () => {
      const intent = createIntent({
        id: 'test-intent-structure',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = attackIntentParser(context, intent);

      expect(command).toBeTruthy();
      expect(command).toMatchObject({
        __type: 'command',
        type: CommandType.ATTACK,
        actor: ACTOR_ID,
        location: PLACE_ID,
        trace: intent.id,
        args: {
          target: TARGET_ID,
        },
      });
    });

    it('should preserve trace from intent', () => {
      const traceId = 'custom-trace-12345';
      const intent = createIntent({
        id: traceId,
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = attackIntentParser(context, intent);

      expect(command?.trace).toBe(traceId);
    });
  });
});
