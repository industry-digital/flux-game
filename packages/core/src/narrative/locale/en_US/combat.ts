import {
  CombatantDidAttack,
  CombatantDidDefend,
  CombatantDidMove,
  CombatantDidDie,
  CombatTurnDidEnd,
  CombatTurnDidStart,
  CombatRoundDidStart,
  CombatRoundDidEnd,
  CombatSessionStarted,
  CombatSessionEnded,
  CombatSessionStatusDidChange,
  CombatantDidRecoverAp,
  CombatantWasAttacked,
  CombatantDidAcquireRange,
} from '~/types/event';
import { MovementDirection } from '~/types/combat';
import { SessionStatus } from '~/types/session';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';
import {
  withUserEventValidation,
  withInteractionValidation,
  createPerspectiveTemplate,
  createSystemTemplate,
  createSystemPerspectiveTemplate,
  createDynamicSystemPerspectiveTemplate,
} from '~/narrative/util';
import { getAllStats, getMaxHp } from '~/worldkit/entity/actor';

export const renderAttackNarrative: TemplateFunction<CombatantDidAttack, ActorURN> = (context, event, actorId) => {
  const { world, equipmentApi } = context;
  const actor = world.actors[event.actor];
  const target = world.actors[event.payload.target];

  // Handle missing actors gracefully
  if (!actor || !target) {
    return '';
  }

  const weapon = equipmentApi.getEquippedWeaponSchema(actor);
  const { attackType, roll, attackRating } = event.payload;
  const weaponName = weapon.name;

  const actorStats = getAllStats(actor);

  // Generate weapon-specific attack verbs and descriptions
  const getAttackDescription = () => {
    const isHighRoll = roll.result >= 15; // High roll threshold
    const actorPower = actorStats.pow?.eff || 0;
    const actorFinesse = actorStats.fin?.eff || 0;
    const isPowerfulAttack = actorPower > actorFinesse;

    // Weapon-specific attack verbs based on weapon type and stats
    const weaponType = weapon.skill.split(':').slice(-1)[0] || 'generic';

    switch (weaponType) {
      case 'unarmed':
        // Special handling for bare hands combat with martial arts flavor
        if (attackType === 'cleave') {
          return isPowerfulAttack
            ? (isHighRoll ? 'unleashes a devastating spinning strike' : 'attempts a wide sweeping')
            : (isHighRoll ? 'executes a precise spinning technique' : 'tries a sweeping');
        }
        return isPowerfulAttack
          ? (isHighRoll ? 'delivers a crushing blow' : 'throws a heavy punch')
          : (isHighRoll ? 'strikes with lightning speed' : 'swings');

      case 'slash':
        if (attackType === 'cleave') {
          return isPowerfulAttack
            ? (isHighRoll ? 'unleashes a devastating sweeping' : 'swings in a wide')
            : (isHighRoll ? 'executes a precise sweeping' : 'attempts a sweeping');
        }
        return isPowerfulAttack
          ? (isHighRoll ? 'delivers a crushing' : 'swings their')
          : (isHighRoll ? 'strikes with a swift' : 'slashes with their');

      case 'pierce':
        return isPowerfulAttack
          ? (isHighRoll ? 'drives their' : 'thrusts their')
          : (isHighRoll ? 'darts forward with their' : 'jabs with their');

      case 'crush':
        return isPowerfulAttack
          ? (isHighRoll ? 'brings down their' : 'swings their')
          : (isHighRoll ? 'strikes precisely with their' : 'attacks with their');

      case 'pistol':
      case 'rifle':
      case 'shotgun':
        return isHighRoll ? 'fires their' : 'shoots their';

      default:
        return isPowerfulAttack
          ? (isHighRoll ? 'strikes powerfully with their' : 'attacks with their')
          : (isHighRoll ? 'strikes precisely with their' : 'attacks with their');
    }
  };

  const attackDescription = getAttackDescription();

  // Generate narrative for all perspectives
  if (actorId === event.actor) {
    // actorId is the attacker
    if (attackType === 'cleave') {
      return `You ${attackDescription} ${weaponName} in a sweeping attack!`;
    }
    return `You ${attackDescription.replace('their', 'your')} ${weaponName} at ${target.name}.`;
  }

  if (actorId === event.payload.target) {
    // actorId is the target
    if (attackType === 'cleave') {
      return `${actor.name} ${attackDescription} ${weaponName} in a sweeping attack!`;
    }
    return `${actor.name} ${attackDescription} ${weaponName} at you.`;
  }

  // actorId is an observer
  if (attackType === 'cleave') {
    return `${actor.name} ${attackDescription} ${weaponName} in a sweeping attack!`;
  }
  return `${actor.name} ${attackDescription} ${weaponName} at ${target.name}.`;
};

export const renderWasAttackedNarrative: TemplateFunction<CombatantWasAttacked, ActorURN> = (context, event, actorId) => {
  const { world, equipmentApi, actorSkillApi } = context;
  const attacker = world.actors[event.payload.source];
  const target = world.actors[event.actor];
  const { damage, outcome, attackRating, evasionRating } = event.payload;

  // Handle missing actors gracefully
  if (!attacker || !target) {
    return '';
  }

  const weapon = equipmentApi.getEquippedWeaponSchema(attacker);
  const weaponName = weapon.name;

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
          ? `barely avoids ${target.name} with the ${weaponName}`
          : `sidesteps the ${weaponName}`;
      }
    }

    const targetMaxHp = getMaxHp(target);
    const damagePercent = damage / targetMaxHp;

    // Damage intensity descriptions
    if (damagePercent >= 0.3) {
      if (perspective === 'target') {
        return `are devastated by the ${weaponName} for ${damage} damage`;
      } else if (perspective === 'attacker') {
        return `devastate ${target.name} with your ${weaponName} for ${damage} damage`;
      } else {
        return `brutally strikes ${target.name} with the ${weaponName} for ${damage} damage`;
      }
    } else if (damagePercent >= 0.15) {
      if (perspective === 'target') {
        return `are wounded severely by the ${weaponName} for ${damage} damage`;
      } else if (perspective === 'attacker') {
        return `land a solid hit on ${target.name} with your ${weaponName} for ${damage} damage`;
      } else {
        return `lands a solid hit on ${target.name} with the ${weaponName} for ${damage} damage`;
      }
    } else if (damagePercent >= 0.05) {
      if (perspective === 'target') {
        return `are struck by the ${weaponName} for ${damage} damage`;
      } else if (perspective === 'attacker') {
        return `hit ${target.name} with your ${weaponName} for ${damage} damage`;
      } else {
        return `hits ${target.name} with the ${weaponName} for ${damage} damage`;
      }
    } else {
      if (perspective === 'target') {
        return `are grazed by the ${weaponName} for ${damage} damage`;
      } else if (perspective === 'attacker') {
        return `barely scratch ${target.name} with your ${weaponName} for ${damage} damage`;
      } else {
        return `barely scratches ${target.name} with the ${weaponName} for ${damage} damage`;
      }
    }
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

export const renderDefendNarrative = withUserEventValidation(
  createPerspectiveTemplate<CombatantDidDefend>(
    'You take a defensive stance.',
    (actorName) => `${actorName} takes a defensive stance.`
  )
);

export const renderMoveNarrative: TemplateFunction<CombatantDidMove> = (context, event, actorId) => {
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
      } else {
        return isFirstPerson
          ? `shift ${baseDirection} ${distanceText}`
          : `shifts ${baseDirection} ${distanceText}`;
      }
    }
  };

  // Add tactical context if weapon has range preferences
  const getTacticalContext = () => {
    const optimalRange = weapon.range.optimal || 1;
    const newPosition = event.payload.to.coordinate;

    // This is simplified - in a real scenario we'd check distances to enemies
    if (direction === 'forward' && optimalRange <= 1) {
      return ' to close distance';
    } else if (direction === 'backward' && optimalRange > 2) {
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

export const renderTargetNarrative = withInteractionValidation(
  (context, event, actorId) => {
    const actor = context.world.actors[event.actor];
    const target = context.world.actors[event.payload.target];
    return actorId === event.actor
      ? `You target ${target.name}.`
      : `${actor.name} targets ${target.name}.`;
  }
);

export const renderDeathNarrative: TemplateFunction<CombatantDidDie> = (context, event, actorId) => {
  const { world } = context;
  const actor = world.actors[event.actor];

  if (actorId === event.actor) {
    // actorId is the actor
    return 'You have died!';
  }

  // actorId is an observer
  return `${actor.name} has been killed!`;
};

export const renderTurnEndNarrative = createDynamicSystemPerspectiveTemplate<CombatTurnDidEnd>(
  (event) => event.payload.turnActor,
  (context, event) => `Your turn has ended.\nYou have recovered ${event.payload.energy.change} energy.`,
  (context, event, actorName) => `${actorName}'s turn ends.`
);

export const renderTurnStartNarrative = createSystemPerspectiveTemplate<CombatTurnDidStart>(
  (event) => event.payload.turnActor,
  'Your turn begins.',
  (actorName) => `${actorName}'s turn begins.`
);

export const renderRoundStartNarrative = createSystemTemplate<CombatRoundDidStart>(
  (context, event) => `Round ${event.payload.round} begins!`
);

export const renderRoundEndNarrative = createSystemTemplate<CombatRoundDidEnd>(
  (context, event) => `Round ${event.payload.round} ends.`
);

export const renderCombatSessionStartNarrative = createSystemTemplate<CombatSessionStarted>(
  (context, event) => {
    const { world } = context;
    const combatantNames = event.payload.combatants.map(([actorId]) => world.actors[actorId]?.name).filter(Boolean);

    if (combatantNames.length <= 2) {
      return `Combat begins between ${combatantNames.join(' and ')}!`;
    }

    return `A fierce battle erupts involving ${combatantNames.length} combatants!`;
  }
);

export const renderCombatSessionEndNarrative = createSystemTemplate<CombatSessionEnded>(
  (context, event) => {
    const { winningTeam, finalRound } = event.payload;

    if (winningTeam) {
      return `Combat ends after ${finalRound} rounds. Team ${winningTeam.toUpperCase()} is victorious!`;
    }

    return `Combat ends after ${finalRound} rounds with no clear victor.`;
  }
);

export const renderCombatStatusChangeNarrative = createSystemTemplate<CombatSessionStatusDidChange>(
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

export const renderApRecoveryNarrative: TemplateFunction<CombatantDidRecoverAp, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor];
  const recovered = event.payload.recovered;

  if (recipientId === event.actor) {
    return `You recover ${recovered} action points.`;
  }

  return `${actor.name} recovers ${recovered} action points.`;
};

export const renderAcquireRangeNarrative: TemplateFunction<CombatantDidAcquireRange, ActorURN> = (context, event, actorId) => {
  const { world, schemaManager } = context;
  const actor = world.actors[event.actor];
  const target = world.actors[event.payload.target];
  const range = event.payload.range;
  const direction = event.payload.direction;

  if (actorId === event.actor) {
    // Get weapon information for the actor
    const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);
    const weaponInfo = `Your ${weapon.name.toLowerCase()}'s optimal range is ${weapon.range.optimal || 1}m.`;

    // Convert MovementDirection to readable text
    const directionText = direction === MovementDirection.FORWARD ? 'in front of you' : 'behind you';

    return `${target.name} is ${range}m away, ${directionText}.\n${weaponInfo}`;
  }

  // Third-person narrative for other observers
  return `${actor.name} is range to ${target.name} (${range}m).`;
};
