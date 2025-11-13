import { Actor } from '~/types/entity/actor';
import { ActorDidRenameShell, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { createWorldEvent } from '~/worldkit/event';
import { ErrorCode } from '~/types/error';

export type RenameShellAction = (
  actor: Actor,
  shellId: string,
  newName: string,
  trace?: string,
  output?: WorldEvent[],
) => WorldEvent[];

export type RenameShellActionDependencies = {
  createWorldEvent: typeof createWorldEvent;
};

export const DEFAULT_RENAME_SHELL_DEPS: Readonly<RenameShellActionDependencies> = Object.freeze({
  createWorldEvent,
});

export const createRenameShellAction = (
  context: TransformerContext,
  session: WorkbenchSession,
  deps: RenameShellActionDependencies = DEFAULT_RENAME_SHELL_DEPS,
): RenameShellAction => {

  return function renameShell(
    actor: Actor,
    shellId: string,
    newName: string,
    trace: string = context.uniqid(),
    output: WorldEvent[] = [], // Consumers may opt into zero-allocation
  ): WorldEvent[] {
    output.length = 0;

    // Invariant: The target shell exists in the actor's arsenal.
    const targetShell = actor.shells![shellId];
    if (!targetShell) {
      context.declareError(ErrorCode.INVALID_TARGET, trace);
      return output;
    }

    if (actor.currentShell === targetShell.id) {
      context.declareError(ErrorCode.INVALID_TARGET, trace);
      return output;
    }

    const oldName = targetShell.name;
    targetShell.name = newName;

    // Create rename event
    const shellRenameEvent = deps.createWorldEvent<ActorDidRenameShell>({
      trace,
      type: EventType.ACTOR_DID_RENAME_SHELL,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: {
        shellId: targetShell.id,
        oldName,
        newName,
      },
    });

    context.declareEvent(shellRenameEvent);

    output.push(shellRenameEvent);

    return output;
  };
};
