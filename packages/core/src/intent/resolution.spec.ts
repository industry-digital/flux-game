import { describe, beforeEach, it, expect } from 'vitest';
import { resolveCommandFromIntent, createCommandResolverContext } from './resolution';
import { createIntent } from './factory';
import { TransformerContext } from '~/types/handler';
import { WorldProjection } from '~/types/world';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';

describe('Intent Resolution', () => {
  let context: TransformerContext;

  // Create test actors and place
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const TARGET_ID: ActorURN = 'flux:actor:test:bob';
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
      })),
    });
  });

  describe('resolveCommandFromIntent', () => {
    it('should resolve attack intent to ATTACK command', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });

      const command = resolveCommandFromIntent(context, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ATTACK);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
    });

    it('should resolve advance intent to ADVANCE command', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'advance 10',
      });

      const command = resolveCommandFromIntent(context, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ADVANCE);
      expect(command?.actor).toBe(ACTOR_ID);
    });

    it('should thread session ID from intent to command', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: 'attack bob',
      });

      const command = resolveCommandFromIntent(context, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBe(SESSION_ID);
      expect(command?.type).toBe(CommandType.ATTACK);
    });

    it('should handle unrecognized intents gracefully', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'do something impossible',
      });

      const command = resolveCommandFromIntent(context, intent);

      expect(command).toBeNull();
    });

    it('should preserve all intent metadata in command', () => {
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: SESSION_ID,
        text: 'look bob',
      });

      const command = resolveCommandFromIntent(context, intent);

      expect(command).toBeTruthy();
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
      expect(command?.session).toBe(SESSION_ID);
      expect(command?.type).toBe(CommandType.LOOK);
    });

    it('should handle combat-specific intents with session context', () => {
      const combatSessionId: SessionURN = 'flux:session:combat:simulator';

      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: combatSessionId,
        text: 'strike bob',
      });

      const command = resolveCommandFromIntent(context, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBe(combatSessionId);
      expect(command?.type).toBe(CommandType.STRIKE);
    });
  });

  describe('createCommandResolverContext', () => {
    it('should create parser context with entity resolvers', () => {
      const parserContext = createCommandResolverContext(context);

      expect(parserContext).toHaveProperty('world');
      expect(parserContext).toHaveProperty('uniqid');
      expect(parserContext).toHaveProperty('timestamp');
      expect(parserContext).toHaveProperty('resolveActor');
      expect(parserContext).toHaveProperty('resolvePlace');
      expect(parserContext).toHaveProperty('resolveItem');
    });

    it('should resolve actors by name', () => {
      const parserContext = createCommandResolverContext(context);
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack bob',
      });
      const resolvedActor = parserContext.resolveActor(intent);

      expect(resolvedActor?.id).toBe(TARGET_ID);
    });

    it('should resolve actors by exact name match', () => {
      const parserContext = createCommandResolverContext(context);
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'attack Bob', // Using exact name match
      });
      const resolvedActor = parserContext.resolveActor(intent);

      expect(resolvedActor?.id).toBe(TARGET_ID);
    });
  });

  describe('session threading integration', () => {
    it('should maintain session context through full resolution pipeline', () => {
      const combatSessionId: SessionURN = 'flux:session:combat:test-integration';

      // Step 1: Create intent with session
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        session: combatSessionId,
        text: 'advance 25',
      });

      // Step 2: Resolve to command
      const command = resolveCommandFromIntent(context, intent);

      // Verify session threading
      expect(command).toBeTruthy();
      expect(command?.session).toBe(combatSessionId);
      expect(command?.type).toBe(CommandType.ADVANCE);
      expect(command?.actor).toBe(ACTOR_ID);
      expect(command?.location).toBe(PLACE_ID);
    });

    it('should handle commands without session context', () => {
      // Step 1: Create intent without session
      const intent = createIntent({
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'look bob',
      });

      // Step 2: Resolve to command
      const command = resolveCommandFromIntent(context, intent);

      // Verify command creation without session
      expect(command).toBeTruthy();
      expect(command?.session).toBeUndefined();
      expect(command?.type).toBe(CommandType.LOOK);
    });
  });
});
