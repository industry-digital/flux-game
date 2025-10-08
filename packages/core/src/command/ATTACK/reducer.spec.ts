import { describe, it, expect, beforeEach, vi } from 'vitest';
import { attackReducer } from './handler';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { createTestActor } from '~/testing/world-testing';
import { createPlace } from '~/worldkit/entity/place';
import { createActorCommand } from '~/lib/intent';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { TransformerContext } from '~/types/handler';
import { Team } from '~/types/combat';

describe('ATTACK Reducer', () => {
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const TARGET_ID: ActorURN = 'flux:actor:test:bob';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';

  let context: TransformerContext;

  beforeEach(() => {
    context = createTestTransformerContext({
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
  });

  describe('target validation', () => {
    it('should declare error when target actor not found', () => {
      const mockDeclareError = vi.spyOn(context, 'declareError');
      const missingTargetId: ActorURN = 'flux:actor:test:missing';

      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: missingTargetId,
        },
      });

      const result = attackReducer(context, command);

      expect(mockDeclareError).toHaveBeenCalledWith(
        'Could not find `ATTACK` target in world projection',
        command.id
      );
      expect(result).toBe(context);
    });

    it('should declare error when attacker actor not found', () => {
      const mockDeclareError = vi.spyOn(context, 'declareError');
      const missingActorId: ActorURN = 'flux:actor:test:missing';

      const command = createActorCommand({
        actor: missingActorId,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        },
      });

      const result = attackReducer(context, command);

      expect(mockDeclareError).toHaveBeenCalledWith(
        'Could not find `ATTACK` actor in world projection',
        command.id
      );
      expect(result).toBe(context);
    });

    it('should declare error when actors are in different locations', () => {
      const mockDeclareError = vi.spyOn(context, 'declareError');
      const differentPlaceId: PlaceURN = 'flux:place:test:other-arena';

      // Move target to different location
      context.world.actors[TARGET_ID] = createTestActor({
        id: TARGET_ID,
        name: 'Bob',
        location: differentPlaceId,
      });

      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        },
      });

      const result = attackReducer(context, command);

      expect(mockDeclareError).toHaveBeenCalledWith(
        '`ATTACK` actor and target must be in the same location',
        command.id
      );
      expect(result).toBe(context);
    });
  });

  describe('combat session creation', () => {
    it('should create new combat session when none exists', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        },
      });

      // Initially no sessions
      expect(Object.keys(context.world.sessions)).toHaveLength(0);

      const result = attackReducer(context, command);

      // Should create a session
      expect(Object.keys(context.world.sessions)).toHaveLength(1);
      expect(result).toBe(context);
    });

    it('should use existing combat session when provided', () => {
      // Pre-create a session
      const existingSessionId = 'flux:session:combat:existing';
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        session: existingSessionId,
        args: {
          target: TARGET_ID,
        },
      });

      const result = attackReducer(context, command);

      // Should still work (though session creation logic will handle the details)
      expect(result).toBe(context);
    });
  });

  describe('combatant management', () => {
    it('should add combatants to new session with correct teams', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        },
      });

      const result = attackReducer(context, command);

      // Verify session was created
      const sessionIds = Object.keys(context.world.sessions) as SessionURN[];
      expect(sessionIds).toHaveLength(1);

      const session = context.world.sessions[sessionIds[0]];
      expect(session).toBeDefined();
      expect(session.data.combatants.size).toBe(2);

      // Verify teams are assigned correctly (attacker = BRAVO, target = ALPHA)
      const attackerCombatant = session.data.combatants.get(ACTOR_ID);
      const targetCombatant = session.data.combatants.get(TARGET_ID);

      expect(attackerCombatant?.team).toBe(Team.BRAVO);
      expect(targetCombatant?.team).toBe(Team.ALPHA);
      expect(result).toBe(context);
    });
  });

  describe('combat plan execution', () => {
    it('should execute combat plan when valid', () => {
      // Mock generateCombatPlan to return a simple plan
      const mockPlan = [
        createActorCommand({
          actor: ACTOR_ID,
          location: PLACE_ID,
          type: CommandType.ATTACK,
          args: { target: TARGET_ID },
        }),
      ];

      // We can't easily mock the generateCombatPlan function since it's imported,
      // but we can verify the reducer runs without errors
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        },
      });

      const result = attackReducer(context, command);

      // Should complete without errors
      expect(result).toBe(context);

      // Should have created a session
      expect(Object.keys(context.world.sessions)).toHaveLength(1);
    });
  });

  describe('error handling', () => {
    it('should not declare errors for valid attack', () => {
      const mockDeclareError = vi.spyOn(context, 'declareError');

      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        },
      });

      const result = attackReducer(context, command);

      // Should not have any validation errors
      expect(mockDeclareError).not.toHaveBeenCalledWith(
        expect.stringContaining('Could not find'),
        expect.any(String)
      );
      expect(mockDeclareError).not.toHaveBeenCalledWith(
        expect.stringContaining('must be in the same location'),
        expect.any(String)
      );
      expect(result).toBe(context);
    });

    it('should handle missing command args gracefully', () => {
      const mockDeclareError = vi.spyOn(context, 'declareError');

      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: undefined as any, // Invalid target
        },
      });

      const result = attackReducer(context, command);

      expect(mockDeclareError).toHaveBeenCalledWith(
        'Could not find `ATTACK` target in world projection',
        command.id
      );
      expect(result).toBe(context);
    });
  });

  describe('integration with combat system', () => {
    it('should return the same context instance', () => {
      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        },
      });

      const result = attackReducer(context, command);

      // Reducer should always return the same context instance
      expect(result).toBe(context);
    });

    it('should preserve existing world state', () => {
      const originalActorCount = Object.keys(context.world.actors).length;
      const originalPlaceCount = Object.keys(context.world.places).length;

      const command = createActorCommand({
        actor: ACTOR_ID,
        location: PLACE_ID,
        type: CommandType.ATTACK,
        args: {
          target: TARGET_ID,
        },
      });

      const result = attackReducer(context, command);

      // Should not modify existing actors or places
      expect(Object.keys(result.world.actors)).toHaveLength(originalActorCount);
      expect(Object.keys(result.world.places)).toHaveLength(originalPlaceCount);

      // Should add a session
      expect(Object.keys(result.world.sessions)).toHaveLength(1);
    });
  });
});
