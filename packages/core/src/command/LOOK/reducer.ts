import { EventType } from '~/types/event';
import { PureReducer, TransformerContext } from '~/types/handler';
import { LookCommand } from './types';
import { ActorURN, ItemURN, PlaceURN } from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';
import { parseEntityTypeFromURN } from '~/worldkit/entity/urn';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { withBasicWorldStateValidation } from '~/command/validation';

const declareLookEvent = (context: TransformerContext, command: LookCommand, target: ActorURN | PlaceURN | ItemURN) => {
  context.declareEvent({
    trace: command.id,
    type: EventType.ACTOR_DID_LOOK,
    location: command.location!,
    actor: command.actor!,
    payload: {
      target,
    },
  });
};

/**
 * Rules for looking at an actor:
 * - Actor may look at self
 * - Actor may look at another Actor in the same `location`
 */
export const lookAtActorReducer: PureReducer<TransformerContext, LookCommand> = (context, command) => {
  const { actors } = context.world;
  const actor = actors[command.actor!];
  const targetActorId = command.args.target as ActorURN;
  const targetActor = actors[targetActorId];

  if (!targetActor) {
    context.declareError('Target actor not found in world projection', command.id);
    return context;
  }

  if (targetActor.location !== actor.location) {
    context.declareError('Target actor not in the same location as the actor', command.id);
    return context;
  }

  declareLookEvent(context, command, targetActor.id);

  return context;
};

/**
 * Rules for looking at a place:
 * - Actor may look only at the Place that the actor is in
 */
export const lookAtPlaceReducer: PureReducer<TransformerContext, LookCommand> = (context, command) => {
  const { actors } = context.world;
  const actor = actors[command.actor!];
  const targetPlaceId = command.args.target as PlaceURN;

  if (targetPlaceId !== actor.location) {
    context.declareError('Target place not in the same location as the actor', command.id);
    return context;
  }

  declareLookEvent(context, command, targetPlaceId);

  return context;
};

/**
 * Rules for looking at an item:
 * - Actor may look at an item in own inventory
 * - Actor may look at a loose item in the same `location` as the actor
 */
export const lookAtItemReducer: PureReducer<TransformerContext, LookCommand> = (context, command) => {
  const { actors, items } = context.world;
  const actor = actors[command.actor!];
  const targetItemId = command.args.target as ItemURN;

  let targetItem = actor.inventory.items[targetItemId];

  // Fell through, so we're looking at an item in the same place as the actor
  if (!targetItem) {
    targetItem = items[targetItemId];
  }

  if (!targetItem) {
    context.declareError('Could not find target item in world projection', command.id);
    return context;
  }

  declareLookEvent(context, command, targetItem.id);

  return context;
};

const lookReducerCore: PureReducer<TransformerContext, LookCommand> = (context, command) => {
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

/**
 * Rules for looking at an entity:
 * - Actor may look only at Actors in the same `location` as the actor
 * - Actor may look only at the Place that the actor is in
 * - Actor may look only at these items:
 *   - Items in the actor's inventory
 *   - Items in the same `location` as the actor
 */
export const lookReducer: PureReducer<TransformerContext, LookCommand> =
  withCommandType(CommandType.LOOK,
    withBasicWorldStateValidation(
      lookReducerCore
    )
  );
