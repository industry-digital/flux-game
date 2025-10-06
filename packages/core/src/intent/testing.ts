import { Actor } from '~/types/entity/actor';
import { Place } from '~/types/entity/place';
import { Intent, WorldProjection } from '~/types/handler';
import { ActorURN, PlaceURN } from '~/types/taxonomy';
import { createWorld, createTestPlace } from '~/testing/world-testing';
import { createActor } from '~/worldkit/entity/actor';
import { createPlaceUrn } from '~/lib/taxonomy';

/**
 * Creates a test intent with the specified parameters
 */
export const createTestIntent = (
  text: string,
  actor: ActorURN,
  location: PlaceURN,
  ts = 1234567890000,
): Intent => {
  const normalized = text.toLowerCase();
  const tokens = normalized.split(/\s+/).filter(token => token.length >= 2);
  const verb = tokens[0];

  return {
    id: 'test-intent',
    ts,
    actor,
    location,
    text,
    normalized,
    verb,
    tokens,
    uniques: new Set(tokens),
  };
};

/**
 * Creates a standard test world with common actors and places
 */
export const createStandardTestWorld = (): {
  world: WorldProjection;
  testPlace1: Place;
  testPlace2: Place;
  knight: Actor;
  wizard: Actor;
  archer: Actor;
} => {
  // Create test places
  const testPlace1 = createTestPlace({
    id: createPlaceUrn('test', 'castle'),
    name: 'Castle Courtyard'
  });

  const testPlace2 = createTestPlace({
    id: createPlaceUrn('test', 'forest'),
    name: 'Dark Forest'
  });

  // Create test actors with specific names and locations
  const knight = createActor((actor) => ({
    ...actor,
    name: 'Sir Galahad',
    location: testPlace1.id
  }));

  const wizard = createActor((actor) => ({
    ...actor,
    name: 'Gandalf the Grey',
    location: testPlace1.id
  }));

  const archer = createActor((actor) => ({
    ...actor,
    name: 'Legolas',
    location: testPlace2.id
  }));

  // Create world with our test entities
  const world = createWorld({
    actors: {
      [knight.id]: knight,
      [wizard.id]: wizard,
      [archer.id]: archer
    },
    places: {
      [testPlace1.id]: testPlace1,
      [testPlace2.id]: testPlace2
    }
  });

  return { world, testPlace1, testPlace2, knight, wizard, archer };
};

export type BenchmarkWorld = {
  world: WorldProjection;
  sampleActor: ActorURN;
  sampleLocation: PlaceURN;
};

/**
 * Creates a benchmark world with the specified number of actors
 */
export const createBenchmarkWorld = (actorCount: number): BenchmarkWorld => {
  const testPlace = {
    id: createPlaceUrn('bench', 'test-place') as PlaceURN,
    name: 'Benchmark Place',
    description: 'A place for benchmarking',
    type: 'place' as const,
    actors: {},
    items: {},
    exits: {},
    effects: {}
  } as unknown as Place;

  const actors: Record<ActorURN, any> = {};
  let sampleActor: ActorURN | undefined;

  // Create diverse actor names for realistic benchmarking
  const namePatterns = [
    'Knight', 'Wizard', 'Archer', 'Rogue', 'Paladin', 'Barbarian', 'Cleric', 'Ranger',
    'Sorcerer', 'Warlock', 'Bard', 'Druid', 'Monk', 'Fighter', 'Artificer', 'Blood Hunter'
  ];

  const adjectives = ['Swift', 'Mighty', 'Ancient', 'Noble', 'Dark', 'Bright', 'Fierce', 'Wise'];
  const suffixes = ['blade', 'heart', 'soul', 'fist', 'eye', 'wing', 'storm', 'flame'];

  for (let i = 0; i < actorCount; i++) {
    const basePattern = namePatterns[i % namePatterns.length];
    const adjective = adjectives[i % adjectives.length];
    const suffix = suffixes[i % suffixes.length];

    let name: string;
    if (i % 3 === 0) {
      name = `${adjective} ${basePattern}`;
    } else if (i % 3 === 1) {
      name = `${basePattern} ${suffix}`;
    } else {
      name = `${basePattern}${i}`;
    }

    const actor = createActor((a) => ({
      ...a,
      name,
      location: testPlace.id
    }));

    actors[actor.id] = actor;
    if (!sampleActor) sampleActor = actor.id;
  }

  const world = createWorld({
    actors,
    places: { [testPlace.id]: testPlace }
  });

  return { world, sampleActor: sampleActor!, sampleLocation: testPlace.id };
};

/**
 * Measures throughput of a resolver function
 */
export const measureThroughput = (
  resolverApi: any,
  intents: Intent[],
  iterations: number = 100
): { opsPerSecond: number; avgLatencyMs: number } => {
  const startTime = performance.now();

  for (let i = 0; i < iterations; i++) {
    const intent = intents[i % intents.length];
    resolverApi.resolveActor(intent);
  }

  const endTime = performance.now();
  const totalTimeMs = endTime - startTime;
  const opsPerSecond = (iterations / totalTimeMs) * 1000;
  const avgLatencyMs = totalTimeMs / iterations;

  return { opsPerSecond, avgLatencyMs };
};
