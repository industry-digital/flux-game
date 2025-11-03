import { Actor } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { ActorDidDiffShellMutations, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { createWorldEvent } from '~/worldkit/event';
import { ShellPerformanceDependencies } from '~/worldkit/entity/actor/shell/instrumentation';
import { createShellDiff } from '~/worldkit/workbench/diff';

export type DiffStagedMutationsAction = (trace?: string) => WorldEvent[];

export const createDiffStagedMutationsAction = (
  context: TransformerContext,
  session: WorkbenchSession,
  actor: Actor,
  shell: Shell,
): DiffStagedMutationsAction => {
  const { declareError } = context;

  const shellPerformanceDeps: ShellPerformanceDependencies = {
    massApi: context.mass,
    equipmentApi: context.equipmentApi,
  };

  return function diffStagedMutations(trace: string = context.uniqid()): WorldEvent[] {
    if (session.data.pendingMutations.length === 0) {
      declareError('No staged mutations to diff');
      return [];
    }

    const shellDiff = createShellDiff(actor, shell, session.data.pendingMutations, shellPerformanceDeps);

    // Create event
    const shellMutationsDiffedEvent = createWorldEvent<ActorDidDiffShellMutations>({
      trace,
      type: EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: shellDiff,
    });

    return [shellMutationsDiffedEvent];
  };
};
