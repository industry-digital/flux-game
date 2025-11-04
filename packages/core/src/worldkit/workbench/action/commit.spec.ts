import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Stat } from '~/types/entity/actor';
import { ActorDidCommitShellMutations, ActorDidCompleteCurrencyTransaction, EventType } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { CurrencyType, TransactionType } from '~/types/currency';
import { StatMutationOperation, ShellMutationType } from '~/types/workbench';
import { createCommitShellMutationsAction } from './commit';
import {
  useSimpleWorkbenchScenario,
  createMockWorkbenchContext,
  createStatMutation
} from '../testing';
import { setBalance, getBalance } from '~/worldkit/entity/actor/wallet';
import { extractFirstEventOfType } from '~/testing/event';
import { getShellStatValue } from '~/worldkit/entity/actor/shell';

describe('CommitShellMutationsAction', () => {
  let context: TransformerContext;

  beforeEach(() => {
    context = createMockWorkbenchContext();
    // Mock declareError as a spy
    context.declareError = vi.fn();
  });

  describe('successful commit', () => {
    it('should commit pending mutations with sufficient funds', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 2),
          createStatMutation(Stat.FIN, StatMutationOperation.ADD, 1)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Give actor sufficient scrap
      setBalance(actor, CurrencyType.SCRAP, 1000);
      const initialBalance = getBalance(actor, CurrencyType.SCRAP);

      // Capture initial shell stats
      const shell = actor.shells[actor.currentShell];
      const initialPow = getShellStatValue(shell, Stat.POW);
      const initialFin = getShellStatValue(shell, Stat.FIN);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor, 'test-trace');

      // Should return currency event + commit event
      expect(events).toHaveLength(2);

      // First event should be currency spend
      const spendEvent = extractFirstEventOfType<ActorDidCompleteCurrencyTransaction>(events, EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION)!;
      expect(spendEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
      expect(spendEvent.trace).toBe('test-trace');
      expect(spendEvent.payload.transaction.currency).toBe(CurrencyType.SCRAP);
      expect(spendEvent.payload.transaction.type).toBe(TransactionType.DEBIT);
      expect(spendEvent.payload.transaction.amount).toBeGreaterThan(0);

      // Second event should be commit event
      const commitEvent = extractFirstEventOfType<ActorDidCommitShellMutations>(events, EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED)!;
      expect(commitEvent.type).toBe(EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED);
      expect(commitEvent.trace).toBe('test-trace');
      expect(commitEvent.location).toBe(actor.location);
      expect(commitEvent.actor).toBe(actor.id);
      expect(commitEvent.session).toBe(session.id);
      expect(commitEvent.payload.cost).toBe(spendEvent.payload.transaction.amount);
      expect(commitEvent.payload.mutations).toHaveLength(2);

      // Verify mutations were applied to shell
      expect(getShellStatValue(shell, Stat.POW)).toBe(initialPow + 2);
      expect(getShellStatValue(shell, Stat.FIN)).toBe(initialFin + 1);

      // Verify wallet was debited
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(initialBalance - spendEvent.payload.transaction.amount);

      // Verify pending mutations were cleared
      expect(session.data.pendingMutations).toHaveLength(0);
    });

    it('should work with single mutation', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.RES, StatMutationOperation.ADD, 3)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 500);
      const shell = actor.shells[actor.currentShell];
      const initialRes = getShellStatValue(shell, Stat.RES);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(2);
      expect(getShellStatValue(shell, Stat.RES)).toBe(initialRes + 3);
      expect(session.data.pendingMutations).toHaveLength(0);
    });

    it('should use default trace when none provided', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 1)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 100);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(2);
      expect(events[0].trace).toBe('test-uniqid-12345'); // From mock context
      expect(events[1].trace).toBe('test-uniqid-12345');
    });
  });

  describe('error cases', () => {
    it('should fail when no pending mutations', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith('No staged mutations to commit');
    });

    it('should fail when current shell not found', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 1)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Remove current shell
      delete actor.shells[actor.currentShell];

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith('Current shell not found');
    });

    it('should fail when insufficient funds', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 5) // Expensive mutation
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Set very low balance
      setBalance(actor, CurrencyType.SCRAP, 1);
      const balance = getBalance(actor, CurrencyType.SCRAP);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringMatching(/^Insufficient scrap for shell modifications: need \d+, have 1$/)
      );

      // Verify no changes were made
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(balance);
      expect(session.data.pendingMutations).toHaveLength(1); // Still pending
    });

    it('should provide specific error message with exact amounts', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 2)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 5);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('need')
      );
      expect(context.declareError).toHaveBeenCalledWith(
        expect.stringContaining('have 5')
      );
    });
  });

  describe('cost calculation', () => {
    it('should calculate correct cost for multiple mutations', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 1),
          createStatMutation(Stat.FIN, StatMutationOperation.ADD, 1),
          createStatMutation(Stat.RES, StatMutationOperation.ADD, 1)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 1000);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(2);
      const spendEvent = extractFirstEventOfType<ActorDidCompleteCurrencyTransaction>(events, EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION)!;
      const commitEvent = extractFirstEventOfType<ActorDidCommitShellMutations>(events, EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED)!;

      // Cost should be consistent between spend and commit events
      expect(spendEvent.payload.transaction.amount).toBe(commitEvent.payload.cost);
      expect(commitEvent.payload.cost).toBeGreaterThan(0);
    });

    it('should handle zero-cost mutations gracefully', () => {
      // Create a scenario where mutations result in zero cost (e.g., downgrades)
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.REMOVE, 1)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 100);
      const initialBalance = getBalance(actor, CurrencyType.SCRAP);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(2);
      const spendEvent = extractFirstEventOfType<ActorDidCompleteCurrencyTransaction>(events, EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION)!;
      expect(spendEvent.payload.transaction.amount).toBe(0);

      // Balance should remain unchanged for zero-cost transaction
      expect(getBalance(actor, CurrencyType.SCRAP)).toBe(initialBalance);
    });
  });

  describe('state management', () => {
    it('should preserve original mutations in commit event before clearing', () => {
      const originalMutations = [
        createStatMutation(Stat.POW, StatMutationOperation.ADD, 2),
        createStatMutation(Stat.FIN, StatMutationOperation.ADD, 1)
      ];

      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [...originalMutations] // Copy to avoid reference issues
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 1000);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      const commitEvent = events[1] as ActorDidCommitShellMutations;

      // Verify mutations are preserved in event
      expect(commitEvent.payload.mutations).toHaveLength(2);
      expect(commitEvent.payload.mutations[0]).toEqual(originalMutations[0]);
      expect(commitEvent.payload.mutations[1]).toEqual(originalMutations[1]);

      // Verify session mutations are cleared
      expect(session.data.pendingMutations).toHaveLength(0);
    });

    it('should not modify shell if transaction fails', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 5)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 1); // Insufficient funds
      const shell = actor.shells[actor.currentShell];
      const initialPow = getShellStatValue(shell, Stat.POW);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(0);

      // Shell should remain unchanged
      expect(getShellStatValue(shell, Stat.POW)).toBe(initialPow);

      // Mutations should still be pending
      expect(session.data.pendingMutations).toHaveLength(1);
    });
  });

  describe('event generation', () => {
    it('should generate proper currency event with transaction details', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 1)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 100);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor, 'custom-trace');

      const spendEvent = extractFirstEventOfType<ActorDidCompleteCurrencyTransaction>(events, EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION)!;

      expect(spendEvent.type).toBe(EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION);
      expect(spendEvent.trace).toBe('custom-trace');
      expect(spendEvent.location).toBe(actor.location);
      expect(spendEvent.actor).toBe(actor.id);
      expect(spendEvent.payload.transaction.actorId).toBe(actor.id);
      expect(spendEvent.payload.transaction.currency).toBe(CurrencyType.SCRAP);
      expect(spendEvent.payload.transaction.type).toBe(TransactionType.DEBIT);
    });

    it('should generate proper commit event with complete payload', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.FIN, StatMutationOperation.ADD, 2)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor, CurrencyType.SCRAP, 200);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor, 'commit-trace');

      const commitEvent = events[1] as ActorDidCommitShellMutations;

      expect(commitEvent.type).toBe(EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED);
      expect(commitEvent.trace).toBe('commit-trace');
      expect(commitEvent.location).toBe(actor.location);
      expect(commitEvent.actor).toBe(actor.id);
      expect(commitEvent.session).toBe(session.id);
      expect(commitEvent.payload.cost).toBeGreaterThan(0);
      expect(commitEvent.payload.mutations).toHaveLength(1);
      const mutation = commitEvent.payload.mutations[0];
      expect(mutation.type).toBe(ShellMutationType.STAT);
      if (mutation.type === ShellMutationType.STAT) {
        expect(mutation.stat).toBe(Stat.FIN);
      }
    });
  });

  describe('integration with wallet system', () => {
    it('should follow complete transaction workflow', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 2)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      const initialBalance = 150;
      setBalance(actor, CurrencyType.SCRAP, initialBalance);

      const commitAction = createCommitShellMutationsAction(context, session);
      const events = commitAction(actor);

      expect(events).toHaveLength(2);

      const transactionEvent = extractFirstEventOfType<ActorDidCompleteCurrencyTransaction>(events, EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION)!;
      const commitEvent = extractFirstEventOfType<ActorDidCommitShellMutations>(events, EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED)!;

      // Verify transaction record structure
      expect(transactionEvent.payload.transaction.actorId).toBe(actor.id);
      expect(transactionEvent.payload.transaction.currency).toBe(CurrencyType.SCRAP);
      expect(transactionEvent.payload.transaction.type).toBe(TransactionType.DEBIT);
      expect(transactionEvent.payload.transaction.amount).toBe(commitEvent.payload.cost);
      expect(transactionEvent.payload.transaction.trace).toBeDefined();

      // Verify wallet was properly debited
      const finalBalance = getBalance(actor, CurrencyType.SCRAP);
      expect(finalBalance).toBe(initialBalance - transactionEvent.payload.transaction.amount);
    });

    it('should handle edge case of exact balance match', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 1)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // First, determine the exact cost
      setBalance(actor, CurrencyType.SCRAP, 1000);
      const testCommitAction = createCommitShellMutationsAction(context, session);
      const testEvents = testCommitAction(actor);
      const transactionEvent = extractFirstEventOfType<ActorDidCompleteCurrencyTransaction>(testEvents, EventType.ACTOR_DID_COMPLETE_CURRENCY_TRANSACTION)!;
      const exactCost = transactionEvent.payload.transaction.amount;

      // Reset scenario with exact balance
      const scenario2 = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(Stat.POW, StatMutationOperation.ADD, 1)
        ]
      });
      const actor2 = scenario2.actors['flux:actor:test-actor'].actor;
      const session2 = scenario2.actors['flux:actor:test-actor'].hooks.session.session;

      setBalance(actor2, CurrencyType.SCRAP, exactCost);

      const commitAction = createCommitShellMutationsAction(context, session2);
      const events = commitAction(actor2);

      expect(events).toHaveLength(2);
      expect(getBalance(actor2, CurrencyType.SCRAP)).toBe(0);
    });
  });
});
