import { Actor } from '~/types/entity/actor';
import { EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { createWorldEvent } from '~/worldkit/event';

export type ListShellsAction = (
  actor: Actor,
  trace?: string,
  output?: WorldEvent[],
) => WorldEvent[];

export type ListShellsActionDependencies = {
  createWorldEvent: typeof createWorldEvent;
};

export const DEFAULT_LIST_SHELLS_ACTION_DEPS: Readonly<ListShellsActionDependencies> = Object.freeze({
  createWorldEvent,
});

const NO_PAYLOAD: Readonly<{}> = Object.freeze({});

export const createListShellsAction = (
  context: TransformerContext,
  session: WorkbenchSession,
  deps: ListShellsActionDependencies = DEFAULT_LIST_SHELLS_ACTION_DEPS,
): ListShellsAction => {
  const { declareEvent } = context;

  return function listShells(
    actor: Actor,
    trace: string = context.uniqid(),
    output: WorldEvent[] = [], // Consumers may opt into zero-allocation
  ): WorldEvent[] {
    output.length = 0;

    const shellEvent = deps.createWorldEvent({
      type: EventType.ACTOR_DID_LIST_SHELLS,
      trace,
      actor: actor.id,
      location: actor.location,
      payload: NO_PAYLOAD,
    });

    declareEvent(shellEvent); // ← Direct event declaration

    output.push(shellEvent);

    return output;
  };
};
