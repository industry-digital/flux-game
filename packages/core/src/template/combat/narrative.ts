import { CombatSession } from '~/types/combat';
import { CombatSessionEnded, CombatSessionStarted } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';
import { areEnemies } from '~/worldkit/combat/team';

type AlliesAndEnemies = {
  allies: ActorURN[];
  enemies: ActorURN[];
};

export type RenderCombatSessionStartedInput = Omit<CombatSessionStarted, 'narrative'>;
export type RenderCombatSessionEndedInput = Omit<CombatSessionEnded, 'narrative'>;

export type CombatNarrativeRenderer = {
  renderCombatSessionStarted: (event: RenderCombatSessionStartedInput, as: ActorURN) => string;
  renderCombatSessionEnded: (event: RenderCombatSessionEndedInput, as: ActorURN) => string;
};

export const createCombatNarrativeRenderer = (
  context: TransformerContext,
  session: CombatSession,
  relationCache: Map<ActorURN, AlliesAndEnemies> = new Map(),
 ) => {
  const { actors, places } = context.world;
  const { equipmentApi } = context;

  const computeAlliesAndEnemies = (as: ActorURN): AlliesAndEnemies => {
    const cached = relationCache.get(as);
    if (cached) {
      return cached as AlliesAndEnemies;
    }

    let allies: ActorURN[] = [];
    let enemies: ActorURN[] = [];

    for (const [actorId] of session.data.combatants) {
      if (actorId === as) continue;
      if (areEnemies(as, actorId, session.data.combatants)) {
        enemies.push(actorId);
      } else {
        allies.push(actorId);
      }
    }

    const out = { allies, enemies };
    relationCache.set(as, out);
    return out;
  };

  const renderCombatSessionStarted = (input: RenderCombatSessionStartedInput, as: ActorURN): string => {
    const { allies, enemies } = computeAlliesAndEnemies(as);

    // Handle edge case where there are no enemies
    if (enemies.length === 0) {
      return 'Combat has started, but there are no enemies present.';
    }

    const parts: string[] = [];

    // Get initiative and position data from the event
    const initiativeMap = new Map(input.payload.initiative);
    const combatantMap = new Map(input.payload.combatants);
    const currentCombatant = combatantMap.get(as);

    // Create opening based on who initiated combat
    const initiator = [...combatantMap.entries()].find(([, summary]) => summary.didInitiateCombat);
    const didInitiate = initiator && initiator[0] === as;

    if (didInitiate) {
      parts.push(createInitiatorNarrative(as, enemies, actors));
    } else {
      parts.push(createDefenderNarrative(as, enemies, actors, initiator?.[0]));
    }

    // Add ally information with more context
    if (allies.length > 0) {
      parts.push(createAllyNarrative(allies, actors));
    }

    // Add location context
    const location = places[input.location];
    if (location?.description?.base) {
      parts.push(`The battle takes place ${location.description.base.toLowerCase()}.`);
    }

    // Add tactical situation based on initiative and positioning
    if (currentCombatant) {
      const tacticalInfo = createTacticalNarrative(as, initiativeMap, combatantMap, actors);
      if (tacticalInfo) {
        parts.push(tacticalInfo);
      }

      // Add positioning information
      const positionInfo = createPositionNarrative(as, combatantMap, actors);
      if (positionInfo) {
        parts.push(positionInfo);
      }
    }

    return parts.join('\n');
  };

  // Fast variant: Inline ally/enemy computation, skip expensive features
  const renderCombatSessionStartedFast = (event: CombatSessionStarted, as: ActorURN): string => {
    const combatantMap = new Map(event.payload.combatants);
    const myTeam = combatantMap.get(as)?.team;

    if (!myTeam) {
      return 'Combat has started.';
    }

    // Inline ally/enemy computation - single pass
    const allies: string[] = [];
    const enemies: string[] = [];

    for (const [actorId, summary] of combatantMap) {
      if (actorId === as) continue;

      if (summary.team === myTeam) {
        allies.push(actors[actorId].name);
      } else {
        enemies.push(actors[actorId].name);
      }
    }

    if (enemies.length === 0) {
      return 'Combat has started, but there are no enemies present.';
    }

    // Simple narrative without equipment/positioning lookups
    const initiator = [...combatantMap.entries()].find(([, summary]) => summary.didInitiateCombat);
    const didInitiate = initiator && initiator[0] === as;

    let result = didInitiate
      ? `You engage ${formatActorList(enemies)} in combat!`
      : `You find yourself in combat against ${formatActorList(enemies)}.`;

    if (allies.length > 0) {
      result += `\nFighting alongside you: ${formatActorList(allies)}.`;
    }

    return result;
  };

  // Minimal variant: Skip ally/enemy computation entirely
  const renderCombatSessionStartedMinimal = (event: CombatSessionStarted, as: ActorURN): string => {
    const combatantMap = new Map(event.payload.combatants);
    const totalCombatants = combatantMap.size;

    // Just count enemies without computing the full lists
    const myTeam = combatantMap.get(as)?.team;
    let enemyCount = 0;

    if (myTeam) {
      for (const [actorId, summary] of combatantMap) {
        if (actorId !== as && summary.team !== myTeam) {
          enemyCount++;
        }
      }
    }

    if (enemyCount === 0) {
      return 'Combat has started, but there are no enemies present.';
    }

    const initiator = [...combatantMap.entries()].find(([, summary]) => summary.didInitiateCombat);
    const didInitiate = initiator && initiator[0] === as;

    return didInitiate
      ? `You initiate combat against ${enemyCount} ${enemyCount === 1 ? 'enemy' : 'enemies'}.`
      : `Combat begins! You face ${enemyCount} ${enemyCount === 1 ? 'enemy' : 'enemies'}.`;
  };

  const createInitiatorNarrative = (
    actorId: ActorURN,
    enemies: ActorURN[],
    actors: Record<ActorURN, any>
  ): string => {
    const actor = actors[actorId];
    const weapon = equipmentApi.getEquippedWeaponSchema(actor);
    const weaponDesc = weapon ? ` with your ${weapon.name}` : '';

    const enemyNames = enemies.map(id => actors[id].name);
    const templates = [
      `You strike first${weaponDesc}, engaging ${formatActorList(enemyNames)} in combat!`,
      `You launch into battle against ${formatActorList(enemyNames)}${weaponDesc}!`,
      `Combat erupts as you face off against ${formatActorList(enemyNames)}${weaponDesc}!`
    ];
    return templates[Math.floor(context.random() * templates.length)];
  };

  const createDefenderNarrative = (
    actorId: ActorURN,
    enemies: ActorURN[],
    actors: Record<ActorURN, any>,
    initiatorId?: ActorURN
  ): string => {
    const actor = actors[actorId];
    const weapon = equipmentApi.getEquippedWeaponSchema(actor);
    const readyWeapon = weapon ? ` You ready your ${weapon.name}.` : '';

    const enemyNames = enemies.map(id => actors[id].name);
    if (initiatorId && enemies.includes(initiatorId)) {
      const initiatorName = actors[initiatorId].name;
      const initiatorWeapon = equipmentApi.getEquippedWeaponSchema(actors[initiatorId]);
      const weaponDesc = initiatorWeapon ? ` with ${initiatorWeapon.name}` : '';
      return `${initiatorName} attacks${weaponDesc}! You find yourself in combat against ${formatActorList(enemyNames)}.${readyWeapon}`;
    }
    return `You are suddenly engaged in combat against ${formatActorList(enemyNames)}!${readyWeapon}`;
  };

  const createAllyNarrative = (allies: ActorURN[], actors: Record<ActorURN, any>): string => {
    const allyNames = allies.map(id => actors[id].name);
    const templates = [
      `Fighting alongside you: ${formatActorList(allyNames)}.`,
      `Your allies ${formatActorList(allyNames)} stand ready to fight.`,
      `${formatActorList(allyNames)} join the battle at your side.`
    ];
    return templates[Math.floor(context.random() * templates.length)];
  };

  const createTacticalNarrative = (
    actorId: ActorURN,
    initiative: Map<ActorURN, any>,
    combatants: Map<ActorURN, any>,
    actors: Record<ActorURN, any>
  ): string | null => {
    const myInitiative = initiative.get(actorId);
    if (!myInitiative) return null;

    // Single pass: count actors with higher initiative and find the one closest above us
    let actorsWithHigherInitiative = 0;
    let actorBeforeMe: ActorURN | null = null;
    let lowestHigherInitiative = Infinity;

    for (const [otherId, otherInitiative] of initiative.entries()) {
      if (otherId === actorId) continue;

      if (otherInitiative.result > myInitiative.result) {
        actorsWithHigherInitiative++;
        // Track the actor with the lowest initiative that's still higher than ours
        // (acts immediately before us in turn order)
        if (otherInitiative.result < lowestHigherInitiative) {
          actorBeforeMe = otherId;
          lowestHigherInitiative = otherInitiative.result;
        }
      }
    }

    const totalActors = initiative.size;
    const myPosition = actorsWithHigherInitiative;

    if (myPosition === 0) {
      return "You act first this round.";
    }

    if (myPosition === totalActors - 1) {
      return "You will act last this round.";
    }

    if (actorBeforeMe) {
      const actorBefore = actors[actorBeforeMe];
      return `${actorBefore.name} acts before you.`;
    }

    return null; // Fallback
  };

  const createPositionNarrative = (
    actorId: ActorURN,
    combatants: Map<ActorURN, any>,
    actors: Record<ActorURN, any>
  ): string | null => {
    const myCombatant = combatants.get(actorId);
    if (!myCombatant?.position) return null;

    const myPosition = myCombatant.position.coordinate;
    const battlefield = session.data.battlefield;
    const combatZoneStart = battlefield.margin;
    const combatZoneEnd = battlefield.length - battlefield.margin;

    // Describe position relative to battlefield
    if (myPosition < combatZoneStart) {
      return "You find yourself at the far left of the battlefield.";
    }
    if (myPosition > combatZoneEnd) {
      return "You find yourself at the far right of the battlefield.";
    }
    // In combat zone - describe relative to enemies
    const enemies = [...combatants.entries()]
      .filter(([id, summary]) => id !== actorId && summary.team !== myCombatant.team)
      .map(([id, summary]) => ({ id, position: summary.position.coordinate }));

    if (enemies.length === 0) return null;

    const closestEnemy = enemies.reduce((closest, enemy) =>
      Math.abs(enemy.position - myPosition) < Math.abs(closest.position - myPosition)
        ? enemy : closest
    );

    const distance = Math.abs(closestEnemy.position - myPosition);
    const enemyName = actors[closestEnemy.id].name;

    if (distance < 10) {
      return `You are in close quarters with ${enemyName}.`;
    }
    if (distance < 50) {
      return `${enemyName} is nearby, within striking distance.`;
    }

    return `${enemyName} is positioned across the battlefield from you.`;
  };

  const formatActorList = (names: string[]): string => {
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} and ${names[1]}`;
    return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
  };

  const renderCombatSessionEnded = (event: CombatSessionEnded, as: ActorURN): string => {
    const { allies, enemies } = computeAlliesAndEnemies(as);
    const commaSeparatedEnemies = enemies.map(actorId => actors[actorId].name).join(', ');

    // Determine if player won by checking if their team matches the winning team
    const playerCombatant = session.data.combatants.get(as);
    const playerTeam = playerCombatant?.team;
    const didWin = event.payload.winningTeam === playerTeam;

    const preamble = `You have ${didWin ? 'won' : 'lost'} the combat against ${commaSeparatedEnemies}.`;

    return preamble;
  };

  return {
    renderCombatSessionStarted,
    renderCombatSessionStartedFast,
    renderCombatSessionStartedMinimal,
    renderCombatSessionEnded,
  };
};
