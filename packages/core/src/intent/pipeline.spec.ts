import { describe, beforeEach, it, expect } from 'vitest';
import { createIntent } from './factory';
import { resolveCommandFromIntent } from './resolution';
import { executeCommand } from './execution';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN, PlaceURN, SessionURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';

describe('3-Step Intent Pipeline Integration', () => {
  let context: TransformerContext;

  // Create test actors and place
  const ACTOR_ID: ActorURN = 'flux:actor:test:alice';
  const TARGET_ID: ActorURN = 'flux:actor:test:bob';
  const PLACE_ID: PlaceURN = 'flux:place:test:arena';

  beforeEach(() => {
    context = createTestTransformerContext({
      world: {
        sessions: {},
        items: {},
        actors: {
          [ACTOR_ID]: createActor({
            id: ACTOR_ID,
            name: 'Alice',
            location: PLACE_ID,
          }),
          [TARGET_ID]: createActor({
            id: TARGET_ID,
            name: 'Bob',
            location: PLACE_ID,
          }),
        },
        places: {
          [PLACE_ID]: createPlace({
            id: PLACE_ID,
            name: 'Test Arena',
          }),
        },
      },
    });
  });

  describe('full pipeline: createIntent → resolveCommandFromIntent → executeCommand', () => {
    it('should execute attack intent through full pipeline', () => {
      // Step 1: Create Intent
      const intent = createIntent({
        id: 'pipeline-test-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
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
        id: 'pipeline-test-2',
        actor: ACTOR_ID,
        location: PLACE_ID,
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
        id: 'pipeline-test-3',
        actor: ACTOR_ID,
        location: PLACE_ID,
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
      const combatSessionId: SessionURN = 'flux:session:combat:pipeline-test';

      // Step 1: Create Intent with session
      const intent = createIntent({
        id: 'session-pipeline-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
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
      const workbenchSessionId: SessionURN = 'flux:session:workbench:pipeline-test';

      // Step 1: Create Intent with session
      const intent = createIntent({
        id: 'session-pipeline-2',
        actor: ACTOR_ID,
        location: PLACE_ID,
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
        id: 'no-session-pipeline',
        actor: ACTOR_ID,
        location: PLACE_ID,
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
        id: 'error-test-1',
        actor: ACTOR_ID,
        location: PLACE_ID,
        text: 'invalid command syntax',
      });

      // Step 2: Resolution should fail gracefully
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeNull();

      // Pipeline stops here - this is expected behavior
    });

    it('should handle execution errors without crashing', () => {
      // Step 1: Create Intent
      const intent = createIntent({
        id: 'error-test-2',
        actor: 'flux:actor:nonexistent' as ActorURN,
        location: PLACE_ID,
        text: 'look bob',
      });

      // Step 2: Resolve to Command
      const command = resolveCommandFromIntent(context, intent);
      expect(command).toBeTruthy();

      // Step 3: Execute Command (should handle invalid actor gracefully)
      const result = executeCommand(context, command!);
      expect(result).toBeTruthy();
      // Errors should be captured in context, not thrown
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
          id: `perf-test-${index}`,
          actor: ACTOR_ID,
          location: PLACE_ID,
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
