#!/usr/bin/env tsx
/**
 * Mutation vs Immutability Benchmark
 *
 * Tests the performance difference between direct mutation and immutable updates
 * for typical game state operations (moving actors, updating inventory, etc.)
 */

import { useBenchmarkSuite } from '~/lib/benchmark';

type EntityId = string;

interface Entity {
  id: EntityId;
  type: string;
}

interface Place {
  id: string;
  name: string;
  entities: Record<EntityId, Entity>;
  exits: Record<string, string>;
}

interface Actor {
  id: string;
  name: string;
  location: string;
  health: number;
  inventory: Record<string, number>;
  attributes: Record<string, number>;
}

interface GameWorld {
  places: Record<string, Place>;
  actors: Record<string, Actor>;
}

// ============================================================================
// Setup Functions
// ============================================================================

function createTestWorld(numPlaces: number = 10, numActors: number = 10): GameWorld {
  const places: Record<string, Place> = {};
  const actors: Record<string, Actor> = {};

  // Create places
  for (let i = 0; i < numPlaces; i++) {
    const placeId = `place-${i}`;
    places[placeId] = {
      id: placeId,
      name: `Room ${i}`,
      entities: {},
      exits: {
        north: `place-${(i + 1) % numPlaces}`,
        south: `place-${(i - 1 + numPlaces) % numPlaces}`,
      },
    };
  }

  // Create actors
  for (let i = 0; i < numActors; i++) {
    const actorId = `actor-${i}`;
    const locationId = `place-${i % numPlaces}`;

    actors[actorId] = {
      id: actorId,
      name: `Actor ${i}`,
      location: locationId,
      health: 100,
      inventory: {
        'sword': 1,
        'potion': 3,
        'gold': 100,
      },
      attributes: {
        strength: 10,
        dexterity: 12,
        intelligence: 8,
      },
    };

    // Add actor to place
    places[locationId].entities[actorId] = {
      id: actorId,
      type: 'actor',
    };
  }

  return { places, actors };
}

// ============================================================================
// Mutation Approach
// ============================================================================

function moveActorMutation(world: GameWorld, actorId: string, destId: string): void {
  const actor = world.actors[actorId];
  const origin = world.places[actor.location];
  const destination = world.places[destId];

  // Direct mutation
  destination.entities[actorId] = origin.entities[actorId];
  delete origin.entities[actorId];
  actor.location = destId;
}

function updateInventoryMutation(world: GameWorld, actorId: string, item: string, delta: number): void {
  const actor = world.actors[actorId];
  actor.inventory[item] = (actor.inventory[item] || 0) + delta;
}

function takeDamageMutation(world: GameWorld, actorId: string, damage: number): void {
  const actor = world.actors[actorId];
  actor.health = Math.max(0, actor.health - damage);
}

// ============================================================================
// Immutable Approach
// ============================================================================

function moveActorImmutable(world: GameWorld, actorId: string, destId: string): GameWorld {
  const actor = world.actors[actorId];
  const origin = world.places[actor.location];
  const destination = world.places[destId];

  const newOriginEntities = { ...origin.entities };
  delete newOriginEntities[actorId];

  const newDestinationEntities = {
    ...destination.entities,
    [actorId]: origin.entities[actorId],
  };

  return {
    places: {
      ...world.places,
      [origin.id]: {
        ...origin,
        entities: newOriginEntities,
      },
      [destination.id]: {
        ...destination,
        entities: newDestinationEntities,
      },
    },
    actors: {
      ...world.actors,
      [actorId]: {
        ...actor,
        location: destId,
      },
    },
  };
}

function updateInventoryImmutable(world: GameWorld, actorId: string, item: string, delta: number): GameWorld {
  const actor = world.actors[actorId];

  return {
    ...world,
    actors: {
      ...world.actors,
      [actorId]: {
        ...actor,
        inventory: {
          ...actor.inventory,
          [item]: (actor.inventory[item] || 0) + delta,
        },
      },
    },
  };
}

function takeDamageImmutable(world: GameWorld, actorId: string, damage: number): GameWorld {
  const actor = world.actors[actorId];

  return {
    ...world,
    actors: {
      ...world.actors,
      [actorId]: {
        ...actor,
        health: Math.max(0, actor.health - damage),
      },
    },
  };
}

// ============================================================================
// Benchmarks
// ============================================================================

async function runBenchmarks() {
  const suite = useBenchmarkSuite('Game State Updates');

  // Actor Movement - Mutation
  await suite.measure({
    name: 'Move Actor (Mutation)',
    iterations: 100000,
    setup: () => createTestWorld(10, 10),
    fn: (world) => {
      moveActorMutation(world, 'actor-0', 'place-5');
      moveActorMutation(world, 'actor-0', 'place-0'); // Move back
    },
  });

  // Actor Movement - Immutable
  await suite.measure({
    name: 'Move Actor (Immutable)',
    iterations: 100000,
    setup: () => createTestWorld(10, 10),
    fn: (world) => {
      let newWorld = moveActorImmutable(world, 'actor-0', 'place-5');
      newWorld = moveActorImmutable(newWorld, 'actor-0', 'place-0'); // Move back
    },
  });

  // Inventory Update - Mutation
  await suite.measure({
    name: 'Update Inventory (Mutation)',
    iterations: 100000,
    setup: () => createTestWorld(10, 10),
    fn: (world) => {
      updateInventoryMutation(world, 'actor-0', 'potion', -1);
      updateInventoryMutation(world, 'actor-0', 'potion', 1); // Restore
    },
  });

  // Inventory Update - Immutable
  await suite.measure({
    name: 'Update Inventory (Immutable)',
    iterations: 100000,
    setup: () => createTestWorld(10, 10),
    fn: (world) => {
      let newWorld = updateInventoryImmutable(world, 'actor-0', 'potion', -1);
      newWorld = updateInventoryImmutable(newWorld, 'actor-0', 'potion', 1); // Restore
    },
  });

  // Take Damage - Mutation
  await suite.measure({
    name: 'Take Damage (Mutation)',
    iterations: 100000,
    setup: () => createTestWorld(10, 10),
    fn: (world) => {
      takeDamageMutation(world, 'actor-0', 10);
      world.actors['actor-0'].health = 100; // Restore
    },
  });

  // Take Damage - Immutable
  await suite.measure({
    name: 'Take Damage (Immutable)',
    iterations: 100000,
    setup: () => createTestWorld(10, 10),
    fn: (world) => {
      let newWorld = takeDamageImmutable(world, 'actor-0', 10);
      // Don't need to restore since we're not mutating
    },
  });

  // Complex Operation - Mutation (move + damage + inventory)
  await suite.measure({
    name: 'Complex Operation (Mutation)',
    iterations: 100000,
    setup: () => createTestWorld(10, 10),
    fn: (world) => {
      moveActorMutation(world, 'actor-0', 'place-5');
      takeDamageMutation(world, 'actor-0', 10);
      updateInventoryMutation(world, 'actor-0', 'potion', -1);
      // Restore
      moveActorMutation(world, 'actor-0', 'place-0');
      world.actors['actor-0'].health = 100;
      updateInventoryMutation(world, 'actor-0', 'potion', 1);
    },
  });

  // Complex Operation - Immutable (move + damage + inventory)
  await suite.measure({
    name: 'Complex Operation (Immutable)',
    iterations: 100000,
    setup: () => createTestWorld(10, 10),
    fn: (world) => {
      let newWorld = moveActorImmutable(world, 'actor-0', 'place-5');
      newWorld = takeDamageImmutable(newWorld, 'actor-0', 10);
      newWorld = updateInventoryImmutable(newWorld, 'actor-0', 'potion', -1);
    },
  });

  suite.report();

  // Comparison Report
  console.log('\n📈 PERFORMANCE COMPARISON');
  console.log('='.repeat(80));

  const comparisons = [
    ['Move Actor', 'Move Actor (Mutation)', 'Move Actor (Immutable)'],
    ['Update Inventory', 'Update Inventory (Mutation)', 'Update Inventory (Immutable)'],
    ['Take Damage', 'Take Damage (Mutation)', 'Take Damage (Immutable)'],
    ['Complex Operation', 'Complex Operation (Mutation)', 'Complex Operation (Immutable)'],
  ];

  for (const [label, mutationKey, immutableKey] of comparisons) {
    const mutationResult = suite.results.get(mutationKey);
    const immutableResult = suite.results.get(immutableKey);

    if (mutationResult && immutableResult) {
      const speedup = immutableResult.avgTimePerOp / mutationResult.avgTimePerOp;
      const pctSlower = ((immutableResult.avgTimePerOp - mutationResult.avgTimePerOp) / mutationResult.avgTimePerOp) * 100;

      console.log(`${label}:`);
      console.log(`  Mutation:   ${mutationResult.throughputPerSecond.toFixed(2)} ops/sec`);
      console.log(`  Immutable:  ${immutableResult.throughputPerSecond.toFixed(2)} ops/sec`);
      console.log(`  ✅ Mutation is ${speedup.toFixed(2)}x faster`);
      console.log(`  ⚠️  Immutable is ${pctSlower.toFixed(1)}% slower`);
      console.log('');
    }
  }
}

// Run the benchmarks
runBenchmarks().catch(console.error);
