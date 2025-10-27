import { AttackOutcome, AttackType, MovementDirection } from '~/types/combat';
import {
  ActorDidAttack,
  ActorWasAttacked,
  ActorDidDie,
  ActorDidDefend,
  ActorDidAcquireTarget,
  ActorDidMoveInCombat,
  CombatTurnDidStart,
  CombatTurnDidEnd,
  EventType,
  CombatSessionStarted
} from '~/types/event';
import { ActorURN, SessionURN } from '~/types/taxonomy';
import { ActionCost } from '~/types/combat';
import { RollResultWithoutModifiers } from '~/types/dice';
import { BattlefieldPosition } from '~/types/combat';
import { CombatEventFactoryDependencies, DEFAULT_COMBAT_EVENT_FACTORY_DEPS } from './deps';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION, DEFAULT_TRACE, DEFAULT_COMBAT_SESSION } from '~/testing/constants';
import { WellKnownActor } from '~/types/actor';

// Generic transform function type
export type EventTransform<T> = (event: T) => T;

// Default values
const DEFAULT_SESSION_ID: SessionURN = DEFAULT_COMBAT_SESSION;

const DEFAULT_ROLL: Readonly<RollResultWithoutModifiers> = Object.freeze({
  dice: '1d20',
  values: [10],
  natural: 10,
  result: 10,
  bonus: 0,
});

const DEFAULT_COST: Readonly<ActionCost> = Object.freeze({
  ap: 2.5,
});

const DEFAULT_POSITION: Readonly<BattlefieldPosition> = Object.freeze({
  coordinate: 100,
  facing: 1,
  speed: 0,
});

// Identity function for when no transform is needed
const identity = <T>(x: T): T => x;

export function createActorDidDieEvent(
  transform: EventTransform<ActorDidDie> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidDie {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_DID_DIE,
    location: DEFAULT_LOCATION,
    actor: BOB_ID,
    trace: DEFAULT_TRACE,
    payload: {
      killer: ALICE_ID,
    },
  }) as ActorDidDie;

  return transform(baseEvent);
};

/**
 * Creates a COMBATANT_DID_ATTACK event for testing
 */
export function createActorDidAttackEvent(
  transform: EventTransform<ActorDidAttack> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidAttack {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_DID_ATTACK,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      target: 'flux:actor:test:target' as ActorURN,
      attackType: AttackType.STRIKE,
      cost: DEFAULT_COST,
      roll: DEFAULT_ROLL,
      attackRating: 75,
    },
  }) as ActorDidAttack;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_WAS_ATTACKED event for testing
 */
export function createActorWasAttackedEvent(
  transform: EventTransform<ActorWasAttacked> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorWasAttacked {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_WAS_ATTACKED,
    location: DEFAULT_LOCATION,
    actor: 'flux:actor:test:target' as ActorURN,
    trace: DEFAULT_TRACE,
    payload: {
      source: ALICE_ID,
      type: AttackType.STRIKE,
      outcome: AttackOutcome.HIT,
      attackRating: 75,
      evasionRating: 45,
      damage: 10,
    },
  }) as ActorWasAttacked;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_DID_DEFEND event for testing
 */
export function createActorDidDefendEvent(
  transform: EventTransform<ActorDidDefend> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidDefend {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_DID_DEFEND,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      cost: DEFAULT_COST,
    },
  }) as ActorDidDefend;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_DID_ACQUIRE_TARGET event for testing
 */
export function createActorDidAcquireTargetEvent(
  transform: EventTransform<ActorDidAcquireTarget> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidAcquireTarget {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_DID_ACQUIRE_TARGET,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_SESSION_ID,
      target: BOB_ID,
    },
  }) as ActorDidAcquireTarget;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_DID_MOVE event for testing
 */
export function createActorDidMoveInCombatEvent(
  transform: EventTransform<ActorDidMoveInCombat> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidMoveInCombat {
  const { createWorldEvent } = deps;

  const fromPosition = DEFAULT_POSITION;
  const toPosition = { ...DEFAULT_POSITION, coordinate: DEFAULT_POSITION.coordinate + 10 };
  const distance = Math.abs(toPosition.coordinate - fromPosition.coordinate);

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_DID_MOVE_IN_COMBAT,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      from: fromPosition,
      to: toPosition,
      distance: distance,
      direction: MovementDirection.FORWARD,
      cost: DEFAULT_COST,
    },
  }) as ActorDidMoveInCombat;

  return transform(baseEvent);
}

/**
 * Creates a COMBAT_TURN_DID_START event for testing
 */
export function createCombatTurnDidStartEvent(
  transform: EventTransform<CombatTurnDidStart> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatTurnDidStart {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.COMBAT_TURN_DID_START,
    location: DEFAULT_LOCATION,
    actor: WellKnownActor.SYSTEM,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_SESSION_ID,
      turnActor: ALICE_ID,
      round: 1,
      turn: 1,
    },
  }) as CombatTurnDidStart;

  return transform(baseEvent);
}

/**
 * Creates a COMBAT_TURN_DID_END event for testing
 */
export function createCombatTurnDidEndEvent(
  transform: EventTransform<CombatTurnDidEnd> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatTurnDidEnd {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.COMBAT_TURN_DID_END,
    location: DEFAULT_LOCATION,
    actor: WellKnownActor.SYSTEM,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_SESSION_ID,
      turnActor: ALICE_ID,
      round: 1,
      turn: 1,
      energy: { before: 1350, after: 1500, change: 150 },
    },
  }) as CombatTurnDidEnd;

  return transform(baseEvent);
}
export function createCombatSessionStartedEvent(
  transform: EventTransform<CombatSessionStarted> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatSessionStarted {
  const { createWorldEvent } = deps;

  const baseEvent: CombatSessionStarted = createWorldEvent({
    type: EventType.COMBAT_SESSION_DID_START,
    location: DEFAULT_LOCATION,
    actor: WellKnownActor.SYSTEM,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_SESSION_ID,
      initiative: [],
      combatants: [],
      namesByTeam: {},
    },
  });

  return transform(baseEvent);
}
