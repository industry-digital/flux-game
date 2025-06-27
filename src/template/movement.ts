import { Direction, Template } from '@flux';
import { ActorSummaryLike } from '~/worldkit/view/actor';

export type ActorMovementProps = {
  actor: ActorSummaryLike;
  direction: Direction;
};

export const renderActorDidDepart: Template<ActorMovementProps> = ({ actor, direction }) => {
  return `${actor.name} moves ${direction}.`;
};

export const renderActorDidArrive: Template<ActorMovementProps> = ({ actor, direction }) => {
  switch (direction) {
    case Direction.NORTH:
    case Direction.SOUTH:
    case Direction.EAST:
    case Direction.WEST:
    case Direction.NORTHEAST:
    case Direction.SOUTHEAST:
    case Direction.SOUTHWEST:
    case Direction.NORTHWEST:
      return `${actor.name} arrives from the ${direction}.`;
    case Direction.UP:
      return `${actor.name} arrives from above.`;
    case Direction.DOWN:
      return `${actor.name} arrives from below.`;
    default:
      return `${actor.name} arrives.`;
  }
};
