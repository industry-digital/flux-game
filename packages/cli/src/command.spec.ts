import { describe, it, expect, beforeEach, vi } from 'vitest';
import { processCommand } from './command';
import {
  ReplState,
  ReplCommand,
  ReplCommandType,
  ReplEffect,
  ReplEffectType,
  ReplMemo,
} from './types';
import { ProcessGameCommandDependencies } from './command';
import {
  ActorURN,
  PlaceURN,
  SessionURN,
  WorldProjection,
  createActor,
  createPlace,
  createTransformerContext,
  createWorldProjection,
  createWorldScenario,
} from '@flux/core';

const DEFAULT_SESSION: SessionURN = 'flux:session:workbench:test';
const DEFAULT_TRACE = 'test-trace-123';
const DEFAULT_LOCATION: PlaceURN = 'flux:place:default';
const ALICE_ID: ActorURN = 'flux:actor:alice';
const BOB_ID: ActorURN = 'flux:actor:bob';

// Type-safe effect testing utilities
const findFirstEffectOfType = <T extends ReplEffectType>(
  effects: ReplEffect[],
  type: T
): Extract<ReplEffect, { type: T }> | undefined => {
  return effects.find(effect => effect.type === type) as Extract<ReplEffect, { type: T }> | undefined;
};

const findAllEffectsOfType = <T extends ReplEffectType>(
  effects: ReplEffect[],
  type: T
): Extract<ReplEffect, { type: T }>[] => {
  return effects.filter(effect => effect.type === type) as Extract<ReplEffect, { type: T }>[];
};

const expectEffectOfType = <T extends ReplEffectType>(
  effects: ReplEffect[],
  type: T
): Extract<ReplEffect, { type: T }> => {
  const effect = findFirstEffectOfType(effects, type);
  expect(effect).toBeDefined();
  return effect!;
};

const expectPrintEffect = (effects: ReplEffect[], expectedText?: string | RegExp) => {
  const printEffect = expectEffectOfType(effects, ReplEffectType.PRINT);
  if (expectedText) {
    if (typeof expectedText === 'string') {
      expect(printEffect.text).toContain(expectedText);
    } else {
      expect(printEffect.text).toMatch(expectedText);
    }
  }
  return printEffect;
};

const expectEffectSequence = (effects: ReplEffect[], expectedTypes: ReplEffectType[]) => {
  expect(effects).toHaveLength(expectedTypes.length);
  expectedTypes.forEach((expectedType, index) => {
    expect(effects[index].type).toBe(expectedType);
  });
};

const expectGameCommandEventFlow = (effects: ReplEffect[]) => {
  // Common pattern: PAUSE_INPUT -> narrative effects -> FLUSH_OUTPUT -> RESUME_INPUT
  expect(effects.length).toBeGreaterThanOrEqual(3);
  expect(effects[0].type).toBe(ReplEffectType.PAUSE_INPUT);
  expect(effects[effects.length - 2].type).toBe(ReplEffectType.FLUSH_OUTPUT);
  expect(effects[effects.length - 1].type).toBe(ReplEffectType.RESUME_INPUT);
};

describe('processCommand', () => {
  let state: ReplState;
  let deps: ProcessGameCommandDependencies;
  let effects: ReplEffect[];
  let mockAddEffect: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Create mock world
    const world = createWorldProjection((w: WorldProjection) => ({
      ...w,
      actors: {
        ...w.actors,
        [ALICE_ID]: createActor((a) => ({ ...a, name: 'Alice', location: DEFAULT_LOCATION })),
        [BOB_ID]: createActor((a) => ({ ...a, name: 'Bob', location: DEFAULT_LOCATION })),
      },
      places: {
        ...w.places,
        [DEFAULT_LOCATION]: createPlace((p) => ({ ...p, name: 'Default Location' })),
      },
    }));

    // Create mock state
    const context = createTransformerContext();
    context.world = world;
    context.resetEvents = vi.fn();
    context.resetErrors = vi.fn();
    context.getDeclaredEvents = vi.fn().mockReturnValue([]);
    context.getDeclaredErrors = vi.fn().mockReturnValue([]);

    state = {
      context,
      scenario: createWorldScenario(context),
      currentActor: undefined,
      memo: { actors: { sessions: new Map(), locations: new Map() } } as ReplMemo,
      running: true,
    };

    // Create mock dependencies with effect tracking
    effects = [];
    mockAddEffect = vi.fn((effect: ReplEffect) => {
      effects.push(effect);
    });

    deps = {
      executeIntent: vi.fn().mockReturnValue(context),
      createIntent: vi.fn().mockReturnValue({ id: DEFAULT_TRACE }),
      getActorSession: vi.fn(),
      getActorLocation: vi.fn(),
      setActorSession: vi.fn(),
      removeActorSession: vi.fn(),
      setActorLocation: vi.fn(),
    };

    vi.clearAllMocks();
  });

  describe('GAME_COMMAND', () => {
    it('should handle empty input', () => {
      const command: ReplCommand = {
        type: ReplCommandType.GAME_COMMAND,
        input: '',
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expectPrintEffect(effects, 'No input provided.\n');
    });

    it('should handle whitespace-only input', () => {
      const command: ReplCommand = {
        type: ReplCommandType.GAME_COMMAND,
        input: '   \t\n  ',
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: 'No input provided.\n'
      });
    });

    it('should require current actor to be set', () => {
      const command: ReplCommand = {
        type: ReplCommandType.GAME_COMMAND,
        input: 'look around',
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: 'No actor context set. Use "actor <id>" first.\n'
      });
    });

    it('should require actor location to be set', () => {
      state.currentActor = ALICE_ID as ActorURN;
      deps.getActorLocation = vi.fn().mockReturnValue(undefined);

      const command: ReplCommand = {
        type: ReplCommandType.GAME_COMMAND,
        input: 'look around',
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: 'No actor context set. Use "actor <id>" first.\n'
      });
    });

    it('should execute game command successfully with no events or errors', () => {
      state.currentActor = ALICE_ID as ActorURN;
      deps.getActorLocation = vi.fn().mockReturnValue(DEFAULT_LOCATION);
      deps.getActorSession = vi.fn().mockReturnValue(DEFAULT_SESSION);

      const command: ReplCommand = {
        type: ReplCommandType.GAME_COMMAND,
        input: 'look around',
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(state.context.resetEvents).toHaveBeenCalled();
      expect(state.context.resetErrors).toHaveBeenCalled();
      expect(deps.executeIntent).toHaveBeenCalled();
      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: '✓ Command executed successfully.\n'
      });
    });

    it('should handle command with events', () => {
      state.currentActor = ALICE_ID as ActorURN;
      deps.getActorLocation = vi.fn().mockReturnValue(DEFAULT_LOCATION as PlaceURN);
      deps.getActorSession = vi.fn().mockReturnValue(undefined);

      const mockEvents = [
        {
          type: 'actor:moved',
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          payload: { sessionId: DEFAULT_SESSION }
        },
      ];

      state.context.getDeclaredEvents = vi.fn().mockReturnValue(mockEvents);

      const command: ReplCommand = {
        type: ReplCommandType.GAME_COMMAND,
        input: 'move north',
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      // Should follow standard game command event flow
      expectGameCommandEventFlow(effects);
    });

    it('should handle command with errors', () => {
      state.currentActor = ALICE_ID as ActorURN;
      deps.getActorLocation = vi.fn().mockReturnValue(DEFAULT_LOCATION as PlaceURN);

      const mockErrors = [
        { code: 'INVALID_TARGET', message: 'Target not found', trace: DEFAULT_TRACE },
      ];

      state.context.getDeclaredErrors = vi.fn().mockReturnValue(mockErrors);

      const command: ReplCommand = {
        type: ReplCommandType.GAME_COMMAND,
        input: 'attack nonexistent',
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: '✗ Command failed. 1 error(s) declared.\n'
      });
    });
  });

  describe('SWITCH_ACTOR', () => {
    it('should switch to existing actor', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SWITCH_ACTOR,
        actorId: ALICE_ID as ActorURN,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(state.currentActor).toBe(ALICE_ID);
      expect(deps.setActorLocation).toHaveBeenCalledWith(
        state.memo,
        ALICE_ID,
        DEFAULT_LOCATION
      );
      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: `✓ Switched to actor: Alice (${ALICE_ID})\n`,
      });
    });

    it('should handle non-existent actor', () => {
      const nonExistentId = 'actor:nonexistent' as ActorURN;
      const command: ReplCommand = {
        type: ReplCommandType.SWITCH_ACTOR,
        actorId: nonExistentId,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(state.currentActor).toBeUndefined();
      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: `Actor not found: ${nonExistentId}\n`,
      });
    });

    it('should display session info when actor has active session', () => {
      deps.getActorSession = vi.fn().mockReturnValue('session:123' as SessionURN);

      const command: ReplCommand = {
        type: ReplCommandType.SWITCH_ACTOR,
        actorId: ALICE_ID as ActorURN,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expectPrintEffect(effects, /\(in\s+session\)/);
    });
  });

  describe('SHOW_HELP', () => {
    it('should show general help when no command specified', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SHOW_HELP,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      const printEffect = expectEffectOfType(effects, ReplEffectType.PRINT);
      expect(printEffect.text).toContain('Available Commands:');
      expect(printEffect.text).toContain('CLI COMMANDS:');
      expect(printEffect.text).toContain('GAME COMMANDS');
    });

    it('should show specific help for unknown command', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SHOW_HELP,
        command: 'unknown',
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expectPrintEffect(effects, "No specific help available for 'unknown'");
    });
  });

  describe('SHOW_CONTEXT', () => {
    it('should display current context with no actor', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SHOW_CONTEXT,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      const printEffect = expectEffectOfType(effects, ReplEffectType.PRINT);
      expect(printEffect.text).toContain('Actor: none');
      expect(printEffect.text).toContain('Location: none');
      expect(printEffect.text).toContain('Session: none');
    });

    it('should display current context with actor', () => {
      state.currentActor = ALICE_ID as ActorURN;
      deps.getActorLocation = vi.fn().mockReturnValue(DEFAULT_LOCATION as PlaceURN);
      deps.getActorSession = vi.fn().mockReturnValue('session:123' as SessionURN);

      const command: ReplCommand = {
        type: ReplCommandType.SHOW_CONTEXT,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      const printEffect = expectEffectOfType(effects, ReplEffectType.PRINT);
      expect(printEffect.text).toContain(`Actor: ${ALICE_ID}`);
      expect(printEffect.text).toContain(`Location: ${DEFAULT_LOCATION}`);
      expect(printEffect.text).toMatch(/Session:\s+.+\(session:123\)/);
    });

    it('should display world statistics', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SHOW_CONTEXT,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      const printEffect = expectEffectOfType(effects, ReplEffectType.PRINT);
      expect(printEffect.text).toContain('Actors: 2');
      expect(printEffect.text).toContain('Places: 1');
      expect(printEffect.text).toContain('Sessions: 0');
    });
  });

  describe('SHOW_EVENTS', () => {
    it('should show no events message when none declared', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SHOW_EVENTS,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: 'No events declared.\n'
      });
    });

    it('should display declared events', () => {
      const mockEvents = [
        {
          type: 'actor:moved',
          location: DEFAULT_LOCATION,
          actor: ALICE_ID,
          trace: 'trace-123',
        },
        {
          type: 'item:picked_up',
          trace: 'trace-456',
        },
      ];

      state.context.getDeclaredEvents = vi.fn().mockReturnValue(mockEvents);

      const command: ReplCommand = {
        type: ReplCommandType.SHOW_EVENTS,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      const printEffect = expectEffectOfType(effects, ReplEffectType.PRINT);
      expect(printEffect.text).toContain('Declared Events (2)');
      expect(printEffect.text).toContain(`actor:moved @ ${DEFAULT_LOCATION} [${ALICE_ID}] - trace-123`);
      expect(printEffect.text).toContain('item:picked_up - trace-456');
    });
  });

  describe('SHOW_ERRORS', () => {
    it('should show no errors message when none declared', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SHOW_ERRORS,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: 'No errors declared.\n'
      });
    });

    it('should display declared errors', () => {
      const mockErrors = [
        {
          code: 'INVALID_TARGET',
          stack: 'Error stack trace',
          trace: 'trace-123',
        },
        {
          code: 'PERMISSION_DENIED',
          stack: 'Another stack trace',
        },
      ];

      state.context.getDeclaredErrors = vi.fn().mockReturnValue(mockErrors);

      const command: ReplCommand = {
        type: ReplCommandType.SHOW_ERRORS,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      const printEffect = expectEffectOfType(effects, ReplEffectType.PRINT);
      expect(printEffect.text).toContain('Declared Errors (2)');
      expect(printEffect.text).toContain('trace-123: INVALID_TARGET + Error stack trace');
      expect(printEffect.text).toContain('no trace: PERMISSION_DENIED + Another stack trace');
    });
  });

  describe('CLEAR_SCREEN', () => {
    it('should add clear screen effect', () => {
      const command: ReplCommand = {
        type: ReplCommandType.CLEAR_SCREEN,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({ type: ReplEffectType.CLEAR_SCREEN });
    });
  });

  describe('EXIT', () => {
    it('should set running to false and add exit effect', () => {
      expect(state.running).toBe(true);

      const command: ReplCommand = {
        type: ReplCommandType.EXIT,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(state.running).toBe(false);
      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({ type: ReplEffectType.EXIT_REPL });
    });
  });

  describe('SHOW_HANDLERS and SHOW_SESSIONS', () => {
    it('should show not implemented message for SHOW_HANDLERS', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SHOW_HANDLERS,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: 'Command not yet implemented.\n'
      });
    });

    it('should show not implemented message for SHOW_SESSIONS', () => {
      const command: ReplCommand = {
        type: ReplCommandType.SHOW_SESSIONS,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: 'Command not yet implemented.\n'
      });
    });
  });

  describe('Unknown command type', () => {
    it('should handle unknown command type gracefully', () => {
      const command = {
        type: 'UNKNOWN_TYPE' as any,
        trace: DEFAULT_TRACE,
      } as ReplCommand;

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({
        type: ReplEffectType.PRINT,
        text: 'Unknown command.\n'
      });
    });
  });

  describe('Effects array management', () => {
    it('should clear effects array before processing', () => {
      effects.push({ type: ReplEffectType.PRINT, text: 'old effect' });

      const command: ReplCommand = {
        type: ReplCommandType.CLEAR_SCREEN,
        trace: DEFAULT_TRACE,
      };

      processCommand(state, command, effects, deps);

      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({ type: ReplEffectType.CLEAR_SCREEN });
    });
  });
});
