import { createActor } from '~/worldkit/entity/actor';
import { isCommandOfType } from '~/lib/intent';
import {
  ActorInput,
  CommandType,
  EventType,
  PureReducer,
  TransformerContext,
  PureHandlerInterface,
  AllowedInput,
} from '@flux';
import { SystemCommand } from '~/types/intent';

export type CreateActorCommand = SystemCommand<CommandType.CREATE_ACTOR, ActorInput>;

export const createActorCommandReducer: PureReducer<TransformerContext, CreateActorCommand> = (
  context,
  command,
) => {
  const { actors } = context.world;
  const actor = createActor(command.args);

  if (actors[actor.id]) {
    context.declareError(`Actor ${actor.id} already exists in world projection`);
    return context;
  }

  actors[actor.id] = actor;

  context.declareEvent({
    type: EventType.ENTITY_CREATED,
    payload: {
      entityId: actor.id,
    },
  });

  return context;
};

export class CREATE_ACTOR implements PureHandlerInterface<TransformerContext, CreateActorCommand> {
  reduce = createActorCommandReducer;
  dependencies = [];
  handles = (input: AllowedInput): input is CreateActorCommand => {
    return isCommandOfType<CommandType.CREATE_ACTOR, ActorInput>(input, CommandType.CREATE_ACTOR);
  };
};
