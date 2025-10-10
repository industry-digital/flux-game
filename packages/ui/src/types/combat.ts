// Combat domain types for @flux/ui
// These types define the interface for battlefield notation components

/**
 * Actor representation for battlefield notation
 */
export type NotationActor = {
  /** Unique identifier for the actor */
  id: string;
  /** Display name for the actor */
  name: string;
  /** Team affiliation */
  team: string;
  /** Position on the battlefield in meters (0-300) */
  position: number;
  /** Direction the actor is facing */
  facing: 'left' | 'right';
};

/**
 * Color strategy for battlefield notation rendering
 */
export type ColorStrategy = {
  /** Color function for subject team actors */
  subject: (text: string) => string;
  /** Color function for enemy team actors */
  enemy: (text: string) => string;
  /** Color function for neutral actors */
  neutral: (text: string) => string;
  /** Color function for currently acting actor background */
  currentActorBackground?: (text: string) => string;
};

/**
 * Battlefield boundary marker
 */
export type BoundaryMarker = {
  /** Position of the boundary in meters */
  position: number;
  /** Which side of the battlefield this boundary represents */
  side: 'left' | 'right';
};

/**
 * Props for the BattlefieldNotation component
 */
export type BattlefieldNotationProps = {
  /** List of actors to display on the battlefield */
  combatants: NotationActor[];
  /** Team that should be highlighted as the subject team */
  subjectTeam?: string;
  /** ID of the currently acting actor (will be highlighted) */
  currentActor?: string;
  /** Optional boundary markers to display */
  boundaries?: BoundaryMarker[];
  /** Color strategy for rendering (defaults to standard colors) */
  colorStrategy?: ColorStrategy;
  /** Whether to use HTML rendering instead of plain text */
  useHtml?: boolean;
  /** Additional CSS classes to apply */
  className?: string;
  /** Grid length in meters */
  battlefieldLength?: number;
};

/**
 * Internal representation of a position group on the battlefield
 */
export type PositionGroup = {
  /** Position coordinate in meters */
  coordinate: number;
  /** Actors facing left at this position */
  leftFacing: NotationActor[];
  /** Actors facing right at this position */
  rightFacing: NotationActor[];
};

/**
 * Actor glyph with metadata
 */
export type ActorGlyph = {
  /** The actor this glyph represents */
  actor: NotationActor;
  /** The symbol to display (e.g., "A₁") */
  symbol: string;
  /** Whether this actor is currently acting */
  isCurrentActor: boolean;
  /** Whether this actor is on the subject team */
  isSubjectTeam: boolean;
};
