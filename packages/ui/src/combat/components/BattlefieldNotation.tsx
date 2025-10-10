import React from 'react';
import type { BattlefieldNotationProps, ColorStrategy } from '~/types/combat';

/**
 * Default color strategies for battlefield notation
 */
const ColorStrategies = {
  /**
   * Standard battlefield colors: green subject, red enemies
   */
  DEFAULT: {
    subject: (text: string) => `\x1b[38;5;46m${text}\x1b[0m`,
    enemy: (text: string) => `\x1b[91m${text}\x1b[0m`,
    neutral: (text: string) => text,
    currentActorBackground: (text: string) => `\x1b[7m${text}\x1b[0m`,
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
   * No coloring - plain text output
   */
  PLAIN: {
    subject: (text: string) => text,
    enemy: (text: string) => text,
    neutral: (text: string) => text,
    currentActorBackground: (text: string) => `**${text}**`,
  } as ColorStrategy,
} as const;


const DEFAULT_SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

/**
 * Generate Unicode subscript numbers for actor symbols
 */
function generateSubscript(num: number, subscripts: string[] = DEFAULT_SUBSCRIPTS): string {
  const digits = num.toString().split('');
  const output = Array(digits.length);

  for (let i = 0; i < digits.length; i++) {
    output[i] = subscripts[parseInt(digits[i])];
  }

  return output.join('');
}

export const createBattleFieldNotationRenderer = () => {
  const leftBoundaries = new Set();
  const rightBoundaries = new Set();
  const letterCounts = new Map<string, number>();
  const positionMap = new Map<number, { leftGlyphs: string[], rightGlyphs: string[] }>();
  const parts: string[] = [];

  /**
   * Render the complete battlefield notation (optimized single-pass)
   */
  return function renderBattlefieldNotation(
    props: BattlefieldNotationProps,
  ): string {
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
      colorStrategy = ColorStrategies.PLAIN,
      battlefieldLength = 300,
    } = props;

    if (combatants.length === 0) {
      return '';
    }

    // Create boundary lookup maps for O(1) access
    for (const boundary of boundaries) {
      if (boundary.side === 'left') {
        leftBoundaries.add(boundary.position);
      } else {
        rightBoundaries.add(boundary.position);
      }
    }

    for (const actor of combatants) {
      // Generate symbol (inline glyph generation)
      const firstLetter = actor.name.charAt(0).toUpperCase();
      const count = letterCounts.get(firstLetter) || 0;
      letterCounts.set(firstLetter, count + 1);
      const symbol = `${firstLetter}${generateSubscript(count + 1)}`;

      // Determine colors and highlighting
      const isCurrentActor = actor.id === currentActor;
      const isSubjectTeam = subjectTeam ? actor.team === subjectTeam : false;

      let colorFn = colorStrategy.neutral;
      if (isSubjectTeam) {
        colorFn = colorStrategy.subject;
      } else if (actor.team) {
        colorFn = colorStrategy.enemy;
      }

      // Create the glyph with facing indicator
      const facingChar = actor.facing === 'right' ? '>' : '<';
      const glyphText = actor.facing === 'right'
        ? `${symbol}${facingChar}`
        : `${facingChar}${symbol}`;

      const coloredGlyph = colorFn(glyphText);
      const finalGlyph = isCurrentActor && colorStrategy.currentActorBackground
        ? colorStrategy.currentActorBackground(coloredGlyph)
        : coloredGlyph;

      // Group by position (inline grouping)
      const pos = actor.position;
      if (!positionMap.has(pos)) {
        positionMap.set(pos, { leftGlyphs: [], rightGlyphs: [] });
      }

      const group = positionMap.get(pos)!;
      if (actor.facing === 'left') {
        group.leftGlyphs.push(finalGlyph);
      } else {
        group.rightGlyphs.push(finalGlyph);
      }
    }

    // Linear scan through battlefield positions (O(300) = O(1) constant time)
    // Early exit optimization: break when all positions processed
    let prevPosition = -1;
    let processedPositions = 0;
    const totalPositions = positionMap.size;

    for (let position = 0; position <= battlefieldLength; position++) {
      if (!positionMap.has(position)) continue;

      processedPositions++;

      const group = positionMap.get(position)!

      // Add left boundary marker
      if (leftBoundaries.has(position)) {
        parts.push('▌');
      }

      // Render position group inline
      const groupParts: string[] = [];

      if (group.leftGlyphs.length > 0) {
        groupParts.push(group.leftGlyphs.join(''));
      }

      if (group.leftGlyphs.length > 0 && group.rightGlyphs.length > 0) {
        groupParts.push(' '); // Boundary space
      }

      if (group.rightGlyphs.length > 0) {
        groupParts.push(group.rightGlyphs.join(''));
      }

      // Add distance from previous group
      if (prevPosition >= 0) {
        const distance = position - prevPosition;
        parts.push(`─${distance}m─`);
      }

      parts.push(`[ ${groupParts.join('')} ]`);
      prevPosition = position;

      // Add right boundary marker
      if (rightBoundaries.has(position)) {
        parts.push('▌');
      }

      // Early exit: all positions processed
      if (processedPositions === totalPositions) {
        break;
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
export function BattlefieldNotation(props: BattlefieldNotationProps): React.JSX.Element {
  const { useHtml = false, className = '' } = props;

  // Choose appropriate color strategy
  const colorStrategy = props.colorStrategy || (useHtml ? ColorStrategies.HTML : ColorStrategies.PLAIN);

  // Generate the notation string
  const notation = renderBattlefieldNotation({
    ...props,
    colorStrategy,
  });

  // Render based on format preference
  if (useHtml) {
    return (
      <div
        className={`battlefield-notation ${className}`}
        dangerouslySetInnerHTML={{ __html: notation }}
      />
    );
  }

  return (
    <pre className={`battlefield-notation ${className}`}>
      {notation}
    </pre>
  );
}

/**
 * Export color strategies for external use
 */
export { ColorStrategies };

/**
 * Export utility functions for testing and advanced usage
 */
export {
  renderBattlefieldNotation
};
