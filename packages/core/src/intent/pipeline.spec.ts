import { describe, beforeEach, it, expect } from 'vitest';
import { createIntent } from './factory';
import { resolveCommandFromIntent } from './resolution';
import { executeCommand } from './execution';
import { TransformerContext } from '~/types/handler';
import { WorldProjection } from '~/types/world';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { SessionURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';
import { ALICE_ID, BOB_ID, DEFAULT_LOCATION } from '~/testing/constants';

describe('3-Step Intent Pipeline Integration', () => {
  let context: TransformerContext;

  // Create test actors and place

  beforeEach(() => {
    context = createTestTransformerContext({
      world: createWorldProjection((w: WorldProjection) => ({
        ...w,
        sessions: {},
        items: {},
        actors: {
          [ALICE_ID]: createActor({
            id: ALICE_ID,
            name: 'Alice',
            location: DEFAULT_LOCATION,
          }),
          [BOB_ID]: createActor({
            id: BOB_ID,
            name: 'Bob',
            location: DEFAULT_LOCATION,
          }),
        },
        places: {
          [DEFAULT_LOCATION]: createPlace({
            id: DEFAULT_LOCATION,
            name: 'Test Arena',
          }),
        },
      })),
    });
  });

  describe('full pipeline: createIntent → resolveCommandFromIntent → executeCommand', () => {
    it('should execute attack intent through full pipeline', () => {
      // Step 1: Create Intent
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'attack bob',
      });

      // Step 2: Resolve to Command
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ATTACK);

      // Step 3: Execute Command
      const result = executeCommand(context, command!);
      expect(result).toBeTruthy();
    });

    it('should execute advance intent through full pipeline', () => {
      // Step 1: Create Intent
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance 15',
      });

      // Step 2: Resolve to Command
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ADVANCE);

      // Step 3: Execute Command
      const result = executeCommand(context, command!);
      expect(result).toBeTruthy();
    });

    it('should handle unresolvable intents gracefully', () => {
      // Step 1: Create Intent
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'do something impossible',
      });

      // Step 2: Resolve to Command (should fail)
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeNull();

      // Step 3: Cannot execute null command
      // This is expected behavior - pipeline stops at resolution failure
    });
  });

  describe('session threading through full pipeline', () => {
    it('should thread combat session ID through entire pipeline', () => {
      const combatSessionId: SessionURN = 'flux:session:combat:pipelinetest';

      // Step 1: Create Intent with session
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: combatSessionId,
        text: 'strike bob',
      });

      expect(intent.session).toBe(combatSessionId);

      // Step 2: Resolve to Command (should preserve session)
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeTruthy();
      expect(command?.session).toBe(combatSessionId);
      expect(command?.type).toBe(CommandType.STRIKE);

      // Step 3: Execute Command (session should be available to handler)
      const result = executeCommand(context, command!);
      expect(result).toBeTruthy();
      // Session context is now available to the command handler
    });

    it('should thread workbench session ID through entire pipeline', () => {
      const workbenchSessionId: SessionURN = 'flux:session:workbench:pipelinetest';

      // Step 1: Create Intent with session
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: workbenchSessionId,
        text: 'use workbench',
      });

      expect(intent.session).toBe(workbenchSessionId);

      // Step 2: Resolve to Command (should preserve session)
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeTruthy();
      expect(command?.session).toBe(workbenchSessionId);

      // Step 3: Execute Command
      const result = executeCommand(context, command!);
      expect(result).toBeTruthy();
    });

    it('should handle pipeline without session context', () => {
      // Step 1: Create Intent without session
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'look bob',
      });

      expect(intent.session).toBeUndefined();

      // Step 2: Resolve to Command
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeTruthy();
      expect(command?.session).toBeUndefined();
      expect(command?.type).toBe(CommandType.LOOK);

      // Step 3: Execute Command
      const result = executeCommand(context, command!);
      expect(result).toBeTruthy();
    });
  });

  describe('pipeline error handling', () => {
    it('should handle resolution failures without crashing', () => {
      // Step 1: Create Intent
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'invalid command syntax',
      });

      // Step 2: Resolution should fail gracefully
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeNull();

      // Pipeline stops here - this is expected behavior
    });

    it('should handle resolution failures with invalid actors', () => {
      // Step 1: Create Intent with nonexistent actor
      const intent = createIntent({
        actor: 'flux:actor:nonexistent',
        location: DEFAULT_LOCATION,
        text: 'look bob',
      });

      // Step 2: Resolution should fail gracefully (actor doesn't exist)
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeNull();

      // This demonstrates that resolution now validates actor existence
      // which is better than failing during execution
    });

    it('should handle execution errors without crashing', () => {
      // Step 1: Create Intent with valid actor but invalid target
      const intent = createIntent({
        actor: ALICE_ID, // Valid actor
        location: DEFAULT_LOCATION,
        text: 'look nonexistent_target', // Invalid target that will fail during execution
      });

      // Step 2: Resolve to Command (should succeed - valid actor and syntax)
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.LOOK);

      // Step 3: Execute Command (should handle invalid target gracefully during execution)
      const result = executeCommand(context, command!);
      expect(result).toBeTruthy();
      // The command should execute but may produce errors for the invalid target
      // This tests that execution errors don't crash the pipeline
    });
  });

  describe('pipeline performance', () => {
    it('should execute multiple intents efficiently', () => {
      const intents = [
        'attack bob',
        'advance 10',
        'look around',
        'strike bob',
        'retreat 5',
      ];

      const results = intents.map((text, index) => {
        // Step 1: Create Intent
        const intent = createIntent({
          actor: ALICE_ID,
          location: DEFAULT_LOCATION,
          text,
        });

        // Step 2: Resolve to Command
        const command = resolveCommandFromIntent(context, intent);
        if (!command) return null;

        // Step 3: Execute Command
        return executeCommand(context, command);
      });

      // All valid intents should execute successfully
      const successfulResults = results.filter(r => r !== null);
      expect(successfulResults.length).toBeGreaterThan(0);
    });
  });
});
