import { Actor } from '~/types/entity/actor';
import { Combatant, CombatantSummary, CombatFacing, CombatSession, Team } from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';
import { WorldEvent } from '~/types/event';
import { createAdvanceMethod, AdvanceDependencies } from './action/advance';
import { createRetreatMethod, RetreatDependencies } from './action/retreat';
import { createAttackMethod, AttackDependencies } from './action/attack';
import { createDefendMethod, DefendMethod, DefendDependencies } from './action/defend';
import { createTargetMethod } from './action/target';
import { createStrikeMethod, StrikeDependencies } from './action/strike';
import { calculateMaxAp } from '~/worldkit/combat/ap';
import { getMaxEnergy } from '~/worldkit/entity/actor/capacitor';
import { createDoneMethod } from '~/worldkit/combat/action/done';
import { cleanApPrecision } from '~/worldkit/combat/ap';
import { computeInitiativeRoll } from '~/worldkit/combat/initiative';
export { deductAp } from '~/worldkit/combat/ap';

export const MOVE_BY_AP = 'ap' as const;
export const MOVE_BY_DISTANCE = 'distance' as const;
export type MovementType = typeof MOVE_BY_AP | typeof MOVE_BY_DISTANCE;

export type CombatantAttributes = {
  ap: Combatant['ap'];
  energy: Combatant['energy'];
  balance: Combatant['balance'];
}

export interface CombatantApi {
  combatant: Combatant;
  canAct: () => boolean;
  target: (targetId: ActorURN, trace?: string) => WorldEvent[];
  advance: (by: MovementType, value: number, target?: ActorURN, trace?: string) => WorldEvent[];
  retreat: (by: MovementType, value: number, target?: ActorURN, trace?: string) => WorldEvent[];
  attack: (target?: ActorURN, trace?: string) => WorldEvent[];
  defend: DefendMethod;
  strike: (target?: ActorURN, trace?: string) => WorldEvent[];
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
};

const COMBATANT_API_DEPS: CombatantApiDependencies = {
  advanceTurn: (trace?: string) => [], //--> no-op
};

/**
 * Creates a combatant API factory with configurable action dependencies
 */
export function createCombatantApiFactory(actionDeps: ActionDependencies = {}) {
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

    const strike = createStrikeMethod(context, session, actor, combatant, actionDeps.strikeDeps);
    const target = createTargetMethod(context, session, actor, combatant);
    const advance = createAdvanceMethod(context, session, actor, combatant, actionDeps.advanceDeps);
    const retreat = createRetreatMethod(context, session, actor, combatant, actionDeps.retreatDeps);
    const done = createDoneMethod(context, session, actor, combatant, { advanceTurn });
    const defend = createDefendMethod(context, session, actor, combatant, { ...actionDeps.defendDeps, done });
    const attack = createAttackMethod(context, session, actor, combatant, {
      ...actionDeps.attackDeps,
      target, strike, defend, advance, retreat,
    });

    const canAct = (): boolean => cleanApPrecision(combatant.ap.eff.cur || 0) > 0;

    return {
      combatant,
      canAct,
      target,
      advance,
      retreat,
      attack,
      defend,
      strike,
      done,
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
  const maxEnergy = getMaxEnergy(actor);
  const balance = 1;

  return {
    ap: {
      nat: { cur: maxAp, max: maxAp },
      eff: { cur: maxAp, max: maxAp },
      mods: {},
    },
    energy: {
      position: actor.capacitor?.position ?? 1,
      nat: { cur: maxEnergy, max: maxEnergy },
      eff: { cur: maxEnergy, max: maxEnergy },
      mods: {},
    },
    balance: {
      nat: { cur: balance, max: balance },
      eff: { cur: balance, max: balance },
      mods: {},
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
}

type Transformer = <T>(input: T) => T;
const identity: Transformer = (input) => input;

export const DEFAULT_CREATE_COMBATANT_DEPS: Readonly<CreateCombatantDependencies> = {
  computeInitiative: computeInitiativeRoll,
  initializeCombatantAttributes: initializeCombatantAttributes,
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
  const { ap, energy, balance } = deps.initializeCombatantAttributes(actor);
  const initiative = deps.computeInitiative(actor);

  return transform({
    actorId: actor.id,
    team,
    initiative,
    mass: 0,
    ap,
    energy,
    balance,
    target: null,
    position: {
      coordinate: 0,
      facing: CombatFacing.RIGHT,
      speed: 0,
    },
  });
};
