import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useActorMovement } from './movement';
import {
  EntityType,
  SpecialVisibility,
  EventType,
  CommandType
} from '~/types/domain';

// Mock the imported utility functions
vi.mock('~/lib/character/character.util', () => ({
  isCharacter: (entity: any) => entity.type === EntityType.CHARACTER,
  isCharacterImmobilized: (character: any) => character.attributes.isImmobilized === true,
}));

describe('useActorMovement', () => {
  // Test fixtures
  let mockContext;
  let mockCommand;
  let normalCharacter;
  let immobilizedCharacter;
  let nonCharacterEntity;
  let originPlace;
  let connectedDestination;
  let disconnectedDestination;
  let originEntities;
  let destinationEntities;

  beforeEach(() => {
    // Mock context with spies
    mockContext = {
      declareEvent: vi.fn(),
      declareSideEffect: vi.fn(),
      declareError: vi.fn(),
      getDeclaredEvents: vi.fn().mockReturnValue([]),
      getDeclaredSideEffects: vi.fn().mockReturnValue([]),
      getDeclaredErrors: vi.fn().mockReturnValue([])
    };

    // Mock command
    mockCommand = {
      id: 'cmd-123',
      type: CommandType.MOVE,
      ts: Date.now(),
      actor: 'character-123',
      args: {
        direction: 'north'
      }
    };

    // Create actor entities
    normalCharacter = {
      id: 'character-123',
      type: EntityType.CHARACTER,
      name: 'Normal Character',
      location: 'place-origin',
      attributes: {
        isImmobilized: false
      }
    };

    immobilizedCharacter = {
      id: 'character-456',
      type: EntityType.CHARACTER,
      name: 'Immobilized Character',
      location: 'place-origin',
      attributes: {
        isImmobilized: true
      }
    };

    nonCharacterEntity = {
      id: 'item-789',
      type: EntityType.ITEM,
      name: 'Some Item',
      location: 'place-origin',
      attributes: {}
    };

    // Create places
    originPlace = {
      id: 'place-origin',
      type: EntityType.PLACE,
      name: 'Origin Place',
      attributes: {
        exits: {
          north: {
            name: 'north',
            to: 'place-connected'
          }
        }
      }
    };

    connectedDestination = {
      id: 'place-connected',
      type: EntityType.PLACE,
      name: 'Connected Destination',
      attributes: {
        exits: {
          south: {
            name: 'south',
            to: 'place-origin'
          }
        }
      }
    };

    disconnectedDestination = {
      id: 'place-disconnected',
      type: EntityType.PLACE,
      name: 'Disconnected Destination',
      attributes: {
        exits: {}
      }
    };

    // Create entity collections
    originEntities = {
      [normalCharacter.id]: {
        ...normalCharacter,
        visibility: SpecialVisibility.VISIBLE_TO_EVERYONE
      },
      [immobilizedCharacter.id]: {
        ...immobilizedCharacter,
        visibility: SpecialVisibility.VISIBLE_TO_EVERYONE
      },
      [nonCharacterEntity.id]: {
        ...nonCharacterEntity,
        visibility: SpecialVisibility.VISIBLE_TO_EVERYONE
      }
    };

    destinationEntities = {};
  });

  describe('isMoveAllowed', () => {
    it('should return false when destination is not connected to origin', () => {
      const { isMoveAllowed } = useActorMovement({
        actor: normalCharacter,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      const result = isMoveAllowed(disconnectedDestination, {});

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('not_connected');
    });

    it('should return true when actor is not a character', () => {
      const { isMoveAllowed } = useActorMovement({
        actor: nonCharacterEntity,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      const result = isMoveAllowed(connectedDestination, {});

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return false when actor is an immobilized character', () => {
      const { isMoveAllowed } = useActorMovement({
        actor: immobilizedCharacter,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      const result = isMoveAllowed(connectedDestination, {});

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('immobilized');
    });

    it('should return true when actor is a non-immobilized character', () => {
      const { isMoveAllowed } = useActorMovement({
        actor: normalCharacter,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      const result = isMoveAllowed(connectedDestination, {});

      expect(result.allowed).toBe(true);
      expect(result.reason).toBeUndefined();
    });
  });

  describe('moveTo', () => {
    it('should return false and declare failure event when movement is not allowed', () => {
      const { moveTo } = useActorMovement({
        actor: normalCharacter,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      const result = moveTo(disconnectedDestination, {});

      expect(result).toBe(false);
      expect(mockContext.declareEvent).toHaveBeenCalledWith({
        type: EventType.ACTOR_MOVEMENT_DID_FAIL,
        payload: {
          exit: 'unknown',
          cause: 'not_connected',
        },
      });
    });

    it('should update actor location when movement is allowed', () => {
      const { moveTo } = useActorMovement({
        actor: normalCharacter,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      moveTo(connectedDestination, destinationEntities);

      expect(normalCharacter.location).toBe(connectedDestination.id);
    });

    it('should remove actor from origin entities when movement is allowed', () => {
      const { moveTo } = useActorMovement({
        actor: normalCharacter,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      moveTo(connectedDestination, destinationEntities);

      expect(originEntities[normalCharacter.id]).toBeUndefined();
    });

    it('should add actor to destination entities when movement is allowed', () => {
      const { moveTo } = useActorMovement({
        actor: normalCharacter,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      moveTo(connectedDestination, destinationEntities);

      expect(destinationEntities[normalCharacter.id]).toBeDefined();
      expect(destinationEntities[normalCharacter.id].visibility).toBe(SpecialVisibility.VISIBLE_TO_EVERYONE);
    });

    it('should declare a movement event when movement is allowed', () => {
      const { moveTo } = useActorMovement({
        actor: normalCharacter,
        origin: originPlace,
        originEntities,
        context: mockContext
      }, mockCommand);

      moveTo(connectedDestination, destinationEntities);

      expect(mockContext.declareEvent).toHaveBeenCalledWith({
        type: EventType.ACTOR_DID_MOVE,
        payload: {
          actor: normalCharacter,
          from: {
            place: originPlace.id,
            exit: 'north',
          },
          to: {
            place: connectedDestination.id,
            entrance: 'south',
          },
        }
      });
    });
  });
});
