import { Actor } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { ActorDidStageShellMutation, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { ComponentMutation, InventoryMutation, ShellMutation, ShellMutationType, StatMutation, StatMutationOperation, ValidationResult, WorkbenchSession } from '~/types/workbench';
import { MAX_STAT_VALUE } from '~/worldkit/entity/actor/stats';
import { createWorldEvent } from '~/worldkit/event';
import { getShellStatValue } from '~/worldkit/entity/actor/shell';
import { ErrorCode } from '~/types/error';


export const validateStatMutation = (
  shell: Shell,
  mutation: StatMutation,
  result: ValidationResult,
): ValidationResult => {
  const currentValue = getShellStatValue(shell, mutation.stat);
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

export type StageMutationAction = (
  actor: Actor,
  shellId: string,
  mutation: ShellMutation,
  trace?: string,
  output?: WorldEvent[],
) => WorldEvent[];

export const createStageMutationAction = (
  context: TransformerContext,
  session: WorkbenchSession,
): StageMutationAction => {
  const { declareError } = context;

  return function stageMutation(
    actor: Actor,
    shellId: string,
    mutation: ShellMutation,
    trace: string = context.uniqid(),
    output: WorldEvent[] = [], // Consumers may opt into zero-allocation
  ): WorldEvent[] {
    output.length = 0;

    const shell = actor.shells![shellId];
    if (!shell) {
      declareError(ErrorCode.NOT_FOUND, trace);
      return [];
    }

    switch (mutation.type) {
      case ShellMutationType.STAT:
        return handleStatMutation(context, session, actor, shell, mutation as StatMutation, trace, output);
      case ShellMutationType.COMPONENT:
        return handleComponentMutation(context, session, actor, shell, mutation as ComponentMutation, trace, output);
      case ShellMutationType.INVENTORY:
        return handleInventoryMutation(context, session, actor, shell, mutation as InventoryMutation, trace, output);
      case ShellMutationType.METADATA:
      default:
        throw new Error('Not implmented');
    }
  }
}

const PREALLOCATED_VALIDATION_RESULT = {} as any;

const handleStatMutation = (
  context: TransformerContext,
  session: WorkbenchSession,
  actor: Actor,
  shell: Shell,
  mutation: StatMutation,
  trace: string,
  output: WorldEvent[],
): WorldEvent[] => {
  const { ok, error } = validateStatMutation(shell, mutation, PREALLOCATED_VALIDATION_RESULT);
  if (!ok) {
    context.declareError(error);
    return output;
  }

  // Direct mutation
  session.data.pendingMutations.push(mutation);

  const event = createWorldEvent<ActorDidStageShellMutation>({
    trace,
    type: EventType.ACTOR_DID_STAGE_SHELL_MUTATION,
    actor: actor.id,
    location: actor.location,
    session: session.id,
    payload: {
      shellId: shell.id,
      mutation,
    },
  });

  output.push(event);

  return output;
};

const handleComponentMutation = (
  context: TransformerContext,
  session: WorkbenchSession,
  actor: Actor,
  shell: Shell,
  mutation: ComponentMutation,
  trace: string,
  output: WorldEvent[],
): WorldEvent[] => {
  const componentSchema = context.schemaManager.getSchema(mutation.schema);

  const event = createWorldEvent<ActorDidStageShellMutation>({
    trace,
    type: EventType.ACTOR_DID_STAGE_SHELL_MUTATION,
    actor: actor.id,
    location: actor.location,
    session: session.id,
    payload: {
      shellId: shell.id,
      mutation,
    },
  });

  output.push(event);

  return output;
};

const handleInventoryMutation = (
  context: TransformerContext,
  session: WorkbenchSession,
  actor: Actor,
  shell: Shell,
  mutation: InventoryMutation,
  trace: string,
  output: WorldEvent[],
): WorldEvent[] => {
  throw new Error('Not implmented');
};
