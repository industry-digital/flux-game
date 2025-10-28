import { describe, it, expect, beforeEach } from 'vitest';
import { createTransformerContext } from '~/worldkit/context';
import {
  createWorkbenchSessionDidStartEvent,
  createWorkbenchSessionDidEndEvent,
  createActorDidStageShellMutationEvent,
  createActorDidDiffShellMutationsEvent,
  createActorDidUndoShellMutationsEvent,
  createActorDidCommitShellMutationsEvent,
  createActorDidListShellsEvent,
  createStatMutation,
} from '~/testing/event/factory/workbench';
import { ComponentMutationOperation, ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { Actor, Stat } from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';
import { ALICE_ID, BOB_ID } from '~/testing/constants';
import {
  withObjectSerializationValidation,
  withDebuggingArtifactValidation,
  withNonEmptyValidation,
  withNarrativeQuality,
  withPerspectiveDifferentiation,
  withComposedValidation,
} from '~/testing/narrative-quality';
import { createWorldScenario, WorldScenarioHook } from '~/worldkit/scenario';

// Import the specific narrative functions we're testing
import {
  narrateWorkbenchSessionDidStart,
  narrateWorkbenchSessionDidEnd,
  narrateActorDidStageShellMutation,
  narrateActorDidDiffShellMutations,
  narrateActorDidUndoShellMutations,
  narrateActorDidCommitShellMutations,
  narrateActorDidListShells,
} from './workbench';
import { TransformerContext } from '~/types/handler';
import { createDefaultActors } from '~/testing/actors';
import { CurrencyType } from '~/types/currency';

describe('English Workbench Narratives - Snapshot Tests', () => {
  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let alice: Actor;
  let bob: Actor;

  beforeEach(() => {
    context = createTransformerContext();
    ({ alice, bob } = createDefaultActors());
    scenario = createWorldScenario(context, { actors: [alice, bob] });

    // Set Alice's shell stats to the expected values for the tests
    const aliceShell = alice.shells[alice.currentShell];
    if (aliceShell) {
      aliceShell.stats[Stat.POW].nat = 40;
      aliceShell.stats[Stat.POW].eff = 40;
      aliceShell.stats[Stat.FIN].nat = 40;
      aliceShell.stats[Stat.FIN].eff = 40;
      aliceShell.stats[Stat.RES].nat = 40;
      aliceShell.stats[Stat.RES].eff = 40;
    }

    // Only Alice is going to be working at the workbench
    scenario.assignCurrency(alice, CurrencyType.SCRAP, 1000);
  });

  describe('narrateWorkbenchSessionDidStart', () => {

    it('should render exact session start from actor perspective', () => {
      const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateWorkbenchSessionDidStart(context, event, ALICE_ID);
      expect(narrative).toBe('You begin working at the shell workbench.');
    });

    it('should render exact session start from observer perspective', () => {
      const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateWorkbenchSessionDidStart(context, event, BOB_ID);
      expect(narrative).toBe('Alice begins working at a shell workbench.');
    });

    it('should render exact session start with different actor names', () => {
      const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: BOB_ID }));
      const narrative = narrateWorkbenchSessionDidStart(context, event, BOB_ID);
      expect(narrative).toBe('You begin working at the shell workbench.');
    });
  });

  describe('narrateWorkbenchSessionDidEnd', () => {
    it('should render exact session end from actor perspective', () => {
      const event = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateWorkbenchSessionDidEnd(context, event, ALICE_ID);
      expect(narrative).toBe('You finish your work at the workbench.');
    });

    it('should render exact session end from observer perspective', () => {
      const event = createWorkbenchSessionDidEndEvent((e) => ({
        ...e,
        actor: ALICE_ID,
      }));

      const narrative = narrateWorkbenchSessionDidEnd(context, event, BOB_ID);
      expect(narrative).toBe('Alice finishes working at the workbench.');
    });

    it('should render exact session end with different actor names', () => {
      const event = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateWorkbenchSessionDidEnd(context, event, BOB_ID);
      expect(narrative).toBe('Alice finishes working at the workbench.');
    });
  });

  describe('narrateActorDidStageShellMutation', () => {
    it('should render exact stat mutation staging from actor perspective', () => {
      const event = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          mutation: createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
        },
      }));

      const narrative = narrateActorDidStageShellMutation(context, event, ALICE_ID);
      expect(narrative).toBe('You stage a stat modification to the shell design.');
    });

    it('should render exact component mutation staging from actor perspective', () => {
      const event = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          mutation: {
            type: ShellMutationType.COMPONENT,
          } as any,
        },
      }));

      const narrative = narrateActorDidStageShellMutation(context, event, ALICE_ID);
      expect(narrative).toBe('You stage a component change to the shell design.');
    });

    it('should render exact unknown mutation staging from actor perspective', () => {
      const event = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          mutation: {
            type: 'UNKNOWN_TYPE' as any,
          } as any,
        },
      }));

      const narrative = narrateActorDidStageShellMutation(context, event, ALICE_ID);
      expect(narrative).toBe('You stage a change to the shell design.');
    });

    it('should render exact mutation staging from observer perspective', () => {
      const event = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          mutation: createStatMutation(Stat.FIN, StatMutationOperation.ADD, 25),
        },
      }));

      const narrative = narrateActorDidStageShellMutation(context, event, BOB_ID);
      expect(narrative).toBe('Alice makes adjustments to her shell.');
    });

    it('should render exact mutation staging with different actor names', () => {
      const event = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          mutation: createStatMutation(Stat.RES, StatMutationOperation.REMOVE, 3),
        },
      }));

      const narrative = narrateActorDidStageShellMutation(context, event, BOB_ID);
      expect(narrative).toBe('You stage a stat modification to the shell design.');
    });
  });

  describe('narrateActorDidDiffShellMutations', () => {
    it('should render exact diff review from actor perspective with no changes', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidDiffShellMutations(context, event, ALICE_ID);
      expect(narrative).toBe(`You review your shell design. No changes detected.

> Enter \`shell commit\` to commit your changes.
> Enter \`shell undo\` to revert modifications.
> Enter \`help workbench\` for available commands.`);
    });

    it('should render exact diff review from actor perspective with performance changes', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          perf: {
            ...e.payload.perf,
            gapClosing10: '2.5 -> 2.1',
            peakPowerOutput: '5000 -> 5500',
            weaponDamage: '50 -> 55',
          },
        },
      }));

      const narrative = narrateActorDidDiffShellMutations(context, event, ALICE_ID);
      expect(narrative).toContain('Shell Configuration Analysis:');
      expect(narrative).toContain('Gap Closing (10m):     2.5 -> 2.1s (-0.4s)');
      expect(narrative).toContain('Peak Power Output:     5000 -> 5500W (+500W)');
      expect(narrative).toContain('Weapon Damage:         50 -> 55 dmg (+5 dmg)');
    });

    it('should render exact diff review from actor perspective with stat changes', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          stats: {
            pow: '45 -> 50',
            fin: '30 -> 35',
            res: '25',
          },
        },
      }));

      const narrative = narrateActorDidDiffShellMutations(context, event, ALICE_ID);
      expect(narrative).toContain('Shell Configuration Analysis:');
      expect(narrative).toContain('SHELL STATS');
      expect(narrative).toContain('  POW:              45 -> 50 (+5)');
      expect(narrative).toContain('  FIN:              30 -> 35 (+5)');
      expect(narrative).toContain('  RES:              25');
    });

    it('should render exact diff review from actor perspective with both stat and performance changes', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          stats: {
            pow: '40 -> 45',
          },
          perf: {
            ...e.payload.perf,
            weaponDamage: '48 -> 52',
          },
        },
      }));

      const narrative = narrateActorDidDiffShellMutations(context, event, ALICE_ID);
      expect(narrative).toContain('Shell Configuration Analysis:');
      expect(narrative).toContain('SHELL STATS');
      expect(narrative).toContain('  POW:              40 -> 45 (+5)');
      expect(narrative).toContain('WEAPON SYSTEM');
      expect(narrative).toContain('  Weapon Damage:         48 -> 52 dmg (+4 dmg)');
    });

    it('should show all shell stats including unchanged ones', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          stats: {
            pow: '40 -> 45', // Only POW is changing
          },
          perf: {
            ...e.payload.perf,
            weaponDamage: '48 -> 52',
          },
        },
      }));

      const narrative = narrateActorDidDiffShellMutations(context, event, ALICE_ID);
      expect(narrative).toContain('SHELL STATS');
      expect(narrative).toContain('  POW:              40 -> 45 (+5)'); // Changed stat
      expect(narrative).toContain('  FIN:              40'); // Unchanged stat (current value)
      expect(narrative).toContain('  RES:              40'); // Unchanged stat (current value)
    });

    it('should render exact diff review from observer perspective', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidDiffShellMutations(context, event, BOB_ID);
      expect(narrative).toBe('Alice reviews their shell modifications.');
    });
  });

  describe('narrateActorDidUndoShellMutations', () => {
    it('should render exact undo from actor perspective', () => {
      const event = createActorDidUndoShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidUndoShellMutations(context, event, ALICE_ID);
      expect(narrative).toBe('You have reversed your staged shell modifications.');
    });

    it('should render exact undo from observer perspective', () => {
      const event = createActorDidUndoShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidUndoShellMutations(context, event, BOB_ID);
      expect(narrative).toBe('Alice reverses her recent shell modifications.');
    });
  });

  describe('narrateActorDidCommitShellMutations', () => {
    it('should render exact commit with cost from actor perspective', () => {
      const event = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 150,
          mutations: [
            createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
            createStatMutation(Stat.FIN, StatMutationOperation.ADD, 3),
          ],
        },
      }));

      const narrative = narrateActorDidCommitShellMutations(context, event, ALICE_ID);
      expect(narrative).toBe('You commit 2 shell modifications for 150 credits.');
    });

    it('should render exact commit without cost from actor perspective', () => {
      const event = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 0,
          mutations: [createStatMutation(Stat.RES, StatMutationOperation.ADD, 30)],
        },
      }));

      const narrative = narrateActorDidCommitShellMutations(context, event, ALICE_ID);
      expect(narrative).toBe('You commit 1 shell modification.');
    });

    it('should render exact commit with single mutation from actor perspective', () => {
      const event = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 75,
          mutations: [createStatMutation(Stat.POW, StatMutationOperation.ADD, 10)],
        },
      }));

      const narrative = narrateActorDidCommitShellMutations(context, event, ALICE_ID);
      expect(narrative).toBe('You commit 1 shell modification for 75 credits.');
    });

    it('should render exact commit from observer perspective', () => {
      const event = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 200,
          mutations: [
            createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
            createStatMutation(Stat.FIN, StatMutationOperation.ADD, 5),
            createStatMutation(Stat.RES, StatMutationOperation.ADD, 5),
          ],
        },
      }));

      const narrative = narrateActorDidCommitShellMutations(context, event, BOB_ID);
      expect(narrative).toBe('Alice commits their shell modifications.');
    });

    it('should render exact commit with different actor names', () => {
      const event = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: BOB_ID,
        payload: {
          ...e.payload,
          cost: 50,
          mutations: [createStatMutation(Stat.FIN, StatMutationOperation.REMOVE, 2)],
        },
      }));

      const narrative = narrateActorDidCommitShellMutations(context, event, BOB_ID);
      expect(narrative).toBe('You commit 1 shell modification for 50 credits.');
    });
  });

  describe('narrateActorDidListShells', () => {
    it('should render exact shell listing from actor perspective with multiple shells', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, ALICE_ID);
      expect(narrative).toContain('SHELL INVENTORY');
      expect(narrative).toContain('  ID NAME                 POW FIN RES  MASS');
      expect(narrative).toContain('  -- -------------------- --- --- --- ------');
      expect(narrative).toContain('✓ Currently active shell');
      // Should show Alice's shell with her stats (40/40/40)
      expect(narrative).toMatch(/✓.*40.*40.*40/);
    });

    it('should render exact shell listing from actor perspective with single shell', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: BOB_ID }));
      const narrative = narrateActorDidListShells(context, event, BOB_ID);
      expect(narrative).toContain('SHELL INVENTORY');
      expect(narrative).toContain('  ID NAME                 POW FIN RES  MASS');
      // Should show Bob's shell with his stats
      expect(narrative).toMatch(/✓.*\d+.*\d+.*\d+/);
      expect(narrative).toContain('✓ Currently active shell');
    });

    it('should show active shell indicator correctly', () => {
      const event = createActorDidListShellsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
      }));

      const narrative = narrateActorDidListShells(context, event, ALICE_ID);
      // Should have exactly one active shell marked with ✓ in the data rows (exclude footer)
      const lines = narrative.split('\n');
      const dataRows = lines.filter(line =>
        line.startsWith('✓ ') &&
        !line.includes('Currently active shell') // Exclude footer
      );
      expect(dataRows).toHaveLength(1);
    });

    it('should format stats correctly in individual columns', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, ALICE_ID);
      // Should show Alice's shell stats right-aligned in 3-char columns
      expect(narrative).toMatch(/✓.*\s+\d+\s+\d+\s+\d+\s+/);
    });

    it('should format mass correctly', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, ALICE_ID);
      // Should show mass in kg format, right-aligned
      expect(narrative).toMatch(/\d+\.\d+kg$/m);
    });

    it('should truncate long shell names correctly', () => {
      // Create a shell with a very long name to test truncation
      const actor = context.world.actors[ALICE_ID];
      const shellId = Object.keys(actor.shells)[0];
      actor.shells[shellId].name = 'This is a very long shell name that should be truncated';

      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, ALICE_ID);
      expect(narrative).toContain('This is a very lo...');
    });

    it('should handle shells with no name (show "Unnamed Shell")', () => {
      // Remove the name from Alice's shell
      const actor = context.world.actors[ALICE_ID];
      const shellId = Object.keys(actor.shells)[0];
      // @ts-expect-error - Force-deleting the name property
      delete actor.shells[shellId].name;

      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, ALICE_ID);
      expect(narrative).toContain('Unnamed Shell');
    });

    it('should display shell IDs as simple counters', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, ALICE_ID);
      // Should show simple counter ID (right-aligned)
      expect(narrative).toMatch(/✓\s+1\s/);
      expect(narrative).not.toContain('flux:');
    });

    it('should return empty string from observer perspective', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, BOB_ID);
      expect(narrative).toBe('');
    });

    it('should return "no shells available" message when actor has no shells', () => {
      // Remove all shells from Alice
      const actor = context.world.actors[ALICE_ID];
      actor.shells = {};

      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, ALICE_ID);
      expect(narrative).toBe('You have no shells available.');
    });

    it('should return empty string for missing actor', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidListShells(context, event, BOB_ID);
      expect(narrative).toBe('');
    });

    it('should log actual shell listing output for inspection', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event, ALICE_ID);

      console.log('\n=== SHELL LISTING OUTPUT ===');
      console.log(narrative);
      console.log('=== END SHELL LISTING ===\n');

      // Basic validation to ensure test passes
      expect(narrative).toContain('SHELL INVENTORY');
      expect(narrative).toContain('✓ Currently active shell');
    });
  });

  describe('Error handling', () => {
    it('should return empty string for missing actor in session start', () => {
      const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateWorkbenchSessionDidStart(context, event, BOB_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in session end', () => {
      const event = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateWorkbenchSessionDidEnd(context, event, BOB_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in stage mutation', () => {
      const event = createActorDidStageShellMutationEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidStageShellMutation(context, event, BOB_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in diff mutations', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidDiffShellMutations(context, event, BOB_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in undo mutations', () => {
      const event = createActorDidUndoShellMutationsEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidUndoShellMutations(context, event, BOB_ID);
      expect(narrative).toBe('');
    });

    it('should return empty string for missing actor in commit mutations', () => {
      const event = createActorDidCommitShellMutationsEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateActorDidCommitShellMutations(context, event, BOB_ID);
      expect(narrative).toBe('');
    });
  });

  describe('Narrative Quality Validation', () => {
    describe('narrateWorkbenchSessionDidStart - Quality validation', () => {
      it('should not contain [object Object] in session start narratives', () => {
        const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: ALICE_ID }));
        const perspectives = [ALICE_ID, BOB_ID];
        perspectives.forEach(perspective => {
          withObjectSerializationValidation(narrateWorkbenchSessionDidStart, context, event, perspective)();
        });
      });

      it('should pass comprehensive quality validation', () => {
        const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: ALICE_ID }));
        withNarrativeQuality(narrateWorkbenchSessionDidStart, context, event, BOB_ID)();
      });

      it('should generate different narratives for different perspectives', () => {
        const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: ALICE_ID }));
        withPerspectiveDifferentiation(narrateWorkbenchSessionDidStart, context, event, [ALICE_ID, BOB_ID])();
      });
    });

    describe('narrateWorkbenchSessionDidEnd - Quality validation', () => {
      it('should pass quality validation for session end narratives', () => {
        const event = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
        const perspectives = [ALICE_ID, BOB_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateWorkbenchSessionDidEnd, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidStageShellMutation - Quality validation', () => {
      it('should pass quality validation for stat mutation staging', () => {
        const event = createActorDidStageShellMutationEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            mutation: createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
          },
        }));

        const perspectives = [ALICE_ID, BOB_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidStageShellMutation, context, event, perspective)();
        });
      });

      it('should pass quality validation for component mutation staging', () => {
        const event = createActorDidStageShellMutationEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            mutation: {
              type: ShellMutationType.COMPONENT,
            } as any,
          },
        }));

        const perspectives = [ALICE_ID, BOB_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidStageShellMutation, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidDiffShellMutations - Quality validation', () => {
      it('should pass quality validation for diff review narratives', () => {
        const event = createActorDidDiffShellMutationsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        const perspectives = [ALICE_ID, BOB_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidDiffShellMutations, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidUndoShellMutations - Quality validation', () => {
      it('should pass quality validation for undo narratives', () => {
        const event = createActorDidUndoShellMutationsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        const perspectives = [ALICE_ID, BOB_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidUndoShellMutations, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidCommitShellMutations - Quality validation', () => {
      it('should pass quality validation for commit narratives', () => {
        const event = createActorDidCommitShellMutationsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            cost: 100,
            mutations: [createStatMutation(Stat.POW, StatMutationOperation.ADD, 5)],
          },
        }));

        const perspectives = [ALICE_ID, BOB_ID];
        perspectives.forEach(perspective => {
          withNarrativeQuality(narrateActorDidCommitShellMutations, context, event, perspective)();
        });
      });
    });

    describe('narrateActorDidListShells - Quality validation', () => {
      it('should pass quality validation for shell listing narratives', () => {
        const event = createActorDidListShellsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        // Only test actor perspective - observer intentionally returns empty string for privacy
        withNarrativeQuality(narrateActorDidListShells, context, event, ALICE_ID)();
      });

      it('should not contain [object Object] in shell listing narratives', () => {
        const event = createActorDidListShellsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        const perspectives = [ALICE_ID, BOB_ID];
        perspectives.forEach(perspective => {
          withObjectSerializationValidation(narrateActorDidListShells, context, event, perspective)();
        });
      });

      it('should generate different narratives for different perspectives', () => {
        const event = createActorDidListShellsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        // Actor should see shell listing, observer should see empty string
        const actorNarrative = narrateActorDidListShells(context, event, ALICE_ID);
        const observerNarrative = narrateActorDidListShells(context, event, BOB_ID);

        expect(actorNarrative).not.toBe(observerNarrative);
        expect(actorNarrative).toContain('SHELL INVENTORY');
        expect(observerNarrative).toBe('');
      });

      it('should pass comprehensive quality validation with no shells', () => {
        // Remove all shells from Alice
        const actor = context.world.actors[ALICE_ID];
        actor.shells = {};

        const event = createActorDidListShellsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        withNarrativeQuality(narrateActorDidListShells, context, event, ALICE_ID)();
      });
    });

    describe('Composed quality validation', () => {
      it('should pass all quality checks with composed validators', () => {
        const event = createWorkbenchSessionDidStartEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        // Demonstrate composition of validators
        const composedValidator = withComposedValidation(
          withObjectSerializationValidation,
          withDebuggingArtifactValidation,
          withNonEmptyValidation
        );

        composedValidator(narrateWorkbenchSessionDidStart, context, event, BOB_ID)();
      });

      it('should validate perspective differentiation across all narrative functions', () => {
        const sessionStartEvent = createWorkbenchSessionDidStartEvent((e) => ({
          ...e,
          actor: ALICE_ID,
        }));

        withPerspectiveDifferentiation(narrateWorkbenchSessionDidStart, context, sessionStartEvent, [ALICE_ID, BOB_ID])();

        const stageEvent = createActorDidStageShellMutationEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            mutation: createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
          },
        }));

        withPerspectiveDifferentiation(narrateActorDidStageShellMutation, context, stageEvent, [ALICE_ID, BOB_ID])();

        const commitEvent = createActorDidCommitShellMutationsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            cost: 100,
            mutations: [createStatMutation(Stat.POW, StatMutationOperation.ADD, 5)],
          },
        }));

        withPerspectiveDifferentiation(narrateActorDidCommitShellMutations, context, commitEvent, [ALICE_ID, BOB_ID])();
      });
    });
  });

  describe('Workbench Narrative Mood Board', () => {
    it('should generate a comprehensive mood board of all workbench narratives', () => {
      console.log('\n' + '='.repeat(80));
      console.log('🎨 WORKBENCH NARRATIVE MOOD BOARD');
      console.log('='.repeat(80));

      // Session Management
      console.log('\n📋 SESSION MANAGEMENT');
      console.log('-'.repeat(40));

      const sessionStartEvent = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: ALICE_ID }));
      console.log('🟢 Session Start (Self):', narrateWorkbenchSessionDidStart(context, sessionStartEvent, ALICE_ID));
      console.log('👁️  Session Start (Observer):', narrateWorkbenchSessionDidStart(context, sessionStartEvent, BOB_ID));

      const sessionEndEvent = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
      console.log('🔴 Session End (Self):', narrateWorkbenchSessionDidEnd(context, sessionEndEvent, ALICE_ID));
      console.log('👁️  Session End (Observer):', narrateWorkbenchSessionDidEnd(context, sessionEndEvent, BOB_ID));

      // Shell Modifications
      console.log('\n🔧 SHELL MODIFICATIONS');
      console.log('-'.repeat(40));

      const statMutationEvent = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          mutation: createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
        },
      }));
      console.log('⚡ Stat Staging (Self):', narrateActorDidStageShellMutation(context, statMutationEvent, ALICE_ID));
      console.log('👁️  Stat Staging (Observer):', narrateActorDidStageShellMutation(context, statMutationEvent, BOB_ID));

      const componentMutationEvent = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          mutation: {
            type: ShellMutationType.COMPONENT,
            operation: ComponentMutationOperation.MOUNT,
            schema: 'flux:schema:component:test',
            componentId: 'flux:item:component:test',
          },
        },
      }));

      console.log('🔩 Component Staging (Self):', narrateActorDidStageShellMutation(context, componentMutationEvent, ALICE_ID));
      console.log('👁️  Component Staging (Observer):', narrateActorDidStageShellMutation(context, componentMutationEvent, BOB_ID));

      // Shell Analysis - Comprehensive performance diff across all 17 fields
      console.log('\n📊 SHELL ANALYSIS');
      console.log('-'.repeat(40));

      const diffEvent = createActorDidDiffShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          stats: {
            pow: '40 -> 45',
            fin: '40 -> 35',
            res: '40 -> 50',
          },
          perf: {
            // Mobility
            gapClosing10: '2.5 -> 2.1',
            gapClosing100: '15.2 -> 14.8',
            avgSpeed10: '4.0 -> 4.3',
            avgSpeed100: '6.6 -> 7.1',
            topSpeed: '12.5 -> 13.2',

            // Power System
            peakPowerOutput: '5000 -> 5500',
            componentPowerDraw: '1200 -> 1150',
            freePower: '3800 -> 4350',
            powerToWeightRatio: '5.9 -> 6.5',

            // Combat Effectiveness
            weaponDamage: '48 -> 52',
            weaponDps: '25.5 -> 28.1',
            weaponApCost: '120 -> 115',

            // Physical Characteristics
            totalMassKg: '850.0 -> 845.0',
            inertialMassKg: '680.0 -> 692.5',
            inertiaReduction: '20.0 -> 17.5',

            // Energy System
            capacitorCapacity: '50000 -> 55000',
            maxRechargeRate: '2500 -> 2750',
          },
        },
      }));
      const diffNarrative = narrateActorDidDiffShellMutations(context, diffEvent, ALICE_ID);
      console.log('📈 Shell Diff (Self):\n' + diffNarrative.split('\n').map(line => '    ' + line).join('\n'));

      // Shell Actions
      console.log('\n🔄 SHELL ACTIONS');
      console.log('-'.repeat(40));

      const undoEvent = createActorDidUndoShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID }));
      console.log('↩️  Undo (Self):', narrateActorDidUndoShellMutations(context, undoEvent, ALICE_ID));
      console.log('👁️  Undo (Observer):', narrateActorDidUndoShellMutations(context, undoEvent, BOB_ID));

      const commitEvent = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 275,
          mutations: [
            createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
            createStatMutation(Stat.FIN, StatMutationOperation.REMOVE, 5),
            createStatMutation(Stat.RES, StatMutationOperation.ADD, 10),
          ],
        },
      }));
      console.log('✅ Commit with Cost (Self):', narrateActorDidCommitShellMutations(context, commitEvent, ALICE_ID));
      console.log('👁️  Commit with Cost (Observer):', narrateActorDidCommitShellMutations(context, commitEvent, BOB_ID));

      const freeCommitEvent = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 0,
          mutations: [createStatMutation(Stat.RES, StatMutationOperation.ADD, 2)],
        },
      }));
      console.log('🆓 Commit Free (Self):', narrateActorDidCommitShellMutations(context, freeCommitEvent, ALICE_ID));

      // Shell Inventory
      console.log('\n📦 SHELL INVENTORY');
      console.log('-'.repeat(40));

      const listEvent = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const shellListing = narrateActorDidListShells(context, listEvent, ALICE_ID);
      console.log('📋 Shell Listing (Self):\n' + shellListing.split('\n').map(line => '    ' + line).join('\n'));

      const observerListing = narrateActorDidListShells(context, listEvent, BOB_ID);
      console.log('👁️  Shell Listing (Observer):', observerListing || '(empty - private action)');

      // Gender Variations
      console.log('\n👤 GENDER VARIATIONS');
      console.log('-'.repeat(40));

      // Create a male actor for comparison
      const { charlie } = createDefaultActors();
      scenario.addActor(charlie);

      const charlieUndoEvent = createActorDidUndoShellMutationsEvent((e) => ({ ...e, actor: charlie.id }));
      console.log('♂️  Male Undo (Observer):', narrateActorDidUndoShellMutations(context, charlieUndoEvent, ALICE_ID));
      console.log('♀️  Female Undo (Observer):', narrateActorDidUndoShellMutations(context, undoEvent, BOB_ID));

      const charlieStageEvent = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: charlie.id,
        payload: {
          ...e.payload,
          mutation: createStatMutation(Stat.FIN, StatMutationOperation.ADD, 3),
        },
      }));
      console.log('♂️  Male Staging (Observer):', narrateActorDidStageShellMutation(context, charlieStageEvent, ALICE_ID));
      console.log('♀️  Female Staging (Observer):', narrateActorDidStageShellMutation(context, statMutationEvent, BOB_ID));

      console.log('\n' + '='.repeat(80));
      console.log('🎨 END MOOD BOARD');
      console.log('='.repeat(80) + '\n');

      // No meaningful assertions - this is purely for visualization
      expect(true).toBe(true);
    });
  });
});
