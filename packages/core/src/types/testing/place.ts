import { Exit, Place } from '~/types/entity/place';
import { Taxonomy } from '~/types/taxonomy';

/**
 * Interface for edge definitions that connect places
 */
export type PlaceGraphEdge = Exit & {
  direction: Taxonomy.Directions;
}

/**
 * Interface for defining a place and its connections
 */
export type PlaceGraphNode = {
  id: string;
  name: string;
  description: string;
  edges: PlaceGraphEdge[];
}

/**
 * Result type for a place graph, containing created places and their URNs
 */
export interface PlaceGraph {
  places: Record<string, Place>;
  urns: Record<string, Taxonomy.Places>;
}
