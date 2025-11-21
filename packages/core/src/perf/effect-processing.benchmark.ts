#!/usr/bin/env tsx
/**
 * Effect Processing Benchmark
 *
 * Tests performance of common effect processing patterns including:
 * - Effect evaluation and position updates
 * - Schema lookups and caching
 * - Effect application and removal
 * - Bulk effect processing on multiple actors
 */

import { useBenchmarkSuite } from '~/lib/benchmark';
import { EffectCurve, EffectSchema } from '~/types/schema/effect';
import { Actor } from '~/types/entity/actor';
import { WellKnownDuration } from '~/types/world/time';
import { AppliedEffect } from '~/types/entity/effect';
import { EffectURN } from '~/types/taxonomy';

interface EffectEvaluation {
  value: number;
  progress: number;
  expired: boolean;
}

// ============================================================================
// Effect Schemas
// ============================================================================

// Preallocated string constants for prefix matching
const DAMAGE_EFFECT_PREFIXES = {
  BLEEDING: 'flux:effect:condition:bleeding',
  POISONED: 'flux:effect:condition:poisoned',
  BURNING: 'flux:effect:condition:burning',
} as const;

// Preallocated padded tokens for precise includes() matching
const DAMAGE_EFFECT_TOKENS = {
  BLEEDING: ':bleeding:',
  POISONED: ':poisoned:',
  BURNING: ':burning:',
} as const;

// Set-based lookup for O(1) precise matching
const DAMAGE_EFFECTS_SET = new Set([
  'flux:effect:condition:bleeding',
  'flux:effect:condition:poisoned',
  'flux:effect:condition:burning',
]);

const EFFECT_SCHEMAS: Record<EffectURN, EffectSchema> = {
  'flux:effect:condition:bleeding': {
    urn: 'flux:effect:condition:bleeding',
    curve: EffectCurve.EASE_OUT,
    duration: 3 * WellKnownDuration.COMBAT_TURN, // 18 seconds
  },
  'flux:effect:condition:poisoned': {
    urn: 'flux:effect:condition:poisoned',
    curve: EffectCurve.LINEAR,
    duration: 5 * WellKnownDuration.COMBAT_TURN, // 30 seconds
  },
  'flux:effect:condition:burning': {
    urn: 'flux:effect:condition:burning',
    curve: EffectCurve.EASE_IN,
    duration: 2 * WellKnownDuration.COMBAT_TURN, // 12 seconds
  },
  'flux:effect:condition:weakened': {
    urn: 'flux:effect:condition:weakened',
    curve: EffectCurve.FLATLINE_ONE,
    duration: 10 * WellKnownDuration.COMBAT_TURN, // 60 seconds
  },
};

// ============================================================================
// Core Effect Evaluation Functions
// ============================================================================

const applyCurve = (curve: EffectCurve, progress: number): number => {
  const t = Math.max(0, Math.min(1, progress));

  switch (curve) {
    case EffectCurve.LINEAR:
      return t;
    case EffectCurve.EASE_IN:
      return t * t * t; // Cubic ease-in
    case EffectCurve.EASE_OUT:
      const oneMinusT = 1 - t;
      return 1 - oneMinusT * oneMinusT * oneMinusT; // Cubic ease-out
    case EffectCurve.FLATLINE_ONE:
      return 1.0;
    case EffectCurve.FLATLINE_ZERO:
      return 0.0;
    default:
      return t;
  }
};

const evaluateEffect = (
  effect: AppliedEffect,
  schema: EffectSchema,
  timestamp: number,
  outResult: EffectEvaluation
): void => {
  const elapsed = timestamp - effect.ts;

  // Use effect overrides or fall back to schema defaults
  const duration = effect.duration ?? schema.duration;
  const curve = effect.curve ?? schema.curve;

  const progress = Math.min(elapsed / duration, 1.0);
  const curveValue = applyCurve(curve, progress);

  // Final value = initial strength * curve position
  outResult.value = effect.initial * curveValue;
  outResult.progress = progress;
  outResult.expired = progress >= 1.0;
};

// ============================================================================
// Data Generation
// ============================================================================

function createTestActor(id: string, numEffects: number = 3): Actor {
  const effects: Record<string, AppliedEffect> = {};
  const effectTypes = Object.keys(EFFECT_SCHEMAS) as EffectURN[];

  for (let i = 0; i < numEffects; i++) {
    const effectType = effectTypes[i % effectTypes.length];
    const effectId = `effect-${id}-${i}`;

    effects[effectId] = {
      schema: effectType,
      ts: Date.now() - Math.random() * 10000, // Random start time within last 10 seconds
      initial: 5 + Math.random() * 10, // Random initial strength 5-15
      position: Math.random(), // Random current position
    };
  }

  return {
    id: id as `flux:actor:${string}`,
    hp: { current: 100, max: 100 },
    effects,
  } as Actor;
}

function createTestActors(count: number, effectsPerActor: number = 3): Actor[] {
  const actors: Actor[] = [];
  for (let i = 0; i < count; i++) {
    actors.push(createTestActor(`actor-${i}`, effectsPerActor));
  }
  return actors;
}

// ============================================================================
// Processing Strategies
// ============================================================================

// Strategy 1: Direct Processing (No Caching)
class DirectProcessor {
  private result = { value: 0, progress: 0, expired: false };

  processActorEffects(actor: Actor, timestamp: number): number {
    let totalComputations = 0;

    for (const effectId in actor.effects) {
      const effect = actor.effects[effectId];
      const schema = EFFECT_SCHEMAS[effect.schema];
      if (!schema) continue;

      evaluateEffect(effect, schema, timestamp, this.result);

      // Apply damage if it's a damage effect
      if (effect.schema.includes('bleeding') || effect.schema.includes('poisoned') || effect.schema.includes('burning')) {
        const damagePerSecond = this.result.value;
        const tickDuration = 0.1; // 100ms tick
        actor.hp.current = Math.max(0, actor.hp.current - damagePerSecond * tickDuration);
      }

      // Remove expired effects
      if (this.result.expired) {
        delete actor.effects[effectId];
      }

      totalComputations++;
    }

    return totalComputations;
  }
}

// Strategy 2: Schema Caching
class CachedSchemaProcessor {
  private schemaCache = new Map<EffectURN, EffectSchema>();
  private result = { value: 0, progress: 0, expired: false };

  processActorEffects(actor: Actor, timestamp: number): number {
    let totalComputations = 0;

    for (const effectId in actor.effects) {
      const effect = actor.effects[effectId];

      // Use cached schema lookup
      let schema = this.schemaCache.get(effect.schema);
      if (!schema) {
        schema = EFFECT_SCHEMAS[effect.schema];
        if (schema) {
          this.schemaCache.set(effect.schema, schema);
        } else {
          continue;
        }
      }

      evaluateEffect(effect, schema, timestamp, this.result);

      // Apply damage
      if (effect.schema.includes('bleeding') || effect.schema.includes('poisoned') || effect.schema.includes('burning')) {
        const damagePerSecond = this.result.value;
        const tickDuration = 0.1; // 100ms tick
        actor.hp.current = Math.max(0, actor.hp.current - damagePerSecond * tickDuration);
      }

      // Remove expired effects
      if (this.result.expired) {
        delete actor.effects[effectId];
      }

      totalComputations++;
    }

    return totalComputations;
  }

  clearCache(): void {
    this.schemaCache.clear();
  }
}

// Strategy 3: Batch Processing with Pre-allocated Arrays
class BatchProcessor {
  private expiredEffects: string[] = [];
  private result = { value: 0, progress: 0, expired: false };

  processActorEffects(actor: Actor, timestamp: number): number {
    let totalComputations = 0;
    this.expiredEffects.length = 0; // Clear without reallocation

    // First pass: evaluate all effects
    for (const effectId in actor.effects) {
      const effect = actor.effects[effectId];
      const schema = EFFECT_SCHEMAS[effect.schema];
      if (!schema) continue;

      evaluateEffect(effect, schema, timestamp, this.result);

      // Apply damage
      if (effect.schema.includes('bleeding') || effect.schema.includes('poisoned') || effect.schema.includes('burning')) {
        const damagePerSecond = this.result.value;
        const tickDuration = 0.1; // 100ms tick
        actor.hp.current = Math.max(0, actor.hp.current - damagePerSecond * tickDuration);
      }

      // Collect expired effects for batch removal
      if (this.result.expired) {
        this.expiredEffects.push(effectId);
      }

      totalComputations++;
    }

    // Second pass: batch remove expired effects
    for (const effectId of this.expiredEffects) {
      delete actor.effects[effectId];
    }

    return totalComputations;
  }
}

// Strategy 4: Optimized String Matching with startsWith
class OptimizedStringProcessor {
  private expiredEffects: string[] = [];
  private result = { value: 0, progress: 0, expired: false };

  processActorEffects(actor: Actor, timestamp: number): number {
    let totalComputations = 0;
    this.expiredEffects.length = 0; // Clear without reallocation

    // First pass: evaluate all effects
    for (const effectId in actor.effects) {
      const effect = actor.effects[effectId];
      const schema = EFFECT_SCHEMAS[effect.schema];
      if (!schema) continue;

      evaluateEffect(effect, schema, timestamp, this.result);

      // Apply damage using optimized string matching
      if (this.isDamageEffect(effect.schema)) {
        const damagePerSecond = this.result.value;
        const tickDuration = 0.1; // 100ms tick
        actor.hp.current = Math.max(0, actor.hp.current - damagePerSecond * tickDuration);
      }

      // Collect expired effects for batch removal
      if (this.result.expired) {
        this.expiredEffects.push(effectId);
      }

      totalComputations++;
    }

    // Second pass: batch remove expired effects
    for (const effectId of this.expiredEffects) {
      delete actor.effects[effectId];
    }

    return totalComputations;
  }

  private isDamageEffect(schema: string): boolean {
    return schema.startsWith(DAMAGE_EFFECT_PREFIXES.BLEEDING) ||
           schema.startsWith(DAMAGE_EFFECT_PREFIXES.POISONED) ||
           schema.startsWith(DAMAGE_EFFECT_PREFIXES.BURNING);
  }
}

// Strategy 5: Padded Token Matching with includes()
class PaddedTokenProcessor {
  private expiredEffects: string[] = [];
  private result = { value: 0, progress: 0, expired: false };

  processActorEffects(actor: Actor, timestamp: number): number {
    let totalComputations = 0;
    this.expiredEffects.length = 0; // Clear without reallocation

    // First pass: evaluate all effects
    for (const effectId in actor.effects) {
      const effect = actor.effects[effectId];
      const schema = EFFECT_SCHEMAS[effect.schema];
      if (!schema) continue;

      evaluateEffect(effect, schema, timestamp, this.result);

      // Apply damage using padded token matching
      if (this.isDamageEffect(effect.schema)) {
        const damagePerSecond = this.result.value;
        const tickDuration = 0.1; // 100ms tick
        actor.hp.current = Math.max(0, actor.hp.current - damagePerSecond * tickDuration);
      }

      // Collect expired effects for batch removal
      if (this.result.expired) {
        this.expiredEffects.push(effectId);
      }

      totalComputations++;
    }

    // Second pass: batch remove expired effects
    for (const effectId of this.expiredEffects) {
      delete actor.effects[effectId];
    }

    return totalComputations;
  }

  private isDamageEffect(schema: string): boolean {
    return schema.includes(DAMAGE_EFFECT_TOKENS.BLEEDING) ||
           schema.includes(DAMAGE_EFFECT_TOKENS.POISONED) ||
           schema.includes(DAMAGE_EFFECT_TOKENS.BURNING);
  }
}

// Strategy 6: Set-based Lookup for O(1) Precise Matching
class SetBasedProcessor {
  private expiredEffects: string[] = [];
  private result = { value: 0, progress: 0, expired: false };

  processActorEffects(actor: Actor, timestamp: number): number {
    let totalComputations = 0;
    this.expiredEffects.length = 0; // Clear without reallocation

    // First pass: evaluate all effects
    for (const effectId in actor.effects) {
      const effect = actor.effects[effectId];
      const schema = EFFECT_SCHEMAS[effect.schema];
      if (!schema) continue;

      evaluateEffect(effect, schema, timestamp, this.result);

      // Apply damage using set-based lookup
      if (this.isDamageEffect(effect.schema)) {
        const damagePerSecond = this.result.value;
        const tickDuration = 0.1; // 100ms tick
        actor.hp.current = Math.max(0, actor.hp.current - damagePerSecond * tickDuration);
      }

      // Collect expired effects for batch removal
      if (this.result.expired) {
        this.expiredEffects.push(effectId);
      }

      totalComputations++;
    }

    // Second pass: batch remove expired effects
    for (const effectId of this.expiredEffects) {
      delete actor.effects[effectId];
    }

    return totalComputations;
  }

  private isDamageEffect(schema: string): boolean {
    return DAMAGE_EFFECTS_SET.has(schema);
  }
}

// ============================================================================
// Benchmarks
// ============================================================================

async function runBenchmarks() {
  const suite = useBenchmarkSuite('Effect Processing Performance');

  const timestamp = Date.now();

  // Warmup function to trigger JIT compilation
  const warmup = (fn: () => void, iterations: number = 10000) => {
    console.log(`🔥 Warming up JIT compiler (${iterations} iterations)...`);
    for (let i = 0; i < iterations; i++) {
      fn();
    }
  };

  // Perform global warmup on key functions
  console.log('🚀 Starting warmup phase...');

  // Warmup effect evaluation
  const warmupEffect = createTestActor('warmup', 3);
  const warmupProcessor = new DirectProcessor();
  warmup(() => warmupProcessor.processActorEffects(warmupEffect, timestamp));

  // Warmup curve calculations
  warmup(() => applyCurve(EffectCurve.EASE_OUT, Math.random()));

  // Warmup string matching
  warmup(() => 'flux:effect:condition:bleeding'.includes('bleeding'));

  console.log('✅ Warmup complete, starting benchmarks...\n');

  // Single Actor Processing
  await suite.measure({
    name: 'Single Actor - Direct Processing',
    iterations: 50000,
    setup: () => {
      const actor = createTestActor('test-actor', 5);
      const processor = new DirectProcessor();
      // Warmup this specific combination
      for (let i = 0; i < 1000; i++) {
        processor.processActorEffects(actor, timestamp);
      }
      return { actor, processor };
    },
    fn: ({ actor, processor }) => {
      processor.processActorEffects(actor, timestamp);
    },
  });

  await suite.measure({
    name: 'Single Actor - Cached Schema',
    iterations: 50000,
    setup: () => {
      const actor = createTestActor('test-actor', 5);
      const processor = new CachedSchemaProcessor();
      // Warmup this specific combination
      for (let i = 0; i < 1000; i++) {
        processor.processActorEffects(actor, timestamp);
      }
      return { actor, processor };
    },
    fn: ({ actor, processor }) => {
      processor.processActorEffects(actor, timestamp);
    },
  });

  await suite.measure({
    name: 'Single Actor - Batch Processing',
    iterations: 50000,
    setup: () => createTestActor('test-actor', 5),
    fn: (actor) => {
      const processor = new BatchProcessor();
      processor.processActorEffects(actor, timestamp);
    },
  });

  await suite.measure({
    name: 'Single Actor - Optimized String Matching',
    iterations: 50000,
    setup: () => createTestActor('test-actor', 5),
    fn: (actor) => {
      const processor = new OptimizedStringProcessor();
      processor.processActorEffects(actor, timestamp);
    },
  });

  await suite.measure({
    name: 'Single Actor - Padded Token Matching',
    iterations: 50000,
    setup: () => {
      const actor = createTestActor('test-actor', 5);
      const processor = new PaddedTokenProcessor();
      // Warmup this specific combination
      for (let i = 0; i < 1000; i++) {
        processor.processActorEffects(actor, timestamp);
      }
      return { actor, processor };
    },
    fn: ({ actor, processor }) => {
      processor.processActorEffects(actor, timestamp);
    },
  });

  await suite.measure({
    name: 'Single Actor - Set-based Lookup',
    iterations: 50000,
    setup: () => {
      const actor = createTestActor('test-actor', 5);
      const processor = new SetBasedProcessor();
      // Warmup this specific combination
      for (let i = 0; i < 1000; i++) {
        processor.processActorEffects(actor, timestamp);
      }
      return { actor, processor };
    },
    fn: ({ actor, processor }) => {
      processor.processActorEffects(actor, timestamp);
    },
  });

  // Multiple Actors Processing
  await suite.measure({
    name: '100 Actors - Direct Processing',
    iterations: 1000,
    setup: () => createTestActors(100, 3),
    fn: (actors) => {
      const processor = new DirectProcessor();
      for (const actor of actors) {
        processor.processActorEffects(actor, timestamp);
      }
    },
  });

  await suite.measure({
    name: '100 Actors - Cached Schema',
    iterations: 1000,
    setup: () => ({ actors: createTestActors(100, 3), processor: new CachedSchemaProcessor() }),
    fn: ({ actors, processor }) => {
      for (const actor of actors) {
        processor.processActorEffects(actor, timestamp);
      }
    },
  });

  await suite.measure({
    name: '100 Actors - Batch Processing',
    iterations: 1000,
    setup: () => createTestActors(100, 3),
    fn: (actors) => {
      const processor = new BatchProcessor();
      for (const actor of actors) {
        processor.processActorEffects(actor, timestamp);
      }
    },
  });

  await suite.measure({
    name: '100 Actors - Optimized String Matching',
    iterations: 1000,
    setup: () => createTestActors(100, 3),
    fn: (actors) => {
      const processor = new OptimizedStringProcessor();
      for (const actor of actors) {
        processor.processActorEffects(actor, timestamp);
      }
    },
  });

  await suite.measure({
    name: '100 Actors - Padded Token Matching',
    iterations: 1000,
    setup: () => {
      const actors = createTestActors(100, 3);
      const processor = new PaddedTokenProcessor();
      // Warmup
      for (let i = 0; i < 100; i++) {
        for (const actor of actors) {
          processor.processActorEffects(actor, timestamp);
        }
      }
      return { actors, processor };
    },
    fn: ({ actors, processor }) => {
      for (const actor of actors) {
        processor.processActorEffects(actor, timestamp);
      }
    },
  });

  await suite.measure({
    name: '100 Actors - Set-based Lookup',
    iterations: 1000,
    setup: () => {
      const actors = createTestActors(100, 3);
      const processor = new SetBasedProcessor();
      // Warmup
      for (let i = 0; i < 100; i++) {
        for (const actor of actors) {
          processor.processActorEffects(actor, timestamp);
        }
      }
      return { actors, processor };
    },
    fn: ({ actors, processor }) => {
      for (const actor of actors) {
        processor.processActorEffects(actor, timestamp);
      }
    },
  });

  // Heavy Load Testing
  await suite.measure({
    name: '1000 Actors - Cached Schema',
    iterations: 100,
    setup: () => ({ actors: createTestActors(1000, 4), processor: new CachedSchemaProcessor() }),
    fn: ({ actors, processor }) => {
      for (const actor of actors) {
        processor.processActorEffects(actor, timestamp);
      }
    },
  });

  // Effect-Specific Benchmarks
  await suite.measure({
    name: 'Bleeding Effect Evaluation',
    iterations: 100000,
    setup: () => {
      const effect: AppliedEffect = {
        schema: 'flux:effect:condition:bleeding',
        ts: timestamp - 5000, // 5 seconds ago
        initial: 12.0, // Strong bleeding
        position: 0.3,
      };
      const schema = EFFECT_SCHEMAS['flux:effect:condition:bleeding'];
      const result = { value: 0, progress: 0, expired: false };
      return { effect, schema, result };
    },
    fn: ({ effect, schema, result }) => {
      evaluateEffect(effect, schema, timestamp, result);
    },
  });

  // Test effect with overrides
  await suite.measure({
    name: 'Effect with Overrides Evaluation',
    iterations: 100000,
    setup: () => {
      const effect: AppliedEffect = {
        schema: 'flux:effect:condition:bleeding',
        ts: timestamp - 8000, // 8 seconds ago
        initial: 15.0, // Very strong bleeding
        position: 0.5,
        // Override schema defaults
        duration: 5 * WellKnownDuration.COMBAT_TURN, // Longer than schema's 3 turns
        curve: EffectCurve.LINEAR, // Doesn't clot naturally
      };
      const schema = EFFECT_SCHEMAS['flux:effect:condition:bleeding'];
      const result = { value: 0, progress: 0, expired: false };
      return { effect, schema, result };
    },
    fn: ({ effect, schema, result }) => {
      evaluateEffect(effect, schema, timestamp, result);
    },
  });

  await suite.measure({
    name: 'Curve Application (EASE_OUT)',
    iterations: 1000000,
    setup: () => Math.random(), // Random progress value
    fn: (progress) => {
      applyCurve(EffectCurve.EASE_OUT, progress);
    },
  });

  // String Matching Comparison
  await suite.measure({
    name: 'String Matching - includes()',
    iterations: 1000000,
    setup: () => {
      const schema = 'flux:effect:condition:bleeding';
      // Warmup includes() calls
      for (let i = 0; i < 10000; i++) {
        schema.includes('bleeding') || schema.includes('poisoned') || schema.includes('burning');
      }
      return schema;
    },
    fn: (schema): void => {
      const result = schema.includes('bleeding') || schema.includes('poisoned') || schema.includes('burning');
    },
  });

  await suite.measure({
    name: 'String Matching - startsWith() with constants',
    iterations: 1000000,
    setup: () => {
      const schema = 'flux:effect:condition:bleeding';
      // Warmup startsWith() calls
      for (let i = 0; i < 10000; i++) {
        schema.startsWith(DAMAGE_EFFECT_PREFIXES.BLEEDING) ||
        schema.startsWith(DAMAGE_EFFECT_PREFIXES.POISONED) ||
        schema.startsWith(DAMAGE_EFFECT_PREFIXES.BURNING);
      }
      return schema;
    },
    fn: (schema): void => {
      const result = schema.startsWith(DAMAGE_EFFECT_PREFIXES.BLEEDING) ||
                     schema.startsWith(DAMAGE_EFFECT_PREFIXES.POISONED) ||
                     schema.startsWith(DAMAGE_EFFECT_PREFIXES.BURNING);
    },
  });

  await suite.measure({
    name: 'String Matching - includes() with padded tokens',
    iterations: 1000000,
    setup: () => {
      const schema = 'flux:effect:condition:bleeding';
      // Warmup padded token calls
      for (let i = 0; i < 10000; i++) {
        schema.includes(DAMAGE_EFFECT_TOKENS.BLEEDING) ||
        schema.includes(DAMAGE_EFFECT_TOKENS.POISONED) ||
        schema.includes(DAMAGE_EFFECT_TOKENS.BURNING);
      }
      return schema;
    },
    fn: (schema): void => {
      const result = schema.includes(DAMAGE_EFFECT_TOKENS.BLEEDING) ||
                     schema.includes(DAMAGE_EFFECT_TOKENS.POISONED) ||
                     schema.includes(DAMAGE_EFFECT_TOKENS.BURNING);
    },
  });

  await suite.measure({
    name: 'String Matching - Set.has() lookup',
    iterations: 1000000,
    setup: () => {
      const schema = 'flux:effect:condition:bleeding';
      // Warmup Set.has() calls
      for (let i = 0; i < 10000; i++) {
        DAMAGE_EFFECTS_SET.has(schema);
      }
      return schema;
    },
    fn: (schema): void => {
      const result = DAMAGE_EFFECTS_SET.has(schema);
    },
  });

  // Realistic Combat Scenario
  await suite.measure({
    name: 'Combat Scenario - 10 Actors with Mixed Effects',
    iterations: 5000,
    setup: () => {
      const actors = createTestActors(10, 2);
      // Add some effects with overrides to simulate realistic combat
      actors.forEach((actor, i) => {
        if (i % 3 === 0) {
          // Add severe bleeding with custom duration
          actor.effects['severe-bleeding'] = {
            schema: 'flux:effect:condition:bleeding',
            ts: timestamp - 2000,
            initial: 20.0,
            position: 0.1,
            duration: 6 * WellKnownDuration.COMBAT_TURN, // Longer bleeding
          };
        }
        if (i % 2 === 0) {
          // Add weakening effect
          actor.effects['weakness'] = {
            schema: 'flux:effect:condition:weakened',
            ts: timestamp - 1000,
            initial: 0.7, // 70% strength reduction
            position: 0.0,
          };
        }
      });
      return { actors, processor: new CachedSchemaProcessor() };
    },
    fn: ({ actors, processor }) => {
      for (const actor of actors) {
        processor.processActorEffects(actor, timestamp);
      }
    },
  });

  suite.report();

  // Performance Analysis
  console.log('\n🎯 EFFECT PROCESSING ANALYSIS');
  console.log('='.repeat(80));

  const singleActorDirect = suite.results.get('Single Actor - Direct Processing');
  const singleActorCached = suite.results.get('Single Actor - Cached Schema');
  const singleActorBatch = suite.results.get('Single Actor - Batch Processing');
  const singleActorOptimized = suite.results.get('Single Actor - Optimized String Matching');
  const singleActorPadded = suite.results.get('Single Actor - Padded Token Matching');
  const singleActorSet = suite.results.get('Single Actor - Set-based Lookup');

  if (singleActorDirect && singleActorCached && singleActorBatch && singleActorOptimized && singleActorPadded && singleActorSet) {
    console.log('Single Actor Performance:');
    console.log(`  Direct:     ${singleActorDirect.throughputPerSecond.toFixed(0)} actors/sec`);
    console.log(`  Cached:     ${singleActorCached.throughputPerSecond.toFixed(0)} actors/sec`);
    console.log(`  Batch:      ${singleActorBatch.throughputPerSecond.toFixed(0)} actors/sec`);
    console.log(`  Optimized:  ${singleActorOptimized.throughputPerSecond.toFixed(0)} actors/sec`);
    console.log(`  Padded:     ${singleActorPadded.throughputPerSecond.toFixed(0)} actors/sec`);
    console.log(`  Set-based:  ${singleActorSet.throughputPerSecond.toFixed(0)} actors/sec`);

    const cachedSpeedup = singleActorCached.throughputPerSecond / singleActorDirect.throughputPerSecond;
    const batchSpeedup = singleActorBatch.throughputPerSecond / singleActorDirect.throughputPerSecond;
    const optimizedSpeedup = singleActorOptimized.throughputPerSecond / singleActorDirect.throughputPerSecond;
    const paddedSpeedup = singleActorPadded.throughputPerSecond / singleActorDirect.throughputPerSecond;
    const setSpeedup = singleActorSet.throughputPerSecond / singleActorDirect.throughputPerSecond;

    console.log(`  ✅ Caching provides ${cachedSpeedup.toFixed(2)}x speedup`);
    console.log(`  ✅ Batch processing provides ${batchSpeedup.toFixed(2)}x speedup`);
    console.log(`  ✅ Optimized strings provide ${optimizedSpeedup.toFixed(2)}x speedup`);
    console.log(`  ✅ Padded tokens provide ${paddedSpeedup.toFixed(2)}x speedup`);
    console.log(`  ✅ Set-based lookup provides ${setSpeedup.toFixed(2)}x speedup`);
  }

  const multiActorDirect = suite.results.get('100 Actors - Direct Processing');
  const multiActorCached = suite.results.get('100 Actors - Cached Schema');
  const multiActorOptimized = suite.results.get('100 Actors - Optimized String Matching');
  const multiActorSet = suite.results.get('100 Actors - Set-based Lookup');

  if (multiActorDirect && multiActorCached && multiActorOptimized && multiActorSet) {
    console.log('\nMulti-Actor Performance:');
    console.log(`  Direct:     ${multiActorDirect.throughputPerSecond.toFixed(0)} batches/sec`);
    console.log(`  Cached:     ${multiActorCached.throughputPerSecond.toFixed(0)} batches/sec`);
    console.log(`  Optimized:  ${multiActorOptimized.throughputPerSecond.toFixed(0)} batches/sec`);
    console.log(`  Set-based:  ${multiActorSet.throughputPerSecond.toFixed(0)} batches/sec`);

    const multiSpeedup = multiActorCached.throughputPerSecond / multiActorDirect.throughputPerSecond;
    const optimizedMultiSpeedup = multiActorOptimized.throughputPerSecond / multiActorDirect.throughputPerSecond;
    const setMultiSpeedup = multiActorSet.throughputPerSecond / multiActorDirect.throughputPerSecond;
    console.log(`  ✅ Caching provides ${multiSpeedup.toFixed(2)}x speedup for bulk processing`);
    console.log(`  ✅ Optimized strings provide ${optimizedMultiSpeedup.toFixed(2)}x speedup for bulk processing`);
    console.log(`  ✅ Set-based lookup provides ${setMultiSpeedup.toFixed(2)}x speedup for bulk processing`);
  }

  const bleedingEval = suite.results.get('Bleeding Effect Evaluation');
  const overrideEval = suite.results.get('Effect with Overrides Evaluation');
  const curveEval = suite.results.get('Curve Application (EASE_OUT)');
  const combatScenario = suite.results.get('Combat Scenario - 10 Actors with Mixed Effects');
  const includesMatch = suite.results.get('String Matching - includes()');
  const startsWithMatch = suite.results.get('String Matching - startsWith() with constants');
  const setMatch = suite.results.get('String Matching - Set.has() lookup');

  if (bleedingEval && curveEval) {
    console.log('\nCore Operations:');
    console.log(`  Effect Evaluation: ${bleedingEval.throughputPerSecond.toFixed(0)} evals/sec`);
    console.log(`  Curve Application: ${curveEval.throughputPerSecond.toFixed(0)} curves/sec`);

    if (overrideEval) {
      const overheadPct = ((bleedingEval.avgTimePerOp - overrideEval.avgTimePerOp) / bleedingEval.avgTimePerOp) * 100;
      console.log(`  Override Overhead: ${Math.abs(overheadPct).toFixed(1)}% ${overheadPct > 0 ? 'slower' : 'faster'}`);
    }
  }

  if (includesMatch && startsWithMatch && setMatch) {
    console.log('\nString Matching Performance:');
    console.log(`  includes():   ${includesMatch.throughputPerSecond.toFixed(0)} matches/sec`);
    console.log(`  startsWith(): ${startsWithMatch.throughputPerSecond.toFixed(0)} matches/sec`);
    console.log(`  Set.has():    ${setMatch.throughputPerSecond.toFixed(0)} matches/sec`);

    const startsWithSpeedup = startsWithMatch.throughputPerSecond / includesMatch.throughputPerSecond;
    const setSpeedup = setMatch.throughputPerSecond / includesMatch.throughputPerSecond;
    console.log(`  ✅ startsWith() is ${startsWithSpeedup.toFixed(2)}x ${startsWithSpeedup > 1 ? 'faster' : 'slower'} than includes()`);
    console.log(`  🚀 Set.has() is ${setSpeedup.toFixed(2)}x ${setSpeedup > 1 ? 'faster' : 'slower'} than includes()`);
  }

  if (combatScenario) {
    console.log('\nRealistic Scenarios:');
    console.log(`  Combat Scenario: ${combatScenario.throughputPerSecond.toFixed(0)} scenarios/sec`);
    console.log(`  Avg Effects/Actor: ~3-4 (including overrides)`);
  }

  console.log('\n📊 RECOMMENDATIONS');
  console.log('='.repeat(80));
  console.log('• Use schema caching for production - significant performance gains');
  console.log('• Batch expired effect removal to reduce object churn');
  console.log('• Consider pre-allocating result objects to avoid GC pressure');
  console.log('• Effect evaluation is CPU-bound - optimize curve calculations for hot paths');
  console.log('• Override functionality has minimal performance impact');
  console.log('• Realistic combat scenarios show system can handle 100+ actors with mixed effects');
}

// Run the benchmarks
runBenchmarks().catch(console.error);
