import { isCommandOfType } from '~/lib/intent';
import { ActorCommand, Command, CommandType } from '~/types/intent';
import { PureReducer, TransformerContext, PureHandlerInterface, IntentParser, Intent, IntentParserContext } from '~/types/handler';
import { ActorURN, ItemURN, PlaceURN } from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';
import { lookAtActorReducer, lookAtPlaceReducer, lookAtItemReducer } from './reducers';
import { parseEntityTypeFromURN } from '~/worldkit/entity/urn';

export type LookCommandArgs = { target: ActorURN | PlaceURN | ItemURN }
export type LookCommand = ActorCommand<CommandType.LOOK, LookCommandArgs>;

/**
 * Rules for looking at an entity:
 * - Actor may look only at Actors in the same `location` as the actor
 * - Actor may look only at the Place that the actor is in
 * - Actor may look only at these items:
 *   - Items in the actor's inventory
 *   - Items in the same `location` as the actor
 */
export const lookReducer: PureReducer<TransformerContext, LookCommand> = (context, command) => {
  const { declareError } = context;
  const { places, actors } = context.world;
  const place = places[command.location!];

  if (!place) {
    declareError('Could not find place in world projection', command.id);
    return context;
  }

  const actor = actors[command.actor!];
  if (!actor) {
    declareError('Could not find actor in world project', command.id);
    return context;
  }

  const entityType = parseEntityTypeFromURN(command.args.target);

  switch (entityType) {
    case EntityType.ACTOR:
      return lookAtActorReducer(context, command);

    case EntityType.PLACE:
      return lookAtPlaceReducer(context, command);

    case EntityType.ITEM:
      return lookAtItemReducer(context, command);

    default: // This is never supposed to happen
      declareError('Invalid look command arguments', command.id);
      return context;
  }
};

export const lookIntentParser: IntentParser<LookCommand> = (
  context: IntentParserContext,
  intent: Intent,
): LookCommand | undefined => {
  if (!intent.verb.startsWith('look')) {
    return undefined;
  }

  const targetActor = context.resolveActor(intent)
  if (targetActor) {
    return {
      __type: 'command',
      id: context.uniqid(),
      ts: context.timestamp(),
      actor: intent.actor,
      location: intent.location,
      type: CommandType.LOOK,
      args: {
        target: targetActor.id,
      },
    };
  }

  const targetPlace = context.resolvePlace(intent);
  if (targetPlace) {
    return {
      __type: 'command',
      id: context.uniqid(),
      ts: context.timestamp(),
      actor: intent.actor,
      location: intent.location,
      type: CommandType.LOOK,
      args: {
        target: targetPlace.id,
      },
    };
  }

  const targetItem = context.resolveItem(intent);
  if (targetItem) {
    return {
      __type: 'command',
      id: context.uniqid(),
      ts: context.timestamp(),
      actor: intent.actor,
      location: intent.location,
      type: CommandType.LOOK,
      args: {
        target: targetItem.id,
      },
    };
  }

  return undefined;
};

export class LOOK implements PureHandlerInterface<TransformerContext, LookCommand> {
  reduce = lookReducer;
  dependencies = [];
  handles = (command: Command): command is LookCommand => {
    return isCommandOfType<CommandType.LOOK, LookCommandArgs>(command, CommandType.LOOK);
  };
}
