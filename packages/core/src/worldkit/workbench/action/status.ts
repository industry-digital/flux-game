import { Actor } from '~/types/entity/actor';
import { ActorDidAssessShellStatus, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { createWorldEvent } from '~/worldkit/event';
import { ErrorCode } from '~/types/error';

export type GetShellStatusAction = (
  actor: Actor,
  trace?: string,
  output?: WorldEvent[],
) => WorldEvent[];

export const createGetShellStatusAction = (
  context: TransformerContext,
  session: WorkbenchSession,
): GetShellStatusAction => {
  const { declareError, declareEvent } = context;

  return function getShellStatus(
    actor: Actor,
    trace: string = context.uniqid(),
    output: WorldEvent[] = [], // Consumers may opt into zero-allocation
  ): WorldEvent[] {
    output.length = 0;

    const currentShell = actor.shells![actor.currentShell!];
    if (!currentShell) {
      declareError(ErrorCode.INVALID_TARGET, trace);
      return output;
    }

    const shellStatusEvent = createWorldEvent<ActorDidAssessShellStatus>({
      trace,
      type: EventType.ACTOR_DID_ASSESS_SHELL_STATUS,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: {
        shellId: currentShell.id,
      },
    });

    declareEvent(shellStatusEvent);

    output.push(shellStatusEvent);

    return output;
  };
};
