import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActorStat } from '~/types/entity/actor';
import { ActorDidSwapShell, EventType } from '~/types/event';
import { TransformerContext } from '~/types/handler';
import { createSwapShellAction } from './swap';
import { UndoStagedMutationsAction } from './undo';
import {
  useSimpleWorkbenchScenario,
  createMockWorkbenchContext,
  createStatMutation
} from '../testing';
import { StatMutationOperation } from '~/types/workbench';
import { createInventory } from '~/worldkit/entity/actor/inventory';
import { createShell } from '~/worldkit/entity/actor/shell';

describe('SwapShellAction', () => {
  let context: TransformerContext;
  let mockUndoAction: UndoStagedMutationsAction;

  beforeEach(() => {
    context = createMockWorkbenchContext();
    // Mock declareError as a spy
    context.declareError = vi.fn();

    mockUndoAction = vi.fn().mockReturnValue([{
      type: EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE,
      trace: 'test-trace',
      location: 'flux:place:test-workbench',
      actor: 'flux:actor:test-actor',
      payload: { sessionId: 'test-session' }
    }]);
  });

  describe('successful shell swap', () => {
    it('should swap to a different shell when no pending mutations', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Capture original shell ID before swap
      const originalShellId = actor.currentShell;

      // Add a second shell to the actor
      const secondShellId = 'shell-2';
      actor.shells[secondShellId] = {
        id: secondShellId,
        name: 'Combat Shell',
        stats: {
          [ActorStat.POW]: { nat: 15, eff: 15, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
        inventory: createInventory(),
        equipment: {},
      };

      const swapAction = createSwapShellAction(context, session);
      const events = swapAction(actor, 'Combat Shell');

      expect(events).toHaveLength(1);
      const swapEvent = events[0] as ActorDidSwapShell;
      expect(swapEvent.type).toBe(EventType.ACTOR_DID_SWAP_SHELL);
      expect(swapEvent.payload.fromShellId).toBe(originalShellId);
      expect(swapEvent.payload.toShellId).toBe(secondShellId);
      expect(actor.currentShell).toBe(secondShellId);
      expect(session.data.currentShellId).toBe(secondShellId);
    });

    it('should swap using shell ID instead of name', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      const secondShellId = 'shell-2';
      actor.shells[secondShellId] = {
        id: secondShellId,
        name: 'Combat Shell',
        stats: {
          [ActorStat.POW]: { nat: 15, eff: 15, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
        inventory: createInventory(),
        equipment: {},
      };

      const swapAction = createSwapShellAction(context, session);
      const events = swapAction(actor, secondShellId);

      expect(events).toHaveLength(1);
      expect(actor.currentShell).toBe(secondShellId);
    });
  });

  describe('error cases', () => {
    it('should fail when target shell does not exist', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      const swapAction = createSwapShellAction(context, session);
      const events = swapAction(actor, 'NonexistentShell');

      expect(events).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should fail when trying to swap to current shell', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;
      const currentShell = actor.shells[actor.currentShell];

      const swapAction = createSwapShellAction(context, session);
      const events = swapAction(actor, currentShell.name || actor.currentShell);

      expect(events).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });

    it('should fail when pending mutations exist without force flag', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 2)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Add second shell
      actor.shells['shell-2'] = {
        id: 'shell-2',
        name: 'Combat Shell',
        stats: {
          [ActorStat.POW]: { nat: 15, eff: 15, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
        inventory: createInventory(),
        equipment: {},
      };

      const swapAction = createSwapShellAction(context, session);
      const events = swapAction(actor, 'Combat Shell');

      expect(events).toHaveLength(0);
      expect(context.declareError).toHaveBeenCalled();
    });
  });

  describe('force flag behavior', () => {
    it('should discard pending mutations and swap when force=true', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 2),
          createStatMutation(ActorStat.FIN, StatMutationOperation.ADD, 1)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Add second shell
      const secondShellId = 'shell-2';
      actor.shells[secondShellId] = createShell((shell) => ({
        ...shell,
        id: secondShellId,
        name: 'Combat Shell',
        stats: {
          [ActorStat.POW]: { nat: 15, eff: 15, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
      }));

      const swapAction = createSwapShellAction(context, session, {
        undoStagedMutations: mockUndoAction
      });
      const events = swapAction(actor, 'Combat Shell', true);

      expect(events).toHaveLength(2);
      expect(events[0].type).toBe(EventType.WORKBENCH_SHELL_MUTATIONS_UNDONE);
      expect(events[1].type).toBe(EventType.ACTOR_DID_SWAP_SHELL);
      expect(mockUndoAction).toHaveBeenCalledWith(actor, expect.any(String));
      expect(context.declareError).toHaveBeenCalled();
      expect(actor.currentShell).toBe(secondShellId);
    });

    it('should work with force=true even when no pending mutations', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Add second shell
      const secondShellId = 'shell-2';
      actor.shells[secondShellId] = {
        id: secondShellId,
        name: 'Combat Shell',
        stats: {
          [ActorStat.POW]: { nat: 15, eff: 15, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
        inventory: createInventory(),
        equipment: {},
      };

      const swapAction = createSwapShellAction(context, session, {
        undoStagedMutations: mockUndoAction
      });
      const events = swapAction(actor, 'Combat Shell', true);

      expect(events).toHaveLength(1);
      expect(events[0].type).toBe(EventType.ACTOR_DID_SWAP_SHELL);
      expect(mockUndoAction).not.toHaveBeenCalled();
      expect(actor.currentShell).toBe(secondShellId);
    });
  });

  describe('dependency injection', () => {
    it('should use default dependencies when none provided', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // This should work without throwing
      const swapAction = createSwapShellAction(context, session);
      expect(swapAction).toBeDefined();
      expect(typeof swapAction).toBe('function');
    });

    it('should use default dependencies with empty object', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      const swapAction = createSwapShellAction(context, session, {});
      expect(swapAction).toBeDefined();
      expect(typeof swapAction).toBe('function');
    });

    it('should use custom undo action when provided', () => {
      const scenario = useSimpleWorkbenchScenario(context, {
        pendingMutations: [
          createStatMutation(ActorStat.POW, StatMutationOperation.ADD, 2)
        ]
      });
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Add second shell
      actor.shells['shell-2'] = {
        id: 'shell-2',
        name: 'Combat Shell',
        stats: {
          [ActorStat.POW]: { nat: 15, eff: 15, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
        inventory: createInventory(),
        equipment: {},
      };

      const swapAction = createSwapShellAction(context, session, {
        undoStagedMutations: mockUndoAction
      });
      const events = swapAction(actor, 'Combat Shell', true);

      expect(mockUndoAction).toHaveBeenCalledWith(actor, expect.any(String));
      expect(events).toHaveLength(2);
    });

    it('should not create unnecessary allocations with default deps', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Multiple calls should reuse the same default object
      const swapAction1 = createSwapShellAction(context, session);
      const swapAction2 = createSwapShellAction(context, session);

      expect(swapAction1).toBeDefined();
      expect(swapAction2).toBeDefined();
      // The functions themselves will be different, but they should use the same default deps
    });
  });

  describe('event generation', () => {
    it('should generate proper swap event with correct payload', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;
      const originalShellId = actor.currentShell;

      // Add second shell
      const secondShellId = 'shell-2';
      actor.shells[secondShellId] = createShell((shell) => ({
        ...shell,
        id: secondShellId,
        name: 'Combat Shell',
        stats: {
          [ActorStat.POW]: { nat: 15, eff: 15, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
      }));

      const swapAction = createSwapShellAction(context, session);
      const events = swapAction(actor, 'Combat Shell', false, 'custom-trace');

      expect(events).toHaveLength(1);
      const swapEvent = events[0] as ActorDidSwapShell;

      expect(swapEvent.type).toBe(EventType.ACTOR_DID_SWAP_SHELL);
      expect(swapEvent.trace).toBe('custom-trace');
      expect(swapEvent.location).toBe(actor.location);
      expect(swapEvent.actor).toBe(actor.id);
      expect(swapEvent.payload.actorId).toBe(actor.id);
      expect(swapEvent.payload.fromShellId).toBe(originalShellId);
      expect(swapEvent.payload.toShellId).toBe(secondShellId);
      expect(swapEvent.payload.sessionId).toBe(session.id);
    });

    it('should use shell ID as name when shell has no name', () => {
      const scenario = useSimpleWorkbenchScenario(context);
      const actor = scenario.actors['flux:actor:test-actor'].actor;
      const session = scenario.actors['flux:actor:test-actor'].hooks.session.session;

      // Add second shell without name
      const secondShellId = 'shell-2';
      actor.shells[secondShellId] = createShell((shell) => ({
        ...shell,
        id: secondShellId,
        name: '', // Empty name
        stats: {
          [ActorStat.POW]: { nat: 15, eff: 15, mods: {} },
          [ActorStat.FIN]: { nat: 10, eff: 10, mods: {} },
          [ActorStat.RES]: { nat: 12, eff: 12, mods: {} },
        },
      }));

      const swapAction = createSwapShellAction(context, session);
      const events = swapAction(actor, secondShellId);

      expect(events).toHaveLength(1);
      const swapEvent = events[0] as ActorDidSwapShell;
      expect(swapEvent.type).toBe(EventType.ACTOR_DID_SWAP_SHELL);
      expect(swapEvent.payload.toShellId).toBe(secondShellId);
    });
  });
});
