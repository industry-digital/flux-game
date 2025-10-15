import { AttackOutcome, AttackType, MovementDirection } from '~/types/combat';
import {
  CombatantDidAttack,
  CombatantWasAttacked,
  CombatantDidDie,
  CombatantDidDefend,
  CombatantDidAcquireTarget,
  CombatantDidMove,
  CombatantDidRecoverAp,
  CombatTurnDidStart,
  CombatTurnDidEnd,
  EventType,
  CombatSessionStarted
} from '~/types/event';
import { ActorURN, SessionURN } from '~/types/taxonomy';
import { ActionCost } from '~/types/combat';
import { RollResult } from '~/types/dice';
import { BattlefieldPosition } from '~/types/combat';
import { CombatEventFactoryDependencies, DEFAULT_COMBAT_EVENT_FACTORY_DEPS } from './deps';
import { ALICE_ID, BOB_ID } from '~/testing/constants';
import { WellKnownActor } from '~/types/actor';

// Transform function types for each factory
export type CombatantDidAttackTransform = (event: CombatantDidAttack) => CombatantDidAttack;
export type CombatantWasAttackedTransform = (event: CombatantWasAttacked) => CombatantWasAttacked;
export type CombatantDidDieTransform = (event: CombatantDidDie) => CombatantDidDie;
export type CombatantDidDefendTransform = (event: CombatantDidDefend) => CombatantDidDefend;
export type CombatantDidAcquireTargetTransform = (event: CombatantDidAcquireTarget) => CombatantDidAcquireTarget;
export type CombatantDidMoveTransform = (event: CombatantDidMove) => CombatantDidMove;
export type CombatantDidRecoverApTransform = (event: CombatantDidRecoverAp) => CombatantDidRecoverAp;
export type CombatTurnDidStartTransform = (event: CombatTurnDidStart) => CombatTurnDidStart;
export type CombatTurnDidEndTransform = (event: CombatTurnDidEnd) => CombatTurnDidEnd;

// Default values
const DEFAULT_LOCATION = 'flux:place:test';
const DEFAULT_TRACE = 'test-trace';
const DEFAULT_SESSION_ID: SessionURN = 'flux:session:combat:test';

const DEFAULT_ROLL: Readonly<RollResult> = Object.freeze({
  dice: '1d20',
  values: [10],
  natural: 10,
  result: 10,
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

/**
 * Creates a COMBATANT_DID_ATTACK event for testing
 */
export function createCombatantDidAttackEvent(
  transform: CombatantDidAttackTransform = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatantDidAttack {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.COMBATANT_DID_ATTACK,
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
  }) as CombatantDidAttack;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_WAS_ATTACKED event for testing
 */
export function createCombatantWasAttackedEvent(
  transform: CombatantWasAttackedTransform = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatantWasAttacked {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.COMBATANT_WAS_ATTACKED,
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
  }) as CombatantWasAttacked;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_DID_DIE event for testing
 */
export function createCombatantDidDieEvent(
  transform: CombatantDidDieTransform = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatantDidDie {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.COMBATANT_DID_DIE,
    location: DEFAULT_LOCATION,
    actor: BOB_ID,
    trace: DEFAULT_TRACE,
    payload: {
      killer: ALICE_ID,
    },
  }) as CombatantDidDie;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_DID_DEFEND event for testing
 */
export function createCombatantDidDefendEvent(
  transform: CombatantDidDefendTransform = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatantDidDefend {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.COMBATANT_DID_DEFEND,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      cost: DEFAULT_COST,
    },
  }) as CombatantDidDefend;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_DID_ACQUIRE_TARGET event for testing
 */
export function createCombatantDidAcquireTargetEvent(
  transform: CombatantDidAcquireTargetTransform = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatantDidAcquireTarget {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.COMBATANT_DID_ACQUIRE_TARGET,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_SESSION_ID,
      target: BOB_ID,
    },
  }) as CombatantDidAcquireTarget;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_DID_MOVE event for testing
 */
export function createCombatantDidMoveEvent(
  transform: CombatantDidMoveTransform = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatantDidMove {
  const { createWorldEvent } = deps;

  const fromPosition = DEFAULT_POSITION;
  const toPosition = { ...DEFAULT_POSITION, coordinate: DEFAULT_POSITION.coordinate + 10 };
  const distance = Math.abs(toPosition.coordinate - fromPosition.coordinate);

  const baseEvent = createWorldEvent({
    type: EventType.COMBATANT_DID_MOVE,
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
  }) as CombatantDidMove;

  return transform(baseEvent);
}

/**
 * Creates a COMBATANT_DID_RECOVER_AP event for testing
 */
export function createCombatantDidRecoverApEvent(
  transform: CombatantDidRecoverApTransform = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): CombatantDidRecoverAp {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.COMBATANT_DID_RECOVER_AP,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      before: 10.0,
      after: 12.0,
      recovered: 2.0,
    },
  }) as CombatantDidRecoverAp;

  return transform(baseEvent);
}

/**
 * Creates a COMBAT_TURN_DID_START event for testing
 */
export function createCombatTurnDidStartEvent(
  transform: CombatTurnDidStartTransform = identity,
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
  transform: CombatTurnDidEndTransform = identity,
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
type CombatSessionStartedTransform = (event: CombatSessionStarted) => CombatSessionStarted;
export function createCombatSessionStartedEvent(
  transform: CombatSessionStartedTransform = identity,
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
    },
  });

  return transform(baseEvent);
}
