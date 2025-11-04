import { Actor } from '~/types/entity/actor';
import { BattlefieldPosition, Combatant, CombatantSummary, CombatFacing, CombatSession, Team } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';
import { WorldEvent } from '~/types/event';
import { createAdvanceMethod, AdvanceDependencies, AdvanceMethod } from './action/advance';
import { createRetreatMethod, RetreatDependencies, RetreatMethod } from './action/retreat';
import { createAttackMethod, AttackDependencies } from './action/attack';
import { createDefendMethod, DefendMethod, DefendDependencies } from './action/defend';
import { createTargetMethod } from './action/target';
import { createStrikeMethod, StrikeDependencies } from './action/strike';
import { createCleaveMethod, CleaveDependencies } from '~/worldkit/combat/action/cleave';
import { createRangeMethod, RangeMethod } from '~/worldkit/combat/action/range';
import { calculateMaxAp, deductAp, getCurrentAp } from '~/worldkit/combat/ap';
import { consumeEnergy } from '~/worldkit/entity/actor/capacitor';
import { createDoneMethod } from '~/worldkit/combat/action/done';
import { cleanApPrecision } from '~/worldkit/combat/ap';
import { computeInitiativeRoll } from '~/worldkit/combat/initiative';
export { deductAp } from '~/worldkit/combat/ap';

type Transform<T> = (input: T) => T;
const identity = <T>(x: T): T => x;

export const MOVE_BY_AP = 'ap' as const;
export const MOVE_BY_DISTANCE = 'distance' as const;
export const MOVE_BY_MAX = 'max' as const;
export type MovementType = typeof MOVE_BY_AP | typeof MOVE_BY_DISTANCE | typeof MOVE_BY_MAX;

export type CombatantAttributes = {
  ap: Combatant['ap'];
}

export interface CombatantApi {
  combatant: Combatant;
  canAct: () => boolean;
  deductCost: (ap: number, energy: number) => void;
  target: (targetId: ActorURN, trace?: string) => WorldEvent[];
  advance: AdvanceMethod;
  retreat: RetreatMethod;
  attack: (target?: ActorURN, trace?: string) => WorldEvent[];
  defend: DefendMethod;
  range: RangeMethod;
  strike: (target?: ActorURN, trace?: string) => WorldEvent[];
  cleave: (trace?: string) => WorldEvent[];
  done: (trace?: string) => WorldEvent[];
}

export type CombatantApiDependencies = {
  advanceTurn: (trace?: string) => WorldEvent[];
};

export type ActionDependencies = {
  defendDeps?: Partial<DefendDependencies>;
  strikeDeps?: Partial<StrikeDependencies>;
  advanceDeps?: Partial<AdvanceDependencies>;
  retreatDeps?: Partial<RetreatDependencies>;
  attackDeps?: Partial<AttackDependencies>;
  cleaveDeps?: Partial<CleaveDependencies>;
};

const COMBATANT_API_DEPS: CombatantApiDependencies = {
  advanceTurn: (trace?: string) => {
    throw new Error('advanceTurn dependency not provided - use session API to get properly configured combatant APIs');
  },
};

const DEFAULT_ACTION_DEPS: ActionDependencies = {};

/**
 * Creates a combatant API factory with configurable action dependencies
 */
export function createCombatantApiFactory(actionDeps: ActionDependencies = DEFAULT_ACTION_DEPS) {
  return function createCombatantApi(
    context: TransformerContext,
    session: CombatSession,
    actor: Actor,
    { advanceTurn }: CombatantApiDependencies = COMBATANT_API_DEPS,
  ): CombatantApi {
    const combatant = session.data.combatants.get(actor.id);
    if (!combatant) {
      throw new Error(`Combatant not found: ${actor.id}`);
    }

    const range = createRangeMethod(context, session, actor, combatant);
    const strike = createStrikeMethod(context, session, actor, combatant, actionDeps.strikeDeps);
    const target = createTargetMethod(context, session, actor, combatant);
    const done = createDoneMethod(context, session, actor, combatant, { advanceTurn });
    const advance = createAdvanceMethod(context, session, actor, combatant, { ...actionDeps.advanceDeps, done });
    const retreat = createRetreatMethod(context, session, actor, combatant, { ...actionDeps.retreatDeps, done });
    const defend = createDefendMethod(context, session, actor, combatant, { ...actionDeps.defendDeps, done });
    const cleave = createCleaveMethod(context, session, actor, combatant, { ...actionDeps.cleaveDeps });
    const attack = createAttackMethod(context, session, actor, combatant, {
      ...actionDeps.attackDeps,
      target, strike, defend, advance, retreat, done,
    });

    const canAct = (): boolean => cleanApPrecision(getCurrentAp(combatant) || 0) > 0;

    const deductCost = (ap: number, energy: number): void => {
      if (ap > 0) {
        deductAp(combatant, ap);
      }
      if (energy > 0) {
        consumeEnergy(actor, energy);
      }
    };

    return {
      combatant,
      canAct,
      deductCost,
      target,
      advance,
      retreat,
      attack,
      defend,
      strike,
      cleave,
      done,
      range,
    };
  };
}

/**
 * Creates the main combatant hook for tactical combat actions
 * Every combat action exposed by this hook returns a list of WorldEvents
 *
 * This is the production version with no action dependencies configured.
 */
export const createCombatantApi = createCombatantApiFactory();

/**
 * Initialize combatant attributes
 */
export function initializeCombatantAttributes(actor: Actor): CombatantAttributes {
  const maxAp = calculateMaxAp(actor);

  return {
    ap: {
      current: maxAp,
      max: maxAp,
    },
  };
}

/**
 * Create combatant summary for session data
 */
export function createCombatantSummary(combatant: Combatant): CombatantSummary {
  return {
    actorId: combatant.actorId,
    team: combatant.team,
    position: combatant.position,
    ap: combatant.ap,
  };
}

export type CreateCombatantDependencies = {
  computeInitiative: typeof computeInitiativeRoll;
  initializeCombatantAttributes: typeof initializeCombatantAttributes;
  timestamp: () => number;
}

export const DEFAULT_CREATE_COMBATANT_DEPS: Readonly<CreateCombatantDependencies> = {
  computeInitiative: computeInitiativeRoll,
  initializeCombatantAttributes: initializeCombatantAttributes,
  timestamp: () => Date.now(),
};

/**
 * Creates a combatant from an actor with initialized combat attributes.
 */
export const createCombatant = (
  actor: Actor,
  team: string | Team,
  transform: (c: Combatant) => Combatant = identity,
  deps: CreateCombatantDependencies = DEFAULT_CREATE_COMBATANT_DEPS,
): Combatant => {
  const { ap } = deps.initializeCombatantAttributes(actor);
  const initiative = deps.computeInitiative(actor);

  return transform({
    actorId: actor.id,
    team,
    initiative,
    ap,
    target: null,
    position: {
      coordinate: 0,
      facing: CombatFacing.RIGHT,
      speed: 0,
    },
  });
};

export const setCombatantPosition = (
  combatant: Combatant,
  transform: Transform<BattlefieldPosition>,
): void => {
  const newPosition = transform(combatant.position);
  combatant.position = newPosition;
};
