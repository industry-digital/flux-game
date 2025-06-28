import { describe, it, expect } from 'vitest';
import { CREATE_ACTOR, createActorCommandReducer, CreateActorCommand } from './handler';
import { EntityType, Actor, ActorURN, CommandType } from '@flux';
import {
  createTransformerContext,
  createCommand,
  createTestActor,
  createWorld
} from '~/testing';

describe('CreateActorCommandHandler', () => {
  const handler = new CREATE_ACTOR();

  describe('handles method', () => {
    it('should return true for CREATE_ACTOR commands', () => {
      const command = createCommand(CommandType.CREATE_ACTOR);
      expect(handler.handles(command)).toBe(true);
    });

    it('should return false for non-CREATE_ACTOR commands', () => {
      const command = createCommand(CommandType.CREATE_PLACE);
      expect(handler.handles(command)).toBe(false);
    });

    it('should return false for non-command inputs', () => {
      const intent = { __type: 'intent', text: 'create character test' };
      expect(handler.handles(intent as any)).toBe(false);
    });
  });

  describe('reducer behavior', () => {
    it('should add a new character to world.actors', () => {
      const context = createTransformerContext();
      const command = createCommand(CommandType.CREATE_ACTOR, {
        args: {
          name: 'Aria Blackwood',
          description: 'A skilled ranger from the northern forests'
        }
      });

      const result = createActorCommandReducer(context, command as CreateActorCommand);

      // Should have exactly one actor in the world
      const actorIds = Object.keys(result.world.actors);
      expect(actorIds).toHaveLength(1);

      // The actor should have the expected properties
      const character = result.world.actors[actorIds[0] as keyof typeof result.world.actors];
      expect(character).toBeDefined();
      expect(character.type).toBe(EntityType.ACTOR);
      expect(character.name).toBe('Aria Blackwood');
      expect(character.description).toBe('A skilled ranger from the northern forests');
    });

    it('should preserve existing actors in the world', () => {
      const existingActor = createTestActor({ name: 'Existing Actor' });
      const context = createTransformerContext({
        world: createWorld({
          actors: { [existingActor.id]: existingActor }
        })
      });

      const command = createCommand(CommandType.CREATE_ACTOR, {
        args: { name: 'New Actor' }
      });

      const result = createActorCommandReducer(context, command as CreateActorCommand);

      // Should have both actors
      expect(Object.keys(result.world.actors)).toHaveLength(2);
      expect(result.world.actors[existingActor.id]).toBe(existingActor);

      // Find the new actor
      const newActorId = Object.keys(result.world.actors).find(id => id !== existingActor.id);
      expect(newActorId).toBeDefined();
      expect(result.world.actors[newActorId! as keyof typeof result.world.actors].name).toBe('New Actor');
    });

    it('should handle minimal character input', () => {
      const context = createTransformerContext();
      const command = createCommand(CommandType.CREATE_ACTOR, { args: {} });

      const result = createActorCommandReducer(context, command as CreateActorCommand);

      const actorIds = Object.keys(result.world.actors);
      expect(actorIds).toHaveLength(1);

      const character = result.world.actors[actorIds[0] as keyof typeof result.world.actors];
      expect(character.type).toBe(EntityType.ACTOR);
      // Should have default values
      expect(character.name).toBeDefined();
      expect(character.description).toBeDefined();
    });

    it('should create character with specified location', () => {
      const context = createTransformerContext();
      const command = createCommand(CommandType.CREATE_ACTOR, {
        args: {
          name: 'Located Actor',
          location: 'flux:place:world:tavern' as any
        }
      });

      const result = createActorCommandReducer(context, command as CreateActorCommand);

      const actorIds = Object.keys(result.world.actors);
      const character = result.world.actors[actorIds[0] as ActorURN] as Actor;
      expect(character.name).toBe('Located Actor');
      expect(character.location).toBeDefined();
    });

    it('should return the updated context', () => {
      const context = createTransformerContext();
      const command = createCommand(CommandType.CREATE_ACTOR);

      const result = createActorCommandReducer(context, command as CreateActorCommand);

      expect(result).toBeDefined();
      expect(result.world).toBeDefined();
      expect(result.world.actors).toBeDefined();
    });
  });

  describe('handler integration', () => {
    it('should process a command end-to-end', () => {
      const context = createTransformerContext();
      const command = createCommand(CommandType.CREATE_ACTOR, {
        args: {
          name: 'Integration Test Actor',
          description: 'A character created during integration testing'
        }
      });

      // Handler should recognize the command
      expect(handler.handles(command)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(context, command as CreateActorCommand);

      // Verify the observable outcomes
      expect(Object.keys(result.world.actors)).toHaveLength(1);
    });
  });

  describe('handler configuration', () => {
    it('should have empty dependencies', () => {
      expect(handler.dependencies).toEqual([]);
    });

    it('should use the correct reducer function', () => {
      expect(handler.reduce).toBe(createActorCommandReducer);
    });
  });
});
