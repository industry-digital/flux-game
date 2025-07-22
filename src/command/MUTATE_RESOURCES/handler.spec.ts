import { describe, it, expect, beforeEach } from 'vitest';
import { mutateResourcesReducer, MUTATE_RESOURCES, MutateResourcesCommand } from './handler';
import { ResourceNodes } from '~/types/entity/resource';
import { TransformerContext } from '~/types/handler';
import { CommandType, Command } from '~/types/intent';
import { EventType } from '~/types/event';
import { PlaceURN } from '~/types/taxonomy';
import {
  createCommand,
  createTransformerContext,
  createTestPlace,
  createHandlerTest
} from '~/testing';

const createMockResources = (now = Date.now()): ResourceNodes => {
  return {
    ts: now,
    nodes: {
      'flux:resource:water': { quantity: 100, quality: 1, fullness: 1, last: { growth: now, decay: now } },
      'flux:resource:food': { quantity: 50, quality: 1, fullness: 0.5, last: { growth: now, decay: now } },
      'flux:resource:wood': { quantity: 75, quality: 1, fullness: 0.75, last: { growth: now, decay: now } }
    }
  };
};

describe('MUTATE_RESOURCES Handler', () => {
  let mockContext: TransformerContext;
  let mockPlace: any;
  let mockResources: ResourceNodes;
  let mockCommand: MutateResourcesCommand;
  let now: number;

  beforeEach(() => {
    now = Date.now();
    // Setup mock resources data
    mockResources = createMockResources(now);

    // Setup mock place using testing utilities
    mockPlace = createTestPlace({
      id: 'flux:place:test-location' as PlaceURN,
      resources: {
        ts: now - 1000,
        nodes: {
          'flux:resource:water': { quantity: 50, quality: 1, fullness: 0.5, last: { growth: now - 1000, decay: now - 1000 } },
          'flux:resource:food': { quantity: 25, quality: 1, fullness: 0.25, last: { growth: now - 1000, decay: now - 1000 } }
        }
      }
    });

    // Setup mock context using testing utilities
    mockContext = createTransformerContext({
      world: {
        actors: {},
        places: {
          'flux:place:test-location': mockPlace
        }
      }
    });

    // Setup mock command using testing utilities
    mockCommand = createCommand(CommandType.MUTATE_RESOURCES, {
      id: 'test-command-id',
      args: {
        placeId: 'flux:place:test-location' as PlaceURN,
        resources: mockResources
      }
    }) as MutateResourcesCommand;
  });

  describe('mutateResourcesReducer', () => {
    describe('Happy Path', () => {
      it('should update place resources with new resource data', () => {
        const result = mutateResourcesReducer(mockContext, mockCommand);

        expect(mockPlace.resources).toEqual(mockResources);
        expect(result).toBe(mockContext);
      });

      it('should generate RESOURCES_DID_CHANGE event with correct payload', () => {
        const previousResources = { ...mockPlace.resources };

        mutateResourcesReducer(mockContext, mockCommand);

        expect(mockContext.declareEvent).toHaveBeenCalledWith({
          type: EventType.RESOURCES_DID_CHANGE,
          trace: 'test-command-id',
          location: 'flux:place:test-location',
          payload: {
            from: previousResources,
            to: mockResources,
          }
        });
      });

      it('should handle place with no existing resources', () => {
        // Remove existing resources
        delete mockPlace.resources;

        mutateResourcesReducer(mockContext, mockCommand);

        expect(mockPlace.resources).toEqual(mockResources);
        expect(mockContext.declareEvent).toHaveBeenCalledWith({
          type: EventType.RESOURCES_DID_CHANGE,
          trace: 'test-command-id',
          location: 'flux:place:test-location',
          payload: {
            from: undefined,
            to: mockResources,
          }
        });
      });
    });

    describe('Error Cases', () => {
      it('should declare error when place does not exist', () => {
        const nonExistentCommand = createCommand(CommandType.MUTATE_RESOURCES, {
          id: 'test-command-id',
          args: {
            placeId: 'flux:place:nonexistent' as PlaceURN,
            resources: mockResources
          }
        }) as MutateResourcesCommand;

        const result = mutateResourcesReducer(mockContext, nonExistentCommand);

        expect(mockContext.declareError).toHaveBeenCalledWith('Place flux:place:nonexistent not found');
        expect(mockContext.declareEvent).not.toHaveBeenCalled();
        expect(result).toBe(mockContext);
      });

      it('should declare error when places object is empty', () => {
        const emptyWorldContext = createTransformerContext({
          world: {
            actors: {},
            places: {}
          }
        });

        const result = mutateResourcesReducer(emptyWorldContext, mockCommand);

        expect(emptyWorldContext.declareError).toHaveBeenCalledWith('Place flux:place:test-location not found');
        expect(emptyWorldContext.declareEvent).not.toHaveBeenCalled();
        expect(result).toBe(emptyWorldContext);
      });
    });

    describe('Edge Cases', () => {
      it('should handle resources with zero values', () => {
        const zeroResources: ResourceNodes = {
          ts: now,
          nodes: {
            'flux:resource:water': { quantity: 0, quality: 1, fullness: 0, last: { growth: now, decay: now } },
            'flux:resource:food': { quantity: 0, quality: 1, fullness: 0, last: { growth: now, decay: now } },
            'flux:resource:wood': { quantity: 0, quality: 1, fullness: 0, last: { growth: now, decay: now } }
          }
        };

        const zeroCommand = createCommand(CommandType.MUTATE_RESOURCES, {
          id: 'test-command-id',
          args: {
            placeId: 'flux:place:test-location' as PlaceURN,
            resources: zeroResources
          }
        }) as MutateResourcesCommand;

        mutateResourcesReducer(mockContext, zeroCommand);

        expect(mockPlace.resources).toEqual(zeroResources);
      });

      it('should handle resources with decimal values', () => {
        const decimalResources: ResourceNodes = {
          ts: now,
          nodes: {
            'flux:resource:water': { quantity: 10.5, quality: 0.75, fullness: 0.5, last: { growth: now, decay: now } },
            'flux:resource:food': { quantity: 25.75, quality: 0.8, fullness: 0.6, last: { growth: now, decay: now } },
            'flux:resource:wood': { quantity: 33.33, quality: 0.9, fullness: 0.7, last: { growth: now, decay: now } }
          }
        };

        const decimalCommand = createCommand(CommandType.MUTATE_RESOURCES, {
          id: 'test-command-id',
          args: {
            placeId: 'flux:place:test-location' as PlaceURN,
            resources: decimalResources
          }
        }) as MutateResourcesCommand;

        mutateResourcesReducer(mockContext, decimalCommand);

        expect(mockPlace.resources).toEqual(decimalResources);
      });

      it('should handle empty resources object', () => {
        const emptyResources: ResourceNodes = {
          ts: now,
          nodes: {}
        };

        const emptyCommand = createCommand(CommandType.MUTATE_RESOURCES, {
          id: 'test-command-id',
          args: {
            placeId: 'flux:place:test-location' as PlaceURN,
            resources: emptyResources
          }
        }) as MutateResourcesCommand;

        mutateResourcesReducer(mockContext, emptyCommand);

        expect(mockPlace.resources).toEqual(emptyResources);
      });
    });

    describe('State Mutation Verification', () => {
      it('should not mutate the input command', () => {
        const originalCommand = JSON.parse(JSON.stringify(mockCommand));

        mutateResourcesReducer(mockContext, mockCommand);

        expect(mockCommand).toEqual(originalCommand);
      });

      it('should not mutate the input resources object', () => {
        const originalResources = JSON.parse(JSON.stringify(mockResources));

        mutateResourcesReducer(mockContext, mockCommand);

        expect(mockCommand.args.resources).toEqual(originalResources);
      });

      it('should directly mutate the place object', () => {
        const placeReference = mockPlace;

        mutateResourcesReducer(mockContext, mockCommand);

        expect(placeReference.resources).toEqual(mockResources);
        expect(placeReference).toBe(mockPlace); // Same reference
      });
    });
  });

  describe('MUTATE_RESOURCES Class', () => {
    let handler: MUTATE_RESOURCES;

    beforeEach(() => {
      handler = new MUTATE_RESOURCES();
    });

    describe('handles method', () => {
      it('should return true for MUTATE_RESOURCES command', () => {
        const handlerTest = createHandlerTest(handler, mockCommand);
        const result = handlerTest.testHandles();

        expect(result.shouldHandleValidCommand()).toBe(true);
      });

      it('should return false for different command types', () => {
        const otherCommand = createCommand(CommandType.MOVE, {
          id: 'test-id',
          args: {}
        }) as Command;

        const result = handler.handles(otherCommand);
        expect(result).toBe(false);
      });

      it('should return false for command with wrong type but correct structure', () => {
        const wrongTypeCommand = {
          ...mockCommand,
          type: 'WRONG_TYPE' as any
        };

        const result = handler.handles(wrongTypeCommand);
        expect(result).toBe(false);
      });

      it('should return false for malformed command', () => {
        const malformedCommand = {
          type: CommandType.MUTATE_RESOURCES
          // Missing required fields
        } as any;

        const result = handler.handles(malformedCommand);
        expect(result).toBe(false);
      });
    });

    describe('reduce property', () => {
      it('should reference the mutateResourcesReducer function', () => {
        expect(handler.reduce).toBe(mutateResourcesReducer);
      });
    });

    describe('dependencies property', () => {
      it('should have empty dependencies array', () => {
        expect(handler.dependencies).toEqual([]);
      });
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle multiple resource updates', () => {
      const resources1: ResourceNodes = {
        ts: now,
        nodes: {
          'flux:resource:water': { quantity: 100, quality: 1, fullness: 1, last: { growth: now, decay: now } },
          'flux:resource:food': { quantity: 50, quality: 1, fullness: 0.5, last: { growth: now, decay: now } }
        }
      };

      const resources2: ResourceNodes = {
        ts: now + 1000,
        nodes: {
          'flux:resource:water': { quantity: 75, quality: 1, fullness: 0.75, last: { growth: now + 1000, decay: now + 1000 } },
          'flux:resource:food': { quantity: 25, quality: 1, fullness: 0.25, last: { growth: now + 1000, decay: now + 1000 } },
          'flux:resource:wood': { quantity: 60, quality: 1, fullness: 0.6, last: { growth: now + 1000, decay: now + 1000 } }
        }
      };

      const command1 = createCommand(CommandType.MUTATE_RESOURCES, {
        id: 'test-command-1',
        args: {
          placeId: 'flux:place:test-location' as PlaceURN,
          resources: resources1
        }
      }) as MutateResourcesCommand;

      const command2 = createCommand(CommandType.MUTATE_RESOURCES, {
        id: 'test-command-2',
        args: {
          placeId: 'flux:place:test-location' as PlaceURN,
          resources: resources2
        }
      }) as MutateResourcesCommand;

      mutateResourcesReducer(mockContext, command1);
      mutateResourcesReducer(mockContext, command2);

      expect(mockPlace.resources).toEqual(resources2);
      expect(mockContext.declareEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple places with different resources', () => {
      const place2 = createTestPlace({ id: 'flux:place:forest' as PlaceURN });
      const resources2: ResourceNodes = {
        ts: now,
        nodes: {
          'flux:resource:wood': { quantity: 200, quality: 1, fullness: 1, last: { growth: now, decay: now } },
          'flux:resource:stone': { quantity: 100, quality: 1, fullness: 0.5, last: { growth: now, decay: now } }
        }
      };

      const multiPlaceContext = createTransformerContext({
        world: {
          actors: {},
          places: {
            'flux:place:test-location': mockPlace,
            'flux:place:forest': place2
          }
        }
      });

      // Update first place
      mutateResourcesReducer(multiPlaceContext, mockCommand);

      // Update second place
      const command2 = createCommand(CommandType.MUTATE_RESOURCES, {
        id: 'test-command-2',
        args: {
          placeId: 'flux:place:forest' as PlaceURN,
          resources: resources2
        }
      }) as MutateResourcesCommand;

      mutateResourcesReducer(multiPlaceContext, command2);

      expect(multiPlaceContext.world.places['flux:place:test-location'].resources).toEqual(mockResources);
      expect(multiPlaceContext.world.places['flux:place:forest'].resources).toEqual(resources2);
      expect(multiPlaceContext.declareEvent).toHaveBeenCalledTimes(2);
    });
  });
});
