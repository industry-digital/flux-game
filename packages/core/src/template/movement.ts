import { Direction } from '~/types/world/space';
import { Template } from '~/types/template';
import { WorldEventMessageDictionary } from '~/types/fact';
import { ActorSummaryLike } from '~/worldkit/view/actor';
import { Actor } from '~/types/entity/actor';
import { Narrative } from '~/types/narrative';

export type ActorMovementProps = {
  actor: ActorSummaryLike;
  direction: Direction;
  perspective: keyof WorldEventMessageDictionary;
};

export const renderActorDidDepart: Template<ActorMovementProps> = ({ actor, direction, perspective }) => {
  if (perspective === 'actor') {
    return `You move ${direction}.`;
  }
  return `${actor.name} moves ${direction}.`;
};

const renderFromDirection = (direction: Direction) => {
  switch (direction) {
    case Direction.NORTH:
    case Direction.SOUTH:
    case Direction.EAST:
    case Direction.WEST:
    case Direction.NORTHEAST:
    case Direction.SOUTHEAST:
    case Direction.SOUTHWEST:
    case Direction.NORTHWEST:
      return `from the ${direction}.`;
    case Direction.UP:
      return `from above.`;
    case Direction.DOWN:
      return `from below.`;
    default:
      return '';
  }
};

export const renderActorDidArriveNarrative = (
  actor: Actor,
  direction: Direction,
): Narrative => {
  return {
    self: `You arrive ${renderFromDirection(direction)}.`,
    observer: `${actor.name} arrives ${renderFromDirection(direction)}.`,
  };
};

export const renderActorDidDepartNarrative = (
  actor: Actor,
  direction: Direction,
): Narrative => {
  return {
    self: `You depart ${renderFromDirection(direction)}.`,
    observer: `${actor.name} departs ${renderFromDirection(direction)}.`,
  };
};
