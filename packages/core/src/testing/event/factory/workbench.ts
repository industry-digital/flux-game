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
import { CombatEventFactoryDependencies, DEFAULT_COMBAT_EVENT_FACTORY_DEPS } from './deps';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_TRACE, DEFAULT_SHELL_ID, DEFAULT_WORKBENCH_SESSION } from '~/testing/constants';

// Generic transform function type
type EventTransform<T> = (event: T) => T;

const identity = <T>(x: T): T => x;

/**
 * Creates a WORKBENCH_SESSION_DID_START event for testing
 */
export const createWorkbenchSessionDidStartEvent = (
  transform: EventTransform<WorkbenchSessionDidStart> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): WorkbenchSessionDidStart => {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    trace: DEFAULT_TRACE,
    type: EventType.WORKBENCH_SESSION_DID_START,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    session: DEFAULT_WORKBENCH_SESSION,
    payload: {
      sessionId: DEFAULT_WORKBENCH_SESSION,
    },
  }) as WorkbenchSessionDidStart;

  return transform(baseEvent);
}

/**
 * Creates a WORKBENCH_SESSION_DID_END event for testing
 */
export const createWorkbenchSessionDidEndEvent = (
  transform: EventTransform<WorkbenchSessionDidEnd> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): WorkbenchSessionDidEnd => {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    trace: DEFAULT_TRACE,
    type: EventType.WORKBENCH_SESSION_DID_END,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    session: DEFAULT_WORKBENCH_SESSION,
    payload: {},
  }) as WorkbenchSessionDidEnd;

  return transform(baseEvent);
}

/**
 * Creates a WORKBENCH_SHELL_MUTATION_STAGED event for testing
 */
export const createActorDidStageShellMutationEvent = (
  transform: EventTransform<ActorDidStageShellMutation> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidStageShellMutation => {
  const { createWorldEvent } = deps;

  const defaultMutation: StatMutation = {
    type: ShellMutationType.STAT,
    stat: Stat.POW,
    operation: StatMutationOperation.ADD,
    amount: 5,
  };

  const baseEvent = createWorldEvent({
    trace: DEFAULT_TRACE,
    type: EventType.ACTOR_DID_STAGE_SHELL_MUTATION,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    session: DEFAULT_WORKBENCH_SESSION,
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
export const createActorDidDiffShellMutationsEvent = (
  transform: EventTransform<ActorDidDiffShellMutations> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidDiffShellMutations => {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    trace: DEFAULT_TRACE,
    type: EventType.WORKBENCH_SHELL_MUTATIONS_DIFFED,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    session: DEFAULT_WORKBENCH_SESSION,
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
export const createActorDidUndoShellMutationsEvent = (
  transform: EventTransform<ActorDidUndoShellMutations> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidUndoShellMutations => {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    trace: DEFAULT_TRACE,
    type: EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    session: DEFAULT_WORKBENCH_SESSION,
    payload: {},
  }) as ActorDidUndoShellMutations;

  return transform(baseEvent);
}

/**
 * Creates a WORKBENCH_SHELL_MUTATIONS_COMMITTED event for testing
 */
export const createActorDidCommitShellMutationsEvent = (
  transform: EventTransform<ActorDidCommitShellMutations> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidCommitShellMutations => {
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
    trace: DEFAULT_TRACE,
    type: EventType.WORKBENCH_SHELL_MUTATIONS_COMMITTED,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    session: DEFAULT_WORKBENCH_SESSION,
    payload: {
      cost: 100,
      mutations: defaultMutations,
    },
  }) as ActorDidCommitShellMutations;

  return transform(baseEvent);
}

/**
 * Helper function to create stat mutations for testing
 */
export const createStatMutation = (
  stat: Stat = Stat.POW,
  operation: StatMutationOperation = StatMutationOperation.ADD,
  amount: number = 5
): StatMutation => {
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
export const createComponentMutation = (): ShellMutation => {
  return {
    type: ShellMutationType.COMPONENT,
    // Add component-specific fields as needed
  } as ShellMutation;
}

export const createActorDidListShellsEvent = (
  transform: EventTransform<ActorDidListShells> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidListShells => {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    trace: DEFAULT_TRACE,
    type: EventType.ACTOR_DID_LIST_SHELLS,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    session: DEFAULT_WORKBENCH_SESSION,
    payload: {},
  }) as ActorDidListShells;

  return transform(baseEvent);
}

/**
 * Creates an ACTOR_DID_ASSESS_SHELL_STATUS event for testing
 */
export const createActorDidAssessShellStatusEvent = (
  transform: EventTransform<ActorDidAssessShellStatus> = identity,
  deps: CombatEventFactoryDependencies = DEFAULT_COMBAT_EVENT_FACTORY_DEPS
): ActorDidAssessShellStatus => {
  const { createWorldEvent } = deps;

  const baseEvent = createWorldEvent({
    trace: DEFAULT_TRACE,
    type: EventType.ACTOR_DID_ASSESS_SHELL_STATUS,
    actor: ALICE_ID,
    location: DEFAULT_LOCATION,
    session: DEFAULT_WORKBENCH_SESSION,
    payload: {
      shellId: DEFAULT_SHELL_ID,
    },
  }) as ActorDidAssessShellStatus;

  return transform(baseEvent);
}
