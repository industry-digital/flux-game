import { Direction } from '~/types/world/space';
import { Template } from '~/types/template';
import { WorldEventMessageDictionary } from '~/types/fact';
import { ActorSummaryLike } from '~/worldkit/view/actor';

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

export const renderActorDidArrive: Template<ActorMovementProps> = ({ actor, direction, perspective }) => {
  if (perspective === 'actor') {
    return '';
  }
  return `${actor.name} arrives ${renderFromDirection(direction)}.`;
};
