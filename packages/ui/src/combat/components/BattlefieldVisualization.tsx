import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import type { ActorURN } from '@flux/core';
import type { Battlefield, Combatant, CombatFacing } from '@flux/core';

/**
 * Props for the BattlefieldVisualization component
 */
export interface BattlefieldVisualizationProps {
  /**
   * The battlefield configuration
   */
  battlefield: Battlefield;
  /**
   * Map of combatants by ActorURN
   */
  combatants: Map<ActorURN, Combatant>;
  /**
   * Actor data for names and details
   */
  actors: Record<ActorURN, { name: string }>;
  /**
   * Currently active combatant ID
   */
  currentActor?: ActorURN;
  /**
   * Player's team for color perspective
   */
  subjectTeam: string;
  /**
   * Additional CSS classes
   */
  className?: string;
}

/**
 * Cached rendering data for performance optimization
 */
interface RenderCache {
  /**
   * Canvas dimensions
   */
  width: number;
  height: number;
  /**
   * Device pixel ratio
   */
  dpr: number;
  /**
   * Coordinate to pixel mapping scale
   */
  scale: number;
  /**
   * Battlefield offset for centering
   */
  offsetX: number;
  /**
   * Last combatant positions hash for change detection
   */
  positionsHash: string;
  /**
   * Animation frame ID
   */
  animationId?: number;
}

/**
 * Combatant rendering data
 */
interface CombatantRenderData {
  id: ActorURN;
  name: string;
  team: string;
  coordinate: number;
  facing: CombatFacing;
  isCurrentActor: boolean;
  isSubjectTeam: boolean;
  symbol: string;
  targetX: number;
  currentX: number;
  stackOffset: number;
}

// Performance constants
const CANVAS_HEIGHT = 120;
const MARKER_INTERVAL = 50;
const ANIMATION_DURATION = 300; // ms
const STACK_OFFSET = 16; // pixels for vertical stacking
const MIN_CANVAS_WIDTH = 400;

/**
 * Resolve CSS custom property to actual color value
 */
function resolveCSSColor(cssVar: string): string {
  const computedStyle = getComputedStyle(document.documentElement);
  return computedStyle.getPropertyValue(cssVar.replace('var(', '').replace(')', '')).trim();
}

// Color and font constants - resolved at runtime
const getColors = () => ({
  BATTLEFIELD: resolveCSSColor('var(--color-border)'),
  SUBJECT_TEAM: resolveCSSColor('var(--color-success)'),
  ENEMY_TEAM: resolveCSSColor('var(--color-error)'),
  CURRENT_ACTOR: resolveCSSColor('var(--color-warning)'),
  CURRENT_ACTOR_TEXT: resolveCSSColor('var(--color-text-on-primary)'),
  TEXT_SECONDARY: resolveCSSColor('var(--color-text-secondary)'),
  TEXT_PRIMARY: resolveCSSColor('var(--color-text-primary)'),
});

const getFontFamily = () => {
  const computedStyle = getComputedStyle(document.documentElement);
  return computedStyle.getPropertyValue('--font-family-mono').trim() || 'monospace';
};

// Subscript cache for performance
const SUBSCRIPT_CACHE = new Map<number, string>();
const SUBSCRIPTS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

/**
 * Generate Unicode subscript with caching
 */
function getSubscript(num: number): string {
  if (SUBSCRIPT_CACHE.has(num)) {
    return SUBSCRIPT_CACHE.get(num)!;
  }

  const result = num.toString().split('').map(digit => SUBSCRIPTS[parseInt(digit)]).join('');
  SUBSCRIPT_CACHE.set(num, result);
  return result;
}

/**
 * Hash combatant positions for change detection
 */
function hashPositions(combatants: Map<ActorURN, Combatant>): string {
  let hash = '';
  for (const [id, combatant] of combatants) {
    hash += `${id}:${combatant.position.coordinate}:${combatant.position.facing};`;
  }
  return hash;
}

export type BattlefieldVisualizationDependencies = {
  requestAnimationFrame: typeof requestAnimationFrame;
  cancelAnimationFrame: typeof cancelAnimationFrame;
};

export const DEFAULT_BATTLEFIELD_VISUALIZATION_DEPS: Readonly<BattlefieldVisualizationDependencies> = Object.freeze({
  requestAnimationFrame,
  cancelAnimationFrame,
});

export const createBattlefieldVisualizationComponent = (deps: BattlefieldVisualizationDependencies = DEFAULT_BATTLEFIELD_VISUALIZATION_DEPS): React.FC<BattlefieldVisualizationProps> => {

  /**
   * Canvas-based battlefield visualization component
   */
  return ({
    battlefield,
    combatants,
    actors,
    currentActor,
    subjectTeam,
    className = '',
  }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const cacheRef = useRef<RenderCache>({
      width: 0,
      height: 0,
      dpr: 1,
      scale: 1,
      offsetX: 0,
      positionsHash: '',
    });
    const renderDataRef = useRef<CombatantRenderData[]>([]);
    const animationStartRef = useRef<number>(0);

    // Memoized battlefield length
    const battlefieldLength = useMemo(() => battlefield?.length || 300, [battlefield?.length]);

    /**
     * Setup canvas with proper DPI scaling
     */
    const setupCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return false;

      const rect = container.getBoundingClientRect();
      const width = Math.max(rect.width, MIN_CANVAS_WIDTH);
      const height = CANVAS_HEIGHT;
      const dpr = window.devicePixelRatio || 1;

      // Only update if dimensions changed
      const cache = cacheRef.current;
      if (cache.width === width && cache.height === height && cache.dpr === dpr) {
        return true;
      }

      // Update canvas dimensions
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const ctx = canvas.getContext('2d')!;
      ctx.scale(dpr, dpr);

      // Update cache
      cache.width = width;
      cache.height = height;
      cache.dpr = dpr;
      cache.scale = (width - 80) / battlefieldLength; // 40px margin each side
      cache.offsetX = 40;

      return true;
    }, [battlefieldLength]);

    /**
     * Generate render data for combatants with zero-copy iteration
     */
    const generateRenderData = useCallback((): CombatantRenderData[] => {
      const renderData: CombatantRenderData[] = [];
      const letterCounts = new Map<string, number>();
      const positionGroups = new Map<number, CombatantRenderData[]>();

      // Single pass through combatants map
      for (const [actorId, combatant] of combatants) {
        const actor = actors[actorId];
        if (!actor) continue;

        // Generate symbol
        const firstChar = actor.name.charAt(0).toUpperCase();
        const count = (letterCounts.get(firstChar) || 0) + 1;
        letterCounts.set(firstChar, count);
        const symbol = `${firstChar}${getSubscript(count)}`;

        // Calculate target position
        const cache = cacheRef.current;
        const targetX = cache.offsetX + (combatant.position.coordinate * cache.scale);

        const renderItem: CombatantRenderData = {
          id: actorId,
          name: actor.name,
          team: combatant.team.toString(),
          coordinate: combatant.position.coordinate,
          facing: combatant.position.facing,
          isCurrentActor: actorId === currentActor,
          isSubjectTeam: combatant.team.toString() === subjectTeam,
          symbol,
          targetX,
          currentX: targetX, // Will be updated for animations
          stackOffset: 0,
        };

        renderData.push(renderItem);

        // Group by position for stacking
        const existing = positionGroups.get(combatant.position.coordinate);
        if (existing) {
          existing.push(renderItem);
        } else {
          positionGroups.set(combatant.position.coordinate, [renderItem]);
        }
      }

      // Apply stack offsets for same-position combatants
      for (const group of positionGroups.values()) {
        if (group.length > 1) {
          const centerOffset = ((group.length - 1) * STACK_OFFSET) / 2;
          for (let i = 0; i < group.length; i++) {
            group[i].stackOffset = (i * STACK_OFFSET) - centerOffset;
          }
        }
      }

      return renderData;
    }, [combatants, actors, currentActor, subjectTeam]);

    /**
     * Render the battlefield and combatants
     */
    const render = useCallback((timestamp: number = 0) => {
      const canvas = canvasRef.current;
      if (!canvas || !setupCanvas()) return;

      const ctx = canvas.getContext('2d')!;
      const cache = cacheRef.current;
      const colors = getColors();
      const fontFamily = getFontFamily();

      // Clear canvas
      ctx.clearRect(0, 0, cache.width, cache.height);

      // Draw battlefield line
      ctx.strokeStyle = colors.BATTLEFIELD;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cache.offsetX, cache.height / 2);
      ctx.lineTo(cache.offsetX + (battlefieldLength * cache.scale), cache.height / 2);
      ctx.stroke();

      // Draw distance markers every 50m
      ctx.fillStyle = colors.TEXT_SECONDARY;
      ctx.font = `12px ${fontFamily}`;
      ctx.textAlign = 'center';

      for (let pos = 0; pos <= battlefieldLength; pos += MARKER_INTERVAL) {
        const x = cache.offsetX + (pos * cache.scale);

        // Marker line
        ctx.beginPath();
        ctx.moveTo(x, cache.height / 2 - 5);
        ctx.lineTo(x, cache.height / 2 + 5);
        ctx.stroke();

        // Marker text
        ctx.fillText(`${pos}m`, x, cache.height / 2 + 20);
      }

      // Update animation progress
      const animationProgress = cache.animationId ?
        Math.min((timestamp - animationStartRef.current) / ANIMATION_DURATION, 1) : 1;

      // Draw combatants
      ctx.textAlign = 'center';

      for (const combatant of renderDataRef.current) {
        // Animate position if needed
        if (animationProgress < 1) {
          const startX = combatant.currentX;
          combatant.currentX = startX + (combatant.targetX - startX) * animationProgress;
        } else {
          combatant.currentX = combatant.targetX;
        }

        const x = combatant.currentX;
        const y = (cache.height / 2) + combatant.stackOffset;

        // Set base text color based on team
        const baseColor = combatant.isSubjectTeam ?
          colors.SUBJECT_TEAM :
          colors.ENEMY_TEAM;

        // Draw facing indicator and symbol
        const facingChar = combatant.facing === 1 ? '>' : '<';
        const displayText = combatant.facing === 1 ?
          `${combatant.symbol}${facingChar}` :
          `${facingChar}${combatant.symbol}`;

        // Current actor highlighting with pulsing
        if (combatant.isCurrentActor) {
          // Calculate pulsing scale (subtle breathing effect)
          const pulsePhase = (timestamp / 1000) % 2; // 2 second cycle
          const pulseScale = 1 + 0.1 * Math.sin(pulsePhase * Math.PI); // 10% scale variation

          // Save context for transformations
          ctx.save();

          // Apply pulsing scale
          ctx.translate(x, y);
          ctx.scale(pulseScale, pulseScale);

          // Draw current actor text (larger and highlighted color)
          ctx.fillStyle = colors.CURRENT_ACTOR;
          ctx.font = `bold 22px ${fontFamily}`;
          ctx.fillText(displayText, 0, 0);

          // Restore context
          ctx.restore();
        } else {
          // Normal combatant rendering
          ctx.fillStyle = baseColor;
          ctx.font = `bold 18px ${fontFamily}`;
          ctx.fillText(displayText, x, y);
        }
      }

      // Continue animation if needed (position animation or current actor pulsing)
      const hasCurrentActor = renderDataRef.current.some(c => c.isCurrentActor);
      const needsAnimation = (animationProgress < 1 && cache.animationId) || hasCurrentActor;

      if (needsAnimation) {
        deps.requestAnimationFrame(render);
      } else if (cache.animationId) {
        cache.animationId = undefined;
      }
    }, [setupCanvas, battlefieldLength]);

    /**
     * Start animation when positions change
     */
    const startAnimation = useCallback(() => {
      const cache = cacheRef.current;
      if (cache.animationId) {
        deps.cancelAnimationFrame(cache.animationId);
      }

      animationStartRef.current = performance.now();
      cache.animationId = deps.requestAnimationFrame(render);
    }, [render]);

    /**
     * Update render data and trigger re-render
     */
    const updateVisualization = useCallback(() => {
      const newPositionsHash = hashPositions(combatants);
      const cache = cacheRef.current;

      const newRenderData = generateRenderData();
      const hasPositionChanges = cache.positionsHash !== newPositionsHash;

      // Update current positions for existing combatants before animation
      if (hasPositionChanges && renderDataRef.current.length > 0) {
        const oldDataMap = new Map(renderDataRef.current.map(item => [item.id, item]));
        for (const newItem of newRenderData) {
          const oldItem = oldDataMap.get(newItem.id);
          if (oldItem) {
            newItem.currentX = oldItem.currentX;
          }
        }
      }

      renderDataRef.current = newRenderData;
      cache.positionsHash = newPositionsHash;

      const hasCurrentActor = newRenderData.some(c => c.isCurrentActor);

      if (hasPositionChanges && renderDataRef.current.length > 0) {
        startAnimation();
      } else if (hasCurrentActor && !cache.animationId) {
        // Start continuous animation for current actor pulsing
        requestAnimationFrame(render);
      } else {
        render();
      }
    }, [combatants, generateRenderData, startAnimation, render]);

    // Setup resize observer
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver(() => {
        updateVisualization();
      });

      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, [updateVisualization]);

    // Update when props change
    useEffect(() => {
      updateVisualization();
    }, [updateVisualization]);

    // Cleanup animation on unmount
    useEffect(() => {
      return () => {
        const cache = cacheRef.current;
        if (cache.animationId) {
          deps.cancelAnimationFrame(cache.animationId);
        }
      };
    }, []);

    return (
      <div
        ref={containerRef}
        className={`battlefield-visualization ${className}`}
        style={{ width: '100%', height: `${CANVAS_HEIGHT}px` }}
        role="img"
        aria-label={`Battlefield with ${combatants.size} combatants`}
      >
        <canvas
          ref={canvasRef}
          style={{ display: 'block' }}
          aria-hidden="true"
        />
      </div>
    );
  };
};

export const BattlefieldVisualization = createBattlefieldVisualizationComponent();
