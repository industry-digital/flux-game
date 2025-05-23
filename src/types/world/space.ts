import { Taxonomy } from '@flux/taxonomy';

export interface Exit {
  name: string;                      // "north", "through the archway", etc.
  direction: Taxonomy.Directions;    // Which direction the exit faces
  destination: Taxonomy.Places;      // The Place this exit leads to
  description?: string;              // Narrative flavor
}
