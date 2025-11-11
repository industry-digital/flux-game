import { PureReducer, TransformerContext } from '~/types/handler';
import { createActor } from '~/worldkit/entity/actor';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { CreateActorCommand } from './types';
import { EventType } from '~/types/event';
import { WellKnownActor } from '~/types/actor';

const reducerCore: PureReducer<TransformerContext, CreateActorCommand> = (context, command) => {
  const actor = createActor(command.args);
  context.world.actors[actor.id] = actor;

  context.declareEvent({
    trace: command.id,
    type: EventType.ACTOR_WAS_CREATED,
    actor: WellKnownActor.SYSTEM,
    location: actor.location,
    payload: {
      newActorId: actor.id,
    },
  });

  return context;
};

export const createActorCommandReducer: PureReducer<TransformerContext, CreateActorCommand> =
  withCommandType(CommandType.CREATE_ACTOR,
    reducerCore,
  );
