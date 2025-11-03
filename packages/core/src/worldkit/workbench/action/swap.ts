import { Actor } from '~/types/entity/actor';
import { ActorDidListShells, ActorDidSwapShell, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { createWorldEvent } from '~/worldkit/event';
import { createUndoStagedMutationsAction, UndoStagedMutationsAction } from '~/worldkit/workbench/action/undo';
import { ErrorCode } from '~/types/error';

export type SwapShellAction = (
  actor: Actor,
  shellId: string,
  force?: boolean,
  trace?: string,
  output?: WorldEvent[],
) => WorldEvent[];

export type SwapShellActionDependencies = {
  undoStagedMutations?: UndoStagedMutationsAction;
};

export const DEFAULT_SWAP_DEPS: Readonly<SwapShellActionDependencies> = Object.freeze({});

const NO_PAYLOAD: Readonly<{}> = Object.freeze({});

export const createSwapShellAction = (
  context: TransformerContext,
  session: WorkbenchSession,
  {
    undoStagedMutations = createUndoStagedMutationsAction(context, session),
  }: SwapShellActionDependencies = DEFAULT_SWAP_DEPS,
): SwapShellAction => {
  const { declareError, declareEvent } = context;

  return function swapShell(
    actor: Actor,
    shellId: string,
    force: boolean = false,
    trace: string = context.uniqid(),
    output: WorldEvent[] = [], // Consumers may opt into zero-allocation
  ): WorldEvent[] {
    output.length = 0;

    if (session.data.pendingMutations.length > 0) {
      if (!force) {
        declareError(ErrorCode.FORBIDDEN, trace);
        return output;
      }

      // Force flag: discard pending mutations using undo action
      output.push(...undoStagedMutations(actor, trace));
      declareError(ErrorCode.FORBIDDEN, trace);
    }

    // Invariant: The target shell exists in the actor's arsenal.
    const targetShell = actor.shells[shellId];
    if (!targetShell) {
      declareError(ErrorCode.NOT_FOUND, trace);
      return output;
    }

    if (actor.currentShell === targetShell.id) {
      declareError(ErrorCode.PRECONDITION_FAILED, trace);
      return output;
    }

    // Invariant: Core always occupies Shell
    const currentShell = actor.shells[actor.currentShell];
    if (!currentShell) {
      declareError(ErrorCode.PRECONDITION_FAILED, trace);
      return output;
    }

    // Literal shell pointer swap
    actor.currentShell = targetShell.id;
    session.data.currentShellId = targetShell.id;

    // Create swap event
    const shellSwapEvent = createWorldEvent<ActorDidSwapShell>({
      trace,
      type: EventType.ACTOR_DID_SWAP_SHELL,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: {
        fromShellId: currentShell.id,
        toShellId: targetShell.id,
      },
    });

    declareEvent(shellSwapEvent);
    output.push(shellSwapEvent);

    const shellListEvent = createWorldEvent<ActorDidListShells>({
      trace,
      type: EventType.ACTOR_DID_LIST_SHELLS,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: NO_PAYLOAD,
    });

    declareEvent(shellListEvent);
    output.push(shellListEvent);

    return output;
  };
};
