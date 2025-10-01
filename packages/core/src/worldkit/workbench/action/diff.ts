import { Actor } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { ActorDidDiffShellMutations, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { WorkbenchSession } from '~/types/workbench';
import { createWorldEvent } from '~/worldkit/event';
import { ShellPerformanceDependencies } from '~/worldkit/entity/actor/shell/performance';
import { renderShellDiff } from '~/template/workbench/diff';
import { computeEffectiveStatValue, getNaturalStatValue, getStat } from '~/worldkit/entity/actor';
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
    getStat: getStat,
    getNaturalStatValue: getNaturalStatValue,
    computeEffectiveStatValue: computeEffectiveStatValue,
  };

  return function diffStagedMutations(trace: string = context.uniqid()): WorldEvent[] {
    if (session.data.pendingMutations.length === 0) {
      declareError('No staged mutations to diff');
      return [];
    }

    const shellDiff = createShellDiff(shell, session.data.pendingMutations, shellPerformanceDeps);
    const narrative = { self: renderShellDiff(shellDiff) };

    // Create event
    const shellMutationsDiffedEvent = createWorldEvent<ActorDidDiffShellMutations>({
      type: EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED,
      trace,
      location: actor.location,
      actor: actor.id,
      narrative,
      payload: shellDiff,
    });

    return [shellMutationsDiffedEvent];
  };
};
