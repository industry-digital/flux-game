import { AbstractEntity, EntityType } from '~/types/entity/entity';
import { WorkbenchSession } from '~/types/workbench';
import { CombatSession } from '~/worldkit/combat';

export enum SessionStrategy {
  COMBAT = 'combat',
  WORKBENCH = 'workbench',
}

export enum SessionStatus {
  /**
   * The session is initialized but not yet started
   */
  PENDING = 'pending',

  /**
   * The session is running
   */
  RUNNING = 'running',

  /**
   * The session is paused
   */
  PAUSED = 'paused',

  /**
   * The session has permanently ended
   */
  TERMINATED = 'terminated',
}

export type AbstractSession<
  TSessionStrategy extends SessionStrategy,
  TSessionData,
> = AbstractEntity<EntityType.SESSION> & {
  strategy: TSessionStrategy;
  status: SessionStatus;
  data: TSessionData;
};

/**
 * A session is a temporary data structure that records the state of complex, multi-entity scenarios over time.
 * A session persists across any number of actor commands until some condition is met.
 *
 * Examples
 * - Combat session persists until the combat is over. It tracks combatants, their positions, rounds, initiative, etc.
 * - Workbench session persists until the actor exits the workbench. It tracks the mutations to be applied to a shell.
 */
export type Session = CombatSession | WorkbenchSession;
