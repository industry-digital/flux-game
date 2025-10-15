import { Actor } from '~/types/entity/actor';
import { ActorDidSwapShell, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { findShellByNameOrId } from '~/worldkit/entity/actor/shell';
import { createWorldEvent } from '~/worldkit/event';
import { createCliMessage } from '~/worldkit/workbench/cli';
import { createUndoStagedMutationsAction, UndoStagedMutationsAction } from '~/worldkit/workbench/action/undo';

export type SwapShellAction = (actor: Actor, targetShellNameOrId: string, force?: boolean, trace?: string) => WorldEvent[];

const ERR_PENDING_MUTATIONS = createCliMessage(`ERROR: Unable to transfer consciousness to a different shell while your current shell has pending changes`);
const WARN_MUTATIONS_DISCARDED = createCliMessage(`WARNING: Neural interface severed during consciousness transfer. Pending shell modifications discarded.`);
const ERR_TARGET_SHELL_NOT_FOUND = createCliMessage(`ERROR: Target shell not found in arsenal`);
const ERR_ALREADY_USING_TARGET_SHELL = createCliMessage(`ERROR: Already using target shell`);
const ERR_CURRENT_SHELL_NOT_FOUND = createCliMessage(`ERROR: Current shell not found`);

export type SwapShellActionDependencies = {
  undoStagedMutations?: UndoStagedMutationsAction;
};

export const DEFAULT_SWAP_DEPS: Readonly<SwapShellActionDependencies> = Object.freeze({});

export const createSwapShellAction = (
  context: TransformerContext,
  session: WorkbenchSession,
  {
    undoStagedMutations = createUndoStagedMutationsAction(context, session),
  }: SwapShellActionDependencies = DEFAULT_SWAP_DEPS,
): SwapShellAction => {
  const { declareError } = context;

  return function swapShell(
    actor: Actor,
    targetShellNameOrId: string,
    force: boolean = false,
    trace: string = context.uniqid(),
  ): WorldEvent[] {

    // Handle pending mutations based on force flag
    const events: WorldEvent[] = [];
    if (session.data.pendingMutations.length > 0) {
      if (!force) {
        declareError(ERR_PENDING_MUTATIONS);
        return [];
      }

      // Force flag: discard pending mutations using undo action
      events.push(...undoStagedMutations(actor, trace));
      declareError(WARN_MUTATIONS_DISCARDED);
    }

    // Invariant: The target shell exists in the actor's arsenal.
    const shellMatch = findShellByNameOrId(actor, targetShellNameOrId);
    if (!shellMatch) {
      declareError(ERR_TARGET_SHELL_NOT_FOUND);
      return [];
    }

    const { shell: targetShell, id: targetShellId } = shellMatch;

    if (actor.currentShell === targetShellId) {
      declareError(ERR_ALREADY_USING_TARGET_SHELL);
      return [];
    }

    // Invariant: Core always occupies Shell
    const currentShell = actor.shells[actor.currentShell];
    if (!currentShell) {
      declareError(ERR_CURRENT_SHELL_NOT_FOUND);
      return [];
    }

    const targetShellName = targetShell.name || targetShellId;
    const previousShellId = actor.currentShell;

    // Literal shell pointer swap
    actor.currentShell = targetShellId;

    session.data.currentShellId = targetShellId;

    // Create swap event
    const shellSwapEvent = createWorldEvent<ActorDidSwapShell>({
      type: EventType.ACTOR_DID_SWAP_SHELL,
      trace,
      location: actor.location,
      actor: actor.id,
      payload: {
        fromShellId: previousShellId,
        toShellId: targetShellId,
        sessionId: session.id,
      },
    });

    events.push(shellSwapEvent);
    return events;
  };
};
