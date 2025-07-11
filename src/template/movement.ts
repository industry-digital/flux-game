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
  const subject = perspective === 'actor' ? actor.name : 'You';
  const verb = perspective === 'actor' ? 'moves' : 'move';
  return `${subject} ${verb} ${direction}.`;
};

export const renderActorDidArrive: Template<ActorMovementProps> = ({ actor, direction, perspective }) => {
  const subject = perspective === 'actor' ? actor.name : 'You';
  const verb = perspective === 'actor' ? 'arrives' : 'arrive';

  switch (direction) {
    case Direction.NORTH:
    case Direction.SOUTH:
    case Direction.EAST:
    case Direction.WEST:
    case Direction.NORTHEAST:
    case Direction.SOUTHEAST:
    case Direction.SOUTHWEST:
    case Direction.NORTHWEST:
      return `${subject} ${verb} from the ${direction}.`;
    case Direction.UP:
      return `${subject} ${verb} from above.`;
    case Direction.DOWN:
      return `${subject} ${verb} from below.`;
    default:
      return `${subject} ${verb}.`;
  }
};
