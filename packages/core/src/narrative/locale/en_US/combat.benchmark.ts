#!/usr/bin/env tsx
/**
 * Combat Narrative Performance Benchmark
 *
 * Benchmarks narrative template functions to validate performance characteristics.
 */

import { useBenchmarkSuite } from '~/lib/benchmark';
import { createTransformerContext } from '~/worldkit/context';
import { createWorldScenario } from '~/worldkit/scenario';
import { createDefaultActors } from '~/testing/actors';
import { createPlace } from '~/worldkit/entity/place';
import { DEFAULT_LOCATION, BOB_ID } from '~/testing/constants';
import { createActorDidDieEvent } from '~/testing/event/factory/combat';
import { narrateActorDidDie } from './combat';

const benchmark = useBenchmarkSuite('Combat Narrative Templates');

/**
 * Setup: Create transformer context with actors
 */
const setup = () => {
  const place = createPlace((p) => ({ ...p, id: DEFAULT_LOCATION }));
  const { alice, bob } = createDefaultActors(place.id);

  const context = createTransformerContext();
  createWorldScenario(context, {
    places: [place],
    actors: [alice, bob],
  });

  return { context, alice, bob };
};

/**
 * Benchmark narrateActorDidDie function
 */
const benchmarkActorDidDie = async () => {
  const { context, bob } = setup();

  const event = createActorDidDieEvent((e) => ({
    ...e,
    actor: BOB_ID,
  }));

  await benchmark.measure({
    name: 'narrateActorDidDie',
    iterations: 100_000, // 100 thousand iterations
    setup: () => ({ context, event }),
    fn: ({ context, event }) => {
      narrateActorDidDie(context, event);
    },
  });
};

/**
 * Run all benchmarks
 */
const run = async () => {
  await benchmarkActorDidDie();
  benchmark.report();
};

run().catch(console.error);
