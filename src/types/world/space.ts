import { DirectionURN, PlaceURN } from '~/types/taxonomy';

/**
 * An Exit is a one-way portal that connects an origin Place to a destination Place.
 * For a two-way connections, there must be two Exits, one for each direction.
 */
export interface Exit {
  name: string;
  direction: DirectionURN;
  destination: PlaceURN;
  description?: string;
}
