import React, { useMemo, useRef } from 'react';
import type { BattlefieldNotationProps, ColorStrategy } from '~/types/combat';

/**
 * Color strategies matching the legacy Vue implementation
 */
const ColorStrategies = {
  /**
   * Gruvbox color scheme (default, matching legacy)
   */
  GRUVBOX: {
    subject: (text: string) => `<span style="color: #b8bb26">${text}</span>`,
    enemy: (text: string) => `<span style="color: #fb4934">${text}</span>`,
    neutral: (text: string) => `<span style="color: #ebdbb2">${text}</span>`,
    currentActorBackground: (text: string) => `<span style="font-weight: 900">${text}</span>`,
  } as ColorStrategy,

  /**
   * HTML-friendly colors using CSS classes
   */
  HTML: {
    subject: (text: string) => `<span class="subject-team">${text}</span>`,
    enemy: (text: string) => `<span class="enemy-team">${text}</span>`,
    neutral: (text: string) => text,
    currentActorBackground: (text: string) => `<span class="current-actor">${text}</span>`,
  } as ColorStrategy,

  /**
   * No coloring - HTML output without colors
   */
  PLAIN: {
    subject: (text: string) => text,
    enemy: (text: string) => text,
    neutral: (text: string) => text,
    currentActorBackground: (text: string) => `<span style="font-weight: 900">${text}</span>`,
  } as ColorStrategy,
} as const;

const DEFAULT_SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

// Pre-compute common subscripts for faster access
const SUBSCRIPT_CACHE = new Map<number, string>();

/**
 * Generate Unicode subscript numbers with caching for common values
 */
function generateSubscript(num: number, subscripts: string[] = DEFAULT_SUBSCRIPTS): string {
  // Cache hit for common single digits and small numbers
  if (num < 100) {
    const cached = SUBSCRIPT_CACHE.get(num);
    if (cached) return cached;
  }

  const digits = num.toString();
  let output = '';

  // Direct string building instead of array operations
  for (let i = 0; i < digits.length; i++) {
    output += subscripts[parseInt(digits[i])];
  }

  // Cache small numbers
  if (num < 100) {
    SUBSCRIPT_CACHE.set(num, output);
  }

  return output;
}

type PositionMapValue = { leftGlyphs: string[], rightGlyphs: string[] };

const LEFT = 'left';
const RIGHT = 'right';

// Production-only optimizations
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Optimized color strategies for production
const OptimizedColorStrategies = IS_PRODUCTION ? {
  ...ColorStrategies,
  // Inline simple functions for better performance
  PLAIN: {
    subject: (text: string) => text,
    enemy: (text: string) => text,
    neutral: (text: string) => text,
    currentActorBackground: (text: string) => `**${text}**`,
  }
} : ColorStrategies;

export const createBattleFieldNotationRenderer = () => {
  // Pre-allocate reusable arrays for better memory management
  const leftBoundaries = new Set<number>();
  const rightBoundaries = new Set<number>();
  const letterCounts = new Map<string, number>();
  const positionMap = new Map<number, PositionMapValue>();
  const parts: string[] = [];

  /**
   * Render the complete battlefield notation (optimized single-pass)
   */
  return function renderBattlefieldNotation(props: BattlefieldNotationProps): string {
    // Reset collections efficiently
    parts.length = 0;
    positionMap.clear();
    letterCounts.clear();
    rightBoundaries.clear();
    leftBoundaries.clear();

    const {
      combatants,
      subjectTeam,
      currentActor,
      boundaries = [],
      colorStrategy = OptimizedColorStrategies.GRUVBOX,
    } = props;

    // Fast path for empty combatants
    if (combatants.length === 0) return '';

    // Pre-compute boundary sets with cached length
    for (let i = 0, len = boundaries.length; i < len; i++) {
      const boundary = boundaries[i];
      if (boundary.side === LEFT) {
        leftBoundaries.add(boundary.position);
      } else {
        rightBoundaries.add(boundary.position);
      }
    }

    // Inline critical path for actor processing with cached length
    for (let i = 0, len = combatants.length; i < len; i++) {
      const actor = combatants[i];

      // Debug logging
      if (typeof window !== 'undefined') {
        console.log(`Processing actor ${i}:`, actor);
      }

      // Generate symbol with minimal allocations
      const firstChar = actor.name.charAt(0);
      const firstLetter = firstChar >= 'A' && firstChar <= 'Z' ? firstChar : firstChar.toUpperCase();
      const count = (letterCounts.get(firstLetter) || 0) + 1;
      letterCounts.set(firstLetter, count);
      const symbol = `${firstLetter}${generateSubscript(count)}`;

      // Debug logging
      if (typeof window !== 'undefined') {
        console.log(`Generated symbol for ${actor.name}:`, symbol);
      }

      // Determine coloring (optimize condition checks)
      let colorFn = colorStrategy.neutral;
      if (subjectTeam) {
        if (actor.team === subjectTeam) {
          colorFn = colorStrategy.subject;
        } else if (actor.team) {
          colorFn = colorStrategy.enemy;
        }
      }

      // Create glyph with minimal string operations
      const isRightFacing = actor.facing === RIGHT;
      const glyphText = isRightFacing ? `${symbol}&gt;` : `&lt;${symbol}`;
      let finalGlyph = colorFn(glyphText);

      // Apply current actor highlighting
      if (actor.id === currentActor && colorStrategy.currentActorBackground) {
        finalGlyph = colorStrategy.currentActorBackground(finalGlyph);
      }

      // Group by position
      const pos = actor.position;
      let group = positionMap.get(pos);
      if (!group) {
        group = { leftGlyphs: [], rightGlyphs: [] };
        positionMap.set(pos, group);
      }

      if (isRightFacing) {
        group.rightGlyphs.push(finalGlyph);
      } else {
        group.leftGlyphs.push(finalGlyph);
      }

      // Debug logging
      if (typeof window !== 'undefined') {
        console.log(`Added ${actor.name} to position ${pos}:`, {
          finalGlyph,
          isRightFacing,
          group: { ...group }
        });
      }
    }

    // Sort positions once instead of scanning 300 positions
    const sortedPositions = Array.from(positionMap.keys()).sort((a, b) => a - b);
    let prevPosition = -1;

    // Debug logging
    if (typeof window !== 'undefined') {
      console.log('Final position map:', Object.fromEntries(positionMap));
      console.log('Sorted positions:', sortedPositions);
    }

    for (let i = 0, len = sortedPositions.length; i < len; i++) {
      const position = sortedPositions[i];
      const group = positionMap.get(position)!;

      // Add left boundary marker (optimized for rare boundaries)
      if (leftBoundaries.size > 0 && leftBoundaries.has(position)) {
        parts.push('▌');
      }

      // Build group content efficiently
      let groupContent = '';
      const hasLeftGlyphs = group.leftGlyphs.length > 0;
      const hasRightGlyphs = group.rightGlyphs.length > 0;


      if (hasLeftGlyphs) {
        groupContent += group.leftGlyphs.join('');
      }

      if (hasLeftGlyphs && hasRightGlyphs) {
        groupContent += ' ';
      }

      if (hasRightGlyphs) {
        groupContent += group.rightGlyphs.join('');
      }


      // Add distance from previous group (matching Vue format)
      if (prevPosition >= 0) {
        const distance = position - prevPosition;
        parts.push(`─<span class="distance-number">${distance}</span>─`);
      }

      parts.push(`[ ${groupContent} ]`);
      prevPosition = position;

      // Add right boundary marker
      if (rightBoundaries.has(position)) {
        parts.push('▌');
      }
    }

    return parts.join('');
  }
}

const renderBattlefieldNotation = createBattleFieldNotationRenderer();

/**
 * BattlefieldNotation React component
 *
 * Renders a visual ASCII representation of battlefield state showing:
 * - Actor positions with first-letter symbols and subscripts
 * - Facing indicators using chevrons
 * - Distance gaps between positions
 * - Team-based coloring
 * - Current actor highlighting
 */
export const BattlefieldNotation: React.FC<BattlefieldNotationProps> = React.memo((props) => {
  const rendererRef = useRef(createBattleFieldNotationRenderer());

  const { className, colorStrategy } = useMemo(() => ({
    className: props.className ?? '',
    colorStrategy: props.colorStrategy || OptimizedColorStrategies.GRUVBOX, // Default to Gruvbox like Vue
  }), [props.className, props.colorStrategy]);

  const notation = useMemo(() => {
    return rendererRef.current({ ...props, colorStrategy });
  }, [
    props.combatants,
    props.subjectTeam,
    props.currentActor,
    props.boundaries,
    props.battlefieldLength,
    colorStrategy
  ]);

  // Always render as HTML since we're using HTML-based notation
  return (
    <div
      className={`battlefield-notation ${className}`}
      dangerouslySetInnerHTML={{ __html: notation }}
    />
  );
});

/**
 * Export utility functions for testing and advanced usage
 */
export {
  ColorStrategies,
  renderBattlefieldNotation
};
