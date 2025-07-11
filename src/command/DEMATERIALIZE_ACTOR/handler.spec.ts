import { describe, it, expect } from 'vitest';
import {
    DEMATERIALIZE_ACTOR,
    DematerializeActorCommand,
    dematerializeActorCommandReducer
} from './handler';
import { CommandType } from '~/types/intent';
import { SpecialVisibility } from '~/types/world/visibility';
import {
    createTransformerContext,
    createCommand,
    createTestActor,
    createTestPlace,
    createWorld
} from '~/testing';

describe('DematerializeActorCommandHandler', () => {
  const handler = new DEMATERIALIZE_ACTOR();

  describe('handles method', () => {
    it('should return true for DEMATERIALIZE_ACTOR commands', () => {
      const command = createCommand(CommandType.DEMATERIALIZE_ACTOR, {
        args: { actorId: 'flux:actor:test:test-actor' as any }
      });

      expect(handler.handles(command)).toBe(true);
    });

    it('should return false for non-DEMATERIALIZE_ACTOR commands', () => {
      const command = createCommand(CommandType.CREATE_ACTOR);
      expect(handler.handles(command)).toBe(false);
    });

    it('should return false for non-command inputs', () => {
      const intent = { __type: 'intent', text: 'dematerialize actor' };
      expect(handler.handles(intent as any)).toBe(false);
    });
  });

  describe('reducer behavior', () => {
    it('should remove actor from place entities', () => {
      const actor = createTestActor({
        name: 'Test Actor',
        location: 'flux:place:test:tavern'
      });

      const place = createTestPlace({
        id: 'flux:place:test:tavern',
        name: 'Test Tavern',
        entities: {
          [actor.id]: { vis: SpecialVisibility.VISIBLE_TO_EVERYONE }
        }
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [place.id]: place }
        })
      });

      const command = createCommand(CommandType.DEMATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      const result = dematerializeActorCommandReducer(context, command as DematerializeActorCommand);

      // Actor should be removed from place entities
      const updatedPlace = result.world.places[place.id];
      expect(updatedPlace.entities[actor.id]).toBeUndefined();

      // Actor should still exist in world
      expect(result.world.actors[actor.id]).toBeDefined();
    });

    it('should declare ACTOR_DID_DEMATERIALIZE event', () => {
      const actor = createTestActor({
        location: 'flux:place:test:tavern'
      });

      const place = createTestPlace({
        id: 'flux:place:test:tavern',
        entities: {
          [actor.id]: { vis: SpecialVisibility.VISIBLE_TO_EVERYONE }
        }
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [place.id]: place }
        })
      });

      const command = createCommand(CommandType.DEMATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      dematerializeActorCommandReducer(context, command as DematerializeActorCommand);

      // Should have declared the dematerialize event
      expect(context.declareEvent).toHaveBeenCalledWith({
        type: 'actor:dematerialized',
        actor: actor.id,
        location: place.id,
        payload: {},
        trace: command.id
      });
    });

    it('should handle actor not found error', () => {
      const context = createTransformerContext();
      const command = createCommand(CommandType.DEMATERIALIZE_ACTOR, {
        args: { actorId: 'flux:actor:test:nonexistent' as any }
      });

      const result = dematerializeActorCommandReducer(context, command as DematerializeActorCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalledWith('Actor not found in world projection');
    });

    it('should handle place not found error', () => {
      const actor = createTestActor({
        location: 'flux:place:test:nonexistent'
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor }
        })
      });

      const command = createCommand(CommandType.DEMATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      const result = dematerializeActorCommandReducer(context, command as DematerializeActorCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalledWith('Place not found in `places` projection. Did you remember to load it?');
    });
  });

  describe('handler integration', () => {
    it('should process a command end-to-end', () => {
      const actor = createTestActor({
        location: 'flux:place:test:tavern'
      });

      const place = createTestPlace({
        id: 'flux:place:test:tavern',
        entities: {
          [actor.id]: { vis: SpecialVisibility.VISIBLE_TO_EVERYONE }
        }
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [place.id]: place }
        })
      });

      const command = createCommand(CommandType.DEMATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      // Handler should recognize the command
      expect(handler.handles(command)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(context, command as DematerializeActorCommand);

      // Verify the observable outcomes
      expect(result.world.places[place.id].entities[actor.id]).toBeUndefined();
    });
  });

  describe('handler configuration', () => {
    it('should have empty dependencies', () => {
      expect(handler.dependencies).toEqual([]);
    });

    it('should use the correct reducer function', () => {
      expect(handler.reduce).toBe(dematerializeActorCommandReducer);
    });
  });
});
