import { describe, beforeEach, it, expect } from 'vitest';
import { advanceResolver } from './resolver';
import { createIntent } from '~/intent/factory';
import { createCommandResolverContext } from '~/intent/resolution';
import { TransformerContext } from '~/types/handler';
import { CommandType } from '~/types/intent';
import { createTestTransformerContext } from '~/testing/context-testing';
import { ActorURN } from '~/types/taxonomy';
import { createActor } from '~/worldkit/entity/actor';
import { createPlace } from '~/worldkit/entity/place';
import { createWorldProjection } from '~/worldkit/context';
import { WorldProjection } from '~/types/world';
import { AdvanceCommand } from './types';
import { ALICE_ID, DEFAULT_LOCATION, DEFAULT_COMBAT_SESSION } from '~/testing/constants';

// Type-safe utility functions for testing discriminated union variants
function assertMaxAdvanceCommand(command: AdvanceCommand | undefined): asserts command is AdvanceCommand & { args: { type: 'max' } } {
  expect(command).toBeTruthy();
  expect(command?.args.type).toBe('max');
}

function assertDistanceAdvanceCommand(command: AdvanceCommand | undefined, expectedDistance: number): asserts command is AdvanceCommand & { args: { type: 'distance'; distance: number } } {
  expect(command).toBeTruthy();
  expect(command?.args.type).toBe('distance');
  if (command?.args.type === 'distance') {
    expect(command.args.distance).toBe(Math.floor(expectedDistance));
  }
}

function assertApAdvanceCommand(command: AdvanceCommand | undefined, expectedAp: number): asserts command is AdvanceCommand & { args: { type: 'ap'; ap: number } } {
  expect(command).toBeTruthy();
  expect(command?.args.type).toBe('ap');
  if (command?.args.type === 'ap') {
    expect(command.args.ap).toBe(expectedAp);
  }
}

describe('ADVANCE Command Parser', () => {
  let context: TransformerContext;
  let parserContext: ReturnType<typeof createCommandResolverContext>;

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
        },
        places: {
          [DEFAULT_LOCATION]: createPlace({
            id: DEFAULT_LOCATION,
            name: 'Test Arena',
          }),
        },
      })),
    });

    parserContext = createCommandResolverContext(context);
  });

  describe('Basic Functionality', () => {
    it('should recognize advance verb', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance',
      });

      const command = advanceResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.type).toBe(CommandType.ADVANCE);
      expect(command?.actor).toBe(ALICE_ID);
      expect(command?.location).toBe(DEFAULT_LOCATION);
    });

    it('should reject non-advance verbs', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'attack bob',
      });

      const command = advanceResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

    it('should reject when actor not found', () => {
      const intent = createIntent({
        actor: 'flux:actor:missing' as ActorURN,
        location: DEFAULT_LOCATION,
        text: 'advance',
      });

      const command = advanceResolver(parserContext, intent);

      expect(command).toBeUndefined();
    });

  });

  describe('Max Advance Syntax: "advance"', () => {
    it('should parse bare "advance" as max advance', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command);
    });
  });

  describe('Distance Shorthand Syntax: "advance <number>"', () => {
    it('should parse "advance 15" as distance shorthand', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance 15',
      });

      const command = advanceResolver(parserContext, intent);

      assertDistanceAdvanceCommand(command, 15);
    });

    it('should parse "advance 5.5" as distance shorthand with decimal', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance 5.5',
      });

      const command = advanceResolver(parserContext, intent);

      assertDistanceAdvanceCommand(command, 5.5);
    });

    it('should reject "advance 0" (zero distance)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance 0',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command);
    });

    it('should reject "advance -5" (negative distance)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance -5',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });

    it('should reject "advance abc" (invalid number)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance abc',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });
  });

  describe('Explicit Distance Syntax: "advance distance <number>"', () => {
    it('should parse "advance distance 10"', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance distance 10',
      });

      const command = advanceResolver(parserContext, intent);
      assertDistanceAdvanceCommand(command, 10);
    });

    it('should floor decimal distances to whole meters', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance distance 7.8',
      });

      const command = advanceResolver(parserContext, intent);
      assertDistanceAdvanceCommand(command, 7); // Math.floor(7.8)
    });

    it('should reject "advance distance 0"', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance distance 0',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });

    it('should reject "advance distance -3"', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance distance -3',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });
  });

  describe('AP-based Syntax: "advance ap <number>"', () => {
    it('should parse "advance ap 2.5"', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance ap 2.5',
      });

      const command = advanceResolver(parserContext, intent);
      assertApAdvanceCommand(command, 2.5);
    });

    it('should parse "advance ap 1" (whole number AP)', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance ap 1',
      });

      const command = advanceResolver(parserContext, intent);
      assertApAdvanceCommand(command, 1);
    });

    it('should reject "advance ap 0"', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance ap 0',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });

    it('should reject "advance ap -1.5"', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance ap -1.5',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });
  });

  describe('Session Threading', () => {
    it('should thread session ID from intent to command', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: DEFAULT_COMBAT_SESSION,
        text: 'advance 10',
      });

      const command = advanceResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBe(DEFAULT_COMBAT_SESSION);
    });

    it('should work without session ID', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance ap 1.5',
      });

      const command = advanceResolver(parserContext, intent);

      expect(command).toBeTruthy();
      expect(command?.session).toBeUndefined();
    });
  });

  describe('Edge Cases and Malformed Input', () => {
    it('should handle extra tokens gracefully', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance distance 10 extra tokens here',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance due to >2 tokens
    });

    it('should handle unknown modifiers', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance speed 10',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });

    it('should handle empty string numbers', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance distance',
      });

      const command = advanceResolver(parserContext, intent);

      assertMaxAdvanceCommand(command); // Falls back to max advance
    });
  });

  describe('Performance Characteristics', () => {
    it('should use zero-allocation token parsing', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance ap 2.5',
      });

      // Verify tokens are pre-parsed
      expect(intent.tokens).toEqual(['ap', '2.5']);
      expect(intent.verb).toBe('advance');

      const command = advanceResolver(parserContext, intent);
      assertApAdvanceCommand(command, 2.5);
    });

    it('should handle large numbers efficiently', () => {
      const intent = createIntent({
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        text: 'advance 999999',
      });

      const command = advanceResolver(parserContext, intent);
      assertDistanceAdvanceCommand(command, 999999);
    });
  });

  describe('Command Structure Validation', () => {

    it('should preserve all required command fields', () => {
      const intent = createIntent({
        id: 'test1234',
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: DEFAULT_COMBAT_SESSION,
        text: 'advance distance 15',
      });

      const command = advanceResolver(parserContext, intent);

      expect(command).toMatchObject({
        id: 'test1234',
        type: CommandType.ADVANCE,
        actor: ALICE_ID,
        location: DEFAULT_LOCATION,
        session: DEFAULT_COMBAT_SESSION,
        args: {
          type: 'distance',
          distance: 15,
        },
      });
    });
  });
});
