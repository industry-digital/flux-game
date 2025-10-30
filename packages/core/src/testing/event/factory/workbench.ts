import {
  WorkbenchSessionDidStart,
  WorkbenchSessionDidEnd,
  ActorDidStageShellMutation,
  ActorDidDiffShellMutations,
  ActorDidUndoShellMutations,
  ActorDidCommitShellMutations,
  EventType,
  ActorDidListShells,
  ActorDidAssessShellStatus,
} from '~/types/event';
import { ShellMutation, ShellMutationType, StatMutation, StatMutationOperation } from '~/types/workbench';
import { ShellStat, Stat } from '~/types/entity/actor';
import { SessionURN } from '~/types/taxonomy';
import { CombatEventFactoryDependencies, DEFAULT_COMBAT_EVENT_FACTORY_DEPS } from './deps';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_TRACE, DEFAULT_SHELL_ID } from '~/testing/constants';

// Generic transform function type
export type EventTransform<T> = (event: T) => T;

// Default values
const DEFAULT_WORKBENCH_SESSION: SessionURN = 'flux:session:workbench:test';
const identity = <T>(x: T): T => x;

/**
 * Creates a WORKBENCH_SESSION_DID_START event for testing
 */
export function createWorkbenchSessionDidStartEvent(
  transform: EventTransform<WorkbenchSessionDidStart> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): WorkbenchSessionDidStart {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.WORKBENCH_SESSION_DID_START,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_WORKBENCH_SESSION,
    },
  }) as WorkbenchSessionDidStart;

  return transform(baseEvent);
}

/**
 * Creates a WORKBENCH_SESSION_DID_END event for testing
 */
export function createWorkbenchSessionDidEndEvent(
  transform: EventTransform<WorkbenchSessionDidEnd> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): WorkbenchSessionDidEnd {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.WORKBENCH_SESSION_DID_END,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_WORKBENCH_SESSION,
    },
  }) as WorkbenchSessionDidEnd;

  return transform(baseEvent);
}

/**
 * Creates a WORKBENCH_SHELL_MUTATION_STAGED event for testing
 */
export function createActorDidStageShellMutationEvent(
  transform: EventTransform<ActorDidStageShellMutation> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidStageShellMutation {
  const { createWorldEvent } = deps;

  const defaultMutation: StatMutation = {
    type: ShellMutationType.STAT,
    stat: Stat.POW,
    operation: StatMutationOperation.ADD,
    amount: 5,
  };

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_DID_STAGE_SHELL_MUTATION,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      shellId: DEFAULT_SHELL_ID,
      mutation: defaultMutation,
    },
  }) as ActorDidStageShellMutation;

  return transform(baseEvent);
}

/**
 * Creates a WORKBENCH_SHELL_MUTATIONS_DIFFED event for testing
 */
export function createActorDidDiffShellMutationsEvent(
  transform: EventTransform<ActorDidDiffShellMutations> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidDiffShellMutations {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      shellId: DEFAULT_SHELL_ID,
      cost: 0,
      stats: {},
      perf: {
        gapClosing10: '2.5',
        gapClosing100: '15.2',
        avgSpeed10: '4.0',
        avgSpeed100: '6.6',
        peakPowerOutput: '5000',
        componentPowerDraw: '1200',
        freePower: '3800',
        weaponDps: '25.5',
        weaponDamage: '50',
        weaponApCost: '120',
        totalMassKg: '850.0',
        inertialMassKg: '680.0',
        inertiaReduction: '0.2',
        powerToWeightRatio: '5.9',
        topSpeed: '12.5',
        capacitorCapacity: '50000',
        maxRechargeRate: '2500',
      },
    },
  }) as ActorDidDiffShellMutations;

  return transform(baseEvent);
}

/**
 * Creates a WORKBENCH_SHELL_MUTATIONS_UNDONE event for testing
 */
export function createActorDidUndoShellMutationsEvent(
  transform: EventTransform<ActorDidUndoShellMutations> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidUndoShellMutations {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_WORKBENCH_SESSION,
    },
  }) as ActorDidUndoShellMutations;

  return transform(baseEvent);
}

/**
 * Creates a WORKBENCH_SHELL_MUTATIONS_COMMITTED event for testing
 */
export function createActorDidCommitShellMutationsEvent(
  transform: EventTransform<ActorDidCommitShellMutations> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidCommitShellMutations {
  const { createWorldEvent } = deps;

  const defaultMutations: ShellMutation[] = [
    {
      type: ShellMutationType.STAT,
      stat: Stat.POW,
      operation: StatMutationOperation.ADD,
      amount: 5,
    },
  ];

  const baseEvent = createWorldEvent({
    type: EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_WORKBENCH_SESSION,
      cost: 100,
      mutations: defaultMutations,
    },
  }) as ActorDidCommitShellMutations;

  return transform(baseEvent);
}

/**
 * Helper function to create stat mutations for testing
 */
export function createStatMutation(
  stat: Stat = Stat.POW,
  operation: StatMutationOperation = StatMutationOperation.ADD,
  amount: number = 5
): StatMutation {
  return {
    type: ShellMutationType.STAT,
    stat: stat as ShellStat,
    operation,
    amount,
  };
}

/**
 * Helper function to create component mutations for testing
 */
export function createComponentMutation(): ShellMutation {
  return {
    type: ShellMutationType.COMPONENT,
    // Add component-specific fields as needed
  } as ShellMutation;
}

export function createActorDidListShellsEvent(
  transform: EventTransform<ActorDidListShells> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidListShells {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_DID_LIST_SHELLS,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {},
  }) as ActorDidListShells;

  return transform(baseEvent);
}

/**
 * Creates an ACTOR_DID_ASSESS_SHELL_STATUS event for testing
 */
export function createActorDidAssessShellStatusEvent(
  transform: EventTransform<ActorDidAssessShellStatus> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidAssessShellStatus {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    type: EventType.ACTOR_DID_ASSESS_SHELL_STATUS,
    location: DEFAULT_LOCATION,
    actor: ALICE_ID,
    trace: DEFAULT_TRACE,
    payload: {
      sessionId: DEFAULT_WORKBENCH_SESSION,
      shellId: DEFAULT_SHELL_ID,
    },
  }) as ActorDidAssessShellStatus;

  return transform(baseEvent);
}
