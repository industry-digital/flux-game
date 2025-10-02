import { EventType } from '~/types/event';
import { PureReducer, TransformerContext } from '~/types/handler';
import { EntityType } from '~/types/entity/entity';
import type { LookCommand } from './handler';
import { Perspective } from '~/types/narrative';
import { renderActorSummary } from '~/template/actor';
import { lookAtPlace } from '~/worldkit/narrative/place';

export const lookAtActorReducer: PureReducer<TransformerContext, LookCommand> = (context, command) => {
  if (command.args.type !== EntityType.ACTOR) {
    return context;
  }

  const { actors } = context.world;
  const actor = actors[command.actor!];
  const targetActor = actors[command.args.id];

  if (!targetActor) {
    context.declareError('Target actor not found in world projection', command.id);
    return context;
  }

  context.declareEvent({
    type: EventType.ACTOR_DID_LOOK_AT_ACTOR,
    location: actor.location!,
    actor: actor.id,
    payload: { target: targetActor.id },
    trace: command.id,
    narrative: {
      self: renderActorSummary(targetActor, Perspective.OBSERVER),
    },
  });

  return context;
};

export const lookAtPlaceReducer: PureReducer<TransformerContext, LookCommand> = (context, command) => {
  if (command.args.type !== EntityType.PLACE) {
    return context;
  }

  const { actors } = context.world;
  const actor = actors[command.actor!];
  const targetPlaceId = command.location ?? command.args.id;

  // Use the shared lookAtPlace function to handle the logic and event generation
  return lookAtPlace(context, actor.id, targetPlaceId, command.id);
};

export const lookAtItemReducer: PureReducer<TransformerContext, LookCommand> = (context, command) => {
  if (command.args.type !== EntityType.ITEM) {
    return context;
  }

  const { actors } = context.world;
  const actor = actors[command.actor!];

  if (command.args.self) {
    const target = actor.inventory.items[command.args.id];

    if (!target) {
      context.declareError('Could not find target item in actor inventory', command.id);
      return context;
    }


    context.declareEvent({
      type: EventType.ACTOR_DID_LOOK_AT_SELF_ITEM,
      location: actor.location!,
      actor: actor.id,
      payload: { target: command.args.id },
      trace: command.id,
    });

    return context;
  }

  // Fell through, so we're looking at an item in the same place as the actor
  const { items } = context.world;
  const target = items[command.args.id];

  if (!target) {
    context.declareError('Could not find target item in world projection', command.id);
    return context;
  }

  context.declareEvent({
    type: EventType.ACTOR_DID_LOOK_AT_PLACE_ITEM,
    location: actor.location!,
    actor: actor.id,
    payload: { target: command.args.id },
    trace: command.id,
  });

  return context;
};
