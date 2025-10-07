import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  useCombatScenario,
  CombatScenarioActorInput,
  CombatScenarioDependencies,
  DEFAULT_TEST_SCENARIO_DEPS
} from './scenario';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';
import { CombatFacing, Team } from '~/types/combat';
import { Stat } from '~/types/entity/actor';
import { createSwordSchema } from '~/worldkit/schema/weapon/sword';
import { createModifiableScalarAttribute } from '~/worldkit/entity/attribute';
import { createTransformerContext } from '~/worldkit/context';
import { WeaponSchema } from '~/types/schema/weapon';
import { getStatValue } from '~/worldkit/entity/actor/stats';

describe('useCombatScenario', () => {
  let context: TransformerContext;
  let mockDependencies: CombatScenarioDependencies;
  let testWeapon: WeaponSchema = createSwordSchema({
    urn: 'flux:schema:weapon:test',
    name: 'Test Weapon',
  });

  beforeEach(() => {
    context = createTransformerContext();

    // Mock the mass computation to avoid schema lookup issues
    context.mass.computeInventoryMass = vi.fn().mockReturnValue(1000);

    // Create mock dependencies with spies
    mockDependencies = {
      useCombatSession: vi.fn().mockImplementation(DEFAULT_TEST_SCENARIO_DEPS.useCombatSession),
    };
  });

  describe('basic functionality', () => {
    it('should create scenario with single actor', () => {
      const participants: Record<ActorURN, CombatScenarioActorInput> = {
        'flux:actor:test:warrior': {
          team: Team.ALPHA,
          name: 'Test Warrior',
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      expect(scenario.actors).toBeDefined();
      expect(scenario.actors['flux:actor:test:warrior']).toBeDefined();

      const warrior = scenario.actors['flux:actor:test:warrior'];
      expect(warrior.actor.name).toBe('Test Warrior');
      expect(warrior.hooks.combatant).toBeDefined();
    });

    it('should create scenario with multiple actors', () => {
      const participants: Record<ActorURN, CombatScenarioActorInput> = {
        'flux:actor:test:attacker': {
          team: Team.ALPHA,
          name: 'Attacker',
        },
        'flux:actor:test:defender': {
          team: Team.BRAVO,
          name: 'Defender',
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      expect(Object.keys(scenario.actors)).toHaveLength(2);
      expect(scenario.actors['flux:actor:test:attacker']).toBeDefined();
      expect(scenario.actors['flux:actor:test:defender']).toBeDefined();

      expect(scenario.actors['flux:actor:test:attacker'].actor.name).toBe('Attacker');
      expect(scenario.actors['flux:actor:test:defender'].actor.name).toBe('Defender');
    });

    it('should use default name when none provided', () => {
      const participants = {
        'flux:actor:test:unnamed': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      const actor = scenario.actors['flux:actor:test:unnamed'];
      expect(actor.actor.name).toBe('unnamed'); // Should extract from URN
    });
  });

  describe('core stats configuration', () => {
    it('should apply custom core stats (INT, PER, MEM)', () => {
      const participants = {
        'flux:actor:test:smart': {
          team: Team.ALPHA,
          stats: { int: 15, per: 12, mem: 18 },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      const actor = scenario.actors['flux:actor:test:smart'].actor;

      // Core stats should be on actor.stats
      expect(actor.stats[Stat.INT].nat).toBe(15);
      expect(actor.stats[Stat.INT].eff).toBe(15);
      expect(actor.stats[Stat.PER].nat).toBe(12);
      expect(actor.stats[Stat.PER].eff).toBe(12);
      expect(actor.stats[Stat.MEM].nat).toBe(18);
      expect(actor.stats[Stat.MEM].eff).toBe(18);
    });

    it('should use default core stats when none provided', () => {
      const participants = {
        'flux:actor:test:default-core': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      const actor = scenario.actors['flux:actor:test:default-core'].actor;

      // Default core stats should be 10
      expect(actor.stats[Stat.INT].nat).toBe(10);
      expect(actor.stats[Stat.PER].nat).toBe(10);
      expect(actor.stats[Stat.MEM].nat).toBe(10);
    });
  });

  describe('shell stats configuration', () => {
    it('should apply custom shell stats (POW, FIN, RES)', () => {
      const participants = {
        'flux:actor:test:strong': {
          team: Team.ALPHA,
          stats: { pow: 80, fin: 60, res: 70 },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      const actor = scenario.actors['flux:actor:test:strong'].actor;

      // Shell stats should be accessible via Actor-specific functions
      expect(getStatValue(actor, Stat.POW)).toBe(80);
      expect(getStatValue(actor, Stat.FIN)).toBe(60);
      expect(getStatValue(actor, Stat.RES)).toBe(70);

      // Shell stats should be on the current shell
      const currentShell = actor.shells[actor.currentShell];
      expect(currentShell.stats[Stat.POW].nat).toBe(80);
      expect(currentShell.stats[Stat.POW].eff).toBe(80);
      expect(currentShell.stats[Stat.FIN].nat).toBe(60);
      expect(currentShell.stats[Stat.FIN].eff).toBe(60);
      expect(currentShell.stats[Stat.RES].nat).toBe(70);
      expect(currentShell.stats[Stat.RES].eff).toBe(70);
    });

    it('should use default shell stats when none provided', () => {
      const participants = {
        'flux:actor:test:default-shell': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      const actor = scenario.actors['flux:actor:test:default-shell'].actor;

      // Default shell stats should be 10
      expect(getStatValue(actor, Stat.POW)).toBe(10);
      expect(getStatValue(actor, Stat.FIN)).toBe(10);
      expect(getStatValue(actor, Stat.RES)).toBe(10);
    });

    it('should use partial shell stats with defaults', () => {
      const participants = {
        'flux:actor:test:partial-shell': {
          team: Team.ALPHA,
          stats: { pow: 50 }, // Only POW specified
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      const actor = scenario.actors['flux:actor:test:partial-shell'].actor;

      expect(getStatValue(actor, Stat.POW)).toBe(50);
      expect(getStatValue(actor, Stat.FIN)).toBe(10); // Default
      expect(getStatValue(actor, Stat.RES)).toBe(10); // Default
    });
  });

  describe('mixed stats configuration', () => {
    it('should handle all 6 actor stats (core + shell)', () => {
      const participants = {
        'flux:actor:test:all-stats': {
          team: Team.ALPHA,
          stats: {
            int: 12,
            per: 14,
            mem: 10,
            pow: 16,
            fin: 13,
            res: 15,
          },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const actor = scenario.actors['flux:actor:test:all-stats'].actor;

      // Core stats accessible via Actor functions
      expect(getStatValue(actor, Stat.INT)).toBe(12);
      expect(getStatValue(actor, Stat.PER)).toBe(14);
      expect(getStatValue(actor, Stat.MEM)).toBe(10);

      // Shell stats via Actor functions
      expect(getStatValue(actor, Stat.POW)).toBe(16);
      expect(getStatValue(actor, Stat.FIN)).toBe(13);
      expect(getStatValue(actor, Stat.RES)).toBe(15);
    });

    it('should apply complex stat attribute objects', () => {
      const participants: Record<ActorURN, CombatScenarioActorInput> = {
        'flux:actor:test:complex-stats': {
          team: Team.ALPHA,
          stats: {
            pow: createModifiableScalarAttribute((attr) => ({ ...attr, nat: 18, eff: 16 })),
            fin: 14, // Mix with simple number
            int: createModifiableScalarAttribute((attr) => ({ ...attr, nat: 13, eff: 15 })),
          },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const { actor } = scenario.actors['flux:actor:test:complex-stats'];

      // Complex shell stat object should be applied (eff: 16, nat: 18)
      expect(getStatValue(actor, Stat.POW)).toBe(16);

      // Simple shell stat should be applied
      expect(getStatValue(actor, Stat.FIN)).toBe(14);

      // Complex core stat object should be applied (eff: 15, nat: 13)
      expect(getStatValue(actor, Stat.INT)).toBe(15);
    });
  });

  describe('position handling', () => {
    it('should use default position when none provided', () => {
      const participants = {
        'flux:actor:test:positioned': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      // Position is handled by the combat session, but we can verify the actor was created
      expect(scenario.actors['flux:actor:test:positioned']).toBeDefined();
    });

    it('should merge partial position with defaults', () => {
      const participants = {
        'flux:actor:test:custom-pos': {
          team: Team.ALPHA,
          position: { coordinate: 150 }, // Only coordinate specified
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      // The position merging happens when adding to combat session
      expect(scenario.actors['flux:actor:test:custom-pos']).toBeDefined();
    });

    it('should handle full position specification', () => {
      const participants = {
        'flux:actor:test:full-pos': {
          team: Team.ALPHA,
          position: {
            coordinate: 200,
            facing: CombatFacing.LEFT,
            speed: 5,
          },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      expect(scenario.actors['flux:actor:test:full-pos']).toBeDefined();
    });
  });

  describe('combatant hook integration', () => {
    it('should create combatant hook for each actor', () => {
      const participants = {
        'flux:actor:test:hooks': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      const actor = scenario.actors['flux:actor:test:hooks'];

      // Should have combatant hook with expected methods
      expect(actor.hooks.combatant).toBeDefined();
      expect(typeof actor.hooks.combatant.done).toBe('function');
      expect(typeof actor.hooks.combatant.defend).toBe('function');
    });
  });

  describe('dependency injection', () => {
    it('should use default dependencies when none provided', () => {
      const participants = {
        'flux:actor:test:default-deps': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      expect(scenario.actors['flux:actor:test:default-deps']).toBeDefined();
    });

    it('should use injected dependencies', () => {
      const participants = {
        'flux:actor:test:injected-deps': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      }, mockDependencies);

      expect(scenario.actors['flux:actor:test:injected-deps']).toBeDefined();

      // Verify mocked dependencies were called
      expect(mockDependencies.useCombatSession).toHaveBeenCalled();
    });
  });

  describe('world integration', () => {
    it('should add actors to world context', () => {
      const participants = {
        'flux:actor:test:world': {
          team: Team.ALPHA,
          name: 'World Actor',
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      // Actor should be added to world
      expect(context.world.actors['flux:actor:test:world']).toBeDefined();
      expect(context.world.actors['flux:actor:test:world'].name).toBe('World Actor');

      // Should be the same reference as in scenario
      expect(context.world.actors['flux:actor:test:world']).toBe(
        scenario.actors['flux:actor:test:world'].actor
      );
    });

    it('should handle multiple actors in world', () => {
      const participants = {
        'flux:actor:test:world1': {
          team: Team.ALPHA,
          name: 'Actor 1',
        },
        'flux:actor:test:world2': {
          team: Team.BRAVO,
          name: 'Actor 2',
        },
      };

      useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });

      // Both actors should be in world
      expect(context.world.actors['flux:actor:test:world1']).toBeDefined();
      expect(context.world.actors['flux:actor:test:world2']).toBeDefined();

      expect(context.world.actors['flux:actor:test:world1'].name).toBe('Actor 1');
      expect(context.world.actors['flux:actor:test:world2'].name).toBe('Actor 2');
    });
  });

  describe('skills configuration', () => {
    it('should apply simple skill ranks', () => {
      const participants = {
        'flux:actor:test:skilled': {
          team: Team.ALPHA,
          skills: {
            'flux:skill:evasion': 3,
            'flux:skill:combat:strike': 2,
          },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const { actor } = scenario.actors['flux:actor:test:skilled'];

      // Verify skills were applied to the actor
      expect(actor.skills['flux:skill:evasion']).toEqual({
        xp: 0,
        pxp: 0,
        rank: 3,
      });
      expect(actor.skills['flux:skill:combat:strike']).toEqual({
        xp: 0,
        pxp: 0,
        rank: 2,
      });
    });

    it('should apply complex skill state objects', () => {
      const participants = {
        'flux:actor:test:experienced': {
          team: Team.ALPHA,
          skills: {
            'flux:skill:evasion': { xp: 1500, pxp: 750, rank: 4, mods: {} },
            'flux:skill:combat:strike': { xp: 2000, pxp: 1000, rank: 5, mods: {} },
          },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const actor = scenario.actors['flux:actor:test:experienced'];

      expect(actor.actor.skills['flux:skill:evasion']).toEqual({
        xp: 1500,
        pxp: 750,
        rank: 4,
        mods: {},
      });
      expect(actor.actor.skills['flux:skill:combat:strike']).toEqual({
        xp: 2000,
        pxp: 1000,
        rank: 5,
        mods: {},
      });
    });

    it('should use empty skills when none provided', () => {
      const participants = {
        'flux:actor:test:no-skills': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const actor = scenario.actors['flux:actor:test:no-skills'];

      expect(actor.actor.skills).toEqual({});
    });
  });

  describe('combatant attributes', () => {
    it('should apply simple AP values', () => {
      const participants = {
        'flux:actor:test:high-ap': {
          team: Team.ALPHA,
          ap: 8,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const actor = scenario.actors['flux:actor:test:high-ap'];

      const { combatant } = actor.hooks.combatant;

      // Verify AP was set via combatant hook
      expect(combatant.ap.eff.cur).toBe(8);
    });

    it('should apply simple balance values', () => {
      const participants = {
        'flux:actor:test:balanced': {
          team: Team.ALPHA,
          balance: 7,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const actor = scenario.actors['flux:actor:test:balanced'];
      const { combatant } = actor.hooks.combatant;

      // Verify balance was set via combatant hook
      expect(combatant.balance.eff.cur).toBe(7);
    });

    it('should handle multiple combatant attributes', () => {
      const participants = {
        'flux:actor:test:multi-attributes': {
          team: Team.ALPHA,
          ap: 6,
          balance: 5,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const actor = scenario.actors['flux:actor:test:multi-attributes'];
      const { combatant } = actor.hooks.combatant;

      expect(combatant.ap.eff.cur).toBe(6);
      expect(combatant.balance.eff.cur).toBe(5);
    });

    it('should use default attributes when none provided', () => {
      const participants = {
        'flux:actor:test:default-attributes': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const actor = scenario.actors['flux:actor:test:default-attributes'];
      const { combatant } = actor.hooks.combatant;

      // Should have default values (not testing specific values since they're from dependencies)
      expect(combatant.ap.eff.cur).toBeDefined();
      expect(combatant.balance.eff.cur).toBeDefined();
    });
  });

  describe('targeting configuration', () => {
    it('should set target when specified', () => {
      const participants = {
        'flux:actor:test:attacker': {
          team: Team.ALPHA,
          target: 'flux:actor:test:defender' as ActorURN,
        },
        'flux:actor:test:defender': {
          team: Team.BRAVO,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const attacker = scenario.actors['flux:actor:test:attacker'];
      const defender = scenario.actors['flux:actor:test:defender'];

      // Verify target was set
      expect(attacker.hooks.combatant.combatant.target).toBe('flux:actor:test:defender');
      expect(defender.hooks.combatant.combatant.target).toBeNull();
    });

    it('should handle actors without targets', () => {
      const participants = {
        'flux:actor:test:no-target': {
          team: Team.ALPHA,
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const actor = scenario.actors['flux:actor:test:no-target'];

      expect(actor.hooks.combatant.combatant.target).toBeNull();
    });
  });

  describe('error handling', () => {
    it('should handle empty participants', () => {
      const participants = {};
      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      expect(scenario.actors).toEqual({});
    });
  });

  describe('stat architecture validation', () => {
    it('should properly separate core and shell stats', () => {
      const participants = {
        'flux:actor:test:architecture': {
          team: Team.ALPHA,
          stats: {
            int: 15, per: 12, mem: 18,  // Core stats
            pow: 20, fin: 16, res: 14,  // Shell stats
          },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const { actor } = scenario.actors['flux:actor:test:architecture'];

      // Core stats should be directly on actor.stats
      expect(actor.stats).toHaveProperty(Stat.INT);
      expect(actor.stats).toHaveProperty(Stat.PER);
      expect(actor.stats).toHaveProperty(Stat.MEM);

      // Shell stats should NOT be directly on actor.stats
      expect(actor.stats).not.toHaveProperty(Stat.POW);
      expect(actor.stats).not.toHaveProperty(Stat.FIN);
      expect(actor.stats).not.toHaveProperty(Stat.RES);

      // Shell stats should be on the current shell
      const currentShell = actor.shells[actor.currentShell];
      expect(currentShell.stats).toHaveProperty(Stat.POW);
      expect(currentShell.stats).toHaveProperty(Stat.FIN);
      expect(currentShell.stats).toHaveProperty(Stat.RES);

      // Shell stats should NOT have core stats
      expect(currentShell.stats).not.toHaveProperty(Stat.INT);
      expect(currentShell.stats).not.toHaveProperty(Stat.PER);
      expect(currentShell.stats).not.toHaveProperty(Stat.MEM);
    });

    it('should maintain stat values through Actor-specific functions', () => {
      const participants = {
        'flux:actor:test:stat-access': {
          team: Team.ALPHA,
          stats: {
            int: 13, per: 11, mem: 17,  // Core stats
            pow: 19, fin: 15, res: 12,  // Shell stats
          },
        },
      };

      const scenario = useCombatScenario(context, {
        participants,
        weapons: [testWeapon],
      });
      const { actor } = scenario.actors['flux:actor:test:stat-access'];

      // Core stats accessible directly
      expect(actor.stats[Stat.INT].eff).toBe(13);
      expect(actor.stats[Stat.PER].eff).toBe(11);
      expect(actor.stats[Stat.MEM].eff).toBe(17);

      // Shell stats accessible via Actor functions
      expect(getStatValue(actor, Stat.POW)).toBe(19);
      expect(getStatValue(actor, Stat.FIN)).toBe(15);
      expect(getStatValue(actor, Stat.RES)).toBe(12);

      // Core stats also accessible via Actor functions (for consistency)
      expect(getStatValue(actor, Stat.INT)).toBe(13);
      expect(getStatValue(actor, Stat.PER)).toBe(11);
      expect(getStatValue(actor, Stat.MEM)).toBe(17);
    });
  });
});
