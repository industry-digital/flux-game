import { Actor } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { ActorDidStageShellMutation, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { ShellMutation, ShellMutationType, StatMutation, StatMutationOperation, ValidationResult, WorkbenchSession } from '~/types/workbench';
import { MAX_STAT_VALUE } from '~/worldkit/entity/actor';
import { createWorldEvent } from '~/worldkit/event';

export const validateStatMutation = (
  shell: Shell,
  mutation: StatMutation,
  // Consumers may opt into object re-use
  result: ValidationResult = { ok: false, error: 'DEFAULT_ERROR_MESSAGE' },
): ValidationResult => {
  const currentValue = shell.stats[mutation.stat].eff;
  let targetValue: number;

  if (mutation.operation === StatMutationOperation.ADD) {
    targetValue = currentValue + mutation.amount;
  } else {
    targetValue = currentValue - mutation.amount;
  }

  // Check bounds
  if (targetValue < 0) {
    result.ok = false;
    result.error = `Stat ${mutation.stat} cannot go below 0 (attempted: ${targetValue})`;
    return result;
  }

  if (targetValue > MAX_STAT_VALUE) {
    result.ok = false;
    result.error = `Stat ${mutation.stat} cannot exceed 100 (attempted: ${targetValue})`;
    return result;
  }

  result.ok = true;
  delete result.error
  return result;
}

export type StageMutationAction = (mutation: ShellMutation, trace?: string) => WorldEvent[];

export const createStageMutationAction = (
  context: TransformerContext,
  session: WorkbenchSession,
  actor: Actor,
  shell: Shell,
): StageMutationAction => {
  const { declareError } = context;

  return function stageMutation(mutation: ShellMutation, trace: string = context.uniqid()): WorldEvent[] {
    if (mutation.type === ShellMutationType.STAT) {
      const validationResult = validateStatMutation(shell, mutation);
      if (!validationResult.ok) {
        declareError(validationResult.error);
        return [];
      }
    }

    // Direct mutation
    session.data.pendingMutations.push(mutation);

    const shellMutationStagedEvent = createWorldEvent<ActorDidStageShellMutation>({
        type: EventType.WORKBENCH_SHELL_MUTATION_STAGED,
        trace,
        location: actor.location,
        actor: actor.id,
        payload: {
          shellId: shell.id,
          mutation,
        },
      });

    return [shellMutationStagedEvent];
  }
}
