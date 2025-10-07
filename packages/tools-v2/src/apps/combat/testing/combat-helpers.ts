import { vi, expect } from 'vitest';
import type {
  TransformerContext,
  Actor,
  ActorURN,
  PlaceURN,
  CombatSession,
  WeaponSchema,
  WeaponSchemaURN,
  WorldEvent
} from '@flux/core';

/**
 * Combat-specific test utilities for creating mock contexts, actors, and sessions
 */

// Test constants
export const TEST_PLACE_ID: PlaceURN = 'flux:place:test-battlefield';
export const ALICE_ID: ActorURN = 'flux:actor:alice';
export const BOB_ID: ActorURN = 'flux:actor:bob';
export const CHARLIE_ID: ActorURN = 'flux:actor:charlie';

/**
 * Creates a mock TransformerContext for testing
 */
export function createMockTransformerContext(): TransformerContext {
  const declaredEvents: WorldEvent[] = [];

  return {
    world: {
      actors: {},
      places: {},
      items: {},
      sessions: {},
    },
    uniqid: vi.fn(() => `test-id-${Math.random().toString(36).substr(2, 9)}`),
    timestamp: vi.fn(() => Date.now()),
    declareEvent: vi.fn((event: WorldEvent) => {
      declaredEvents.push(event);
      return event;
    }),
    declareError: vi.fn(),
    getDeclaredEvents: vi.fn(() => declaredEvents),
    schemaManager: {
      getSchemasOfType: vi.fn(() => new Map()),
    },
    equipmentApi: {
      getEquippedWeaponSchema: vi.fn(() => null),
    },
  } as unknown as TransformerContext;
}

/**
 * Creates a test actor with basic stats
 */
export function createTestActor(
  id: ActorURN,
  name: string,
  location: PlaceURN = TEST_PLACE_ID,
  stats: { pow?: number; fin?: number; res?: number } = {}
): Actor {
  const { pow = 10, fin = 10, res = 10 } = stats;

  return {
    id,
    name,
    location,
    type: 'actor' as any, // Add required type field
    stats: {
      pow: { nat: pow, eff: pow, mods: {} },
      fin: { nat: fin, eff: fin, mods: {} },
      res: { nat: res, eff: res, mods: {} },
      int: { nat: 10, eff: 10, mods: {} },
      per: { nat: 10, eff: 10, mods: {} },
      mem: { nat: 10, eff: 10, mods: {} },
    },
    hp: {
      nat: { max: 100, cur: 100 },
      eff: { max: 100, cur: 100 },
      mods: {}
    },
    skills: {},
    equipment: {},
    inventory: {
      mass: 1000,
      ts: Date.now(),
      items: {}
    },
  } as unknown as Actor;
}

/**
 * Creates a mock weapon schema for testing
 */
export function createMockWeaponSchema(urn: WeaponSchemaURN): WeaponSchema {
  return {
    urn,
    name: 'Test Weapon',
    description: 'A weapon for testing',
    baseMass: 1000,
    damage: {
      base: 10,
      type: 'slashing'
    },
    range: {
      min: 1,
      max: 2
    },
    ap_cost: 3,
  } as unknown as WeaponSchema;
}

/**
 * Creates a mock combat session for testing
 */
export function createMockCombatSession(): CombatSession {
  return {
    id: 'flux:session:test-combat',
    type: 'session' as any,
    status: 'pending',
    data: {
      combatants: new Map(),
      initiative: new Map(),
      rounds: {
        current: {
          number: 1,
          actions: []
        }
      },
      battlefield: {
        width: 10,
        height: 10,
        positions: new Map()
      }
    }
  } as unknown as CombatSession;
}

/**
 * Creates a populated test scenario with Alice and Bob
 */
export function createTestCombatScenario() {
  const context = createMockTransformerContext();

  // Create test actors
  const alice = createTestActor(ALICE_ID, 'Alice', TEST_PLACE_ID, { pow: 12, fin: 10, res: 11 });
  const bob = createTestActor(BOB_ID, 'Bob', TEST_PLACE_ID, { pow: 10, fin: 12, res: 10 });

  // Add actors to context
  context.world.actors[ALICE_ID] = alice;
  context.world.actors[BOB_ID] = bob;

  // Create mock weapon schemas
  const weaponMap = new Map();
  const longsword = createMockWeaponSchema('flux:schema:weapon:longsword' as WeaponSchemaURN);
  weaponMap.set(longsword.urn, longsword);

  // Mock schema manager to return weapons
  vi.mocked(context.schemaManager.getSchemasOfType).mockReturnValue(weaponMap);

  return {
    context,
    actors: { alice, bob },
    weapons: weaponMap,
  };
}

/**
 * Mock Universal Intent System functions
 */
export const createMockIntentSystem = () => ({
  resolveIntent: vi.fn(),
  executeCommand: vi.fn(),
});

/**
 * Creates a mock WorldEvent for testing
 */
export function createMockWorldEvent(
  type: string,
  actor?: ActorURN,
  data: Record<string, any> = {}
): WorldEvent {
  return {
    id: `test-event-${Math.random().toString(36).substr(2, 9)}`,
    type,
    ts: Date.now(),
    actor,
    ...data
  } as WorldEvent;
}

/**
 * Assertion helpers for combat testing
 */
export const combatAssertions = {
  /**
   * Assert that an actor has expected HP
   */
  expectActorHp: (actor: Actor, expectedHp: number) => {
    expect(actor.hp.eff.cur).toBe(expectedHp);
  },

  /**
   * Assert that an actor has expected AP (if AP system exists)
   */
  expectActorAp: (actor: any, expectedAp: number) => {
    expect(actor.ap?.eff?.cur).toBe(expectedAp);
  },

  /**
   * Assert that events contain specific types
   */
  expectEventTypes: (events: WorldEvent[], expectedTypes: string[]) => {
    const eventTypes = events.map(e => e.type);
    expectedTypes.forEach(type => {
      expect(eventTypes).toContain(type);
    });
  },

  /**
   * Assert that an actor is alive
   */
  expectActorAlive: (actor: Actor) => {
    expect(actor.hp.eff.cur).toBeGreaterThan(0);
  },

  /**
   * Assert that an actor is dead
   */
  expectActorDead: (actor: Actor) => {
    expect(actor.hp.eff.cur).toBeLessThanOrEqual(0);
  },
};
