import { ActorURN, SessionURN } from '~/types/taxonomy';
import { WorkbenchSession, WorkbenchSessionData } from '~/types/workbench';
import { SessionStatus, SessionStrategy } from '~/types/session';
import { EntityType } from '~/types/entity/entity';
import { uniqid as uniqidImpl, BASE62_CHARSET } from '~/lib/random';
import { TransformerContext, WorldProjection } from '~/types/handler';
import { createSessionId } from '~/worldkit/session';

const uniqid = () => uniqidImpl(16, BASE62_CHARSET);

export type CreateWorkbenchSessionDependencies = {
  uniqid?: () => string;
};

export type WorkbenchSessionInput = {
  id?: SessionURN;
  actorId: ActorURN;
  initialShellId?: string;
};

/**
 * Creates a new workbench session for the specified actor.
 */
export const createWorkbenchSession = (
  context: TransformerContext,
  input: WorkbenchSessionInput,
): WorkbenchSession => {
  const { uniqid } = context;
  const { world } = context;

  const actor = world.actors[input.actorId];
  if (!actor) {
    throw new Error(`Actor not found in world projection`);
  }

  // Invariant: Actor always has a currentShellId
  const currentShellId = input.initialShellId ?? actor.currentShell;
  if (!currentShellId) {
    throw new Error(`Actor has no current shell!`);
  }

  // Invariant: Actor always has a shell with the given ID
  if (!actor.shells[currentShellId]) {
    throw new Error(`Shell ${currentShellId} not found for actor ${input.actorId}`);
  }

  const data: WorkbenchSessionData = {
    currentShellId,
    pendingChanges: [],
  };

  return {
    id: input.id ?? `flux:session:workbench:${uniqid()}`,
    type: EntityType.SESSION,
    strategy: SessionStrategy.WORKBENCH,
    status: SessionStatus.PENDING,
    data,
    log: [],
  };
};

/**
 * Creates a unique workbench session ID.
 */
export function createWorkbenchSessionId(key: string = uniqid()): SessionURN {
  return createSessionId(SessionStrategy.WORKBENCH, key);
}

/**
 * Retrieves an existing workbench session from the world.
 */
export const getWorkbenchSession = (
  world: WorldProjection,
  sessionId: SessionURN,
): WorkbenchSession | undefined => {
  return world.sessions[sessionId] as WorkbenchSession | undefined;
};

export type WorkbenchSessionApi = {
  session: WorkbenchSession;
  isNew: boolean;
};

/**
 * Hook-style utility for managing workbench session lifecycle
 */
export const createWorkbenchSessionApi = (
  context: TransformerContext,
  actorId: ActorURN,
  sessionId?: SessionURN,
  initialShellId?: string,
): WorkbenchSessionApi => {
  const { world } = context;

  let isNew = !sessionId;
  sessionId ??= createWorkbenchSessionId();

  let session!: WorkbenchSession;

  if (isNew) {
    session = createWorkbenchSession(context, {
      id: sessionId,
      actorId,
      initialShellId,
    });
    // Store the new session in the world context so it can be retrieved later
    world.sessions[sessionId] = session;
  } else {
    session = getWorkbenchSession(world, sessionId)!;
  }

  if (!session) {
    throw new Error(`Workbench session ${sessionId} not found`);
  }

  return {
    session,
    isNew,
  };
};
