import { CombatAction, Combatant, CombatSession } from '~/types/combat';
import { WeaponSchema } from '~/types/schema/weapon';
import { ActorURN } from '~/types/taxonomy';
import { CHANCE_ACTIONS, PLAN_ENDING_ACTIONS } from '~/worldkit/combat/action/constants';
import { calculateWeaponApCost } from '~/worldkit/combat/damage';

/**
 * Cache for memoizing expensive plan generation computations
 */
export type SearchCache = Map<string, { plans: ScoredPlan[]; ts: number }>;

/**
 * Pre-computed battlefield state analysis with cached values for efficient plan generation
 */
export type TacticalSituation = {
  /**
   * The combatant making tactical decisions
   */
  combatant: Combatant;

  /**
   * Current combat session state
   */
  session: CombatSession;

  /**
   * Combatant's resolved weapon schema
   */
  weapon: WeaponSchema;

  /**
   * All valid targets with distances and basic assessments
   */
  validTargets: Array<{
    actorId: ActorURN;
    combatant: Combatant;
    distance: number;
    isInRange: boolean;
    isOptimalRange: boolean;
  }>;

  /**
   * Current resource state snapshot
   */
  resources: {
    ap: { current: number; max: number };
    energy: { current: number; max: number };
  };

  /**
   * Pre-computed tactical assessments
   */
  assessments: {
    /**
     * Primary target (if any)
     */
    primaryTarget: ActorURN | null;
    /**
     * Distance to primary target
     */
    primaryTargetDistance: number | null;
    /**
     * Whether combatant can attack this turn
     */
    canAttack: boolean;
    /**
     * Whether combatant needs to reposition
     */
    needsRepositioning: boolean;
    /**
     * Optimal engagement distance for weapon
     */
    optimalDistance: number;
  };
};

/**
 * Composite heuristic weights for tactical evaluation
 */
export type TacticalPriorities = {
  /**
   * Weight for damage potential (0-1)
   */
  damageWeight: number;
  /**
   * Weight for resource efficiency (0-1)
   */
  efficiencyWeight: number;
  /**
   * Weight for positioning advantage (0-1)
   */
  positioningWeight: number;
  /**
   * Weight for tactical momentum (0-1)
   */
  momentumWeight: number;
  /**
   * Weight for risk/safety considerations (0-1)
   */
  riskWeight: number;
};

export type HeuristicProfileName = 'default'| 'melee' | 'reach' | 'ranged';

/**
 * Weapon-specific scoring configuration
 */
export type HeuristicProfile = {
  /**
   * Weapon-specific tactical priorities
   */
  priorities: TacticalPriorities;
  /**
   * Optimal engagement distance
   */
  optimalDistance: number;
  /**
   * Minimum safe distance (for ranged weapons)
   */
  minSafeDistance: number;
  /**
   * Maximum effective distance
   */
  maxEffectiveDistance: number;
  /**
   * Whether this weapon can control space
   */
  controlsSpace: boolean;
};

/**
 * Lightweight search state with structural sharing for efficient traversal
 */
export type PlanNode = {
  /**
   * Unique identifier for this node
   */
  id: string;
  /**
   * Parent node (null for root)
   */
  parent: PlanNode | null;
  /**
   * Depth in search tree
   */
  depth: number;
  /**
   * Action sequence from root to this node
   */
  actions: CombatAction[];
  /**
   * Combatant state after applying all actions
   */
  combatantState: {
    ap: number;
    energy: number;
    position: number;
    facing: number;
  };
  /**
   * Whether this node represents a terminal state (ends with chance action)
   */
  isTerminal: boolean;
  /**
   * Cached evaluation score (computed lazily)
   */
  score?: number;
};

/**
 * Action sequence with evaluation score
 */
export type ScoredPlan = {
  /**
   * Complete action sequence
   */
  actions: CombatAction[];
  /**
   * Composite evaluation score
   */
  score: number;
  /**
   * Breakdown of score components for debugging
   */
  scoreBreakdown: {
    damage: number;
    efficiency: number;
    positioning: number;
    momentum: number;
    risk: number;
    total: number;
  };
};

export type SearchDependencies = {
  timestamp: () => number;
  calculateWeaponApCost: typeof calculateWeaponApCost;
};

/**
 * Configuration for exhaustive search traversal
 */
export type SearchConfig = {
  /**
   * Maximum search depth (default: 4)
   */
  maxDepth: number;
  /**
   * Maximum nodes to evaluate (default: 200)
   */
  maxNodes: number;
  /**
   * Maximum terminal plans to consider (default: 80)
   */
  maxTerminalPlans: number;
  /**
   * Whether to enable early termination optimizations
   */
  enableEarlyTermination: boolean;
  /**
   * Minimum score threshold for plan consideration
   */
  minScoreThreshold: number;
  /**
   * Actions that can terminate a plan
   */
  planEndingActions: typeof PLAN_ENDING_ACTIONS;
  /**
   * Actions that can be used to terminate a plan
   */
  chanceActions: typeof CHANCE_ACTIONS;
};

/**
 * Weapon assessment for a specific target at a given distance
 */
export type WeaponAssessment = {
  /**
   * Whether weapon can hit at this distance
   */
  canHit: boolean;
  /**
   * Effectiveness score (0-1) at this distance
   */
  effectiveness: number;
  /**
   * Optimal distance for this weapon
   */
  optimalDistance: number;
  /**
   * Whether target is within optimal range
   */
  isOptimalRange: boolean;
  /**
   * Distance category for tactical decisions
   */
  distanceCategory: 'melee' | 'close' | 'medium' | 'long';
};

/**
 * Positioning assessment for tactical decisions
 */
export type PositionAssessment = {
  /**
   * Current position advantage score
   */
  currentAdvantage: number;
  /**
   * Potential positions and their scores
   */
  potentialPositions: Array<{
    coordinate: number;
    advantage: number;
    movementCost: number;
  }>;
  /**
   * Whether repositioning is recommended
   */
  shouldReposition: boolean;
  /**
   * Best target position (if repositioning)
   */
  bestPosition: number | null;
};

/**
 * Factory function result for creating tactical situations
 */
export type TacticalSituationFactory = {
  /**
   * Create tactical situation from combat state
   */
  create: (
    session: CombatSession,
    combatant: Combatant,
    weapon: WeaponSchema
  ) => TacticalSituation;
  /**
   * Update existing situation with new state
   */
  update: (
    situation: TacticalSituation,
    changes: Partial<Pick<TacticalSituation, 'combatant' | 'session'>>
  ) => TacticalSituation;
};

/**
 * Factory function result for creating heuristic profiles
 */
export type HeuristicProfileFactory = {
  /**
   * Create profile for specific weapon type
   */
  forWeapon: (weapon: WeaponSchema) => HeuristicProfile;
  /**
   * Create custom profile with overrides
   */
  custom: (base: HeuristicProfile, overrides: Partial<HeuristicProfile>) => HeuristicProfile;
};

/**
 * Search engine interface for plan generation
 */
export type SearchEngine = {
  /**
   * Generate all valid plans lazily
   */
  generatePlans: (situation: TacticalSituation, config: SearchConfig) => Generator<ScoredPlan>;
  /**
   * Find single optimal plan with memoization
   */
  findOptimalPlan: (situation: TacticalSituation, config: SearchConfig) => ScoredPlan | null;
  /**
   * Create initial search node
   */
  createRootNode: (situation: TacticalSituation) => PlanNode;
  /**
   * Apply action to node (returns new node)
   */
  applyAction: (node: PlanNode, action: CombatAction) => PlanNode;
};

/**
 * Performance metrics for search optimization
 */
export type SearchMetrics = {
  /**
   * Total nodes evaluated
   */
  nodesEvaluated: number;
  /**
   * Terminal plans considered
   */
  terminalPlans: number;
  /**
   * Search time in milliseconds
   */
  searchTimeMs: number;
  /**
   * Plans per second
   */
  plansPerSecond: number;
  /**
   * Early terminations triggered
   */
  earlyTerminations: number;
};
