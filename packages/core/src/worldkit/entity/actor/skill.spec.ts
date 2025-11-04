import { describe, it, expect } from 'vitest';
import { Actor } from '~/types/entity/actor';
import { SkillState } from '~/types/entity/skill';
import { SkillSchemaURN } from '~/types/taxonomy';
import { createActor } from './index';
import { DEFAULT_TIMESTAMP } from '~/testing/constants';
import {
  MIN_SKILL_RANK,
  MAX_SKILL_RANK,
  getActorSkill,
  createDefaultSkillState,
  setActorSkillRank,
  setActorSkillRanks,
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

});
