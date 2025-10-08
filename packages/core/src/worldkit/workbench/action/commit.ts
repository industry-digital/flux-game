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

export const createCommitShellMutationsAction = (
  context: TransformerContext,
  session: WorkbenchSession,
): CommitShellMutationsAction => {
  const { declareError } = context;

  return function commitShellMutations(actor: Actor, trace: string = context.uniqid()): WorldEvent[] {
    // 1. Validate Pending Mutations
    if (session.data.pendingMutations.length === 0) {
      declareError('No staged mutations to commit');
      return [];
    }

    const shell = actor.shells[actor.currentShell];
    if (!shell) {
      declareError('Current shell not found');
      return [];
    }

    const cost = calculateTotalCost(shell, session.data.pendingMutations);

    if (!hasEnoughFunds(actor, CurrencyType.SCRAP, cost)) {
      declareError(`Insufficient scrap for shell modifications: need ${cost}, have ${getBalance(actor, CurrencyType.SCRAP)}`);
      return [];
    }

    // 4. Create Transaction
    const transaction = createCurrencyTransaction({
      actorId: actor.id,
      currency: CurrencyType.SCRAP,
      type: TransactionType.DEBIT,
      amount: cost,
      trace,
    });

    // 5. Execute Transaction (applies payment + emits currency events)
    const currencyEvents = executeCurrencyTransaction(context, actor, transaction);

    // 6. Apply Mutations
    applyShellMutations(shell, session.data.pendingMutations);

    // 7. Clear Pending State
    const committedMutations = [...session.data.pendingMutations]; // Copy before clearing
    session.data.pendingMutations.length = 0;

    // 8. Create Event
    const commitEvent = createWorldEvent<ActorDidCommitShellMutations>({
      type: EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED,
      trace,
      location: actor.location,
      actor: actor.id,
      payload: {
        sessionId: session.id,
        cost,
        mutations: committedMutations,
      },
    });

    // Return all events
    return [...currencyEvents, commitEvent];
  };
};
