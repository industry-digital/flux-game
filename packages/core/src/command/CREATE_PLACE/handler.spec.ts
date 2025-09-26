import { describe, it, expect } from 'vitest';
import {
  CREATE_PLACE,
  CreatePlaceCommand,
  createPlaceCommandReducer
} from './handler';
import { CommandType } from '~/types/intent';
import { EntityType } from '~/types/entity/entity';
import { createPlaceUrn } from '~/lib/taxonomy';
import { Direction } from '~/types/world/space';
import {
  createTestTransformerContext,
  createCommand,
  createWorld
} from '~/testing';

describe('CreatePlaceCommandHandler', () => {
  const handler = new CREATE_PLACE();

  describe('handles method', () => {
    it('should return true for CREATE_PLACE commands', () => {
      const command = createCommand(CommandType.CREATE_PLACE, {
        args: {
          id: createPlaceUrn('breach', 'warrens'),
          name: 'The Warrens',
          description: 'The Warrens are a collection of small, cramped apartments and shanties that are home to the city\'s poorest and most desperate.',
        }
      });

      expect(handler.handles(command)).toBe(true);
    });

    it('should return false for non-CREATE_PLACE commands', () => {
      const command = createCommand(CommandType.CREATE_ACTOR);
      expect(handler.handles(command)).toBe(false);
    });

    it('should return false for non-command inputs', () => {
      const intent = { __type: 'intent', text: 'create place tavern' };
      expect(handler.handles(intent as any)).toBe(false);
    });
  });

  describe('reducer behavior', () => {
    it('should add a new place to world.places', () => {
      const context = createTestTransformerContext();
      const command = createCommand(CommandType.CREATE_PLACE, {
        args: {
          id: createPlaceUrn('test', 'rusty-dragon-tavern'),
          name: 'The Rusty Dragon Tavern',
          description: 'A cozy tavern filled with the warmth of hearth and good company'
        }
      });

      const result = createPlaceCommandReducer(context, command as CreatePlaceCommand);

      // Should have exactly one place in the world
      const placeIds = Object.keys(result.world.places);
      expect(placeIds).toHaveLength(1);

      // The place should have the expected properties
      const place = result.world.places[placeIds[0] as keyof typeof result.world.places];
      expect(place).toBeDefined();
      expect(place.type).toBe(EntityType.PLACE);
      expect(place.name).toBe('The Rusty Dragon Tavern');
      expect(place.description).toBe('A cozy tavern filled with the warmth of hearth and good company');
    });

    it('should preserve existing places in the world', () => {
      const existingPlaceId = 'flux:place:world:existing';
      const existingPlace = {
        id: existingPlaceId,
        type: EntityType.PLACE,
        name: 'Existing Place'
      };

      const context = createTestTransformerContext({
        world: createWorld({
          places: { [existingPlaceId]: existingPlace as any }
        })
      });

      const command = createCommand(CommandType.CREATE_PLACE, {
        args: {
          id: createPlaceUrn('test', 'new-place'),
          name: 'New Place'
        }
      });

      const result = createPlaceCommandReducer(context, command as CreatePlaceCommand);

      // Should have both places
      expect(Object.keys(result.world.places)).toHaveLength(2);
      expect(result.world.places[existingPlaceId]).toBe(existingPlace);

      // Find the new place
      const newPlaceId = Object.keys(result.world.places).find(id => id !== existingPlaceId);
      expect(newPlaceId).toBeDefined();
      expect(result.world.places[newPlaceId! as keyof typeof result.world.places].name).toBe('New Place');
    });

    it('should handle minimal place input', () => {
      const context = createTestTransformerContext();
      const command = createCommand(CommandType.CREATE_PLACE, {
        args: {
          id: createPlaceUrn('test', 'minimal-place')
        }
      });

      const result = createPlaceCommandReducer(context, command as CreatePlaceCommand);

      const placeIds = Object.keys(result.world.places);
      expect(placeIds).toHaveLength(1);

      const place = result.world.places[placeIds[0] as keyof typeof result.world.places];
      expect(place.type).toBe(EntityType.PLACE);
      // Should have default values
      expect(place.name).toBeDefined();
      expect(place.description).toBeDefined();
      expect(place.exits).toBeDefined();
    });

    it('should create place with exits', () => {
      const context = createTestTransformerContext();
      const command = createCommand(CommandType.CREATE_PLACE, {
        args: {
          id: createPlaceUrn('test', 'central-plaza'),
          name: 'Central Plaza',
          description: 'A bustling central area',
          biome: 'urban' as any,
          climate: 'temperate' as any,
          exits: {
            [Direction.NORTH]: {
              direction: Direction.NORTH,
              label: 'Northern District',
              to: createPlaceUrn('world', 'north')
            }
          }
        }
      });

      const result = createPlaceCommandReducer(context, command as CreatePlaceCommand);
      const placeIds = Object.keys(result.world.places);
      const place = result.world.places[placeIds[0] as keyof typeof result.world.places];

      expect(place.name).toBe('Central Plaza');
      expect(place.exits).toBeDefined();
      // Exit inputs are now a dictionary, and the output is also a dictionary
      expect(place.exits[Direction.NORTH]).toBeDefined();
      expect(place.exits[Direction.NORTH]?.label).toBe('Northern District');
    });

    it('should return the updated context', () => {
      const context = createTestTransformerContext();
      const command = createCommand(CommandType.CREATE_PLACE, {
        args: {
          id: createPlaceUrn('test', 'test-place'),
          name: 'Test Place'
        }
      });

      const result = createPlaceCommandReducer(context, command as CreatePlaceCommand);

      expect(result).toBeDefined();
      expect(result.world).toBeDefined();
      expect(result.world.places).toBeDefined();
    });
  });

  describe('handler integration', () => {
    it('should process a command end-to-end', () => {
      const context = createTestTransformerContext();
      const command = createCommand(CommandType.CREATE_PLACE, {
        args: {
          id: createPlaceUrn('test', 'integration-place'),
          name: 'Integration Test Place',
          description: 'A place created during integration testing'
        }
      });

      // Handler should recognize the command
      expect(handler.handles(command)).toBe(true);

      // Handler should process the command successfully
      const result = handler.reduce(context, command as CreatePlaceCommand);

      // Verify the observable outcomes
      expect(Object.keys(result.world.places)).toHaveLength(1);
    });
  });

  describe('handler configuration', () => {
    it('should have empty dependencies', () => {
      expect(handler.dependencies).toEqual([]);
    });

    it('should use the correct reducer function', () => {
      expect(handler.reduce).toBe(createPlaceCommandReducer);
    });
  });
});
