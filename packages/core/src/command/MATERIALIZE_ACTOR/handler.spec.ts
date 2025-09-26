import { describe, it, expect } from 'vitest';
import {
  MATERIALIZE_ACTOR,
  MaterializeActorCommand,
  materializeActorReducer
} from './handler';
import { CommandType } from '~/types/intent';
import { SpecialVisibility } from '~/types/world/visibility';
import {
  createTestTransformerContext,
  createCommand,
  createTestActor,
  createTestPlace,
  createWorld
} from '~/testing';

describe('MaterializeActorCommandHandler', () => {
  const handler = new MATERIALIZE_ACTOR();

  describe('handles method', () => {
    it('should return true for MATERIALIZE_ACTOR commands', () => {
      const command = createCommand(CommandType.MATERIALIZE_ACTOR, {
        args: { actorId: 'flux:actor:test:test-actor' as any }
      });

      expect(handler.handles(command as any)).toBe(true);
    });

    it('should return false for non-MATERIALIZE_ACTOR commands', () => {
      const command = createCommand(CommandType.CREATE_ACTOR);
      expect(handler.handles(command as any)).toBe(false);
    });

    it('should return false for non-command inputs', () => {
      const intent = { __type: 'intent', text: 'materialize actor' };
      expect(handler.handles(intent as any)).toBe(false);
    });
  });

  describe('reducer behavior', () => {
    it('should add actor to place entities', () => {
      const actor = createTestActor({
        name: 'Test Actor',
        location: 'flux:place:test:tavern'
      });

      const place = createTestPlace({
        id: actor.location,
        name: 'Test Tavern',
        entities: {} // No actors initially
      });

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [place.id]: place }
        })
      });

      const command = createCommand(CommandType.MATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      const result = materializeActorReducer(context, command as MaterializeActorCommand);

      // Actor should be added to place entities
      const updatedPlace = result.world.places[place.id];
      expect(updatedPlace.entities[actor.id]).toBeDefined();
      expect(updatedPlace.entities[actor.id]?.vis).toBe(SpecialVisibility.VISIBLE_TO_EVERYONE);

      // Actor should still exist in world
      expect(result.world.actors[actor.id]).toBeDefined();
    });

    it('should declare ACTOR_DID_MATERIALIZE event', () => {
      const actor = createTestActor({
        location: 'flux:place:test:tavern'
      });

      const place = createTestPlace({
        id: 'flux:place:test:tavern',
        entities: {}
      });

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [place.id]: place }
        })
      });

      const command = createCommand(CommandType.MATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      materializeActorReducer(context, command as MaterializeActorCommand);

      // Should have declared the materialize event
      expect(context.declareEvent).toHaveBeenCalled();
    });

    it('should handle actor not found error', () => {
      const context = createTestTransformerContext();
      const command = createCommand(CommandType.MATERIALIZE_ACTOR, {
        args: { actorId: 'flux:actor:test:nonexistent' as any }
      });

      const result = materializeActorReducer(context, command as MaterializeActorCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should handle place not found error', () => {
      const actor = createTestActor({
        location: 'flux:place:test:nonexistent'
      });

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor }
        })
      });

      const command = createCommand(CommandType.MATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      const result = materializeActorReducer(context, command as MaterializeActorCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalledWith('Place not found in `places` projection. Did you remember to load it?');
    });

    it('should overwrite existing entity visibility', () => {
      const actor = createTestActor({
        location: 'flux:place:test:tavern'
      });

      const place = createTestPlace({
        id: 'flux:place:test:tavern',
        entities: {
          [actor.id]: { vis: 'HIDDEN' as any } // Actor was hidden
        }
      });

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [place.id]: place }
        })
      });

      const command = createCommand(CommandType.MATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      const result = materializeActorReducer(context, command as MaterializeActorCommand);

      // Actor should now be visible
      const updatedPlace = result.world.places[place.id];
      expect(updatedPlace.entities[actor.id]?.vis).toBe(SpecialVisibility.VISIBLE_TO_EVERYONE);
    });
  });

  describe('handler integration', () => {
    it('should process a command end-to-end', () => {
      const actor = createTestActor({
        location: 'flux:place:test:tavern'
      });

      const place = createTestPlace({
        id: 'flux:place:test:tavern',
        entities: {}
      });

      const context = createTestTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [place.id]: place }
        })
      });

      const command = createCommand(CommandType.MATERIALIZE_ACTOR, {
        args: { actorId: actor.id }
      });

      // Handler should recognize the command
      expect(handler.handles(command as any)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(context, command as MaterializeActorCommand);

      // Verify the observable outcomes
      expect(result.world.places[place.id].entities[actor.id]).toBeDefined();
      expect(result.world.places[place.id].entities[actor.id]?.vis).toBe(SpecialVisibility.VISIBLE_TO_EVERYONE);
    });
  });

  describe('handler configuration', () => {
    it('should have empty dependencies', () => {
      expect(handler.dependencies).toEqual([]);
    });

    it('should use the correct reducer function', () => {
      expect(handler.reduce).toBe(materializeActorReducer);
    });
  });
});
