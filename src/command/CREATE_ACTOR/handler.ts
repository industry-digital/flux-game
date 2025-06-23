import { createActor } from '~/worldkit/entity/actor';
import { isCommandOfType } from '~/lib/intent';
import {
    ActorInput,
    CommandType,
    PureReducer,
    TransformerContext,
    PureHandlerInterface,
    AllowedInput,
    EventType,
} from '@flux';
import { SystemCommand } from '~/types/intent';

export type CreateActorCommand = SystemCommand<CommandType.CREATE_ACTOR, ActorInput>;

export const createActorCommandReducer: PureReducer<TransformerContext, CreateActorCommand> = (
  context,
  command,
) => {
  const { declareEvent } = context;
  const { actors } = context.world;
  const actor = createActor(command.args);

  if (actors[actor.id]) {
    context.declareError(`Actor ${actor.id} already exists in world projection`);
    return context;
  }

  // All we have to do is add the new actor to `actors` projection
  // The server will understand that this is a new actor
  actors[actor.id] = actor;

  declareEvent({
    type: EventType.ACTOR_WAS_CREATED,
    actor: actor.id,
    location: actor.location.id,
    payload: {},
    trace: command.id,
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
