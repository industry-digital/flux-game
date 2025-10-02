import { CombatSession } from '~/types/combat';
import { CombatantDidDie, CombatSessionEnded, CombatSessionStarted } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';
import { AlliesAndEnemies, computeAlliesAndEnemies } from '~/worldkit/combat/team';

export type RenderCombatSessionStartedInput = Omit<CombatSessionStarted, 'narrative'>;
export type RenderCombatSessionEndedInput = Omit<CombatSessionEnded, 'narrative'>;

export type CombatNarrativeRenderer = {
  renderCombatSessionStarted: (as: ActorURN, event: RenderCombatSessionStartedInput) => string;
  renderCombatSessionEnded: (as: ActorURN, event: RenderCombatSessionEndedInput) => string;
  renderCombatantDidDie: (as: ActorURN, event: CombatantDidDie, deadActor: ActorURN) => string;
};

export const createCombatNarrativeRenderer = (
  context: TransformerContext,
  session: CombatSession,
  relationCache: Map<ActorURN, AlliesAndEnemies> = new Map(),
 ) => {
  const { actors } = context.world;
  const { equipmentApi } = context;

  let initiator: ActorURN | null = null;

  for (const [actorId, combatant] of session.data.combatants) {
    if (combatant.didInitiateCombat) {
      initiator = actorId;
      break;
    }
  }

  const cachedComputeAlliesAndEnemies = (as: ActorURN): AlliesAndEnemies => {
    const cached = relationCache.get(as);
    if (cached) {
      return cached;
    }
    const out = computeAlliesAndEnemies(as, session.data.combatants);
    relationCache.set(as, out);
    return out;
  };


  const renderCombatSessionStarted = (input: RenderCombatSessionStartedInput, as: ActorURN): string => {
    const { enemies } = cachedComputeAlliesAndEnemies(as);
    const didInitiate = initiator && initiator === as;
    const enemyNames = enemies.map(actorId => actors[actorId].name);

    return didInitiate
      ? `You engage ${formatActorList(enemyNames)} in combat!`
      : `You find yourself in combat against ${formatActorList(enemyNames)}.`;
  };

  const renderCombatSessionEnded = (event: CombatSessionEnded, as: ActorURN): string => {
    const { allies, enemies } = cachedComputeAlliesAndEnemies(as);
    const commaSeparatedEnemies = enemies.map(actorId => actors[actorId].name).join(', ');

    // Determine if player won by checking if their team matches the winning team
    const playerCombatant = session.data.combatants.get(as);
    const playerTeam = playerCombatant?.team;
    const didWin = event.payload.winningTeam === playerTeam;

    const preamble = `You have ${didWin ? 'won' : 'lost'} the combat against ${commaSeparatedEnemies}.`;

    return preamble;
  };

  const renderCombatantDidDie = (event: CombatantDidDie, deadActor: ActorURN, as: ActorURN): string => {
    const deadActorName = actors[deadActor].name;
    return `${deadActorName} has died!`;
  };

  return {
    renderCombatSessionStarted,
    renderCombatSessionEnded,
    renderCombatantDidDie,
  };
};

const formatActorList = (names: string[]): string => {
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
};
