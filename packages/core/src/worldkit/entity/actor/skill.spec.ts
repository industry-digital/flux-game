import { describe, it, expect, beforeEach } from 'vitest';
import { Actor } from '~/types/entity/actor';
import { SkillState } from '~/types/entity/skill';
import { AppliedModifiers } from '~/types/modifier';
import { SkillSchemaURN } from '~/types/taxonomy';
import { createActor } from './index';
import { createModifier } from '~/worldkit/entity/modifier';
import { DEFAULT_TIMESTAMP } from '~/testing/constants';
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
  setActorSkillRank,
  setActorSkillRanks,
  type ActorSkillApi,
} from './skill';

const NOW = DEFAULT_TIMESTAMP;
const ONE_MINUTE_AGO = NOW - (60 * 1000);
const ONE_MINUTE_FROM_NOW = NOW + (60 * 1000);

const TEST_SKILL_URN: SkillSchemaURN = 'flux:skill:test' as SkillSchemaURN;

// Test fixtures
const createTestActor = (skills: Partial<Record<SkillSchemaURN, SkillState>> = {}): Actor => {
  const actor = createActor();
  return {
    ...actor,
    name: 'Test Actor',
    description: { base: 'Test actor for skill tests' },
    skills: {
      ...actor.skills,
      ...skills,
    },
  };
};

describe('skill utilities', () => {
  describe('createDefaultSkillState', () => {
    it('should create default skill state with zero rank', () => {
      const result = createDefaultSkillState();

      expect(result).toEqual({
        xp: 0,
        pxp: 0,
        rank: 0,
      });
    });

    it('should create skill state with specified rank', () => {
      const result = createDefaultSkillState(50);

      expect(result).toEqual({
        xp: 0,
        pxp: 0,
        rank: 50,
      });
    });

    it('should clamp rank to valid range', () => {
      expect(createDefaultSkillState(-10).rank).toBe(MIN_SKILL_RANK);
      expect(createDefaultSkillState(150).rank).toBe(MAX_SKILL_RANK);
    });
  });

  describe('getActorSkill', () => {
    it('should return existing skill state', () => {
      const skillState: SkillState = {
        xp: 100,
        pxp: 50,
        rank: 75,
        mods: {
          'test-mod': createModifier({
            origin: 'test:modifier',
            value: 10,
            duration: -1,
            ts: NOW,
          }),
        },
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

    it('should return modifiers object for skill with modifiers', () => {
      const modifier1 = createModifier({ origin: 'test:mod1', value: 10, duration: -1, ts: NOW });
      const modifier2 = createModifier({ origin: 'test:mod2', value: 5, duration: -1, ts: NOW });
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
      const modsObject = {
        'mod1': createModifier({ origin: 'test:mod', value: 10, duration: -1, ts: NOW })
      };
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: modsObject
        }
      });

      const result = getActorSkillModifiers(actor, TEST_SKILL_URN);

      expect(result).toBe(modsObject);
    });
  });

  describe('getEffectiveSkillRank', () => {
    it('should return base rank when no modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: { xp: 0, pxp: 0, rank: 50, mods: {} }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN, undefined, undefined, { timestamp: () => NOW });

      expect(result).toBe(50);
    });

    it('should add active modifier values to base rank', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'mod1': createModifier({ origin: 'test:mod1', value: 10, duration: -1, ts: NOW }),
            'mod2': createModifier({ origin: 'test:mod2', value: 5, duration: -1, ts: NOW }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN, undefined, undefined, { timestamp: () => NOW });

      expect(result).toBe(65); // 50 + 10 + 5
    });

    it('should ignore expired modifiers', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'active': createModifier({ origin: 'test:active', value: 10, duration: -1, ts: NOW }),
            'expired1': createModifier({ origin: 'test:expired1', value: 20, duration: 30000, ts: NOW - 60000 }),
            'expired2': createModifier({ origin: 'test:expired2', value: 30, duration: 10000, ts: NOW - 20000 }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN, undefined, undefined, { timestamp: () => NOW });

      expect(result).toBe(60); // 50 + 10 (only active modifier)
    });

    it('should handle negative modifier values', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'positive': createModifier({ origin: 'test:positive', value: 10, duration: -1, ts: NOW }),
            'negative': createModifier({ origin: 'test:negative', value: -15, duration: -1, ts: NOW }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN, undefined, undefined, { timestamp: () => NOW });

      expect(result).toBe(45); // 50 + 10 - 15
    });

    it('should clamp result to MIN_SKILL_RANK', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 10,
          mods: {
            'penalty': createModifier({ origin: 'test:penalty', value: -50, duration: -1, ts: NOW }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN, undefined, undefined, { timestamp: () => NOW });

      expect(result).toBe(MIN_SKILL_RANK);
    });

    it('should clamp result to MAX_SKILL_RANK', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 90,
          mods: {
            'bonus': createModifier({ origin: 'test:bonus', value: 50, duration: -1, ts: NOW }),
          }
        }
      });

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN, undefined, undefined, { timestamp: () => NOW });

      expect(result).toBe(MAX_SKILL_RANK);
    });

    it('should work with pre-extracted baseSkill and modifiers', () => {
      const baseSkill: SkillState = { xp: 0, pxp: 0, rank: 50, mods: {} };
      const modifiers: AppliedModifiers = {
        'mod1': createModifier({ origin: 'test:mod1', value: 15, duration: -1, ts: NOW }),
      };
      const actor = createTestActor();

      const result = getEffectiveSkillRank(actor, TEST_SKILL_URN, baseSkill, modifiers, { timestamp: () => NOW });

      expect(result).toBe(65); // 50 + 15
    });
  });

  describe('hasActiveSkillModifiers', () => {
    it('should return false when no modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: { xp: 0, pxp: 0, rank: 50, mods: {} }
      });

      const result = hasActiveSkillModifiers(actor, TEST_SKILL_URN, NOW);

      expect(result).toBe(false);
    });

    it('should return true when active modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'active': createModifier({ origin: 'test:active', value: 10, duration: -1, ts: NOW }),
          }
        }
      });

      const result = hasActiveSkillModifiers(actor, TEST_SKILL_URN, NOW);

      expect(result).toBe(true);
    });

    it('should return false when only expired modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'expired1': createModifier({ origin: 'test:expired1', value: 10, duration: 30000, ts: NOW - 60000 }),
            'expired2': createModifier({ origin: 'test:expired2', value: 20, duration: 10000, ts: NOW - 20000 }),
          }
        }
      });

      const result = hasActiveSkillModifiers(actor, TEST_SKILL_URN, NOW);

      expect(result).toBe(false);
    });

    it('should return true when mix of active and expired modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'active': createModifier({ origin: 'test:active', value: 10, duration: -1, ts: NOW }),
            'expired': createModifier({ origin: 'test:expired', value: 20, duration: 30000, ts: NOW - 60000 }),
          }
        }
      });

      const result = hasActiveSkillModifiers(actor, TEST_SKILL_URN, NOW);

      expect(result).toBe(true);
    });
  });

  describe('getSkillModifierBonus', () => {
    it('should return 0 when no modifiers exist', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: { xp: 0, pxp: 0, rank: 50, mods: {} }
      });

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN, undefined, NOW);

      expect(result).toBe(0);
    });

    it('should sum active modifier values', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'mod1': createModifier({ origin: 'test:mod1', value: 10, duration: -1, ts: NOW }),
            'mod2': createModifier({ origin: 'test:mod2', value: 5, duration: -1, ts: NOW }),
            'mod3': createModifier({ origin: 'test:mod3', value: -3, duration: -1, ts: NOW }),
          }
        }
      });

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN, undefined, NOW);

      expect(result).toBe(12); // 10 + 5 - 3
    });

    it('should ignore expired modifiers', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 0,
          pxp: 0,
          rank: 50,
          mods: {
            'active': createModifier({ origin: 'test:active', value: 10, duration: -1, ts: NOW }),
            'expired': createModifier({ origin: 'test:expired', value: 100, duration: 30000, ts: NOW - 60000 }),
          }
        }
      });

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN, undefined, NOW);

      expect(result).toBe(10); // Only active modifier
    });

    it('should work with pre-extracted modifiers', () => {
      const modifiers: AppliedModifiers = {
        'mod1': createModifier({ origin: 'test:mod1', value: 15, duration: -1, ts: NOW }),
        'mod2': createModifier({ origin: 'test:mod2', value: 5, duration: -1, ts: NOW }),
        'mod3': createModifier({ origin: 'test:expired', value: 100, duration: 30000, ts: NOW - 60000 }), // expired
      };
      const actor = createTestActor();

      const result = getSkillModifierBonus(actor, TEST_SKILL_URN, modifiers, NOW);

      expect(result).toBe(20); // 15 + 5 (expired ignored)
    });
  });

  describe('setActorSkillRank', () => {
    it('should set skill rank for new skill', () => {
      const actor = createTestActor();

      setActorSkillRank(actor, TEST_SKILL_URN, 75);

      const skill = getActorSkill(actor, TEST_SKILL_URN);
      expect(skill.rank).toBe(75);
      expect(skill.xp).toBe(0);
      expect(skill.pxp).toBe(0);
    });

    it('should update existing skill rank', () => {
      const actor = createTestActor({
        [TEST_SKILL_URN]: { xp: 100, pxp: 50, rank: 25 }
      });

      setActorSkillRank(actor, TEST_SKILL_URN, 80);

      const skill = getActorSkill(actor, TEST_SKILL_URN);
      expect(skill.rank).toBe(80);
      expect(skill.xp).toBe(100);
      expect(skill.pxp).toBe(50);
    });

    it('should clamp rank to valid range', () => {
      const actor = createTestActor();

      setActorSkillRank(actor, TEST_SKILL_URN, -20);
      expect(getActorSkill(actor, TEST_SKILL_URN).rank).toBe(MIN_SKILL_RANK);

      setActorSkillRank(actor, TEST_SKILL_URN, 150);
      expect(getActorSkill(actor, TEST_SKILL_URN).rank).toBe(MAX_SKILL_RANK);
    });

    it('should preserve existing modifiers when updating rank', () => {
      const existingModifier = createModifier({ origin: 'test:existing', value: 15, duration: -1, ts: NOW });
      const actor = createTestActor({
        [TEST_SKILL_URN]: {
          xp: 100,
          pxp: 50,
          rank: 25,
          mods: { 'existing': existingModifier }
        }
      });

      setActorSkillRank(actor, TEST_SKILL_URN, 60);

      const skill = getActorSkill(actor, TEST_SKILL_URN);
      expect(skill.rank).toBe(60);
      expect(skill.mods?.['existing']).toStrictEqual(existingModifier);
    });
  });

  describe('setActorSkillRanks', () => {
    it('should set multiple skill ranks', () => {
      const actor = createTestActor();
      const skillUrn1: SkillSchemaURN = 'flux:skill:test1' as SkillSchemaURN;
      const skillUrn2: SkillSchemaURN = 'flux:skill:test2' as SkillSchemaURN;

      setActorSkillRanks(actor, {
        [skillUrn1]: 30,
        [skillUrn2]: 70,
        [TEST_SKILL_URN]: 50,
      });

      expect(getActorSkill(actor, skillUrn1).rank).toBe(30);
      expect(getActorSkill(actor, skillUrn2).rank).toBe(70);
      expect(getActorSkill(actor, TEST_SKILL_URN).rank).toBe(50);
    });

    it('should update existing skills and create new ones', () => {
      const skillUrn1: SkillSchemaURN = 'flux:skill:existing' as SkillSchemaURN;
      const skillUrn2: SkillSchemaURN = 'flux:skill:new' as SkillSchemaURN;

      const actor = createTestActor({
        [skillUrn1]: { xp: 200, pxp: 100, rank: 40 }
      });

      setActorSkillRanks(actor, {
        [skillUrn1]: 80,
        [skillUrn2]: 60,
      });

      const existingSkill = getActorSkill(actor, skillUrn1);
      const newSkill = getActorSkill(actor, skillUrn2);

      expect(existingSkill.rank).toBe(80);
      expect(existingSkill.xp).toBe(200);
      expect(existingSkill.pxp).toBe(100);

      expect(newSkill.rank).toBe(60);
      expect(newSkill.xp).toBe(0);
      expect(newSkill.pxp).toBe(0);
    });

    it('should clamp all ranks to valid range', () => {
      const actor = createTestActor();
      const skillUrn1: SkillSchemaURN = 'flux:skill:low' as SkillSchemaURN;
      const skillUrn2: SkillSchemaURN = 'flux:skill:high' as SkillSchemaURN;

      setActorSkillRanks(actor, {
        [skillUrn1]: -10,
        [skillUrn2]: 150,
        [TEST_SKILL_URN]: 50,
      });

      expect(getActorSkill(actor, skillUrn1).rank).toBe(MIN_SKILL_RANK);
      expect(getActorSkill(actor, skillUrn2).rank).toBe(MAX_SKILL_RANK);
      expect(getActorSkill(actor, TEST_SKILL_URN).rank).toBe(50);
    });
  });

  describe('createActorSkillApi', () => {
    let actors: Record<string, Actor>;
    let api: ActorSkillApi;

    beforeEach(() => {
      actors = {
        'flux:actor:alice': createTestActor({
          [TEST_SKILL_URN]: {
            xp: 0,
            pxp: 0,
            rank: 50,
            mods: {
              'mod1': createModifier({ origin: 'test:mod1', value: 15, duration: 30000, ts: ONE_MINUTE_AGO }),
              'mod2': createModifier({ origin: 'test:mod2', value: -5, duration: -1, ts: NOW }),
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

      api = createActorSkillApi(new Map(), { timestamp: () => NOW });
    });

    describe('function signatures', () => {
      it('should have identical signatures to original functions', () => {
        const alice = actors['flux:actor:alice'];

        const skill1 = getActorSkill(alice, TEST_SKILL_URN);
        const skill2 = api.getActorSkill(alice, TEST_SKILL_URN);
        expect(skill2).toStrictEqual(skill1);

        const mods1 = getActorSkillModifiers(alice, TEST_SKILL_URN);
        const mods2 = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        expect(mods2).toStrictEqual(mods1);

        const rank1 = getEffectiveSkillRank(alice, TEST_SKILL_URN, undefined, undefined, { timestamp: () => NOW });
        const rank2 = api.getEffectiveSkillRank(alice, TEST_SKILL_URN);
        expect(rank2).toBe(rank1);

        const hasActive1 = hasActiveSkillModifiers(alice, TEST_SKILL_URN, NOW);
        const hasActive2 = api.hasActiveSkillModifiers(alice, TEST_SKILL_URN, NOW);
        expect(hasActive2).toBe(hasActive1);

        const bonus1 = getSkillModifierBonus(alice, TEST_SKILL_URN, undefined, NOW);
        const bonus2 = api.getSkillModifierBonus(alice, TEST_SKILL_URN, undefined, NOW);
        expect(bonus2).toBe(bonus1);
      });
    });

    describe('memoization behavior', () => {
      it('should cache modifier extraction results', () => {
        const alice = actors['flux:actor:alice'];

        const mods1 = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        expect(Object.keys(mods1)).toHaveLength(2);

        const mods2 = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        expect(mods2).toBe(mods1); // Same reference (cached)
      });

      it('should cache results per actor-skill combination', () => {
        const alice = actors['flux:actor:alice'];
        const bob = actors['flux:actor:bob'];

        const aliceMods = api.getActorSkillModifiers(alice, TEST_SKILL_URN);
        const bobMods = api.getActorSkillModifiers(bob, TEST_SKILL_URN);

        expect(Object.keys(aliceMods)).toHaveLength(2);
        expect(Object.keys(bobMods)).toHaveLength(0);
        expect(aliceMods).not.toBe(bobMods);
      });
    });

    describe('mutation functions', () => {
      it('should provide access to mutation functions', () => {
        const testActor = createTestActor();
        const skillUrn1: SkillSchemaURN = 'flux:skill:api-test1' as SkillSchemaURN;
        const skillUrn2: SkillSchemaURN = 'flux:skill:api-test2' as SkillSchemaURN;

        api.setActorSkillRank(testActor, skillUrn1, 55);
        expect(api.getActorSkill(testActor, skillUrn1).rank).toBe(55);

        api.setActorSkillRanks(testActor, {
          [skillUrn1]: 75,
          [skillUrn2]: 40,
        });
        expect(api.getActorSkill(testActor, skillUrn1).rank).toBe(75);
        expect(api.getActorSkill(testActor, skillUrn2).rank).toBe(40);

        const defaultSkill = api.createDefaultSkillState(85);
        expect(defaultSkill).toEqual({
          xp: 0,
          pxp: 0,
          rank: 85,
        });
      });
    });

    describe('integration with temporal modifiers', () => {
      it('should correctly handle active vs expired modifiers', () => {
        const actorWithMixedMods = createTestActor({
          [TEST_SKILL_URN]: {
            xp: 0,
            pxp: 0,
            rank: 30,
            mods: {
              'active': createModifier({ origin: 'test:active', value: 20, duration: -1, ts: NOW }),
              'expired': createModifier({ origin: 'test:expired', value: 100, duration: 30000, ts: NOW - 60000 }),
            },
          },
        });

        const mods = api.getActorSkillModifiers(actorWithMixedMods, TEST_SKILL_URN);
        const rank = api.getEffectiveSkillRank(actorWithMixedMods, TEST_SKILL_URN);
        const hasActive = api.hasActiveSkillModifiers(actorWithMixedMods, TEST_SKILL_URN, NOW);
        const bonus = api.getSkillModifierBonus(actorWithMixedMods, TEST_SKILL_URN, undefined, NOW);

        expect(Object.keys(mods)).toHaveLength(2); // Both modifiers present
        expect(rank).toBe(50); // 30 + 20 (expired ignored)
        expect(hasActive).toBe(true); // Active modifier present
        expect(bonus).toBe(20); // Only active modifier
      });
    });
  });
});
