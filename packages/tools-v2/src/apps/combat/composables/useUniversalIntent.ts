import { ref } from 'vue';
import type { IntentResult } from '../types';

const isProcessing = ref(false);

export function useUniversalIntent() {
  const executeIntent = async (
    command: string,
    context: {
      sessionId?: string;
      actorId?: string;
      context?: string;
    } = {}
  ): Promise<IntentResult> => {
    isProcessing.value = true;

    try {
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));

      // Mock intent processing
      const result = await mockIntentExecution(command, context);

      return result;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to execute intent',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      isProcessing.value = false;
    }
  };

  return {
    executeIntent,
    isProcessing
  };
}

// Mock intent execution for demo purposes
async function mockIntentExecution(
  command: string,
  context: { sessionId?: string; actorId?: string; context?: string }
): Promise<IntentResult> {
  const lowerCommand = command.toLowerCase().trim();

  // Mock different command types
  if (lowerCommand.includes('begin combat') || lowerCommand.includes('start combat')) {
    return {
      success: true,
      message: 'Combat has begun!',
      events: [
        {
          id: `event-${Date.now()}`,
          ts: Date.now(),
          trace: 'user-command',
          type: 'combat:session:started' as any,
          location: 'combat:sandbox' as any,
          payload: {
            sessionId: context.sessionId,
            message: 'Combat session started'
          },
          significance: 0.8
        }
      ]
    };
  }

  if (lowerCommand.includes('move to')) {
    const coords = lowerCommand.match(/move to (\d+),?\s*(\d+)/);
    if (coords) {
      const x = parseInt(coords[1]);
      const y = parseInt(coords[2]);

      return {
        success: true,
        message: `Moving to position (${x}, ${y})`,
        events: [
          {
            id: `event-${Date.now()}`,
            ts: Date.now(),
            trace: 'user-command',
            type: 'combat:actor:moved' as any,
            location: 'combat:sandbox' as any,
            actor: context.actorId as any,
            payload: {
              from: { x: 0, y: 0 }, // Would be actual current position
              to: { x, y },
              cost: { actionPoints: 2 }
            },
            significance: 0.3
          }
        ]
      };
    }
  }

  if (lowerCommand.includes('attack') || lowerCommand.includes('shoot')) {
    return {
      success: true,
      message: 'Attack executed!',
      events: [
        {
          id: `event-${Date.now()}`,
          ts: Date.now(),
          trace: 'user-command',
          type: 'combat:actor:attacked' as any,
          location: 'combat:sandbox' as any,
          actor: context.actorId as any,
          payload: {
            target: 'actor:enemy', // Would be determined from context
            damage: Math.floor(Math.random() * 20) + 5,
            outcome: Math.random() > 0.3 ? 'hit' : 'miss',
            roll: { value: Math.floor(Math.random() * 20) + 1, dice: '1d20' }
          },
          significance: 0.7
        }
      ]
    };
  }

  // Default response for unrecognized commands
  return {
    success: false,
    message: `Command not recognized: "${command}"`,
    error: 'Unknown command'
  };
}
