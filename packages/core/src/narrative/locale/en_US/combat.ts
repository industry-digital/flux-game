import {
  ActorDidAttack,
  ActorDidDefend,
  ActorDidMoveInCombat,
  ActorDidDie,
  CombatTurnDidEnd,
  CombatTurnDidStart,
  CombatSessionStarted,
  CombatSessionEnded,
  CombatSessionStatusDidChange,
  ActorWasAttacked,
  ActorDidAssessRange,
  ActorDidAcquireTarget,
} from '~/types/event';
import { AttackType, MovementDirection } from '~/types/combat';
import { SessionStatus } from '~/types/entity/session';
import { Narrative, TemplateFunction } from '~/types/narrative';
import { SchemaURN } from '~/types/taxonomy';
import { Actor, Stat } from '~/types/entity/actor';
import { getAllStats, getMaxHp } from '~/worldkit/entity/actor';
import { getPrimaryDamageType } from '~/worldkit/combat/damage/damage-type';
import { DamageType } from '~/types/damage';
import { Locale, SchemaTranslation } from '~/types/i18n';
import { TransformerContext } from '~/types/handler';
import { WeaponSchema } from '~/types/schema/weapon';
import { getPossessivePronoun } from './util/grammar';
import { EMPTY_NARRATIVE } from '~/narrative/constants';

/**
 * Get localized weapon name from schema (en_US)
 */
const getLocalizedSchemaTranslation = (context: TransformerContext, schemaUrn: SchemaURN): SchemaTranslation => {
  return context.getSchemaTranslation(Locale.en_US, schemaUrn);
};

/**
 * Attack verbs by damage type
 */
const ATTACK_VERBS: Readonly<Record<DamageType, Narrative>> = Object.freeze({
  [DamageType.SLASH]: { self: 'sweep', observer: 'sweeps' },
  [DamageType.PIERCE]: { self: 'drive', observer: 'drives' },
  [DamageType.IMPACT]: { self: 'swing', observer: 'swings' },
  [DamageType.KINETIC]: { self: 'swing', observer: 'swings' },
  [DamageType.THERMAL]: { self: 'sweep', observer: 'sweeps' },
  [DamageType.EXPLOSIVE]: { self: 'swing', observer: 'swings' }
});

/**
 * Format target list for third-person perspective
 */
const formatTargetList = (targets: Actor[]): string => {
  if (targets.length === 0) return '';
  if (targets.length === 1) return targets[0].name;
  if (targets.length === 2) return `${targets[0].name} and ${targets[1].name}`;

  const lastTarget = targets[targets.length - 1];
  const otherTargets = targets.slice(0, -1);
  return `${otherTargets.map(t => t.name).join(', ')}, and ${lastTarget.name}`;
};

/**
 * Generate CLEAVE attack narrative with all perspectives
 *
 * NOTE: CLEAVE attacks require INDIVIDUAL dispatch strategy because each
 * target sees a personalized second-person perspective. This is handled
 * by the server's dispatch strategy module.
 */
const narrateCleaveAttack = (
  context: TransformerContext,
  actor: Actor,
  targets: Actor[],
  weapon: WeaponSchema
) => {
  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;
  const possessive = getPossessivePronoun(actor.gender);
  const primaryDamageType = getPrimaryDamageType(weapon);
  const verbs = ATTACK_VERBS[primaryDamageType];

  if (targets.length === 0) {
    return {
      self: `You ${verbs.self} your ${weaponName} in a wide arc.`,
      observer: `${actor.name} ${verbs.observer} ${possessive} ${weaponName} in a wide arc.`
    };
  }

  const targetList = formatTargetList(targets);

  return {
    self: `You ${verbs.self} your ${weaponName} at ${targetList}.`,
    // Target perspective omitted - requires per-recipient rendering for multi-target
    observer: `${actor.name} ${verbs.observer} ${possessive} ${weaponName} at ${targetList}.`
  };
};

/**
 * Power-biased attack verbs (high POW stat)
 */
const ATTACK_VERBS_POWER: Readonly<Partial<Record<DamageType, Narrative>>> = Object.freeze({
  [DamageType.SLASH]: { self: 'hack', observer: 'hacks' },
  [DamageType.PIERCE]: { self: 'drive', observer: 'drives' },
  [DamageType.IMPACT]: { self: 'crush', observer: 'crushes' },
});

/**
 * Finesse-biased attack verbs (high FIN stat)
 */
const ATTACK_VERBS_FINESSE: Readonly<Partial<Record<DamageType, Narrative>>> = Object.freeze({
  [DamageType.SLASH]: { self: 'slash', observer: 'slashes' },
  [DamageType.PIERCE]: { self: 'stab', observer: 'stabs' },
  [DamageType.IMPACT]: { self: 'strike', observer: 'strikes' },
});

const DEFAULT_ATTACK_VERBS: Narrative = { self: 'attack', observer: 'attacks' };

/**
 * Generate damage descriptions for all perspectives
 *
 * For ACTOR_WAS_ATTACKED events, the victim IS the event actor,
 * so `self` represents the victim's perspective.
 */
const getDamageDescriptions = (
  damage: number,
  weaponName: string,
  attacker: Actor,
  victim: Actor,
  attackRating: number,
  evasionRating: number
): Narrative => {
  if (damage === 0) {
    // Miss descriptions based on evasion vs attack rating
    const isCloseCall = Math.abs(attackRating - evasionRating) <= 2;

    return {
      self: isCloseCall
        ? `You narrowly dodge ${attacker.name}'s ${weaponName}.`
        : `You easily evade ${attacker.name}'s ${weaponName}.`,
      observer: isCloseCall
        ? `${attacker.name} barely misses ${victim.name} with the ${weaponName}.`
        : `${attacker.name} misses ${victim.name} with the ${weaponName}.`
    };
  }

  const victimMaxHp = getMaxHp(victim);
  const damagePercent = damage / victimMaxHp;

  // Devastating hit (30%+ of max HP)
  if (damagePercent >= 0.3) {
    return {
      self: `You are devastated by ${attacker.name}'s ${weaponName} for ${damage} damage.`,
      observer: `${attacker.name} brutally strikes ${victim.name} with the ${weaponName} for ${damage} damage.`
    };
  }

  // Severe hit (15%+ of max HP)
  if (damagePercent >= 0.15) {
    return {
      self: `You are wounded severely by ${attacker.name}'s ${weaponName} for ${damage} damage.`,
      observer: `${attacker.name} lands a solid hit on ${victim.name} with the ${weaponName} for ${damage} damage.`
    };
  }

  // Moderate hit (5%+ of max HP)
  if (damagePercent >= 0.05) {
    return {
      self: `You are struck by ${attacker.name}'s ${weaponName} for ${damage} damage.`,
      observer: `${attacker.name} hits ${victim.name} with the ${weaponName} for ${damage} damage.`
    };
  }

  // Grazing hit
  return {
    self: `You are grazed by ${attacker.name}'s ${weaponName} for ${damage} damage.`,
    observer: `${attacker.name} barely scratches ${victim.name} with the ${weaponName} for ${damage} damage.`
  };
};

export const narrateActorDidAttack: TemplateFunction<ActorDidAttack> = (context, event) => {
  const { world, equipmentApi } = context;
  const actor = world.actors[event.actor];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  const weapon = equipmentApi.getEquippedWeaponSchema(actor);

  // Handle CLEAVE attacks
  if (event.payload.attackType === AttackType.CLEAVE) {
    const targets = event.payload.targets.map(id => world.actors[id]).filter(Boolean);
    if (targets.length === 0) {
      return EMPTY_NARRATIVE;
    }
    return narrateCleaveAttack(context, actor, targets, weapon);
  }

  // Handle STRIKE attacks
  const target = world.actors[event.payload.target];
  if (!target) {
    return EMPTY_NARRATIVE;
  }

  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;
  const actorStats = getAllStats(actor);
  const primaryDamageType = getPrimaryDamageType(weapon) ?? DamageType.SLASH;
  const actorPower = actorStats[Stat.POW];
  const actorFinesse = actorStats[Stat.FIN];
  const isPowerBiased = actorPower > actorFinesse;

  // Select verb set based on character build
  const attackVerbs = isPowerBiased
    ? (ATTACK_VERBS_POWER[primaryDamageType] ?? DEFAULT_ATTACK_VERBS)
    : (ATTACK_VERBS_FINESSE[primaryDamageType] ?? DEFAULT_ATTACK_VERBS);

  const possessive = getPossessivePronoun(actor.gender);

  return {
    self: `You ${attackVerbs.self} ${target.name} with your ${weaponName}.`,
    observer: `${actor.name} ${attackVerbs.observer} ${target.name} with ${possessive} ${weaponName}.`
  };
};

export const narrateActorWasAttacked: TemplateFunction<ActorWasAttacked> = (context, event) => {
  const { world, equipmentApi } = context;
  const attacker = world.actors[event.payload.source];
  const target = world.actors[event.actor];
  const { damage, attackRating, evasionRating } = event.payload;

  if (!attacker || !target) {
    return EMPTY_NARRATIVE;
  }

  const weapon = equipmentApi.getEquippedWeaponSchema(attacker);
  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;

  return getDamageDescriptions(damage, weaponName, attacker, target, attackRating, evasionRating);
};

export const narrateActorDidDefend: TemplateFunction<ActorDidDefend> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor];

  return {
    self: 'You take a defensive stance.',
    observer: `${actor.name} takes a defensive stance.`
  };
};

export const narrateActorDidMoveInCombat: TemplateFunction<ActorDidMoveInCombat> = (context, event) => {
  const { world, equipmentApi } = context;
  const actor = world.actors[event.actor];

  // Use pre-computed values from event payload
  const distance = event.payload.distance;
  const direction = event.payload.direction === MovementDirection.FORWARD ? 'forward' : 'backward';

  // Enhanced movement descriptions based on distance and actor stats
  const actorStats = getAllStats(actor);
  const finesse = actorStats[Stat.FIN];
  const weapon = equipmentApi.getEquippedWeaponSchema(actor);

  const getMovementVerbs = (): Narrative => {
    const distanceText = `${distance}m`;

    // Movement style based on finesse and distance
    if (distance >= 3) {
      if (finesse >= 60) {
        return {
          self: `dash ${direction} ${distanceText}`,
          observer: `${actor.name} dashes ${direction} ${distanceText}`
        };
      }
      if (finesse >= 30) {
        return {
          self: `sprint ${direction} ${distanceText}`,
          observer: `${actor.name} sprints ${direction} ${distanceText}`,
        };
      }
      return {
        self: `charge ${direction} ${distanceText}`,
        observer: `${actor.name} charges ${direction} ${distanceText}`,
      };
    }

    if (distance >= 2) {
      if (finesse >= 60) {
        return {
          self: `glide ${direction} ${distanceText}`,
          observer: `${actor.name} glides ${direction} ${distanceText}`,
        };
      }
      return {
        self: `move ${direction} ${distanceText}`,
        observer: `${actor.name} moves ${direction} ${distanceText}`,
      };
    }

    if (finesse >= 60) {
      return {
        self: `step ${direction} ${distanceText}`,
        observer: `${actor.name} steps ${direction} ${distanceText}`,
      };
    }

    return {
      self: `shift ${direction} ${distanceText}`,
      observer: `${actor.name} shifts ${direction} ${distanceText}`,
    };
  };

  // Add tactical context if weapon has range preferences
  const getTacticalContext = (): string => {
    const optimalRange = weapon.range.optimal || 1;
    if (direction === 'forward' && optimalRange <= 1) {
      return ' to close distance';
    }
    if (direction === 'backward' && optimalRange > 2) {
      return ' to gain range';
    }
    return '';
  };

  const verbs = getMovementVerbs();
  const tacticalContext = getTacticalContext();

  return {
    self: `You ${verbs.self}${tacticalContext}.`,
    observer: `${actor.name} ${verbs.observer}${tacticalContext}.`
  };
};

export const narrateActorDidAcquireTarget: TemplateFunction<ActorDidAcquireTarget> = (context, event) => {
  const { actors } = context.world;
  const actor = actors[event.actor];
  const target = actors[event.payload.target];

  if (!actor || !target) {
    return EMPTY_NARRATIVE;
  }

  return {
    self: `You target ${target.name}.`,
    observer: `${actor.name} targets ${target.name}.`
  };
};

export const narrateActorDidDie: TemplateFunction<ActorDidDie> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor];

  return {
    self: 'You have died!',
    observer: `${actor.name} has been killed!`
  };
};

export const narrateCombatTurnDidEnd: TemplateFunction<CombatTurnDidEnd> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.payload.turnActor];

  return {
    self: `Your turn has ended.\nYou have recovered ${event.payload.energy.change} energy.`,
    observer: `${actor.name}'s turn ends.`
  };
};

export const narrateCombatTurnDidStart: TemplateFunction<CombatTurnDidStart> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.payload.turnActor];

  return {
    self: 'Your turn begins.',
    observer: `${actor.name}'s turn begins.`
  };
};

// Format side descriptions
const formatSide = (members: string[]): string => {
  if (members.length === 1) {
    return members[0];
  }
  if (members.length === 2) {
    return `${members[0]} and ${members[1]}`;
  }
  return `${members.slice(0, -1).join(', ')}, and ${members[members.length - 1]}`;
};

export const narrateCombatSessionStarted: TemplateFunction<CombatSessionStarted> = (context, event) => {
  const { namesByTeam } = event.payload;

  let side1Desc = '';
  let side2Desc = '';
  let isFirstTeam = true;
  let side1Length = 0;
  let side2Length = 0;

  // ASSUMPTION: There are exactly two teams in a combat session
  for (const teamName in namesByTeam) {
    const members = namesByTeam[teamName];
    const sideDesc = formatSide(members);

    if (isFirstTeam) {
      side1Desc = sideDesc;
      side1Length = members.length;
      isFirstTeam = false;
    } else {
      side2Desc = sideDesc;
      side2Length = members.length;
    }
  }

  // Generate side-focused narrative (same for all perspectives)
  const narrative = side1Length === 1 && side2Length === 1
    ? `${side1Desc} faces off against ${side2Desc}!`
    : `${side1Desc} clash with ${side2Desc}!`;

  return {
    self: narrative,
    observer: narrative
  };
};

export const narrateCombatSessionEnded: TemplateFunction<CombatSessionEnded> = (context, event) => {
  const { winningTeam, finalRound } = event.payload;

  const narrative = winningTeam
    ? `Combat ends after ${finalRound} rounds. Team ${winningTeam.toUpperCase()} is victorious!`
    : `Combat ends after ${finalRound} rounds with no clear victor.`;

  return {
    self: narrative,
    observer: narrative
  };
};

export const narrateCombatSessionStatusDidChange: TemplateFunction<CombatSessionStatusDidChange> = (context, event) => {
  const { currentStatus } = event.payload;

  let narrative: string;
  switch (currentStatus) {
    case SessionStatus.RUNNING:
      narrative = 'FIGHT!';
      break;
    case SessionStatus.PAUSED:
      narrative = 'Combat is paused.';
      break;
    case SessionStatus.TERMINATED:
      narrative = 'Combat has ended.';
      break;
    default:
      return EMPTY_NARRATIVE;
  }

  return {
    self: narrative,
    observer: narrative
  };
};

export const narrateActorDidAssessRange: TemplateFunction<ActorDidAssessRange> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor];
  const target = world.actors[event.payload.target];
  const range = event.payload.range;
  const direction = event.payload.direction;

  // Get weapon information for the actor
  const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);
  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;
  const weaponInfo = `Your ${weaponName}'s optimal range is ${weapon.range.optimal || 1}m.`;

  // Convert MovementDirection to readable text
  const directionText = direction === MovementDirection.FORWARD ? 'in front of you' : 'behind you';

  return {
    self: `${target.name} is ${range}m away, ${directionText}.\n${weaponInfo}`,
    observer: `${actor.name} appears to be judging distance to ${target.name}.`
  };
};
