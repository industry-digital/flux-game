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
import { SessionStatus } from '~/types/session';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN, SchemaURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import {
  withUserEventValidation,
  withInteractionValidation,
  createPerspectiveTemplate,
  createSystemTemplate,
  createSystemPerspectiveTemplate,
  createDynamicSystemPerspectiveTemplate,
} from '~/narrative/util';
import { getAllStats, getMaxHp } from '~/worldkit/entity/actor';
import { getPrimaryDamageType } from '~/worldkit/combat/damage/damage-type';
import { DamageType } from '~/types/damage';
import { Locale, SchemaTranslation } from '~/types/i18n';
import { TransformerContext } from '~/types/handler';
import { WeaponSchema } from '~/types/schema/weapon';
import { Perspective } from '~/types/narrative';
import { getPossessivePronoun } from './grammar/pronouns';


/**
 * Get localized weapon name from schema (en_US)
 */
const getLocalizedSchemaTranslation = (context: TransformerContext, schemaUrn: SchemaURN): SchemaTranslation => {
  return context.getSchemaTranslation(Locale.en_US, schemaUrn);
};

export const FIRST_PERSON_VERBS: Readonly<Record<DamageType, string>> = Object.freeze({
  [DamageType.SLASH]: 'sweep',
  [DamageType.PIERCE]: 'drive',
  [DamageType.IMPACT]: 'swing',
  [DamageType.KINETIC]: 'swing',
  [DamageType.THERMAL]: 'sweep',
  [DamageType.EXPLOSIVE]: 'swing'
});

export const THIRD_PERSON_VERBS: Readonly<Record<DamageType, string>> = Object.freeze({
  [DamageType.SLASH]: 'sweeps',
  [DamageType.PIERCE]: 'drives',
  [DamageType.IMPACT]: 'swings',
  [DamageType.KINETIC]: 'swings',
  [DamageType.THERMAL]: 'sweeps',
  [DamageType.EXPLOSIVE]: 'swings'
});

// Helper function to format target list with viewer-specific perspective
const formatTargetList = (targets: Actor[], viewerActorId: ActorURN): string => {
  if (targets.length === 0) return '';
  if (targets.length === 1) {
    return targets[0].id === viewerActorId ? 'you' : targets[0].name;
  }
  if (targets.length === 2) {
    const target1 = targets[0].id === viewerActorId ? 'you' : targets[0].name;
    const target2 = targets[1].id === viewerActorId ? 'you' : targets[1].name;
    return `${target1} and ${target2}`;
  }

  const lastTarget = targets[targets.length - 1];
  const otherTargets = targets.slice(0, -1);
  const lastTargetName = lastTarget.id === viewerActorId ? 'you' : lastTarget.name;
  const otherTargetNames = otherTargets.map(t => t.id === viewerActorId ? 'you' : t.name);
  return `${otherTargetNames.join(', ')}, and ${lastTargetName}`;
};

const narrateCleaveAttack = (context: any, actor: Actor, targets: Actor[], weapon: WeaponSchema, viewerActorId: ActorURN): string => {
  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;
  const possessive = getPossessivePronoun(actor.gender);
  const primaryDamageType = getPrimaryDamageType(weapon);

  // Determine perspective
  let perspective: Perspective;
  if (viewerActorId === actor.id) {
    perspective = Perspective.SELF;
  } else if (targets.some(target => target.id === viewerActorId)) {
    perspective = Perspective.TARGET;
  } else {
    perspective = Perspective.OBSERVER;
  }

  const verb = perspective === Perspective.SELF ? FIRST_PERSON_VERBS[primaryDamageType] : THIRD_PERSON_VERBS[primaryDamageType];

  if (perspective === Perspective.SELF) {
    // Attacker perspective: "You slash your sword at Alice and Bob."
    if (targets.length === 0) {
      return `You ${verb} your ${weaponName} in a wide arc.`;
    }
    const targetList = targets.map(t => t.name).join(targets.length === 2 ? ' and ' : ', ');
    if (targets.length === 2) {
      return `You ${verb} your ${weaponName} at ${targetList}.`;
    }
    const lastTarget = targets[targets.length - 1];
    const otherTargets = targets.slice(0, -1);
    return `You ${verb} your ${weaponName} at ${otherTargets.map(t => t.name).join(', ')}, and ${lastTarget.name}.`;
  }

  if (perspective === Perspective.TARGET) {
    // Target perspective: "Alice slashes her sword at you and Bob."
    if (targets.length === 0) {
      return `${actor.name} ${verb} ${possessive} ${weaponName} in a wide arc.`;
    }
    const targetList = formatTargetList(targets, viewerActorId);
    return `${actor.name} ${verb} ${possessive} ${weaponName} at ${targetList}.`;
  }

  // Observer perspective: "Alice slashes her sword at Bob and Charlie."
  if (targets.length === 0) {
    return `${actor.name} ${verb} ${possessive} ${weaponName} in a wide arc.`;
  }
  if (targets.length === 1) {
    return `${actor.name} ${verb} ${possessive} ${weaponName} at ${targets[0].name}.`;
  }
  if (targets.length === 2) {
    return `${actor.name} ${verb} ${possessive} ${weaponName} at ${targets[0].name} and ${targets[1].name}.`;
  }
  const lastTarget = targets[targets.length - 1];
  const otherTargets = targets.slice(0, -1);
  return `${actor.name} ${verb} ${possessive} ${weaponName} at ${otherTargets.map(t => t.name).join(', ')}, and ${lastTarget.name}.`;
};

const ATTACK_VERBS_POWER_BIAS: Readonly<Partial<Record<DamageType, Record<Perspective, string>>>> = Object.freeze({
  [DamageType.SLASH]: {
    [Perspective.SELF]: 'hack',
    [Perspective.TARGET]: 'hacks',
    [Perspective.OBSERVER]: 'hacks'
  },
  [DamageType.PIERCE]: {
    [Perspective.SELF]: 'drive',
    [Perspective.TARGET]: 'drives',
    [Perspective.OBSERVER]: 'drives'
  },
  [DamageType.IMPACT]: {
    [Perspective.SELF]: 'crush',
    [Perspective.TARGET]: 'crushes',
    [Perspective.OBSERVER]: 'crushes'
  },
});

const ATTACK_VERBS_FINESS_BIAS: Readonly<Partial<Record<DamageType, Record<Perspective, string>>>> = Object.freeze({
  [DamageType.SLASH]: {
    [Perspective.SELF]: 'slash',
    [Perspective.TARGET]: 'slashes',
    [Perspective.OBSERVER]: 'slashes'
  },
  [DamageType.PIERCE]: {
    [Perspective.SELF]: 'stab',
    [Perspective.TARGET]: 'stabs',
    [Perspective.OBSERVER]: 'stabs',
  },
  [DamageType.IMPACT]: {
    [Perspective.SELF]: 'strike',
    [Perspective.TARGET]: 'strikes',
    [Perspective.OBSERVER]: 'strikes'
  },
});

const DEFAULT_ATTACK_VERB = 'attacks';

/**
 * Generate damage description based on damage amount, target health, and perspective
 */
const getDamageDescription = (
  damage: number,
  perspective: Perspective,
  weaponName: string,
  target: Actor,
  attackRating: number,
  evasionRating: number
): string => {
  if (damage === 0) {
    // Miss descriptions based on evasion vs attack rating
    const isCloseCall = Math.abs(attackRating - evasionRating) <= 2;
    if (perspective === Perspective.TARGET) {
      return isCloseCall
        ? `narrowly dodges the ${weaponName}`
        : `easily evades the ${weaponName}`;
    }

    if (perspective === Perspective.SELF) {
      return isCloseCall
        ? `narrowly misses ${target.name} with your ${weaponName}`
        : `misses ${target.name} completely with your ${weaponName}`;
    }

    // Fell through; render OBSERVER perspective
    return isCloseCall
      ? `barely misses ${target.name} with the ${weaponName}`
      : `misses ${target.name} with the ${weaponName}`;
  }

  const targetMaxHp = getMaxHp(target);
  const damagePercent = damage / targetMaxHp;

  // Damage intensity descriptions
  if (damagePercent >= 0.3) {
    if (perspective === Perspective.TARGET) {
      return `are devastated by the ${weaponName} for ${damage} damage`;
    }
    if (perspective === Perspective.SELF) {
      return `devastate ${target.name} with your ${weaponName} for ${damage} damage`;
    }
    return `brutally strikes ${target.name} with the ${weaponName} for ${damage} damage`;
  }

  if (damagePercent >= 0.15) {
    if (perspective === Perspective.TARGET) {
      return `are wounded severely by the ${weaponName} for ${damage} damage`;
    }
    if (perspective === Perspective.SELF) {
      return `land a solid hit on ${target.name} with your ${weaponName} for ${damage} damage`;
    }
    return `lands a solid hit on ${target.name} with the ${weaponName} for ${damage} damage`;
  }

  if (damagePercent >= 0.05) {
    if (perspective === Perspective.TARGET) {
      return `are struck by the ${weaponName} for ${damage} damage`;
    }
    if (perspective === Perspective.SELF) {
      return `hit ${target.name} with your ${weaponName} for ${damage} damage`;
    }
    return `hits ${target.name} with the ${weaponName} for ${damage} damage`;
  }

  if (perspective === Perspective.TARGET) {
    return `are grazed by the ${weaponName} for ${damage} damage`;
  }
  if (perspective === Perspective.SELF) {
    return `barely scratch ${target.name} with your ${weaponName} for ${damage} damage`;
  }
  return `barely scratches ${target.name} with the ${weaponName} for ${damage} damage`;
};

export const narrateActorDidAttack: TemplateFunction<ActorDidAttack, ActorURN> = (context, event, actorId) => {
  const { world, equipmentApi } = context;
  const actor = world.actors[event.actor];

  if (!actor) {
    return '';
  }

  const weapon = equipmentApi.getEquippedWeaponSchema(actor);

  // Handle CLEAVE vs STRIKE attack types
  if (event.payload.attackType === AttackType.CLEAVE) {
    const targets = event.payload.targets.map(id => world.actors[id]).filter(Boolean);
    if (targets.length === 0) {
      return '';
    }
    return narrateCleaveAttack(context, actor, targets, weapon, actorId);
  }

  // Handle STRIKE attacks (original logic)
  const target = world.actors[event.payload.target];
  if (!actor || !target) {
    return '';
  }

  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;
  const actorStats = getAllStats(actor);
  const primaryDamageType = getPrimaryDamageType(weapon) ?? DamageType.SLASH;
  const actorPower = actorStats.pow?.eff || 0;
  const actorFinesse = actorStats.fin?.eff || 0;
  const isPowerBiased = actorPower > actorFinesse;
  const perspective = actorId === event.actor ? Perspective.SELF : Perspective.TARGET;
  const attackVerbs = isPowerBiased ? ATTACK_VERBS_POWER_BIAS[primaryDamageType] : ATTACK_VERBS_FINESS_BIAS[primaryDamageType];
  const attackVerb = attackVerbs?.[perspective] ?? DEFAULT_ATTACK_VERB;

  // Generate narrative for all perspectives (STRIKE attacks only)
  if (perspective === Perspective.SELF) {
    // Attacker perspective: "You slash Bob with your sword."
    return `You ${attackVerb} ${target.name} with your ${weaponName}.`;
  }

  if (actorId === event.payload.target) {
    // Target perspective: "Alice slashes you with her sword."
    return `${actor.name} ${attackVerb} you with ${getPossessivePronoun(actor.gender)} ${weaponName}.`;
  }

  // Observer perspective: "Alice slashes Bob with her sword."
  return `${actor.name} ${attackVerb} ${target.name} with ${getPossessivePronoun(actor.gender)} ${weaponName}.`;
};

export const narrateActorWasAttacked: TemplateFunction<ActorWasAttacked, ActorURN> = (context, event, actorId) => {
  const { world, equipmentApi, skillApi: actorSkillApi } = context;
  const attacker = world.actors[event.payload.source];
  const target = world.actors[event.actor];
  const { damage, outcome, attackRating, evasionRating } = event.payload;

  if (!attacker || !target) {
    return '';
  }

  const weapon = equipmentApi.getEquippedWeaponSchema(attacker);
  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;

  // Generate narrative for all perspectives
  if (actorId === event.actor) {
    // actorId is the target being attacked
    return `You ${getDamageDescription(damage, Perspective.TARGET, weaponName, target, attackRating, evasionRating)}.`;
  }

  if (actorId === event.payload.source) {
    // actorId is the attacker
    return `You ${getDamageDescription(damage, Perspective.SELF, weaponName, target, attackRating, evasionRating)}.`;
  }

  // actorId is an observer
  return `${attacker.name} ${getDamageDescription(damage, Perspective.OBSERVER, weaponName, target, attackRating, evasionRating)}.`;
};

export const narrateActorDidDefend = withUserEventValidation(
  createPerspectiveTemplate<ActorDidDefend>(
    'You take a defensive stance.',
    (actorName) => `${actorName} takes a defensive stance.`
  )
);

export const narrateActorDidMoveInCombat: TemplateFunction<ActorDidMoveInCombat> = (context, event, actorId) => {
  const { world, equipmentApi } = context;
  const actor = world.actors[event.actor];

  // Use pre-computed values from event payload - no calculations needed!
  const distance = event.payload.distance;
  const direction = event.payload.direction === MovementDirection.FORWARD ? 'forward' : 'backward';

  // Enhanced movement descriptions based on distance and actor stats
  const actorStats = getAllStats(actor);
  const finesse = actorStats.fin?.eff || 0;
  const weapon = equipmentApi.getEquippedWeaponSchema(actor);

  const getMovementDescription = (isFirstPerson: boolean) => {
    const baseDirection = direction;
    const distanceText = `${distance}m`;

    // Movement style based on finesse and distance
    if (distance >= 3) {
      if (finesse >= 60) {
        return isFirstPerson
          ? `dash ${baseDirection} ${distanceText}`
          : `dashes ${baseDirection} ${distanceText}`;
      } else if (finesse >= 30) {
        return isFirstPerson
          ? `sprint ${baseDirection} ${distanceText}`
          : `sprints ${baseDirection} ${distanceText}`;
      } else {
        return isFirstPerson
          ? `charge ${baseDirection} ${distanceText}`
          : `charges ${baseDirection} ${distanceText}`;
      }
    } else if (distance >= 2) {
      if (finesse >= 60) {
        return isFirstPerson
          ? `glide ${baseDirection} ${distanceText}`
          : `glides ${baseDirection} ${distanceText}`;
      } else {
        return isFirstPerson
          ? `move ${baseDirection} ${distanceText}`
          : `moves ${baseDirection} ${distanceText}`;
      }
    } else {
      if (finesse >= 60) {
        return isFirstPerson
          ? `step ${baseDirection} ${distanceText}`
          : `steps ${baseDirection} ${distanceText}`;
      }
      return isFirstPerson
        ? `shift ${baseDirection} ${distanceText}`
        : `shifts ${baseDirection} ${distanceText}`;
    }
  };

  // Add tactical context if weapon has range preferences
  const getTacticalContext = () => {
    const optimalRange = weapon.range.optimal || 1;
    const newPosition = event.payload.to.coordinate;

    // This is simplified - in a real scenario we'd check distances to enemies
    if (direction === 'forward' && optimalRange <= 1) {
      return ' to close distance';
    }
    if (direction === 'backward' && optimalRange > 2) {
      return ' to gain range';
    }
    return '';
  };

  if (actorId === event.actor) {
    // actorId is the actor
    return `You ${getMovementDescription(true)}${getTacticalContext()}.`;
  }

  // actorId is an observer
  return `${actor.name} ${getMovementDescription(false)}${getTacticalContext()}.`;
};

export const narrateActorDidAcquireTarget: TemplateFunction<ActorDidAcquireTarget, ActorURN> = withInteractionValidation(
  (context, event, actorId) => {
    const { actors } = context.world;
    const actor = actors[event.actor];
    const target = actors[event.payload.target];

    if (!actor || !target) {
      return '';
    }

    return actorId === event.actor
      ? `You target ${target.name}.`
      : `${actor.name} targets ${target.name}.`;
  }
);

export const narrateActorDidDie: TemplateFunction<ActorDidDie> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.actor];

  if (actorId === event.actor) {
    // actorId is the actor
    return 'You have died!';
  }

  // actorId is an observer
  return `${actor.name} has been killed!`;
};

export const narrateCombatTurnDidEnd = createDynamicSystemPerspectiveTemplate<CombatTurnDidEnd>(
  (event) => event.payload.turnActor,
  (context, event) => `Your turn has ended.\nYou have recovered ${event.payload.energy.change} energy.`,
  (context, event, actorName) => `${actorName}'s turn ends.`
);

export const narrateCombatTurnDidStart = createSystemPerspectiveTemplate<CombatTurnDidStart>(
  (event) => event.payload.turnActor,
  'Your turn begins.',
  (actorName) => `${actorName}'s turn begins.`
);

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

export const narrateCombatSessionStarted = createSystemTemplate<CombatSessionStarted>(
  (context, event) => {
    const { namesByTeam } = event.payload;

    // Zero-copy iteration - collect side descriptions directly
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

    // Generate side-focused narrative
    if (side1Length === 1 && side2Length === 1) {
      return `${side1Desc} faces off against ${side2Desc}!`;
    }

    return `${side1Desc} clash with ${side2Desc}!`;
  }
);

export const narrateCombatSessionEnded = createSystemTemplate<CombatSessionEnded>(
  (context, event) => {
    const { winningTeam, finalRound } = event.payload;

    if (winningTeam) {
      return `Combat ends after ${finalRound} rounds. Team ${winningTeam.toUpperCase()} is victorious!`;
    }

    return `Combat ends after ${finalRound} rounds with no clear victor.`;
  }
);

export const narrateCombatSessionStatusDidChange = createSystemTemplate<CombatSessionStatusDidChange>(
  (context, event) => {
    const { currentStatus } = event.payload;

    switch (currentStatus) {
      case SessionStatus.RUNNING:
        return 'Combat is now active!';
      case SessionStatus.PAUSED:
        return 'Combat has been paused.';
      case SessionStatus.TERMINATED:
        return 'Combat has ended.';
      default:
        return `Combat status changed to ${currentStatus}.`;
    }
  }
);

export const narrateActorDidAssessRange: TemplateFunction<ActorDidAssessRange, ActorURN> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.actor];
  const target = world.actors[event.payload.target];
  const range = event.payload.range;
  const direction = event.payload.direction;

  if (actorId === event.actor) {
    // Get weapon information for the actor
    const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);
    const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;
    const weaponInfo = `Your ${weaponName}'s optimal range is ${weapon.range.optimal || 1}m.`;

    // Convert MovementDirection to readable text
    const directionText = direction === MovementDirection.FORWARD ? 'in front of you' : 'behind you';

    return `${target.name} is ${range}m away, ${directionText}.\n${weaponInfo}`;
  }

  // Third-person narrative for other observers
  return `${actor.name} is range to ${target.name} (${range}m).`;
};
