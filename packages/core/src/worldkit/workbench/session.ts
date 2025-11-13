import { ActorURN, SessionURN } from '~/types/taxonomy';
import { WorkbenchSession, WorkbenchSessionData } from '~/types/workbench';
import { SessionStatus, SessionStrategy } from '~/types/entity/session';
import { EntityType } from '~/types/entity/entity';
import { uniqid as uniqidImpl, BASE62_CHARSET } from '~/lib/random';
import { TransformerContext } from '~/types/handler';
import { WorldProjection } from '~/types/world';
import { createSessionId } from '~/worldkit/session/util';
import { ActorDidListShells, EventType, WorkbenchSessionDidStart } from '~/types/event';
import { createWorldEvent } from '~/worldkit/event';

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

  // Invariant: Workbench only works with PCs that have shells
  if (!actor.shells || !actor.currentShell) {
    throw new Error(`Workbench requires actor with shells (PCs only)`);
  }

  const currentShellId = input.initialShellId ?? actor.currentShell;
  if (!currentShellId) {
    throw new Error(`Actor has no current shell!`);
  }

  // Invariant: Actor always has a shell with the given ID
  if (!actor.shells[currentShellId]) {
    throw new Error(`Shell ${currentShellId} not found for actor ${input.actorId}`);
  }

  const data: WorkbenchSessionData = {
    actorId: input.actorId,
    currentShellId,
    pendingMutations: [],
  };

  return {
    id: input.id ?? `flux:session:workbench:${uniqid()}`,
    type: EntityType.SESSION,
    strategy: SessionStrategy.WORKBENCH,
    status: SessionStatus.PENDING,
    data,
  };
};

/**
 * Creates a unique workbench session ID.
 */
export const createWorkbenchSessionId = (key: string = uniqid()): SessionURN => {
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

export const getWorkbenchSessionOrFail = (
  world: WorldProjection,
  sessionId: SessionURN,
): WorkbenchSession => {
  const session = getWorkbenchSession(world, sessionId);
  if (!session) {
    throw new Error(`Workbench session ${sessionId} not found`);
  }
  return session;
};

export type WorkbenchSessionApi = {
  session: WorkbenchSession;
  isNew: boolean;
};

const NO_PAYLOAD: Readonly<{}> = Object.freeze({});

/**
 * Hook-style utility for managing workbench session lifecycle
 */
export const createWorkbenchSessionApi = (
  context: TransformerContext,
  actorId: ActorURN,
  trace: string,
  sessionId?: SessionURN,
): WorkbenchSessionApi => {
  const { world } = context;

  // Invariant: Actor always exists in world projection
  const actor = world.actors[actorId];
  if (!actor) {
    throw new Error(`Actor not found in world projection`);
  }

  // Invariant: Actor always has a location
  if (!actor.location) {
    throw new Error(`Actor has no location`);
  }

  let isNew = !sessionId;
  sessionId ??= createWorkbenchSessionId();

  let session!: WorkbenchSession;

  if (!isNew) {
    session = getWorkbenchSessionOrFail(world, sessionId);
  }
  else {
    session = createWorkbenchSession(context, {
      id: sessionId,
      actorId,
    });

    const workbenchSessionDidStart: WorkbenchSessionDidStart = createWorldEvent({
      trace,
      type: EventType.WORKBENCH_SESSION_DID_START,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: NO_PAYLOAD,
    });


    const actorDidListShells: ActorDidListShells = createWorldEvent({
      trace,
      type: EventType.ACTOR_DID_LIST_SHELLS,
      actor: actor.id,
      location: actor.location,
      session: session.id,
      payload: NO_PAYLOAD,
    });

    context.declareEvent(workbenchSessionDidStart);
    context.declareEvent(actorDidListShells);

    // Store the new session in the world context so it can be retrieved later
    world.sessions[sessionId] = session;
  }

  return {
    session,
    isNew,
  };
};
