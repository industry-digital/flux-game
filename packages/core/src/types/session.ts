import { AbstractEntity, EntityType } from '~/types/entity/entity';

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
   * The session is not running, and may not be started again
   */
  TERMINATED = 'terminated',
}

export type AbstractSessionData<TSessionStrategy extends SessionStrategy> = {
  strategy: TSessionStrategy;
};

export type AbstractSession<
  TSessionType extends SessionStrategy,
  TSessionData extends AbstractSessionData<TSessionType>,
  TSessionLogEntry extends Record<string, unknown>,
> = AbstractEntity<EntityType.SESSION> & {
  status: SessionStatus;
  data: TSessionData;
  log: TSessionLogEntry[];
};
