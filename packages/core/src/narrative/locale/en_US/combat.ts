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
import { Actor, Gender } from '~/types/entity/actor';
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

const HIS = 'his';
const HER = 'her';
/**
 * Get the appropriate possessive pronoun based on actor gender
 */
const getPossessivePronoun = (gender: Gender): string => {
  return gender === Gender.MALE ? HIS : HER;
};

/**
 * Get localized weapon name from schema (en_US)
 */
const getLocalizedSchemaTranslation = (context: TransformerContext, schemaUrn: SchemaURN): SchemaTranslation => {
  return context.getSchemaTranslation(Locale.en_US, schemaUrn);
};

type DamageTypeNarrative = {
  verb: string;
  impact: string;
  weaponAction: string;
  weaponActionThirdPerson: string;
}

const SLASH_NARRATIVE: Readonly<DamageTypeNarrative> = Object.freeze({
  verb: 'slashes',
  impact: 'cutting through the air',
  weaponAction: 'sweep',
  weaponActionThirdPerson: 'sweeps'
});

const PIERCE_NARRATIVE: Readonly<DamageTypeNarrative> = Object.freeze({
  verb: 'thrusts',
  impact: 'piercing through',
  weaponAction: 'drive',
  weaponActionThirdPerson: 'drives'
});

const IMPACT_NARRATIVE: Readonly<DamageTypeNarrative> = Object.freeze({
  verb: 'strikes',
  impact: 'smashing with force',
  weaponAction: 'swing',
  weaponActionThirdPerson: 'swings'
});

const KINETIC_NARRATIVE: Readonly<DamageTypeNarrative> = Object.freeze({
  verb: 'strikes',
  impact: 'striking with force',
  weaponAction: 'swing',
  weaponActionThirdPerson: 'swings'
});

const THERMAL_NARRATIVE: Readonly<DamageTypeNarrative> = Object.freeze({
  verb: 'burns',
  impact: 'burning with heat',
  weaponAction: 'burn',
  weaponActionThirdPerson: 'burns'
});

const EXPLOSIVE_NARRATIVE: Readonly<DamageTypeNarrative> = Object.freeze({
  verb: 'detonates',
  impact: 'detonating with force',
  weaponAction: 'detonate',
  weaponActionThirdPerson: 'detonates'
});

const DEFAULT_DAMAGE_TYPE_NARRATIVE: Readonly<DamageTypeNarrative> = Object.freeze({
  verb: 'attacks',
  impact: 'striking',
  weaponAction: 'wield',
  weaponActionThirdPerson: 'wields'
});

const NARRATIVES_BY_DAMAGE_TYPE: Record<DamageType, DamageTypeNarrative> = {
  [DamageType.KINETIC]: KINETIC_NARRATIVE,
  [DamageType.THERMAL]: THERMAL_NARRATIVE,
  [DamageType.EXPLOSIVE]: EXPLOSIVE_NARRATIVE,
  [DamageType.SLASH]: SLASH_NARRATIVE,
  [DamageType.PIERCE]: PIERCE_NARRATIVE,
  [DamageType.IMPACT]: IMPACT_NARRATIVE,
};

/**
 * Maps damage types to narrative descriptors for combat text
 */
const getDamageTypeNarrative = (damageType: DamageType): DamageTypeNarrative => {
  return NARRATIVES_BY_DAMAGE_TYPE[damageType] ?? DEFAULT_DAMAGE_TYPE_NARRATIVE;
};

const narrateCleaveAttack = (context: any, actor: Actor, targets: Actor[], weapon: WeaponSchema, viewerActorId: ActorURN): string => {
  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;
  const possessive = getPossessivePronoun(actor.gender);
  const primaryDamageType = getPrimaryDamageType(weapon) ?? DamageType.SLASH;

  // Pierce Brown style: simple, direct verbs
  const getVerb = (perspective: 'first' | 'third') => {
    const firstPersonVerbs = {
      [DamageType.SLASH]: 'sweep',
      [DamageType.PIERCE]: 'drive',
      [DamageType.IMPACT]: 'swing',
      [DamageType.KINETIC]: 'swing',
      [DamageType.THERMAL]: 'sweep',
      [DamageType.EXPLOSIVE]: 'swing'
    };

    const thirdPersonVerbs = {
      [DamageType.SLASH]: 'sweeps',
      [DamageType.PIERCE]: 'drives',
      [DamageType.IMPACT]: 'swings',
      [DamageType.KINETIC]: 'swings',
      [DamageType.THERMAL]: 'sweeps',
      [DamageType.EXPLOSIVE]: 'swings'
    };

    const verbs = perspective === 'first' ? firstPersonVerbs : thirdPersonVerbs;
    return verbs[primaryDamageType] || (perspective === 'first' ? 'swing' : 'swings');
  };

  if (viewerActorId === actor.id) {
    // Attacker perspective: "You sweep your sword in a wide arc."
    const verb = getVerb('first');
    if (targets.length === 0) {
      return `You ${verb} your ${weaponName} in a wide arc.`;
    } else if (targets.length === 1) {
      return `You ${verb} your ${weaponName} at ${targets[0].name}.`;
    } else if (targets.length === 2) {
      return `You ${verb} your ${weaponName} at ${targets[0].name} and ${targets[1].name}.`;
    } else {
      const lastTarget = targets[targets.length - 1];
      const otherTargets = targets.slice(0, -1);
      return `You ${verb} your ${weaponName} at ${otherTargets.map(t => t.name).join(', ')}, and ${lastTarget.name}.`;
    }
  } else {
    // Observer/target perspective: "Alice sweeps her sword in a wide arc."
    const verb = getVerb('third');
    if (targets.length === 0) {
      return `${actor.name} ${verb} ${possessive} ${weaponName} in a wide arc.`;
    } else if (targets.length === 1) {
      return `${actor.name} ${verb} ${possessive} ${weaponName} at ${targets[0].name}.`;
    } else if (targets.length === 2) {
      return `${actor.name} ${verb} ${possessive} ${weaponName} at ${targets[0].name} and ${targets[1].name}.`;
    } else {
      const lastTarget = targets[targets.length - 1];
      const otherTargets = targets.slice(0, -1);
      return `${actor.name} ${verb} ${possessive} ${weaponName} at ${otherTargets.map(t => t.name).join(', ')}, and ${lastTarget.name}.`;
    }
  }
};

export const narrateActorDidAttack: TemplateFunction<ActorDidAttack, ActorURN> = (context, event, actorId) => {
  const { world, equipmentApi } = context;
  const actor = world.actors[event.actor];

  // Handle CLEAVE vs STRIKE attack types
  if (event.payload.attackType === AttackType.CLEAVE) {
    const targets = event.payload.targets.map(id => world.actors[id]).filter(Boolean);
    if (!actor || targets.length === 0) {
      return '';
    }
    return narrateCleaveAttack(context, actor, targets, equipmentApi.getEquippedWeaponSchema(actor), actorId);
  }

  // Handle STRIKE attacks (original logic)
  const target = world.actors[event.payload.target];
  if (!actor || !target) {
    return '';
  }

  const weapon = equipmentApi.getEquippedWeaponSchema(actor);
  const { roll } = event.payload;
  const weaponName = getLocalizedSchemaTranslation(context, weapon.urn).name.singular;

  const actorStats = getAllStats(actor);

  // Pierce Brown style: short, visceral, direct
  const primaryDamageType = getPrimaryDamageType(weapon) ?? DamageType.SLASH;
  const isHighRoll = roll.result >= 15;
  const actorPower = actorStats.pow?.eff || 0;
  const actorFinesse = actorStats.fin?.eff || 0;
  const isPowerfulAttack = actorPower > actorFinesse;

  // Get the right verb based on damage type and attack style
  const getAttackVerb = (perspective: 'first' | 'third') => {
    const firstPersonVerbs = {
      [DamageType.SLASH]: isPowerfulAttack ? 'hack' : 'slash',
      [DamageType.PIERCE]: isPowerfulAttack ? 'drive' : 'stab',
      [DamageType.IMPACT]: isPowerfulAttack ? 'crush' : 'strike',
      [DamageType.KINETIC]: 'strike',
      [DamageType.THERMAL]: 'burn',
      [DamageType.EXPLOSIVE]: 'blast'
    };

    const thirdPersonVerbs = {
      [DamageType.SLASH]: isPowerfulAttack ? 'hacks' : 'slashes',
      [DamageType.PIERCE]: isPowerfulAttack ? 'drives' : 'stabs',
      [DamageType.IMPACT]: isPowerfulAttack ? 'crushes' : 'strikes',
      [DamageType.KINETIC]: 'strikes',
      [DamageType.THERMAL]: 'burns',
      [DamageType.EXPLOSIVE]: 'blasts'
    };

    const verbs = perspective === 'first' ? firstPersonVerbs : thirdPersonVerbs;
    return verbs[primaryDamageType] || (perspective === 'first' ? 'strike' : 'strikes');
  };

  // Generate narrative for all perspectives (STRIKE attacks only)
  if (actorId === event.actor) {
    // Attacker perspective: "You slash Bob with your sword."
    const verb = getAttackVerb('first');
    return `You ${verb} ${target.name} with your ${weaponName}.`;
  }

  if (actorId === event.payload.target) {
    // Target perspective: "Alice slashes you with her sword."
    const verb = getAttackVerb('third');
    return `${actor.name} ${verb} you with ${getPossessivePronoun(actor.gender)} ${weaponName}.`;
  }

  // Observer perspective: "Alice slashes Bob with her sword."
  const verb = getAttackVerb('third');
  return `${actor.name} ${verb} ${target.name} with ${getPossessivePronoun(actor.gender)} ${weaponName}.`;
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

  // Enhanced damage descriptions based on damage amount and target health
  const getDamageDescription = (damage: number, perspective: 'target' | 'attacker' | 'observer') => {
    if (damage === 0) {
      // Miss descriptions based on evasion vs attack rating
      const isCloseCall = Math.abs(attackRating - evasionRating) <= 2;
      if (perspective === 'target') {
        return isCloseCall
          ? `narrowly dodges the ${weaponName}`
          : `easily evades the ${weaponName}`;
      } else if (perspective === 'attacker') {
        return isCloseCall
          ? `narrowly misses ${target.name} with your ${weaponName}`
          : `misses ${target.name} completely with your ${weaponName}`;
      } else {
        return isCloseCall
          ? `barely misses ${target.name} with the ${weaponName}`
          : `misses ${target.name} with the ${weaponName}`;
      }
    }

    const targetMaxHp = getMaxHp(target);
    const damagePercent = damage / targetMaxHp;

    // Damage intensity descriptions
    if (damagePercent >= 0.3) {
      if (perspective === 'target') {
        return `are devastated by the ${weaponName} for ${damage} damage`;
      }
      if (perspective === 'attacker') {
        return `devastate ${target.name} with your ${weaponName} for ${damage} damage`;
      }
      return `brutally strikes ${target.name} with the ${weaponName} for ${damage} damage`;
    }

    if (damagePercent >= 0.15) {
      if (perspective === 'target') {
        return `are wounded severely by the ${weaponName} for ${damage} damage`;
      }
      if (perspective === 'attacker') {
        return `land a solid hit on ${target.name} with your ${weaponName} for ${damage} damage`;
      }
      return `lands a solid hit on ${target.name} with the ${weaponName} for ${damage} damage`;
    }

    if (damagePercent >= 0.05) {
      if (perspective === 'target') {
        return `are struck by the ${weaponName} for ${damage} damage`;
      }
      if (perspective === 'attacker') {
        return `hit ${target.name} with your ${weaponName} for ${damage} damage`;
      }
      return `hits ${target.name} with the ${weaponName} for ${damage} damage`;
    }

    if (perspective === 'target') {
      return `are grazed by the ${weaponName} for ${damage} damage`;
    }
    if (perspective === 'attacker') {
      return `barely scratch ${target.name} with your ${weaponName} for ${damage} damage`;
    }
    return `barely scratches ${target.name} with the ${weaponName} for ${damage} damage`;
  };

  // Generate narrative for all perspectives
  if (actorId === event.actor) {
    // actorId is the target being attacked
    return `You ${getDamageDescription(damage, 'target')}.`;
  }

  if (actorId === event.payload.source) {
    // actorId is the attacker
    return `You ${getDamageDescription(damage, 'attacker')}.`;
  }

  // actorId is an observer
  return `${attacker.name} ${getDamageDescription(damage, 'observer')}.`;
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
