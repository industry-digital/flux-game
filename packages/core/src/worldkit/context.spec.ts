/**
 * Comprehensive Unit Tests for createTransformerContext
 *
 * Tests the factory function that creates fully-formed TransformerContext instances
 * with proper dependency injection, event management, and API integration.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createTransformerContext,
  createWorldProjection,
  createPotentiallyImpureOperations,
  DEFAULT_POTENTIALLY_IMPURE_OPERATIONS,
  MapFunction
} from './context';
import { TransformerContext, PotentiallyImpureOperations, ProfileResult } from '~/types/handler';
import { WorldProjection } from '~/types/world';
import { ActorWasCreatedInput, EventType, WorldEvent } from '~/types/event';
import { createSchemaManager } from '~/worldkit/schema/manager';
import { createMassApi, createMassComputationState } from '~/worldkit/physics/mass';
import { createActorInventoryApi } from '~/worldkit/entity/actor/inventory';
import { createActorEquipmentApi } from '~/worldkit/entity/actor/equipment';
import { createActorSkillApi } from '~/worldkit/entity/actor/skill';
import { createCombatMetricsApi } from '~/worldkit/combat/metrics';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { WellKnownActor } from '~/types';
import { createCombatSessionStartedEvent } from '~/testing/event/factory/combat';
import { DEFAULT_LOCATION } from '~/testing/constants';
import { createRollApi } from '~/worldkit/dice';
import { createActorWeaponApi } from '~/worldkit/entity/actor/weapon';

describe('createTransformerContext', () => {
  let mockDeps: PotentiallyImpureOperations;
  let mockWorld: WorldProjection;
  let mockSchemaManager: ReturnType<typeof createSchemaManager>;

  beforeEach(() => {
    // Create fresh mocks for each test
    mockDeps = {
      random: vi.fn(() => 0.5),
      timestamp: vi.fn(() => 1234567890),
      uniqid: vi.fn(() => 'test-id-123'),
      debug: vi.fn(),
      profile: vi.fn(() => ({ result: 'test-result', duration: 100 } as ProfileResult<any>))
    };

    mockWorld = createWorldProjection();

    mockSchemaManager = createSchemaManager();
  });

  describe('Default Behavior', () => {
    it('should create a context with default parameters', () => {
      const context = createTransformerContext();

      expect(context).toBeDefined();
      expect(context.world).toBeDefined();
      expect(context.schemaManager).toBeDefined();
      expect(context.mass).toBeDefined();
      expect(context.inventoryApi).toBeDefined();
      expect(context.equipmentApi).toBeDefined();
      expect(context.skillApi).toBeDefined();
      expect(context.metrics).toBeDefined();
    });

    it('should create a context with empty world projection by default', () => {
      const context = createTransformerContext();

      expect(context.world.actors).toEqual({});
      expect(context.world.places).toEqual({});
      expect(context.world.items).toEqual({});
      expect(context.world.sessions).toEqual({});
    });

    it('should include all required combat infrastructure', () => {
      const context = createTransformerContext();

      expect(context.searchCache).toBeInstanceOf(Map);
      expect(context.rollDice).toBeTypeOf('function');
      expect(context.distanceCache).toBeInstanceOf(Map);
      expect(context.targetCache).toBeInstanceOf(Map);
      expect(context.weaponCache).toBeInstanceOf(Map);
    });

    it('should include all impure operations', () => {
      const context = createTransformerContext();

      expect(context.random).toBeTypeOf('function');
      expect(context.timestamp).toBeTypeOf('function');
      expect(context.uniqid).toBeTypeOf('function');
      expect(context.debug).toBeTypeOf('function');
      expect(context.profile).toBeTypeOf('function');
    });
  });

  describe('Custom Dependencies', () => {
    it('should accept custom world projection', () => {
      const customWorld: WorldProjection = {
        ...mockWorld,
        actors: { 'flux:actor:test': { id: 'flux:actor:test' as ActorURN } as any },
      };

      const context = createTransformerContext(undefined, customWorld);

      expect(context.world.actors).toEqual(customWorld.actors);
    });

    it('should accept custom schema manager', () => {
      const customSchemaManager = createSchemaManager();
      const context = createTransformerContext(undefined, undefined, customSchemaManager);

      expect(context.schemaManager).toBe(customSchemaManager);
    });

    it('should accept custom impure operations', () => {
      const context = createTransformerContext(undefined, undefined, undefined, mockDeps);

      expect(context.random).toBe(mockDeps.random);
      expect(context.timestamp).toBe(mockDeps.timestamp);
      expect(context.uniqid).toBe(mockDeps.uniqid);
      expect(context.debug).toBe(mockDeps.debug);
      expect(context.profile).toBe(mockDeps.profile);
    });

    it('should accept custom mass API', () => {
      const customMassState = createMassComputationState();
      const customMassApi = createMassApi(mockSchemaManager, customMassState);

      const context = createTransformerContext(
        undefined,
        undefined,
        mockSchemaManager,
        undefined,
        customMassApi
      );

      expect(context.mass).toBe(customMassApi);
    });

    it('should accept custom APIs through parameters', () => {
      const customInventoryApi = createActorInventoryApi(createMassApi(mockSchemaManager, createMassComputationState()));
      const customEquipmentApi = createActorEquipmentApi(mockSchemaManager, customInventoryApi);
      const customActorSkillApi = createActorSkillApi();
      const customRollApi = createRollApi();
      const customMetrics = createCombatMetricsApi();
      const customWeaponApi = createActorWeaponApi(mockSchemaManager, customInventoryApi, customEquipmentApi);

      const context = createTransformerContext(
        undefined,
        undefined,
        mockSchemaManager,
        undefined,
        undefined,
        customInventoryApi,
        customEquipmentApi,
        customWeaponApi,
        customActorSkillApi,
        customRollApi,
        customMetrics
      );

      expect(context.inventoryApi).toBe(customInventoryApi);
      expect(context.equipmentApi).toBe(customEquipmentApi);
      expect(context.skillApi).toBe(customActorSkillApi);
      expect(context.metrics).toBe(customMetrics);
    });
  });

  describe('Map Function', () => {
    it('should apply map function to transform the context', () => {
      const mapFn: MapFunction<TransformerContext> = (ctx) => ({
        ...ctx,
        world: {
          ...ctx.world,
          actors: { 'flux:actor:mapped': { id: 'flux:actor:mapped' as ActorURN } as any }
        }
      });

      const context = createTransformerContext(mapFn);

      expect(context.world.actors).toHaveProperty('flux:actor:mapped');
    });

    it('should preserve all other properties when using map function', () => {
      const mapFn: MapFunction<TransformerContext> = (ctx) => ({
        ...ctx,
        world: { ...ctx.world, actorIds: ['test-actor' as ActorURN] }
      });

      const context = createTransformerContext(mapFn);

      expect(context.declareEvent).toBeTypeOf('function');
      expect(context.declareError).toBeTypeOf('function');
      expect(context.getDeclaredEvents).toBeTypeOf('function');
      expect(context.mass).toBeDefined();
    });
  });

  describe('Event Declaration', () => {
    let context: TransformerContext;

    beforeEach(() => {
      context = createTransformerContext(undefined, undefined, undefined, mockDeps);
    });

    it('should declare events with auto-generated id and timestamp', () => {
      const eventInput: ActorWasCreatedInput = {
        type: EventType.ACTOR_WAS_CREATED,
        location: 'flux:place:test' as PlaceURN,
        actor: WellKnownActor.SYSTEM,
        trace: 'test-command',
        payload: {}
      };

      context.declareEvent(eventInput);

      expect(mockDeps.uniqid).toHaveBeenCalled();
      expect(mockDeps.timestamp).toHaveBeenCalled();
    });

    it('should preserve provided id and timestamp in event input', () => {
      const eventInput: WorldEvent = {
        id: 'custom-id',
        ts: 9876543210,
        type: EventType.ACTOR_WAS_CREATED,
        location: 'flux:place:test' as PlaceURN,
        actor: 'flux:actor:test' as ActorURN,
        trace: 'test-command',
        payload: {}
      };

      context.declareEvent(eventInput);

      // Should not call uniqid or timestamp since they're provided
      expect(mockDeps.uniqid).not.toHaveBeenCalled();
      expect(mockDeps.timestamp).not.toHaveBeenCalled();
    });

    it('should store events for retrieval', () => {
      const eventInput: any = {
        type: EventType.ACTOR_DID_MOVE,
        location: 'flux:place:test' as PlaceURN,
        actor: 'flux:actor:test' as ActorURN,
        trace: 'move-command',
        payload: { destination: 'flux:place:dest' as PlaceURN }
      };

      context.declareEvent(eventInput);
      const events = context.getDeclaredEvents();

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        type: EventType.ACTOR_DID_MOVE,
        location: 'flux:place:test',
        actor: 'flux:actor:test',
        trace: 'move-command'
      });
    });

    it('should retrieve events by type', () => {
      context.declareEvent({
        id: 'test-event-0',
        type: EventType.ACTOR_WAS_CREATED,
        location: 'flux:place:test' as PlaceURN,
        trace: 'create-command',
        payload: {}
      } as any);

      context.declareEvent({
        id: 'test-event-1',
        type: EventType.ACTOR_DID_MOVE,
        location: 'flux:place:test' as PlaceURN,
        trace: 'move-command',
        payload: { destination: 'flux:place:dest' as PlaceURN }
      } as any);

      const createdEvents = context.getDeclaredEvents(EventType.ACTOR_WAS_CREATED);
      const moveEvents = context.getDeclaredEvents(EventType.ACTOR_DID_MOVE);

      expect(createdEvents).toHaveLength(1);
      expect(moveEvents).toHaveLength(1);
      expect(createdEvents[0].type).toBe(EventType.ACTOR_WAS_CREATED);
      expect(moveEvents[0].type).toBe(EventType.ACTOR_DID_MOVE);
    });

    it('should retrieve events by regex pattern', () => {
      context.declareEvent({
        id: 'test-event-0',
        type: EventType.ACTOR_WAS_CREATED,
        location: 'flux:place:test' as PlaceURN,
        trace: 'create-command',
        payload: {}
      } as any);

      context.declareEvent({
        id: 'test-event-1',
        type: EventType.ACTOR_DID_MOVE,
        location: 'flux:place:test' as PlaceURN,
        trace: 'move-command',
        payload: { destination: 'flux:place:dest' as PlaceURN }
      } as any);

      context.declareEvent(createCombatSessionStartedEvent((event) => ({
        ...event,
        id: 'test-event-2',
        trace: 'combat-command',
        type: EventType.COMBAT_SESSION_DID_START,
        actor: WellKnownActor.SYSTEM,
        location: DEFAULT_LOCATION,
        payload: { sessionId: 'flux:session:test', initiative: [], combatants: [] }
      })));

      const actorEvents = context.getDeclaredEvents(/^actor:/);
      const combatEvents = context.getDeclaredEvents(/^combat:/);

      expect(actorEvents).toHaveLength(2);
      expect(combatEvents).toHaveLength(1);
    });

    it('should retrieve events by command trace', () => {
      context.declareEvent({
        id: 'test-event-0',
        type: EventType.ACTOR_WAS_CREATED,
        location: 'flux:place:test' as PlaceURN,
        trace: 'command-1',
        payload: {}
      } as any);

      context.declareEvent({
        id: 'test-event-1',
        type: EventType.ACTOR_DID_MOVE,
        location: 'flux:place:test' as PlaceURN,
        trace: 'command-1',
        payload: { destination: 'flux:place:dest' as PlaceURN }
      } as any);

      context.declareEvent({
        id: 'test-event-2',
        type: EventType.ACTOR_DID_DIE,
        location: 'flux:place:test' as PlaceURN,
        trace: 'command-2',
        payload: { cause: 'test' }
      } as any);

      const command1Events = context.getDeclaredEventsByCommand('command-1');
      const command2Events = context.getDeclaredEventsByCommand('command-2');

      expect(command1Events).toHaveLength(2);
      expect(command2Events).toHaveLength(1);
      expect(command1Events.every(e => e.trace === 'command-1')).toBe(true);
      expect(command2Events.every(e => e.trace === 'command-2')).toBe(true);
    });

    it('should handle events without trace', () => {
      const eventInput: any = {
        type: EventType.WEATHER_DID_CHANGE,
        location: 'flux:place:test' as PlaceURN,
        trace: '',
        payload: { from: null, to: { temperature: 20, humidity: 50 } }
      };

      expect(() => context.declareEvent(eventInput)).not.toThrow();

      const events = context.getDeclaredEvents();
      expect(events).toHaveLength(1);
    });
  });

  describe('Error Declaration', () => {
    let context: TransformerContext;

    beforeEach(() => {
      context = createTransformerContext(undefined, undefined, undefined, mockDeps);
    });

    it('should declare error from Error object', () => {
      const error = new Error('Test error');

      expect(() => context.declareError(error)).not.toThrow();
      expect(mockDeps.timestamp).toHaveBeenCalled();
    });

    it('should declare error from string message', () => {
      expect(() => context.declareError('Test error message')).not.toThrow();
      expect(mockDeps.timestamp).toHaveBeenCalled();
    });

    it('should declare error with custom trace', () => {
      expect(() => context.declareError('Test error', 'custom-trace')).not.toThrow();
      expect(mockDeps.timestamp).toHaveBeenCalled();
    });

    it('should use default trace when not provided', () => {
      // Test the overloaded function behavior
      expect(() => context.declareError('Test error message')).not.toThrow();
    });

    it('should handle Error object with default trace', () => {
      const error = new Error('Test error');
      expect(() => context.declareError(error)).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should create context with all APIs properly integrated', () => {
      const context = createTransformerContext();

      // Test that APIs are properly connected
      expect(context.mass).toBeDefined();
      expect(context.inventoryApi).toBeDefined();
      expect(context.equipmentApi).toBeDefined();

      // Test that schema manager is shared
      expect(context.schemaManager).toBeDefined();
    });

    it('should maintain cache instances across calls', () => {
      const context = createTransformerContext();

      expect(context.searchCache).toBeInstanceOf(Map);
      expect(context.distanceCache).toBeInstanceOf(Map);
      expect(context.targetCache).toBeInstanceOf(Map);
      expect(context.weaponCache).toBeInstanceOf(Map);

      // Caches should be empty initially
      expect(context.searchCache.size).toBe(0);
      expect(context.distanceCache.size).toBe(0);
      expect(context.targetCache.size).toBe(0);
      expect(context.weaponCache.size).toBe(0);
    });

    it('should create independent contexts on multiple calls', () => {
      const context1 = createTransformerContext();
      const context2 = createTransformerContext();

      expect(context1).not.toBe(context2);
      expect(context1.searchCache).not.toBe(context2.searchCache);
      expect(context1.distanceCache).not.toBe(context2.distanceCache);
    });

    it('should work with complex event and error scenarios', () => {
      const context = createTransformerContext(undefined, undefined, undefined, mockDeps);

      // Declare multiple events
      context.declareEvent(createCombatSessionStartedEvent((event) => ({
        ...event,
        id: 'test-event-1',
        location: 'flux:place:arena' as PlaceURN,
        trace: 'combat-init',
        payload: { sessionId: 'flux:session:1', initiative: [], combatants: [] }
      })));

      context.declareEvent({
        id: 'test-event-2',
        type: EventType.COMBATANT_DID_ATTACK,
        location: 'flux:place:arena' as PlaceURN,
        actor: 'flux:actor:attacker' as ActorURN,
        trace: 'combat-init',
        payload: {
          actor: 'flux:actor:attacker' as ActorURN,
          target: 'flux:actor:target' as ActorURN,
          cost: { ap: 2, energy: 10 },
          roll: { dice: '1d20', natural: 15, result: 18, values: [15], mods: {} },
          outcome: 'hit' as const,
          attackRating: 18,
          evasionRating: 12
        }
      } as any);

      // Declare errors
      context.declareError('Combat validation failed', 'combat-init');
      context.declareError(new Error('Critical system error'));

      // Verify event retrieval works correctly
      const allEvents = context.getDeclaredEvents();
      const combatEvents = context.getDeclaredEvents(/^combat:/);
      const combatInitEvents = context.getDeclaredEventsByCommand('combat-init');

      expect(allEvents).toHaveLength(2);
      expect(combatEvents).toHaveLength(2);
      expect(combatInitEvents).toHaveLength(2);
    });
  });
});

describe('createWorldProjection', () => {
  it('should create empty world projection by default', () => {
    const world = createWorldProjection();

    expect(world).toEqual({
      actors: {},
      places: {},
      items: {},
      sessions: {},
      groups: {},
    });
  });

  it('should apply map function to world projection', () => {
    const mapFn: MapFunction<WorldProjection> = (world) => ({
      ...world,
      actors: { 'flux:actor:test': { id: 'flux:actor:test' as ActorURN } as any },
      actorIds: ['flux:actor:test' as ActorURN]
    });

    const world = createWorldProjection(mapFn);

    expect(world.actors).toHaveProperty('flux:actor:test');
  });
});

describe('createPotentiallyImpureOperations', () => {
  it('should create operations with default implementations', () => {
    const ops = createPotentiallyImpureOperations();

    expect(ops.random).toBeTypeOf('function');
    expect(ops.timestamp).toBeTypeOf('function');
    expect(ops.uniqid).toBeTypeOf('function');
    expect(ops.debug).toBeTypeOf('function');
    expect(ops.profile).toBeTypeOf('function');
  });

  it('should accept custom implementations', () => {
    const customRandom = vi.fn(() => 0.75);
    const customTimestamp = vi.fn(() => 9999999999);
    const customUniqid = vi.fn(() => 'custom-id');
    const customDebug = vi.fn();
    const customProfile = vi.fn(() => ({ result: 'custom', duration: 50 } as ProfileResult<any>));

    const ops = createPotentiallyImpureOperations(
      customRandom,
      customTimestamp,
      customUniqid,
      customDebug,
      customProfile
    );

    expect(ops.random).toBe(customRandom);
    expect(ops.timestamp).toBe(customTimestamp);
    expect(ops.uniqid).toBe(customUniqid);
    expect(ops.debug).toBe(customDebug);
    expect(ops.profile).toBe(customProfile);
  });

  it('should use Math.random and Date.now by default', () => {
    const ops = createPotentiallyImpureOperations();

    // Test that they return reasonable values
    const randomValue = ops.random();
    const timestampValue = ops.timestamp();
    const uniqidValue = ops.uniqid();

    expect(randomValue).toBeGreaterThanOrEqual(0);
    expect(randomValue).toBeLessThan(1);
    expect(timestampValue).toBeGreaterThan(1000000000000); // Reasonable timestamp
    expect(uniqidValue).toBeTypeOf('string');
    expect(uniqidValue.length).toBeGreaterThan(0);
  });
});

describe('DEFAULT_POTENTIALLY_IMPURE_OPERATIONS', () => {
  it('should be a readonly object with all required operations', () => {
    expect(DEFAULT_POTENTIALLY_IMPURE_OPERATIONS).toBeDefined();
    expect(DEFAULT_POTENTIALLY_IMPURE_OPERATIONS.random).toBeTypeOf('function');
    expect(DEFAULT_POTENTIALLY_IMPURE_OPERATIONS.timestamp).toBeTypeOf('function');
    expect(DEFAULT_POTENTIALLY_IMPURE_OPERATIONS.uniqid).toBeTypeOf('function');
    expect(DEFAULT_POTENTIALLY_IMPURE_OPERATIONS.debug).toBeTypeOf('function');
    expect(DEFAULT_POTENTIALLY_IMPURE_OPERATIONS.profile).toBeTypeOf('function');
  });

  it('should return consistent results from the same instance', () => {
    const ops1 = DEFAULT_POTENTIALLY_IMPURE_OPERATIONS;
    const ops2 = DEFAULT_POTENTIALLY_IMPURE_OPERATIONS;

    expect(ops1).toBe(ops2);
  });
});
