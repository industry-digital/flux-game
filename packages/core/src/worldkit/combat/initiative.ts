import { Actor, Stat } from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';
import { RollResult, RollSpecification } from '~/types/dice';
import { Combatant } from '~/types/combat';
import { applyModifierToRollResult, rollDiceWithRng } from '~/worldkit/dice';
import { calculateStatBonus, getStatValue } from '~/worldkit/entity/actor/stats';

export const INITIATIVE_ROLL_SPECIFICATION: RollSpecification = '1d20';

export type InitiativeDependencies = {
  random: () => number;
  timestamp: () => number;
  calculateStatBonus: typeof calculateStatBonus;
  getStatValue: typeof getStatValue;
  rollDiceWithRng: typeof rollDiceWithRng;
}

const DEFAULT_INITIATIVE_DEPS: InitiativeDependencies = {
  random: () => Math.random(),
  timestamp: () => Date.now(),
  calculateStatBonus: calculateStatBonus,
  getStatValue: getStatValue,
  rollDiceWithRng: rollDiceWithRng,
}

export function computeInitiativeRoll(
  actor: Actor,
  deps: InitiativeDependencies = DEFAULT_INITIATIVE_DEPS,
): RollResult {
  const perceptionValue = deps.getStatValue(actor, Stat.PER);
  const bonus = deps.calculateStatBonus(perceptionValue);
  const roll = deps.rollDiceWithRng(INITIATIVE_ROLL_SPECIFICATION, deps.random);

  applyModifierToRollResult(roll, `stat:${Stat.PER}`, {
    origin: `stat:${Stat.PER}`,
    value: bonus,
    duration: -1,
    ts: deps.timestamp(),
  });

  return roll;
}

export function computeInitiativeRolls(
  combatants: Map<ActorURN, Combatant>,
  getActorOrFail: (actorId: ActorURN) => Actor,
  deps: InitiativeDependencies = DEFAULT_INITIATIVE_DEPS,
): Map<ActorURN, RollResult> {
  const entries: [ActorURN, RollResult][] = Array(combatants.size);

  let i = 0;
  for (const [actorId] of combatants) {
    const actor = getActorOrFail(actorId);
    entries[i++] = [actorId, computeInitiativeRoll(actor, deps)];
  }

  return new Map(entries.sort((a, b) => b[1].result - a[1].result));
}

export type InitiativeTieBreakerSortInput = {
  actor: Actor;
  combatant: Combatant;
  roll: RollResult;
}

export type InitiativeTieBreaker = (a: InitiativeTieBreakerSortInput, b: InitiativeTieBreakerSortInput) => number;

export const DEFAULT_TIE_BREAKER: InitiativeTieBreaker = (a, b) => {
  const rollDelta = b.roll.result - a.roll.result;
  if (rollDelta !== 0) {
    return rollDelta;
  }

  const finesseDelta = getStatValue(b.actor, Stat.FIN) - getStatValue(a.actor, Stat.FIN);
  if (finesseDelta !== 0) {
    return finesseDelta;
  }

  // ASSUMPTION: Perception was already accounted for in the roll
  // We should *not* bonus perception again. Instead we rely on FIN to break ties
  // Use our new utilities for modifier-aware stat comparison
  const perceptionDelta = getStatValue(b.actor, Stat.PER) - getStatValue(a.actor, Stat.PER);
  if (perceptionDelta !== 0) {
    return perceptionDelta;
  }

  // If all else fails, we pick the attacker.
  // ASSUMPTION: There is only ever one combatant in the session for whom
  // `didInitiateCombat` holds true
  if (a.combatant.didInitiateCombat && !b.combatant.didInitiateCombat) return -1;
  if (b.combatant.didInitiateCombat && !a.combatant.didInitiateCombat) return 1;

  // Final tie-breaker: lexicographic sort by actor ID for complete determinism
  return a.actor.id.localeCompare(b.actor.id);
}

export function sortInitiativeOrder(
  initiativeRolls: Map<ActorURN, RollResult>,
  combatants: Map<ActorURN, Combatant>,
  getActorOrFail: (actorId: ActorURN) => Actor,
  tieBreaker: InitiativeTieBreaker = DEFAULT_TIE_BREAKER,
): Map<ActorURN, RollResult> {
  const sortComparator = (a: InitiativeTieBreakerSortInput, b: InitiativeTieBreakerSortInput) => {
    return tieBreaker(a, b);
  };

  const inputs: InitiativeTieBreakerSortInput[] = Array(initiativeRolls.size);
  let i = 0;
  for (const [actorId, roll] of initiativeRolls) {
    inputs[i++] = { actor: getActorOrFail(actorId)!, combatant: combatants.get(actorId)!, roll };
  }

  const sortedInputs = inputs.sort(sortComparator);

  return new Map(sortedInputs.map(input => [input.actor.id, input.roll]));
}
