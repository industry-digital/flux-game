import { ActorURN } from '~/types/taxonomy';
import { Battlefield, Combatant, CombatFacing, FullyQualifiedCombatant } from '~/types/combat';
import { Actor } from '~/types/entity/actor';

/**
 * ANSI color utility for terminal output
 */
export const AnsiColors = {
  // Color codes
  RED: '\x1b[91m',
  GREEN: '\x1b[38;5;46m', // Bright vibrant green (256-color)
  CYAN: '\x1b[36m',
  RESET: '\x1b[0m',

  // Higher-order colorization functions
  red: (text: string) => `${AnsiColors.RED}${text}${AnsiColors.RESET}`,
  green: (text: string) => `${AnsiColors.GREEN}${text}${AnsiColors.RESET}`,
  cyan: (text: string) => `${AnsiColors.CYAN}${text}${AnsiColors.RESET}`,
} as const;

/**
 * Battlefield-specific colorization strategy
 */
export type ColorStrategy = {
  subject: (text: string) => string;
  enemy: (text: string) => string;
  neutral: (text: string) => string;
};

/**
 * Options for rendering battlefield notation
 */
export type RenderBattlefieldNotationOptions = {
  currentlyActingId?: ActorURN;
  observerId?: ActorURN;
  colorStrategy?: ColorStrategy;
  leftBoundary?: boolean;
  rightBoundary?: boolean;
};

/**
 * Well-known coloring strategies for different contexts
 */
export const ColorStrategies: Record<string, ColorStrategy> = {
  /**
   * Standard battlefield colors: cyan subject, magenta enemies (colorblind-friendly)
   */
  DEFAULT: {
    subject: AnsiColors.cyan,
    enemy: (text: string) => `\x1b[95m${text}\x1b[0m`, // Bright magenta
    neutral: (text: string) => text,
  },

  /**
   * Legacy debug colors: same as DEFAULT (kept for backward compatibility)
   */
  DEBUG: {
    subject: AnsiColors.cyan,
    enemy: AnsiColors.red,
    neutral: (text: string) => text,
  },

  /**
   * No coloring - plain text output for logs, files, etc.
   */
  PLAIN: {
    subject: (text: string) => text,
    enemy: (text: string) => text,
    neutral: (text: string) => text,
  },

  /**
   * High contrast colors for accessibility
   */
  HIGH_CONTRAST: {
    subject: (text: string) => `\x1b[1;92m${text}\x1b[0m`, // Bold green
    enemy: (text: string) => `\x1b[1;91m${text}\x1b[0m`,   // Bold red
    neutral: (text: string) => `\x1b[1;37m${text}\x1b[0m`, // Bold white
  },

  /**
   * Gruvbox color scheme - warm, retro aesthetic
   */
  GRUVBOX: {
    subject: (text: string) => `\x1b[38;5;142m${text}\x1b[0m`, // Gruvbox green (#b8bb26)
    enemy: (text: string) => `\x1b[38;5;167m${text}\x1b[0m`,   // Gruvbox red (#fb4934)
    neutral: (text: string) => `\x1b[38;5;223m${text}\x1b[0m`, // Gruvbox fg (#ebdbb2)
  },

} as const;

const SUBSCRIPT_MAP: Record<string, string> = {
  '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
  '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
};

const SUBSCRIPT_CHARS = ['₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

// Fast uppercase lookup for common characters (avoids String.prototype.toUpperCase)
const UPPERCASE_MAP: Record<string, string> = {
  'a': 'A', 'b': 'B', 'c': 'C', 'd': 'D', 'e': 'E', 'f': 'F', 'g': 'G', 'h': 'H', 'i': 'I', 'j': 'J',
  'k': 'K', 'l': 'L', 'm': 'M', 'n': 'N', 'o': 'O', 'p': 'P', 'q': 'Q', 'r': 'R', 's': 'S', 't': 'T',
  'u': 'U', 'v': 'V', 'w': 'W', 'x': 'X', 'y': 'Y', 'z': 'Z'
};

/**
 * Generate unique actor symbols with uniform numeric subscripts
 * Single-pass algorithm with pre-allocated arrays
 * @param combatants - Map of all combatants to check for symbol collisions
 * @param actors - Actor data for name resolution
 * @returns Map of actorId to unique symbol (e.g., "A₁", "A₂", "B₁")
 */
export function generateUniqueActorSymbols(
  combatants: Map<ActorURN, FullyQualifiedCombatant>,
  actors: Record<ActorURN, Actor>
): Map<ActorURN, string> {
  const symbolMap = new Map<ActorURN, string>(); // JavaScript Maps don't support capacity pre-allocation
  const letterAssignments = new Map<string, number>();

  // Single pass: validate, count, and assign symbols
  for (const [actorId] of combatants) {
    const actor = actors[actorId];

    // Fail-fast validation (moved from hot loop)
    if (!actor) {
      throw new Error(`Missing actor data for: ${actorId}`);
    }

    // Handle empty names with fallback to 'X' (assume names are pre-trimmed)
    const firstChar = actor.name?.[0];
    const baseLetter = firstChar ? (UPPERCASE_MAP[firstChar] || firstChar.toUpperCase()) : 'X';

    // Increment and assign in single operation
    const subscriptNumber = (letterAssignments.get(baseLetter) || 0) + 1;
    letterAssignments.set(baseLetter, subscriptNumber);

    // Build subscript string efficiently - handle common cases directly
    let subscriptChars: string;
    if (subscriptNumber <= 9) {
      // Single digit - direct array lookup (most common case)
      subscriptChars = SUBSCRIPT_CHARS[subscriptNumber - 1];
    } else {
      // Multi-digit - fallback to string building
      subscriptChars = subscriptNumber.toString()
        .split('')
        .map(digit => SUBSCRIPT_MAP[digit] || digit)
        .join('');
    }

    symbolMap.set(actorId, baseLetter + subscriptChars);
  }

  return symbolMap;
}

/**
 * Determine color function for an actor based on team relationship to subject
 */
function getActorColorFunction(
  combatant: Combatant,
  currentlyActingId: ActorURN | undefined,
  observerTeam: string | undefined,
  colorStrategy: ColorStrategy
): (text: string) => string {
  if (!observerTeam) {
    return colorStrategy.neutral;
  }

  if (combatant.team !== observerTeam) {
    return colorStrategy.enemy;
  }

  // Same team as observer - use subject color (inversion handled separately based on currentlyActingId)
  return colorStrategy.subject;
}

/**
 * Create position-to-combatants mapping with pre-allocated arrays
 * Also pre-computes color functions and symbols for single-pass processing
 */
export function createOptimizedPositionMap(
  combatants: Map<ActorURN, FullyQualifiedCombatant>,
  actorSymbols: Map<ActorURN, string>,
  currentlyActingId: ActorURN | undefined,
  observerTeam: string | undefined,
  colorStrategy: ColorStrategy
): Map<number, Array<{
  actorId: ActorURN;
  combatant: FullyQualifiedCombatant;
  symbol: string;
  colorFn: (text: string) => string;
  isActing: boolean;
  facingLeft: boolean;
}>> {
  // OPTIMIZATION: Pre-sort positions and build map in sorted order
  // This way consumers can iterate over the Map directly without sorting

  // First pass: collect all positions and pre-compute combatant data
  const combatantDataByPosition = new Map<number, Array<any>>();

  for (const [actorId, combatant] of combatants) {
    const position = combatant.position.coordinate;

    // Pre-compute all expensive operations once
    const symbol = actorSymbols.get(actorId)!; // Already validated
    const colorFn = getActorColorFunction(combatant, currentlyActingId, observerTeam, colorStrategy);
    const isActing = actorId === currentlyActingId;
    const facingLeft = combatant.position.facing === CombatFacing.LEFT; // Direct enum comparison

    const combatantData = {
      actorId,
      combatant,
      symbol,
      colorFn,
      isActing,
      facingLeft
    };

    if (!combatantDataByPosition.has(position)) {
      combatantDataByPosition.set(position, []);
    }
    combatantDataByPosition.get(position)!.push(combatantData);
  }

  // Second pass: create final map with positions in sorted order
  // JavaScript Maps maintain insertion order, so this will be sorted
  const positionMap = new Map<number, Array<any>>();
  const sortedPositions = Array.from(combatantDataByPosition.keys()).sort((a, b) => a - b);

  for (const position of sortedPositions) {
    positionMap.set(position, combatantDataByPosition.get(position)!);
  }

  return positionMap;
}

/**
 * Render battlefield notation as ASCII representation with colored ANSI escape codes
 * Uses first letter of actor names with numeric subscripts for collisions
 *
 * @param battlefield - The battlefield configuration
 * @param combatants - Map of all combatants with initiative order
 * @param actors - Actor data for name resolution and symbol generation
 * @param options - Optional configuration
 * @param options.currentlyActingId - Actor who gets background inversion highlight
 * @param options.observerId - Actor whose team perspective determines friend/enemy coloring (defaults to currentlyActingId)
 * @param options.colorStrategy - Color scheme to apply
 * @returns Formatted battlefield string with actor symbols, positions, distances, and facing indicators
 *
 * @complexity O(N log P) where N is combatants, P is unique positions (typically P << N, often P ≈ N)
 */
export function renderBattlefieldNotation(
  battlefield: Battlefield,
  combatants: Map<ActorURN, FullyQualifiedCombatant>,
  actors: Record<ActorURN, Actor>,
  options?: RenderBattlefieldNotationOptions,
): string {
  // Handle empty battlefield
  if (combatants.size === 0) {
    return '';
  }

  // Use default color strategy if none provided
  const colorStrategy = options?.colorStrategy || ColorStrategies.DEFAULT;
  const currentlyActingId = options?.currentlyActingId;
  const observerId = options?.observerId;
  const leftBoundary = options?.leftBoundary || false;
  const rightBoundary = options?.rightBoundary || false;

  // Get observer team for color determination (from observer's perspective)
  // Fall back to currently acting combatant if no observer specified (backward compatibility)
  const observerActorId = observerId || currentlyActingId;
  const observerCombatant = observerActorId ? combatants.get(observerActorId) : undefined;
  const observerTeam = observerCombatant?.team;

  // Generate unique symbols for all actors (handles name collisions with subscripts)
  const actorSymbols = generateUniqueActorSymbols(combatants, actors);

  // Create optimized position mapping with all pre-computed data
  const positionMap = createOptimizedPositionMap(combatants, actorSymbols, currentlyActingId, observerTeam, colorStrategy);

  // Calculate boundary distances if needed (O(1) using sorted position map)
  let leftBoundaryDistance = 0;
  let rightBoundaryDistance = 0;

  if (leftBoundary || rightBoundary) {
    const positions = Array.from(positionMap.keys());
    const leftmostPosition = positions[0]; // First position (already sorted)
    const rightmostPosition = positions[positions.length - 1]; // Last position

    leftBoundaryDistance = leftmostPosition - 1; // Distance from battlefield start (position 1)
    rightBoundaryDistance = battlefield.length - rightmostPosition; // Distance to battlefield end
  }

  // Use direct string concatenation instead of array allocation
  let result = '';

  // Add left boundary if enabled
  if (leftBoundary) {
    if (leftBoundaryDistance > 0) {
      result += `▐─${leftBoundaryDistance}m─`;
    } else {
      result += '▐';
    }
  }

  // OPTIMIZATION: Map is already sorted by position, iterate directly
  let lastPosition: number | null = null;

  for (const [position, combatantsAtPosition] of positionMap) {

    // Add distance gap from last position if needed
    if (lastPosition !== null) {
      const distance = position - lastPosition;
      result += `─${distance}m─`;
    }

    // Build left/right facing strings directly
    let leftFacingActors = '';
    let rightFacingActors = '';

    // Partition by facing and build representations
    // No sorting needed - direct partitioning is O(N) vs O(N log N)
    for (const combatantData of combatantsAtPosition) {
      const { symbol, colorFn, isActing, facingLeft } = combatantData;
      const coloredSymbol = colorFn(symbol);

      // Build actor representation efficiently
      let actorWithFacing: string;
      if (facingLeft) {
        // Left-facing: <A₁
        actorWithFacing = isActing
          ? `\x1b[7m<${coloredSymbol}\x1b[0m`
          : `<${coloredSymbol}`;
        leftFacingActors += actorWithFacing;
      } else {
        // Right-facing: A₁>
        actorWithFacing = isActing
          ? `\x1b[7m${coloredSymbol}>\x1b[0m`
          : `${coloredSymbol}>`;
        rightFacingActors += actorWithFacing;
      }
    }

    // Efficiently join with boundary space using strings
    let actorContent: string;
    if (leftFacingActors.length > 0 && rightFacingActors.length > 0) {
      // Both groups exist - join with boundary space
      actorContent = leftFacingActors + ' ' + rightFacingActors;
    } else {
      // Only one group - simple concatenation
      actorContent = leftFacingActors + rightFacingActors;
    }

    // Group all actors at this position within same brackets with 1-character padding
    result += `[ ${actorContent} ]`;
    lastPosition = position;
  }

  // Add right boundary if enabled
  if (rightBoundary) {
    if (rightBoundaryDistance > 0) {
      result += `─${rightBoundaryDistance}m─▌`;
    } else {
      result += '▌';
    }
  }

  return result;
}
