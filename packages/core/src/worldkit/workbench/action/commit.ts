import { Actor } from '~/types/entity/actor';
import { ActorDidCommitShellMutations, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import {
  hasEnoughFunds,
  getBalance,
  createCurrencyTransaction,
  executeCurrencyTransaction
} from '~/worldkit/entity/actor/wallet';
import { CurrencyType, TransactionType } from '~/types/currency';
import { calculateTotalCost } from '~/worldkit/workbench/cost';
import { applyShellMutations } from '~/worldkit/workbench/execution';
import { createWorldEvent } from '~/worldkit/event';

export type CommitShellMutationsAction = (actor: Actor, trace?: string) => WorldEvent[];

export type CommitShellMutationsDependencies = {
  createWorldEvent: typeof createWorldEvent;
  calculateTotalCost: typeof calculateTotalCost;
  hasEnoughFunds: typeof hasEnoughFunds;
  createCurrencyTransaction: typeof createCurrencyTransaction;
  executeCurrencyTransaction: typeof executeCurrencyTransaction;
  applyShellMutations: typeof applyShellMutations;
};

const DEFAULT_COMMIT_SHELL_MUTATIONS_DEPS: CommitShellMutationsDependencies = {
  createWorldEvent,
  calculateTotalCost,
  hasEnoughFunds,
  createCurrencyTransaction,
  executeCurrencyTransaction,
  applyShellMutations,
};

export const createCommitShellMutationsAction = (
  context: TransformerContext,
  session: WorkbenchSession,
  deps: CommitShellMutationsDependencies = DEFAULT_COMMIT_SHELL_MUTATIONS_DEPS,
): CommitShellMutationsAction => {

  return function commitShellMutations(actor: Actor, trace: string = context.uniqid()): WorldEvent[] {
    // 1. Validate Pending Mutations
    if (session.data.pendingMutations.length === 0) {
      context.declareError('No staged mutations to commit');
      return [];
    }

    const shell = actor.shells[actor.currentShell];
    if (!shell) {
      context.declareError('Current shell not found');
      return [];
    }

    const cost = deps.calculateTotalCost(shell, session.data.pendingMutations);

    if (!deps.hasEnoughFunds(actor, CurrencyType.SCRAP, cost)) {
      context.declareError(`Insufficient scrap for shell modifications: need ${cost}, have ${getBalance(actor, CurrencyType.SCRAP)}`);
      return [];
    }

    // 4. Create Transaction
    const transaction = deps.createCurrencyTransaction({
      actorId: actor.id,
      currency: CurrencyType.SCRAP,
      type: TransactionType.DEBIT,
      amount: cost,
      trace,
    });

    // 5. Execute Transaction (applies payment + emits currency events)
    const currencyEvents = deps.executeCurrencyTransaction(context, actor, transaction);

    // 6. Apply Mutations
    deps.applyShellMutations(shell, session.data.pendingMutations);

    // 7. Clear Pending State
    const committedMutations = [...session.data.pendingMutations]; // Copy before clearing
    session.data.pendingMutations.length = 0;

    // 8. Create Event
    const commitEvent = deps.createWorldEvent<ActorDidCommitShellMutations>({
      trace,
      type: EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: {
        cost,
        mutations: committedMutations,
      },
    });

    context.declareEvent(commitEvent);

    return [...currencyEvents, commitEvent];
  };
};
