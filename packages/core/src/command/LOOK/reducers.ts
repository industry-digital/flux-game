import { EventType } from '~/types/event';
import { PureReducer, TransformerContext } from '~/types/handler';
import { EntityType } from '~/types/entity/entity';
import type { LookCommand } from './handler';
import { ActorURN, ItemURN, PlaceURN } from '~/types/taxonomy';

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
  if (command.args.type !== EntityType.ACTOR) {
    context.declareError('lookAtActorReducer received a command with invalid arguments', command.id);
    return context;
  }

  const { actors } = context.world;
  const actor = actors[command.actor!];
  const targetActor = actors[command.args.id];

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
  if (command.args.type !== EntityType.PLACE) {
    context.declareError('lookAtPlaceReducer received invalid arguments', command.id);
    return context;
  }

  const { actors } = context.world;
  const actor = actors[command.actor!];
  const targetPlaceId = command.location ?? command.args.id;

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
  if (command.args.type !== EntityType.ITEM) {
    return context;
  }

  const { actors, items } = context.world;
  const actor = actors[command.actor!];

  let targetItem = actor.inventory.items[command.args.id];

  // Fell through, so we're looking at an item in the same place as the actor
  if (!targetItem) {
    targetItem = items[command.args.id];
  }

  if (!targetItem) {
    context.declareError('Could not find target item in world projection', command.id);
    return context;
  }

  declareLookEvent(context, command, targetItem.id);

  return context;
};
