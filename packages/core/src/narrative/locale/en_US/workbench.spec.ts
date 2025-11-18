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
  createActorDidAssessShellStatusEvent,
  createStatMutation,
} from '~/testing/event/factory/workbench';
import { ShellMutationType, StatMutationOperation } from '~/types/workbench';
import { Actor, Stat } from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';
import { ALICE_ID, BOB_ID } from '~/testing/constants';
import { withNarrativeQuality, withPerspectiveDifferentiation } from '~/testing/narrative-quality';
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
  narrateActorDidAssessShellStatus,
} from './workbench';
import { TransformerContext } from '~/types/handler';
import { createDefaultActors } from '~/testing/actors';
import { CurrencyType } from '~/types/currency';
import { setStatValue } from '~/worldkit/entity/actor/stats';
import { EMPTY_NARRATIVE } from '~/narrative/constants';
import { EventType } from '~/types/event';

/**
 * Workbench Narrative Tests - Two-Perspective Model
 *
 * Tests verify that templates generate BOTH perspectives correctly.
 * Most workbench events are actor-only (observer is empty string for privacy),
 * but some events like session end have observer narratives.
 */
describe('Workbench Narratives - Two-Perspective Model', () => {
  let context: TransformerContext;
  let scenario: WorldScenarioHook;
  let alice: Actor;
  let bob: Actor;

  beforeEach(() => {
    context = createTransformerContext();
    ({ alice, bob } = createDefaultActors());
    scenario = createWorldScenario(context, { actors: [alice, bob] });

    // Set shell stats and sync to actor's materialized view
    if (alice.shells && alice.currentShell) {
      const shell = alice.shells[alice.currentShell];

      // Set stats on shell using type-safe utility
      setStatValue(shell, Stat.POW, 40);
      setStatValue(shell, Stat.FIN, 40);
      setStatValue(shell, Stat.RES, 40);

      // Sync to actor stats (materialized view)
      setStatValue(alice, Stat.POW, 40);
      setStatValue(alice, Stat.FIN, 40);
      setStatValue(alice, Stat.RES, 40);
    }

    // Only Alice is going to be working at the workbench
    scenario.assignCurrency(alice, CurrencyType.SCRAP, 1000);
  });

  describe('narrateWorkbenchSessionDidStart', () => {
    it('generates narrative sequence with self perspective only', () => {
      const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateWorkbenchSessionDidStart(context, event);

      expect(narrative).toEqual([
        { self: 'Connecting to workbench interface...', observer: '', delay: 0 },
        { self: 'ShellOS v2.7.4-pre-collapse | Build 20847 | Neural Protocol Stack: ACTIVE', observer: '', delay: 1_000 },
        { self: 'Connection established.\n> Enter `help workbench` for available commands.', observer: '', delay: 1_000 },
      ]);
    });

    it('generates same sequence regardless of actor', () => {
      const event = createWorkbenchSessionDidStartEvent((e) => ({ ...e, actor: BOB_ID }));
      const narrative = narrateWorkbenchSessionDidStart(context, event);

      expect(narrative).toHaveLength(3);
      expect(narrative[0].self).toContain('Connecting to workbench interface');
    });
  });

  describe('narrateWorkbenchSessionDidEnd', () => {
    it('generates both self and observer perspectives', () => {
      const event = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateWorkbenchSessionDidEnd(context, event);

      expect(narrative.self).toBe('You finish your work at the workbench.');
      expect(narrative.observer).toBe('Alice finishes working at the workbench.');
    });

    it('generates correct observer perspective for different actors', () => {
      const event = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: BOB_ID }));
      const narrative = narrateWorkbenchSessionDidEnd(context, event);

      expect(narrative.self).toBe('You finish your work at the workbench.');
      expect(narrative.observer).toBe('Bob finishes working at the workbench.');
    });

    it('returns EMPTY_NARRATIVE when actor is missing', () => {
      const event = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: 'flux:actor:nonexistent' as ActorURN }));
      const narrative = narrateWorkbenchSessionDidEnd(context, event);

      expect(narrative).toEqual(EMPTY_NARRATIVE);
    });
  });

  describe('narrateActorDidStageShellMutation', () => {
    it('generates stat mutation narrative for self perspective', () => {
      const event = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          shellId: alice.currentShell!,
          mutation: createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
        },
      }));

      const narrative = narrateActorDidStageShellMutation(context, event);

      expect(narrative.self).toBe('POW 40 -> 45');
      expect(narrative.observer).toBe(''); // Staging is only visible to actor
    });

    it('returns EMPTY_NARRATIVE for component mutations', () => {
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

      const narrative = narrateActorDidStageShellMutation(context, event);

      expect(narrative).toEqual(EMPTY_NARRATIVE);
    });

    it('returns EMPTY_NARRATIVE when actor is missing', () => {
      const event = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidStageShellMutation(context, event);

      expect(narrative).toEqual(EMPTY_NARRATIVE);
    });
  });

  describe('narrateActorDidDiffShellMutations', () => {
    it('generates no changes message when nothing changed', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidDiffShellMutations(context, event);

      expect(narrative.self).toContain('You review your shell design. No changes detected.');
      expect(narrative.self).toContain('> Enter `shell commit`');
      expect(narrative.observer).toBe(''); // Diff is only visible to actor
    });

    it('generates comprehensive diff with performance changes', () => {
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

      const narrative = narrateActorDidDiffShellMutations(context, event);

      expect(narrative.self).toContain('Shell Configuration Analysis:');
      expect(narrative.self).toContain('Gap Closing (10m):');
      expect(narrative.self).toContain('Peak Power Output:');
      expect(narrative.self).toContain('Weapon Damage:');
      expect(narrative.observer).toBe('');
    });

    it('shows all shell stats including unchanged ones', () => {
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

      const narrative = narrateActorDidDiffShellMutations(context, event);

      expect(narrative.self).toContain('SHELL STATS');
      expect(narrative.self).toContain('POW:              40 -> 45 (+5)'); // Changed stat
      expect(narrative.self).toContain('FIN:              40'); // Unchanged stat
      expect(narrative.self).toContain('RES:              40'); // Unchanged stat
    });

    it('returns prompts only when actor is missing (base returns EMPTY_NARRATIVE but wrapper adds prompts)', () => {
      const event = createActorDidDiffShellMutationsEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidDiffShellMutations(context, event);

      // The wrapper adds prompts even when base returns EMPTY_NARRATIVE
      expect(narrative.self).toContain('> Enter `shell commit`');
      expect(narrative.observer).toBe('');
    });
  });

  describe('narrateActorDidUndoShellMutations', () => {
    it('generates undo narrative for self perspective', () => {
      const event = createActorDidUndoShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidUndoShellMutations(context, event);

      expect(narrative.self).toBe('You have discarded your staged shell modifications.');
      expect(narrative.observer).toBe(''); // Undo is only visible to actor
    });
  });

  describe('narrateActorDidCommitShellMutations', () => {
    it('generates commit narrative with cost', () => {
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

      const narrative = narrateActorDidCommitShellMutations(context, event);

      expect(narrative.self).toBe('You commit 2 shell modifications for 150 credits.');
      expect(narrative.observer).toBe(''); // Commit is only visible to actor
    });

    it('generates commit narrative without cost', () => {
      const event = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 0,
          mutations: [createStatMutation(Stat.RES, StatMutationOperation.ADD, 30)],
        },
      }));

      const narrative = narrateActorDidCommitShellMutations(context, event);

      expect(narrative.self).toBe('You commit 1 shell modification.');
      expect(narrative.observer).toBe('');
    });

    it('handles singular vs plural correctly', () => {
      const singleEvent = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 75,
          mutations: [createStatMutation(Stat.POW, StatMutationOperation.ADD, 10)],
        },
      }));

      const singleNarrative = narrateActorDidCommitShellMutations(context, singleEvent);
      expect(singleNarrative.self).toContain('1 shell modification');

      const multipleEvent = createActorDidCommitShellMutationsEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          cost: 200,
          mutations: [
            createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
            createStatMutation(Stat.FIN, StatMutationOperation.ADD, 5),
          ],
        },
      }));

      const multipleNarrative = narrateActorDidCommitShellMutations(context, multipleEvent);
      expect(multipleNarrative.self).toContain('2 shell modifications');
    });
  });

  describe('narrateActorDidListShells', () => {
    it('generates shell listing for self perspective', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event);

      expect(narrative.self).toMatch(/✓ .* is your current shell\./);
      expect(narrative.self).toMatch(/✓\s+Shell 1: ".*" \(\d+\.\d+kg, 40 POW, 40 FIN, 40 RES\)/);
      expect(narrative.observer).toBe(''); // Shell listing is only visible to actor
    });

    it('shows active shell indicator correctly', () => {
      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event);

      const lines = narrative.self.split('\n');
      const dataRows = lines.filter(line =>
        line.startsWith('✓ ') && line.includes('Shell 1:')
      );
      expect(dataRows).toHaveLength(1);
    });

    it('handles shells with no name', () => {
      const actor = context.world.actors[ALICE_ID];
      const shellId = Object.keys(actor.shells!)[0];
      // @ts-expect-error - Force-deleting the name property
      delete actor.shells![shellId].name;

      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event);

      expect(narrative.self).toContain('"Unnamed Shell"');
    });

    it('returns no shells message when actor has no shells', () => {
      const actor = context.world.actors[ALICE_ID];
      actor.shells = {};

      const event = createActorDidListShellsEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateActorDidListShells(context, event);

      expect(narrative.self).toBe('You have no shells available.');
      expect(narrative.observer).toBe('');
    });

    it('returns EMPTY_NARRATIVE when actor is missing', () => {
      const event = createActorDidListShellsEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidListShells(context, event);

      expect(narrative).toEqual(EMPTY_NARRATIVE);
    });
  });

  describe('narrateActorDidAssessShellStatus', () => {
    it('generates comprehensive shell status report', () => {
      const event = createActorDidAssessShellStatusEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          shellId: alice.currentShell!,
        }
      }));

      const narrative = narrateActorDidAssessShellStatus(context, event);

      expect(narrative.self).toContain('STATS');
      expect(narrative.self).toContain('MOBILITY');
      expect(narrative.self).toContain('POWER OUTPUT');
      expect(narrative.self).toContain('CAPACITOR');
      expect(narrative.self).toContain('WEAPON');
      expect(narrative.observer).toBe(''); // Assessment is only visible to actor
    });

    it('returns EMPTY_NARRATIVE when actor is missing', () => {
      const event = createActorDidAssessShellStatusEvent((e) => ({
        ...e,
        actor: 'flux:actor:nonexistent' as ActorURN,
      }));

      const narrative = narrateActorDidAssessShellStatus(context, event);

      expect(narrative).toEqual(EMPTY_NARRATIVE);
    });

    it('returns EMPTY_NARRATIVE when shell is missing', () => {
      const event = createActorDidAssessShellStatusEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          shellId: 'flux:shell:nonexistent' as any,
        }
      }));

      const narrative = narrateActorDidAssessShellStatus(context, event);

      expect(narrative).toEqual(EMPTY_NARRATIVE);
    });
  });

  describe('Narrative quality validation', () => {
    it('generates non-empty narratives for valid events', () => {
      const sessionEndEvent = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
      const sessionEndNarrative = narrateWorkbenchSessionDidEnd(context, sessionEndEvent);
      expect(sessionEndNarrative.self.length).toBeGreaterThan(0);
      expect(sessionEndNarrative.observer.length).toBeGreaterThan(0);

      const stageEvent = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          shellId: alice.currentShell!,
          mutation: createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
        },
      }));
      const stageNarrative = narrateActorDidStageShellMutation(context, stageEvent);
      expect(stageNarrative.self.length).toBeGreaterThan(0);
    });

    it('differentiates between self and observer perspectives', () => {
      const sessionEndEvent = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
      const narrative = narrateWorkbenchSessionDidEnd(context, sessionEndEvent);

      expect(narrative.self).not.toBe(narrative.observer);
      expect(narrative.self).toContain('You');
      expect(narrative.observer).toContain('Alice');
    });

    it('maintains consistent narrative structure across events', () => {
      const events = [
        createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID })),
        createActorDidUndoShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID })),
        createActorDidCommitShellMutationsEvent((e) => ({
          ...e,
          actor: ALICE_ID,
          payload: {
            ...e.payload,
            cost: 100,
            mutations: [createStatMutation(Stat.POW, StatMutationOperation.ADD, 5)],
          },
        })),
      ];

      events.forEach(event => {
        const narrative = event.type === 'workbench:session:ended'
          ? narrateWorkbenchSessionDidEnd(context, event)
          : event.type === EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE
          ? narrateActorDidUndoShellMutations(context, event)
          : narrateActorDidCommitShellMutations(context, event);

        expect(narrative).toHaveProperty('self');
        expect(narrative).toHaveProperty('observer');
        expect(typeof narrative.self).toBe('string');
        expect(typeof narrative.observer).toBe('string');
      });
    });

    it('passes quality validation for all narrative functions', () => {
      const sessionEndEvent = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
      withNarrativeQuality(narrateWorkbenchSessionDidEnd, context, sessionEndEvent)();

      const stageEvent = createActorDidStageShellMutationEvent((e) => ({
        ...e,
        actor: ALICE_ID,
        payload: {
          ...e.payload,
          shellId: alice.currentShell!,
          mutation: createStatMutation(Stat.POW, StatMutationOperation.ADD, 5),
        },
      }));
      withNarrativeQuality(narrateActorDidStageShellMutation, context, stageEvent)();

      const diffEvent = createActorDidDiffShellMutationsEvent((e) => ({ ...e, actor: ALICE_ID }));
      withNarrativeQuality(narrateActorDidDiffShellMutations, context, diffEvent)();
    });

    it('validates perspective differentiation', () => {
      const sessionEndEvent = createWorkbenchSessionDidEndEvent((e) => ({ ...e, actor: ALICE_ID }));
      withPerspectiveDifferentiation(narrateWorkbenchSessionDidEnd, context, sessionEndEvent)();
    });
  });
});
