import { Actor } from '~/types/entity/actor';
import { ActorDidSwapShell, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { findShellByNameOrId } from '~/worldkit/entity/actor/shell/shell';
import { createWorldEvent } from '~/worldkit/event';
import { createCliMessage } from '~/worldkit/workbench/cli';

export type SwapShellAction = (actor: Actor, targetShellNameOrId: string, trace?: string) => WorldEvent[];

const ERR_PENDING_MUTATIONS = createCliMessage(`ERROR: Unable to transfer consciousness to a different shell while your current shell has pending changes`);
const ERR_TARGET_SHELL_NOT_FOUND = createCliMessage(`ERROR: Target shell not found in arsenal`);
const ERR_ALREADY_USING_TARGET_SHELL = createCliMessage(`ERROR: Already using target shell`);
const ERR_CURRENT_SHELL_NOT_FOUND = createCliMessage(`ERROR: Current shell not found`);

export const createSwapShellAction = (
  context: TransformerContext,
  session: WorkbenchSession,
): SwapShellAction => {
  const { declareError } = context;

  return function swapShell(
    actor: Actor,
    targetShellNameOrId: string,
    trace: string = context.uniqid(),
  ): WorldEvent[] {
    // Invariant: There are no staged shell mutations.
    if (session.data.pendingMutations.length > 0) {
      declareError(ERR_PENDING_MUTATIONS);
      return [];
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

    const currentShell = actor.shells[actor.currentShell];
    if (!currentShell) {
      declareError(ERR_CURRENT_SHELL_NOT_FOUND);
      return [];
    }

    const targetShellName = targetShell.name || targetShellId;

    // 5. Perform the swap using computed approach (just pointer update!)
    const previousShellId = actor.currentShell;
    actor.currentShell = targetShellId;

    // 6. Update session to track the new shell
    session.data.currentShellId = targetShellId;

    // 7. Create narrative
    const narrative = {
      self: `Consciousness successfully transferred to shell ${targetShellName}.`,
    };

    // 8. Create swap event
    const shellSwapEvent = createWorldEvent<ActorDidSwapShell>({
      type: EventType.ACTOR_DID_SWAP_SHELL,
      trace,
      location: actor.location,
      actor: actor.id,
      narrative,
      payload: {
        actorId: actor.id,
        fromShellId: previousShellId,
        toShellId: targetShellId,
        sessionId: session.id,
      },
    });

    return [shellSwapEvent];
  };
};
