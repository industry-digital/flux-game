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
  const character = createActor(command.args);

  if (actors[character.id]) {
    context.declareError(`Character ${character.id} already exists in world projection`);
    return context;
  }

  actors[character.id] = character;

  context.declareEvent({
    type: EventType.ACTOR_CREATION_DID_SUCCEED,
    payload: { actorId: character.id },
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
