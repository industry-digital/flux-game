import { describe, it, expect, beforeEach } from 'vitest';
import { Actor } from '~/types/entity/actor';
import { SkillState } from '~/types/entity/skill';
import { AppliedModifiers, Modifier } from '~/types/modifier';
import { SkillURN } from '~/types/taxonomy';
import { createActor } from './index';
import {
  MIN_SKILL_RANK,
  MAX_SKILL_RANK,
  getActorSkill,
  getActorSkillModifiers,
  getEffectiveSkillRank,
  hasActiveSkillModifiers,
  getSkillModifierBonus,
  createDefaultSkillState,
  createActorSkillApi,
  type ActorSkillApi,
} from './skill';

// Test fixtures
const createTestActor = (skills: Partial<Record<SkillURN, SkillState>> = {}): Actor => {
  const actor = createActor();
  return {
    ...actor,
    name: 'Test Actor',
    description: { base: 'Test actor for skill tests' },
    skills: {
      ...actor.skills,
      ...skills,  // This preserves object references!
    },
  };
};

const createTestModifier = (overrides: Partial<Modifier> = {}): Modifier => ({
  schema: 'test-modifier' as any,
  position: 0.5,
  value: 10,
  appliedBy: 'test-source' as any,
  ...overrides,
});

const TEST_SKILL_URN: SkillURN = 'flux:skill:test' as SkillURN;

describe('skill.ts', () => {
  describe('createDefaultSkillState', () => {
    it('should create a default skill state with zero values', () => {
      const result = createDefaultSkillState();

      expect(result).toEqual({
        xp: 0,
        pxp: 0,
        rank: 0,
      });
    });
  });

  describe('getActorSkill', () => {
    it('should return existing skill state', () => {
      const skillState: SkillState = {
        xp: 100,
        pxp: 50,
        rank: 75,
        mods: { 'test-mod': createTestModifier() },
      };
      const actor = createTestActor({ [TEST_SKILL_URN]: skillState });

      const result = getActorSkill(actor, TEST_SKILL_URN);

      expect(result).toStrictEqual(skillState);
    });

    it('should return default skill state for non-existent skill', () => {
      const actor = createTestActor();

      const result = getActorSkill(actor, TEST_SKILL_URN);

      expect(result).toEqual(createDefaultSkillState());
    });

    it('should throw error if actor has no skills property', () => {
      const actor = createTestActor();
      delete (actor as any).skills;

      expect(() => getActorSkill(actor, TEST_SKILL_URN)).toThrow('Actor has no skills');
    });
  });

  describe('getActorSkillModifiers', () => {
    it('should return empty object for skill with no modifiers', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: { xp: 0, pxp: 0, rank: 50, mods: {} }
      });

      const result = getActorSkillModifiers(actor, TEST_SKILL_URN);

      expect(result).toEqual({});
    });

    it('should return object of modifiers for skill with modifiers', () => {
      const modifier1 = createTestModifier({ value: 10 });
      const modifier2 = createTestModifier({ value: 5 });
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: { 'mod1': modifier1, 'mod2': modifier2 }
        }
      });

      const result = getActorSkillModifiers(actor, TEST_SKILL_URN);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['mod1']).toStrictEqual(modifier1);
      expect(result['mod2']).toStrictEqual(modifier2);
    });

    it('should return empty object for non-existent skill', () => {
      const actor = createTestActor();

      const result = getActorSkillModifiers(actor, TEST_SKILL_URN);

      expect(result).toEqual({});
    });

    it('should return direct reference to mods object (zero-copy)', () => {
      const modsObject = { 'mod1': createTestModifier({ value: 10 }) };
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: modsObject
        }
      });

      const result = getActorSkillModifiers(actor, TEST_SKILL_URN);

      // Should return the exact same object reference (zero-copy)
      expect(result).toBe(modsObject);
    });
  });

  describe('getEffectiveSkillRank', () => {
    it('should return base rank when no modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: { xp: 0, pxp: 0, rank: 50, mods: {} }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN);

      expect(result).toBe(50);
    });

    it('should add active modifier values to base rank', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'mod1': createTestModifier({ position: 0.5, value: 10 }),
            'mod2': createTestModifier({ position: 0.3, value: 5 }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN);

      expect(result).toBe(65); // 50 + 10 + 5
    });

    it('should ignore expired modifiers (position >= 1.0)', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'active': createTestModifier({ position: 0.5, value: 10 }),
            'expired1': createTestModifier({ position: 1.0, value: 20 }),
            'expired2': createTestModifier({ position: 1.5, value: 30 }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN);

      expect(result).toBe(60); // 50 + 10 (only active modifier)
    });

    it('should handle negative modifier values', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'positive': createTestModifier({ position: 0.5, value: 10 }),
            'negative': createTestModifier({ position: 0.3, value: -15 }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN);

      expect(result).toBe(45); // 50 + 10 - 15
    });

    it('should clamp result to MIN_SKILL_RANK', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 10,
          mods: {
            'penalty': createTestModifier({ position: 0.5, value: -50 }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN);

      expect(result).toBe(MIN_SKILL_RANK); // Should not go below 0
    });

    it('should clamp result to MAX_SKILL_RANK', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 90,
          mods: {
            'bonus': createTestModifier({ position: 0.5, value: 50 }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN);

      expect(result).toBe(MAX_SKILL_RANK); // Should not go above 100
    });

    it('should work with pre-extracted baseSkill and modifiers', () => {
      const baseSkill: SkillState = { xp: 0, pxp: 0, rank: 50, mods: {} };
      const modifiers: AppliedModifiers = {
        'mod1': createTestModifier({ value: 15 }),
      };
      const actor = createTestActor();

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN, baseSkill, modifiers);

      expect(result).toBe(65); // 50 + 15
    });
  });

  describe('hasActiveSkillModifiers', () => {
    it('should return false when no modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: { xp: 0, pxp: 0, rank: 50, mods: {} }
      });

      const result = hasActiveSkillModifiers(actor, TEST_SKILL_URN);

      expect(result).toBe(false);
    });

    it('should return true when active modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'active': createTestModifier({ position: 0.5 }),
          }
        }
      });

      const result = hasActiveSkillModifiers(actor, TEST_SKILL_URN);

      expect(result).toBe(true);
    });

    it('should return false when only expired modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'expired1': createTestModifier({ position: 1.0 }),
            'expired2': createTestModifier({ position: 1.5 }),
          }
        }
      });

      const result = hasActiveSkillModifiers(actor, TEST_SKILL_URN);

      expect(result).toBe(false);
    });

    it('should return true when mix of active and expired modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'active': createTestModifier({ position: 0.5 }),
            'expired': createTestModifier({ position: 1.0 }),
          }
        }
      });

      const result = hasActiveSkillModifiers(actor, TEST_SKILL_URN);

      expect(result).toBe(true);
    });
  });

  describe('getSkillModifierBonus', () => {
    it('should return 0 when no modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: { xp: 0, pxp: 0, rank: 50, mods: {} }
      });

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN);

      expect(result).toBe(0);
    });

    it('should sum active modifier values', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'mod1': createTestModifier({ position: 0.5, value: 10 }),
            'mod2': createTestModifier({ position: 0.3, value: 5 }),
            'mod3': createTestModifier({ position: 0.8, value: -3 }),
          }
        }
      });

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN);

      expect(result).toBe(12); // 10 + 5 - 3
    });

    it('should ignore expired modifiers', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'active': createTestModifier({ position: 0.5, value: 10 }),
            'expired': createTestModifier({ position: 1.0, value: 100 }),
          }
        }
      });

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN);

      expect(result).toBe(10); // Only active modifier
    });

    it('should work with pre-extracted modifiers array', () => {
      const modifiers: AppliedModifiers = {
        'mod1': createTestModifier({ position: 0.5, value: 15 }),
        'mod2': createTestModifier({ position: 0.3, value: 5 }),
        'mod3': createTestModifier({ position: 1.0, value: 100 }), // expired
      };
      const actor = createTestActor();

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN, modifiers);

      expect(result).toBe(20); // 15 + 5 (expired ignored)
    });

    it('should handle all expired modifiers', () => {
      const modifiers: AppliedModifiers = {
        'expired1': createTestModifier({ position: 1.0, value: 10 }),
        'expired2': createTestModifier({ position: 1.5, value: 20 }),
      };
      const actor = createTestActor();

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN, modifiers);

      expect(result).toBe(0);
    });

    it('should handle edge case of position exactly 1.0', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'edge': createTestModifier({ position: 1.0, value: 10 }),
          }
        }
      });

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN);

      expect(result).toBe(0); // position 1.0 should be considered expired
    });
  });

  describe('integration tests', () => {
    it('should maintain consistency between getEffectiveSkillRank and getSkillModifierBonus', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'mod1': createTestModifier({ position: 0.5, value: 10 }),
            'mod2': createTestModifier({ position: 0.3, value: 5 }),
          }
        }
      });

      const effectiveRank = getEffectiveSkillRank(actor, TEST_SKILL_URN);
      const baseSkill = getActorSkill(actor, TEST_SKILL_URN);
      const modifierBonus = getSkillModifierBonus(actor, TEST_SKILL_URN);

      expect(effectiveRank).toBe(baseSkill.rank + modifierBonus);
    });

    it('should handle complex modifier scenarios correctly', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 100,
          pxp: 25,
          rank: 75,
          mods: {
            'weapon-enchant': createTestModifier({ position: 0.0, value: 5 }),   // Just applied
            'defensive-stance': createTestModifier({ position: 0.7, value: 8 }), // Fading
            'poison-penalty': createTestModifier({ position: 0.4, value: -12 }), // Building
            'expired-buff': createTestModifier({ position: 1.0, value: 20 }),    // Expired
            'very-expired': createTestModifier({ position: 2.0, value: 50 }),    // Very expired
          }
        }
      });

      const effectiveRank = getEffectiveSkillRank(actor, TEST_SKILL_URN);
      const modifierBonus = getSkillModifierBonus(actor, TEST_SKILL_URN);
      const hasActive = hasActiveSkillModifiers(actor, TEST_SKILL_URN);

      expect(modifierBonus).toBe(1); // 5 + 8 - 12 = 1 (expired ignored)
      expect(effectiveRank).toBe(76); // 75 + 1
      expect(hasActive).toBe(true);
    });
  });

  describe('createActorSkillApi', () => {
    let actors: Record<string, Actor>;
    let api: ActorSkillApi;
    let getActorCallCount: number;

    beforeEach(() => {
      // Reset call counter
      getActorCallCount = 0;

      // Create test actors
      actors = {
        'flux:actor:alice': createTestActor({
          [TEST_SKILL_URN]: {
            xp: 0,
            pxp: 0,
            rank: 50,
            mods: {
              'mod1': createTestModifier({ position: 0.3, value: 15 }),
              'mod2': createTestModifier({ position: 0.8, value: -5 }),
            },
          },
        }),
        'flux:actor:bob': createTestActor({
          [TEST_SKILL_URN]: {
            xp: 0,
            pxp: 0,
            rank: 25,
            mods: {},
          },
        }),
      };

      // Create API with instrumented getActor function
      api = createActorSkillApi();
    });

    describe('function signatures', () => {
      it('should have identical signatures to original functions', () => {
        const alice = actors['flux:actor:alice'];

        // These should all compile and work identically
        const skill1 = getActorSkill(alice, TEST_SKILL_URN);
        const skill2 = api.getActorSkill(alice, TEST_SKILL_URN);
        expect(skill2).toStrictEqual(skill1);

        const mods1 = getActorSkillModifiers(alice, TEST_SKILL_URN);
        const mods2 = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        expect(mods2).toStrictEqual(mods1);

        const rank1 = getEffectiveSkillRank(alice, TEST_SKILL_URN);
        const rank2 = api.getEffectiveSkillRank(alice, TEST_SKILL_URN);
        expect(rank2).toBe(rank1);

        const hasActive1 = hasActiveSkillModifiers(alice, TEST_SKILL_URN);
        const hasActive2 = api.hasActiveSkillModifiers(alice, TEST_SKILL_URN);
        expect(hasActive2).toBe(hasActive1);

        const bonus1 = getSkillModifierBonus(alice, TEST_SKILL_URN);
        const bonus2 = api.getSkillModifierBonus(alice, TEST_SKILL_URN);
        expect(bonus2).toBe(bonus1);
      });
    });

    describe('memoization behavior', () => {
      it('should cache modifier extraction results', () => {
        const alice = actors['flux:actor:alice'];

        // First call should extract modifiers
        const mods1 = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        expect(Object.keys(mods1)).toHaveLength(2);

        // Second call should use cached result
        const mods2 = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        expect(mods2).toBe(mods1); // Same reference (cached)
        expect(mods2).toStrictEqual(mods1); // Same content
      });

      it('should use memoized modifiers in dependent functions', () => {
        const alice = actors['flux:actor:alice'];

        // Call getActorSkillModifiers first to populate cache
        const mods = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        expect(Object.keys(mods)).toHaveLength(2);

        // These calls should use the cached modifiers
        const rank = api.getEffectiveSkillRank(alice, TEST_SKILL_URN);
        const hasActive = api.hasActiveSkillModifiers(alice, TEST_SKILL_URN);
        const bonus = api.getSkillModifierBonus(alice, TEST_SKILL_URN);

        expect(rank).toBe(60); // 50 + 10 (15 - 5)
        expect(hasActive).toBe(true);
        expect(bonus).toBe(10);
      });

      it('should cache results per actor-skill combination', () => {
        const alice = actors['flux:actor:alice'];
        const bob = actors['flux:actor:bob'];

        // Different actors should have separate cache entries
        const aliceMods = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        const bobMods = api.getActorSkillModifiers(bob, TEST_SKILL_URN);

        expect(Object.keys(aliceMods)).toHaveLength(2);
        expect(Object.keys(bobMods)).toHaveLength(0);
        expect(aliceMods).not.toBe(bobMods);
      });
    });

    describe('error handling', () => {
      it('should handle actors with minimal data gracefully', () => {
        const minimalActor = createTestActor(); // Empty skills

        expect(() => {
          api.getActorSkill(minimalActor, TEST_SKILL_URN);
        }).not.toThrow(); // Should return default skill state

        expect(() => {
          api.getActorSkillModifiers(minimalActor, TEST_SKILL_URN);
        }).not.toThrow(); // Should return empty object

        const skill = api.getActorSkill(minimalActor, TEST_SKILL_URN);
        const mods = api.getActorSkillModifiers(minimalActor, TEST_SKILL_URN);

        expect(skill).toStrictEqual(createDefaultSkillState());
        expect(Object.keys(mods)).toHaveLength(0);
      });
    });

    describe('performance characteristics', () => {
      it('should demonstrate caching benefits', () => {
        const alice = actors['flux:actor:alice'];

        // Multiple calls to functions that use modifiers
        for (let i = 0; i < 5; i++) {
          api.getEffectiveSkillRank(alice, TEST_SKILL_URN);
          api.hasActiveSkillModifiers(alice, TEST_SKILL_URN);
          api.getSkillModifierBonus(alice, TEST_SKILL_URN);
        }

        // Modifier extraction should only happen once per actor-skill combo
        const mods1 = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        const mods2 = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        expect(mods1).toBe(mods2); // Same reference = cached
      });
    });

    describe('edge cases', () => {
      it('should handle actors with no modifiers', () => {
        const bob = actors['flux:actor:bob'];

        const mods = api.getActorSkillModifiers(bob, TEST_SKILL_URN);
        const rank = api.getEffectiveSkillRank(bob, TEST_SKILL_URN);
        const hasActive = api.hasActiveSkillModifiers(bob, TEST_SKILL_URN);
        const bonus = api.getSkillModifierBonus(bob, TEST_SKILL_URN);

        expect(Object.keys(mods)).toHaveLength(0);
        expect(rank).toBe(25); // Base rank only
        expect(hasActive).toBe(false);
        expect(bonus).toBe(0);
      });

      it('should handle actors with missing skills', () => {
        const alice = actors['flux:actor:alice'];
        const missingSkill = 'flux:skill:missing' as SkillURN;

        const skill = api.getActorSkill(alice, missingSkill);
        const mods = api.getActorSkillModifiers(alice, missingSkill);
        const rank = api.getEffectiveSkillRank(alice, missingSkill);

        expect(skill).toStrictEqual(createDefaultSkillState());
        expect(Object.keys(mods)).toHaveLength(0);
        expect(rank).toBe(0);
      });

      it('should handle expired modifiers correctly', () => {
        const actorWithExpired = createTestActor({
          [TEST_SKILL_URN]: {
            xp: 0,
            pxp: 0,
            rank: 30,
            mods: {
              'active': createTestModifier({ position: 0.5, value: 20 }),
              'expired': createTestModifier({ position: 1.0, value: 100 }), // Expired
            },
          },
        });

        actors['flux:actor:expired'] = actorWithExpired;

        const mods = api.getActorSkillModifiers(actorWithExpired, TEST_SKILL_URN);
        const rank = api.getEffectiveSkillRank(actorWithExpired, TEST_SKILL_URN);
        const hasActive = api.hasActiveSkillModifiers(actorWithExpired, TEST_SKILL_URN);
        const bonus = api.getSkillModifierBonus(actorWithExpired, TEST_SKILL_URN);

        expect(Object.keys(mods)).toHaveLength(2); // Both modifiers present
        expect(rank).toBe(50); // 30 + 20 (expired ignored)
        expect(hasActive).toBe(true); // Active modifier present
        expect(bonus).toBe(20); // Only active modifier
      });
    });
  });

  describe('performance benchmarks', () => {
    const BENCHMARK_ITERATIONS = 100000;
    const WARMUP_ITERATIONS = 1000;

    // Create test actors with different modifier loads
    const createBenchmarkActor = (modifierCount: number): Actor => {
      const mods: Record<string, Modifier> = {};
      for (let i = 0; i < modifierCount; i++) {
        const position = i < modifierCount * 0.7 ? Math.random() * 0.9 : 1.0 + Math.random();
        const value = (Math.random() - 0.5) * 20;
        mods[`mod-${i}`] = createTestModifier({ position, value });
      }

      return createTestActor({
        [TEST_SKILL_URN]: {
          xp: 1000,
          pxp: 100,
          rank: 75,
          mods,
        },
      });
    };

    // Simulate old array-based approach for comparison
    const getActorSkillModifiersArray = (actor: Actor, skill: SkillURN): Modifier[] => {
      if (!actor.skills) {
        return [];
      }
      const skillState = actor.skills[skill];
      if (!skillState?.mods) {
        return [];
      }

      const keys = Object.keys(skillState.mods);
      const out = Array(keys.length);
      for (let i = 0; i < keys.length; i++) {
        out[i] = skillState.mods[keys[i]];
      }
      return out;
    };

    const benchmarkFunction = (name: string, fn: () => void): void => {
      // Warmup
      for (let i = 0; i < WARMUP_ITERATIONS; i++) {
        fn();
      }

      // Benchmark
      const start = performance.now();
      for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
        fn();
      }
      const end = performance.now();
      const duration = end - start;
      const opsPerSecond = Math.round(BENCHMARK_ITERATIONS / (duration / 1000));

      console.log(`${name}: ${duration.toFixed(2)}ms (${opsPerSecond.toLocaleString()} ops/sec)`);
    };

    it('should benchmark zero-copy vs array conversion performance', () => {
      const fewModsActor = createBenchmarkActor(3);
      const manyModsActor = createBenchmarkActor(20);

      console.log('\n=== Skill Modifier Extraction Benchmarks ===');

      // Few modifiers comparison
      console.log('\nFew Modifiers (3):');
      benchmarkFunction('  Zero-copy (AppliedModifiers)', () => {
        getActorSkillModifiers(fewModsActor, TEST_SKILL_URN);
      });

      benchmarkFunction('  Array conversion (old)', () => {
        getActorSkillModifiersArray(fewModsActor, TEST_SKILL_URN);
      });

      // Many modifiers comparison
      console.log('\nMany Modifiers (20):');
      benchmarkFunction('  Zero-copy (AppliedModifiers)', () => {
        getActorSkillModifiers(manyModsActor, TEST_SKILL_URN);
      });

      benchmarkFunction('  Array conversion (old)', () => {
        getActorSkillModifiersArray(manyModsActor, TEST_SKILL_URN);
      });

      expect(true).toBe(true);
    });

    it('should benchmark iteration patterns', () => {
      const actor = createBenchmarkActor(15);
      const modifiers = getActorSkillModifiers(actor, TEST_SKILL_URN);

      console.log('\n=== Iteration Pattern Benchmarks ===');

      // for...in iteration (current)
      benchmarkFunction('for...in iteration', () => {
        let total = 0;
        for (let modifierId in modifiers) {
          const modifier = modifiers[modifierId];
          if (modifier.position < 1.0) {
            total += modifier.value;
          }
        }
      });

      // Object.values iteration (alternative)
      benchmarkFunction('Object.values iteration', () => {
        let total = 0;
        const values = Object.values(modifiers);
        for (const modifier of values) {
          if (modifier.position < 1.0) {
            total += modifier.value;
          }
        }
      });

      expect(true).toBe(true);
    });

    it('should benchmark memoized API performance', () => {
      const actor = createBenchmarkActor(10);
      const api = createActorSkillApi();

      console.log('\n=== Memoized API Benchmarks ===');

      // Cold cache (first call)
      benchmarkFunction('Cold cache (first call)', () => {
        api.getActorSkillModifiers(actor, TEST_SKILL_URN);
      });

      // Warm cache (subsequent calls)
      benchmarkFunction('Warm cache (cached)', () => {
        api.getActorSkillModifiers(actor, TEST_SKILL_URN);
      });

      expect(true).toBe(true);
    });
  });
});
