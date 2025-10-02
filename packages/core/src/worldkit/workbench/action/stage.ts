import { describeComponentMutation, describeStatMutation } from '~/template/workbench/mutation';
import { CurrencyType } from '~/types/currency';
import { Actor } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { ActorDidStageShellMutation, EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { ComponentMutation, InventoryMutation, ShellMutation, ShellMutationType, StatMutation, StatMutationOperation, ValidationResult, WorkbenchSession } from '~/types/workbench';
import { MAX_STAT_VALUE } from '~/worldkit/entity/actor';
import { createWorldEvent } from '~/worldkit/event';
import { SchemaRegistry } from '~/worldkit/schema';
import { calculateMutationCost } from '~/worldkit/workbench/cost';

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

export type StageMutationAction = (actor: Actor, shellId: string, mutation: ShellMutation, trace?: string) => WorldEvent[];

export const createStageMutationAction = (
  context: TransformerContext,
  session: WorkbenchSession,
): StageMutationAction => {
  const { declareError } = context;

  return function stageMutation(actor: Actor, shellId: string, mutation: ShellMutation, trace: string = context.uniqid()): WorldEvent[] {
    const shell = actor.shells[shellId];
    if (!shell) {
      declareError(`Shell not found in actor's arsenal`);
      return [];
    }

    switch (mutation.type) {
      case ShellMutationType.STAT:
        return handleStatMutation(context, session, actor, shell, mutation as StatMutation, trace);
      case ShellMutationType.COMPONENT:
        return handleComponentMutation(context, session, actor, shell, mutation as ComponentMutation, trace);
      case ShellMutationType.INVENTORY:
        return handleInventoryMutation(context, session, actor, shell, mutation as InventoryMutation, trace);
      case ShellMutationType.METADATA:
      default:
        throw new Error('Not implmented');
    }
  }
}

const handleStatMutation = (
  context: TransformerContext,
  session: WorkbenchSession,
  actor: Actor,
  shell: Shell,
  mutation: StatMutation,
  trace: string,
): ActorDidStageShellMutation | null => {
  const validationResult = validateStatMutation(shell, mutation);
  if (!validationResult.ok) {
    context.declareError(validationResult.error);
    return null;
  }

  const cost = calculateMutationCost(shell, mutation);
  const currency = CurrencyType.SCRAP;

  // Direct mutation
  session.data.pendingMutations.push(mutation);

  return createWorldEvent<ActorDidStageShellMutation>({
    type: EventType.WORKBENCH_SHELL_MUTATION_STAGED,
    trace,
    location: actor.location,
    actor: actor.id,
    narrative: {
      self: describeStatMutation(mutation as StatMutation, cost, currency),
    },
    payload: {
      shellId: shell.id,
      mutation,
    },
  });
};

const handleComponentMutation = (
  context: TransformerContext,
  session: WorkbenchSession,
  actor: Actor,
  shell: Shell,
  mutation: ComponentMutation,
  trace: string,
): ActorDidStageShellMutation | null => {
  const schema = context.schemaManager.getSchemaOrFail(mutation.schema);

  return createWorldEvent<ActorDidStageShellMutation>({
    type: EventType.WORKBENCH_SHELL_MUTATION_STAGED,
    trace,
    location: actor.location,
    actor: actor.id,
    narrative: {
      self: describeComponentMutation(mutation, schema.name, schema.powerDraw ?? 0),
    },
    payload: {
      shellId: shell.id,
      mutation,
    },
  });
};

const handleInventoryMutation = (
  context: TransformerContext,
  session: WorkbenchSession,
  actor: Actor,
  shell: Shell,
  mutation: InventoryMutation,
  trace: string,
): ActorDidStageShellMutation | null => {
  const { declareError, inventoryApi, schemaManager, mass } = context;

  const item = inventoryApi.getItem(actor, mutation.itemId);
  if (!item) {
    context.declareError(`Inventory item ${mutation.itemId} not found`);
    return null;
  }

  const schema = context.schemaManager.getSchemaOrFail(item.schema as keyof SchemaRegistry);




  return null;
};
