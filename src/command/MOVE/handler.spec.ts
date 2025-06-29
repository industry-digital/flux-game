import { describe, it, expect } from 'vitest';
import {
  MOVE,
  MoveCommand,
  actorMovementReducer
} from './handler';
import { CommandType, SpecialVisibility } from '@flux';
import { createPlaceUrn } from '~/lib/taxonomy';
import { Direction } from '~/types/world/space';
import {
  createTransformerContext,
  createCommand,
  createTestActor,
  createTestPlace,
  createWorld
} from '~/testing';

describe('MoveCommandHandler', () => {
  const handler = new MOVE();

  describe('handles method', () => {
    it('should return true for MOVE commands', () => {
      const command = createCommand(CommandType.MOVE, {
        actor: 'flux:actor:test:test-actor' as any,
        args: { dest: 'flux:place:test:destination' as any }
      });

      expect(handler.handles(command)).toBe(true);
    });

    it('should return false for non-MOVE commands', () => {
      const command = createCommand(CommandType.CREATE_ACTOR);
      expect(handler.handles(command)).toBe(false);
    });

    it('should return false for non-command inputs', () => {
      const intent = { __type: 'intent', text: 'move north' };
      expect(handler.handles(intent as any)).toBe(false);
    });
  });

  describe('reducer behavior', () => {
    it('should move actor between connected places', () => {
      const originId = createPlaceUrn('test', 'tavern');
      const destId = createPlaceUrn('test', 'street');

            const actor = createTestActor({
        name: 'Test Actor',
        location: originId
      });

      const origin = createTestPlace({
        id: originId,
        name: 'The Tavern',
        entities: {
          [actor.id]: { vis: SpecialVisibility.VISIBLE_TO_EVERYONE }
        },
        exits: [
          {
            direction: Direction.NORTH,
            label: 'To the Street',
            to: destId
          }
        ]
      });

      const destination = createTestPlace({
        id: destId,
        name: 'The Street',
        entities: {}
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [originId]: origin, [destId]: destination }
        })
      });

      const command = createCommand(CommandType.MOVE, {
        actor: actor.id,
        args: { dest: destId }
      });

      const result = actorMovementReducer(context, command as MoveCommand);

      // Actor should be removed from origin
      expect(result.world.places[originId].entities[actor.id]).toBeUndefined();

      // Actor should be added to destination
      expect(result.world.places[destId].entities[actor.id]).toBeDefined();

      // Actor location should be updated
      expect(result.world.actors[actor.id].location).toBe(destId);
    });

    it('should declare ACTOR_DID_MOVE event', () => {
      const originId = createPlaceUrn('test', 'tavern');
      const destId = createPlaceUrn('test', 'street');

      const actor = createTestActor({
        location: originId
      });

      const origin = createTestPlace({
        id: originId,
        entities: { [actor.id]: { vis: SpecialVisibility.VISIBLE_TO_EVERYONE } },
        exits: [
          {
            direction: Direction.NORTH,
            label: 'To the Street',
            to: destId
          }
        ]
      });

      const destination = createTestPlace({
        id: destId,
        entities: {}
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [originId]: origin, [destId]: destination }
        })
      });

      const command = createCommand(CommandType.MOVE, {
        actor: actor.id,
        args: { dest: destId }
      });

      actorMovementReducer(context, command as MoveCommand);

      // Should have declared the move event
      expect(context.declareEvent).toHaveBeenCalledWith({
        type: 'actor:moved',
        actor: actor.id,
        location: originId,
        payload: {
          destination: destId,
        },
        trace: command.id
      });
    });

    it('should handle actor not found error', () => {
      const context = createTransformerContext();
      const command = createCommand(CommandType.MOVE, {
        actor: 'flux:actor:test:nonexistent' as any,
        args: { dest: 'flux:place:test:destination' as any }
      });

      const result = actorMovementReducer(context, command as MoveCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalledWith('Actor not found in `actors` projection');
    });

    it('should handle actor without location error', () => {
      const actor = createTestActor({
        location: undefined as any
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor }
        })
      });

      const command = createCommand(CommandType.MOVE, {
        actor: actor.id,
        args: { dest: 'flux:place:test:destination' as any }
      });

      const result = actorMovementReducer(context, command as MoveCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalledWith('Actor `location` not found in `places` projection');
    });

    it('should handle origin place not found error', () => {
      const actor = createTestActor({
        location: 'flux:place:test:nonexistent'
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor }
        })
      });

      const command = createCommand(CommandType.MOVE, {
        actor: actor.id,
        args: { dest: 'flux:place:test:destination' as any }
      });

      const result = actorMovementReducer(context, command as MoveCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalledWith('Actor `location` not found in `places` projection');
    });

    it('should handle destination place not found error', () => {
      const originId = createPlaceUrn('test', 'tavern');
      const actor = createTestActor({
        location: originId
      });

      const origin = createTestPlace({
        id: originId,
        entities: { [actor.id]: { vis: SpecialVisibility.VISIBLE_TO_EVERYONE } }
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [originId]: origin }
        })
      });

      const command = createCommand(CommandType.MOVE, {
        actor: actor.id,
        args: { dest: 'flux:place:test:nonexistent' as any }
      });

      const result = actorMovementReducer(context, command as MoveCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalledWith('Movement destination not found in `places` projection');
    });

    it('should handle no connecting exit error', () => {
      const originId = createPlaceUrn('test', 'tavern');
      const destId = createPlaceUrn('test', 'unreachable');

      const actor = createTestActor({
        location: originId
      });

      const origin = createTestPlace({
        id: originId,
        entities: { [actor.id]: { vis: SpecialVisibility.VISIBLE_TO_EVERYONE } },
        exits: [
          {
            direction: Direction.NORTH,
            label: 'To somewhere else',
            to: createPlaceUrn('test', 'different-place')
          }
        ]
      });

      const destination = createTestPlace({
        id: destId,
        entities: {}
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [originId]: origin, [destId]: destination }
        })
      });

      const command = createCommand(CommandType.MOVE, {
        actor: actor.id,
        args: { dest: destId }
      });

      const result = actorMovementReducer(context, command as MoveCommand);

      // Should return unmodified context
      expect(result).toBe(context);

      // Should declare error
      expect(context.declareError).toHaveBeenCalledWith('There is no exit that connects the origin and destination.');
    });
  });

  describe('handler integration', () => {
    it('should process a command end-to-end', () => {
      const originId = createPlaceUrn('test', 'tavern');
      const destId = createPlaceUrn('test', 'street');

      const actor = createTestActor({
        location: originId
      });

      const origin = createTestPlace({
        id: originId,
        entities: { [actor.id]: { vis: SpecialVisibility.VISIBLE_TO_EVERYONE } },
        exits: [
          {
            direction: Direction.NORTH,
            label: 'To the Street',
            to: destId
          }
        ]
      });

      const destination = createTestPlace({
        id: destId,
        entities: {}
      });

      const context = createTransformerContext({
        world: createWorld({
          actors: { [actor.id]: actor },
          places: { [originId]: origin, [destId]: destination }
        })
      });

      const command = createCommand(CommandType.MOVE, {
        actor: actor.id,
        args: { dest: destId }
      });

      // Handler should recognize the command
      expect(handler.handles(command)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(context, command as MoveCommand);

      // Verify the observable outcomes
      expect(result.world.places[originId].entities[actor.id]).toBeUndefined();
      expect(result.world.places[destId].entities[actor.id]).toBeDefined();
      expect(result.world.actors[actor.id].location).toBe(destId);
    });
  });

  describe('handler configuration', () => {
    it('should have empty dependencies', () => {
      expect(handler.dependencies).toEqual([]);
    });

    it('should use the correct reducer function', () => {
      expect(handler.reduce).toBe(actorMovementReducer);
    });
  });
});
