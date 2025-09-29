import { AbstractSession, AbstractSessionData, SessionStrategy } from '~/types/session';

export type ShellMutation = any;

export type WorkbenchSessionData = AbstractSessionData<SessionStrategy.WORKBENCH> & {
  currentShellId: string;
  pendingChanges: ShellMutation[]; // TODO: Figure out the shape of the changes
};

export type WorkbenchSession = AbstractSession<SessionStrategy.WORKBENCH, WorkbenchSessionData>;
