import { Actor } from '~/types/entity/actor';
import { ActorDidUndoShellMutations, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { createWorldEvent } from '~/worldkit/event';

export type UndoStagedMutationsAction = (actor: Actor, trace?: string) => WorldEvent[];

const NO_PAYLOAD: Readonly<{}> = Object.freeze({});

export const createUndoStagedMutationsAction = (
  context: TransformerContext,
  session: WorkbenchSession,
): UndoStagedMutationsAction => {
  const { declareError } = context;

  return function undoStagedMutations(actor: Actor, trace: string = context.uniqid()): WorldEvent[] {
    // Check if there are any mutations to undo
    if (session.data.pendingMutations.length === 0) {
      declareError('No staged mutations to undo');
      return [];
    }

    // Clear all pending mutations. Direct mutation.
    session.data.pendingMutations.length = 0;

    const shellMutationsUndoneEvent = createWorldEvent<ActorDidUndoShellMutations>({
      trace,
      type: EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: NO_PAYLOAD,
    });

    return [shellMutationsUndoneEvent];
  };
};
