import { ActorURN } from '~/types/taxonomy';
import {
  CombatSession,
  Team,
  BattlefieldPosition,
  Combatant,
  Battlefield,
  CombatFacing
} from '~/types/combat';
import { TransformerContext } from '~/types/handler';
import { SessionStatus } from '~/types/session';
import { createCombatant, CreateCombatantDependencies, DEFAULT_CREATE_COMBATANT_DEPS } from '../combatant';

/**
 * Calculates automatic position and facing for a combatant based on team placement rules.
 */
const calculateCombatantInitialPosition = (
  team: string,
  existingCombatants: Map<ActorURN, Combatant>,
  battlefield: Battlefield
): BattlefieldPosition => {
  if (!team) {
    throw new Error('Team is required to calculate combatant initial position');
  }

  if (!battlefield) {
    throw new Error('Battlefield is required to calculate combatant initial position');
  }

  if (!existingCombatants) {
    throw new Error('Existing combatants are required to calculate combatant initial position');
  }

  // Position combatants based on their actual team value, not just order of addition
  // Team ALPHA goes to the left side (1/3), Team BRAVO goes to the right side (2/3)
  const isTeamAlpha = team === Team.ALPHA;

  if (isTeamAlpha) {
    return {
      coordinate: Math.floor(battlefield.length * (1/3)),
      facing: CombatFacing.RIGHT,
      speed: 0,
    };
  }

  return {
    coordinate: Math.floor(battlefield.length * (2/3)),
    facing: CombatFacing.LEFT,
    speed: 0,
  };
};

export interface CombatantManager {
  addCombatant: (
    actorId: ActorURN,
    team: string | Team,
    position?: BattlefieldPosition,
    didInitiateCombat?: boolean,
    deps?: CreateCombatantDependencies,
  ) => void;

  removeCombatant: (actorId: ActorURN) => void;
}

/**
 * Creates a combatant manager for adding and removing fighters from a combat session.
 */
export function createCombatantManager(
  context: TransformerContext,
  session: CombatSession,
): CombatantManager {
  const { world } = context;

  const addCombatant = (
    actorId: ActorURN,
    team: string,
    position?: BattlefieldPosition,
    didInitiateCombat?: boolean,
    deps: CreateCombatantDependencies = DEFAULT_CREATE_COMBATANT_DEPS,
  ) => {
    if (session.status === SessionStatus.RUNNING) {
      throw new Error('Cannot add combatants after combat has started');
    }

    if (session.data.combatants.has(actorId)) {
      throw new Error(`Combatant ${actorId} already exists`);
    }

    const actor = world.actors[actorId];
    if (!actor) {
      throw new Error(`Actor ${actorId} not found`);
    }

    actor.sessions[session.id] = deps.timestamp();

    const combatant = createCombatant(actor, team, (c: Combatant) => {
      return {
        ...c,
        team,
        position: position ?? calculateCombatantInitialPosition(
          team,
          session.data.combatants,
          session.data.battlefield
        ),
        balance: {
          ...c.balance,
          nat: { cur: 1, max: 1 },
        },
        didInitiateCombat: didInitiateCombat ? true : undefined,
      };
    }, deps);

    session.data.combatants.set(actorId, combatant);

    // Invalidate initiative cache since combatants changed
    session.data.initiativeSorted = false;
  };

  const removeCombatant = (actorId: ActorURN) => {
    if (session.status === SessionStatus.RUNNING) {
      throw new Error('Cannot remove combatants after combat has started');
    }

    const actor = world.actors[actorId];
    if (actor) {
      delete actor.sessions[session.id];
    }

    session.data.combatants.delete(actorId);

    // Invalidate initiative cache since combatants changed
    session.data.initiativeSorted = false;
  };

  return {
    addCombatant,
    removeCombatant,
  };
}
