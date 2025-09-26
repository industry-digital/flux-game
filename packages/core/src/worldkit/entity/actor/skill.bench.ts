import { performance } from 'perf_hooks';
import { Actor } from '~/types/entity/actor';
import { SkillState } from '~/types/entity/skill';
import { Modifier } from '~/types/modifier';
import { SkillURN } from '~/types/taxonomy';
import { createActor } from './index';
import {
  getActorSkill,
  getActorSkillModifiers,
  getEffectiveSkillRank,
  hasActiveSkillModifiers,
  getSkillModifierBonus,
  createDefaultSkillState,
} from './skill';

// Benchmark configuration
const ITERATIONS = 100_000;
const WARMUP_ITERATIONS = 10_000;

// Test data generators
const createBenchmarkModifier = (position: number, value: number): Modifier => ({
  schema: 'flux:schema:modifier:benchmark',
  position,
  value,
  appliedBy: 'flux:actor:benchmark',
} as Modifier);

const createBenchmarkActor = (skillRank: number, modifierCount: number): Actor => {
  const mods: Record<string, Modifier> = {};

  // Create mix of active and expired modifiers
  for (let i = 0; i < modifierCount; i++) {
    const position = i < modifierCount * 0.7 ? Math.random() * 0.9 : 1.0 + Math.random(); // 70% active, 30% expired
    const value = (Math.random() - 0.5) * 20; // -10 to +10
    mods[`mod-${i}`] = createBenchmarkModifier(position, value);
  }

  const skillState: SkillState = {
    xp: 1000,
    pxp: 100,
    rank: skillRank,
    mods,
  };

  return createActor({
    name: 'Benchmark Actor',
    description: 'Actor for performance testing',
    skills: { 'flux:skill:benchmark': skillState } as Record<SkillURN, SkillState>,
  });
};

// Benchmark runner
function benchmark(name: string, fn: () => void): void {
  // Warmup
  for (let i = 0; i < WARMUP_ITERATIONS; i++) {
    fn();
  }

  // Actual benchmark
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    fn();
  }
  const end = performance.now();

  const totalTime = end - start;
  const avgTime = totalTime / ITERATIONS;
  const throughput = ITERATIONS / (totalTime / 1000); // ops/second

  console.log(`${name}:`);
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average time: ${(avgTime * 1000).toFixed(3)}μs per operation`);
  console.log(`  Throughput: ${throughput.toLocaleString()} ops/second`);
  console.log('');
}

// Test scenarios
const TEST_SKILL_URN = 'flux:skill:benchmark' as SkillURN;

// Scenario 1: No modifiers
const actorNoMods = createBenchmarkActor(50, 0);

// Scenario 2: Few modifiers (typical case)
const actorFewMods = createBenchmarkActor(50, 5);

// Scenario 3: Many modifiers (stress test)
const actorManyMods = createBenchmarkActor(50, 20);

// Pre-extracted data for optimization benchmarks
const baseSkillFew = getActorSkill(actorFewMods, TEST_SKILL_URN);
const modifiersFew = getActorSkillModifiers(actorFewMods, TEST_SKILL_URN);

const baseSkillMany = getActorSkill(actorManyMods, TEST_SKILL_URN);
const modifiersMany = getActorSkillModifiers(actorManyMods, TEST_SKILL_URN);

console.log('='.repeat(60));
console.log('SKILL MODULE PERFORMANCE BENCHMARK');
console.log('='.repeat(60));
console.log(`Iterations: ${ITERATIONS.toLocaleString()}`);
console.log(`Warmup: ${WARMUP_ITERATIONS.toLocaleString()}`);
console.log('');

// Benchmark createDefaultSkillState
benchmark('createDefaultSkillState()', () => {
  createDefaultSkillState();
});

// Benchmark getActorSkill
benchmark('getActorSkill() - existing skill', () => {
  getActorSkill(actorFewMods, TEST_SKILL_URN);
});

benchmark('getActorSkill() - non-existent skill', () => {
  getActorSkill(actorNoMods, 'flux:skill:nonexistent' as SkillURN);
});

// Benchmark getActorSkillModifiers
benchmark('getActorSkillModifiers() - no modifiers', () => {
  getActorSkillModifiers(actorNoMods, TEST_SKILL_URN);
});

benchmark('getActorSkillModifiers() - few modifiers (5)', () => {
  getActorSkillModifiers(actorFewMods, TEST_SKILL_URN);
});

benchmark('getActorSkillModifiers() - many modifiers (20)', () => {
  getActorSkillModifiers(actorManyMods, TEST_SKILL_URN);
});

// Benchmark getEffectiveSkillRank
benchmark('getEffectiveSkillRank() - no modifiers', () => {
  getEffectiveSkillRank(actorNoMods, TEST_SKILL_URN);
});

benchmark('getEffectiveSkillRank() - few modifiers (5)', () => {
  getEffectiveSkillRank(actorFewMods, TEST_SKILL_URN);
});

benchmark('getEffectiveSkillRank() - many modifiers (20)', () => {
  getEffectiveSkillRank(actorManyMods, TEST_SKILL_URN);
});

// Benchmark optimized versions with pre-extracted data
benchmark('getEffectiveSkillRank() - optimized few mods', () => {
  getEffectiveSkillRank(actorFewMods, TEST_SKILL_URN, baseSkillFew, modifiersFew);
});

benchmark('getEffectiveSkillRank() - optimized many mods', () => {
  getEffectiveSkillRank(actorManyMods, TEST_SKILL_URN, baseSkillMany, modifiersMany);
});

// Benchmark hasActiveSkillModifiers
benchmark('hasActiveSkillModifiers() - no modifiers', () => {
  hasActiveSkillModifiers(actorNoMods, TEST_SKILL_URN);
});

benchmark('hasActiveSkillModifiers() - few modifiers (5)', () => {
  hasActiveSkillModifiers(actorFewMods, TEST_SKILL_URN);
});

benchmark('hasActiveSkillModifiers() - many modifiers (20)', () => {
  hasActiveSkillModifiers(actorManyMods, TEST_SKILL_URN);
});

// Benchmark getSkillModifierBonus
benchmark('getSkillModifierBonus() - no modifiers', () => {
  getSkillModifierBonus(actorNoMods, TEST_SKILL_URN);
});

benchmark('getSkillModifierBonus() - few modifiers (5)', () => {
  getSkillModifierBonus(actorFewMods, TEST_SKILL_URN);
});

benchmark('getSkillModifierBonus() - many modifiers (20)', () => {
  getSkillModifierBonus(actorManyMods, TEST_SKILL_URN);
});

// Benchmark optimized versions
benchmark('getSkillModifierBonus() - optimized few mods', () => {
  getSkillModifierBonus(actorFewMods, TEST_SKILL_URN, modifiersFew);
});

benchmark('getSkillModifierBonus() - optimized many mods', () => {
  getSkillModifierBonus(actorManyMods, TEST_SKILL_URN, modifiersMany);
});

// Combat simulation benchmark (realistic usage)
console.log('-'.repeat(60));
console.log('COMBAT SIMULATION BENCHMARK');
console.log('-'.repeat(60));

const combatActors = Array.from({ length: 10 }, (_, i) =>
  createBenchmarkActor(40 + i * 2, 3 + i) // Varying skill ranks and modifier counts
);

benchmark('Combat rating calculation (10 actors)', () => {
  for (const actor of combatActors) {
    // Simulate typical combat calculations
    getEffectiveSkillRank(actor, TEST_SKILL_URN);
    hasActiveSkillModifiers(actor, TEST_SKILL_URN);
    getSkillModifierBonus(actor, TEST_SKILL_URN);
  }
});

benchmark('Optimized combat rating (10 actors)', () => {
  for (const actor of combatActors) {
    // Pre-extract for maximum performance
    const baseSkill = getActorSkill(actor, TEST_SKILL_URN);
    const modifiers = getActorSkillModifiers(actor, TEST_SKILL_URN);

    // Reuse extracted data
    getEffectiveSkillRank(actor, TEST_SKILL_URN, baseSkill, modifiers);
    getSkillModifierBonus(actor, TEST_SKILL_URN, modifiers);
    // hasActiveSkillModifiers could also be optimized but uses different logic
    hasActiveSkillModifiers(actor, TEST_SKILL_URN);
  }
});

console.log('='.repeat(60));
console.log('BENCHMARK COMPLETE');
console.log('='.repeat(60));
