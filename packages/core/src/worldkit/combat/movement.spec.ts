import { describe, it, expect } from 'vitest';
import { checkMovementCollision } from './movement';
import { useCombatScenario } from './testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { ActorURN } from '~/types/taxonomy';

describe('checkMovementCollision', () => {
  const context = createTransformerContext();

  describe('no collision scenarios', () => {
    it('should allow movement when no other combatants exist', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 0 }
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const result = checkMovementCollision(combatants, movingActorId, 0, 5);

      expect(result.success).toBe(true);
      expect(result.finalPosition).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should allow movement when path does not cross any enemies', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 0 }
          },
          'flux:actor:test:enemy': {
            team: 'enemy',
            position: { coordinate: 10 } // Far from path (0 to 5)
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const result = checkMovementCollision(combatants, movingActorId, 0, 5);

      expect(result.success).toBe(true);
      expect(result.finalPosition).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should allow movement through friendly units', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 0 }
          },
          'flux:actor:test:friendly': {
            team: 'team1', // Same team
            position: { coordinate: 3 } // In the path (0 to 5)
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const result = checkMovementCollision(combatants, movingActorId, 0, 5);

      expect(result.success).toBe(true);
      expect(result.finalPosition).toBe(5);
      expect(result.error).toBeUndefined();
    });
  });

  describe('collision scenarios', () => {
    it('should block movement when path crosses enemy position (forward movement)', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 0 }
          },
          'flux:actor:test:enemy': {
            team: 'enemy',
            position: { coordinate: 3 } // Blocks path from 0 to 5
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const result = checkMovementCollision(combatants, movingActorId, 0, 5);

      expect(result.success).toBe(false);
      expect(result.finalPosition).toBe(2); // 3 - 1 = 2 (stop 1m away)
      expect(result.error).toContain('Movement blocked by enemy');
      expect(result.error).toContain('position 3m');
      expect(result.error).toContain('advance 2m');
    });

    it('should block movement when path crosses enemy position (backward movement)', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 5 }
          },
          'flux:actor:test:enemy': {
            team: 'enemy',
            position: { coordinate: 3 } // Blocks path from 5 to 0
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const result = checkMovementCollision(combatants, movingActorId, 5, 0);

      expect(result.success).toBe(false);
      expect(result.finalPosition).toBe(4); // 3 - (-1) = 4 (stop 1m away in reverse)
      expect(result.error).toContain('Movement blocked by enemy');
      expect(result.error).toContain('position 3m');
      expect(result.error).toContain('advance 1m'); // Distance from 5 to 4
    });

    it('should find the first enemy collision in path', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 0 }
          },
          'flux:actor:test:enemy1': {
            team: 'enemy',
            position: { coordinate: 3 } // First enemy
          },
          'flux:actor:test:enemy2': {
            team: 'enemy',
            position: { coordinate: 7 } // Second enemy
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const result = checkMovementCollision(combatants, movingActorId, 0, 10);

      expect(result.success).toBe(false);
      expect(result.finalPosition).toBe(2); // Stopped by first enemy at position 3
      expect(result.error).toContain('position 3m'); // Should reference first enemy
    });
  });

  describe('edge cases', () => {
    it('should handle zero-distance movement', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 5 }
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const result = checkMovementCollision(combatants, movingActorId, 5, 5);

      expect(result.success).toBe(true);
      expect(result.finalPosition).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should handle negative positions', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: -5 }
          },
          'flux:actor:test:enemy': {
            team: 'enemy',
            position: { coordinate: -2 } // Enemy at negative position
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const result = checkMovementCollision(combatants, movingActorId, -5, 0);

      expect(result.success).toBe(false);
      expect(result.finalPosition).toBe(-3); // -2 - 1 = -3 (stop 1m away)
      expect(result.error).toContain('position -2m');
    });
  });

  describe('performance optimization (output parameter)', () => {
    it('should reuse provided output object', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 0 }
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;
      const output = { success: false, error: 'old', finalPosition: 999 };

      const result = checkMovementCollision(combatants, movingActorId, 0, 5, output);

      expect(result).toBe(output); // Same object reference
      expect(result.success).toBe(true);
      expect(result.finalPosition).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should reuse output object for collision case', () => {
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 0 }
          },
          'flux:actor:test:enemy': {
            team: 'enemy',
            position: { coordinate: 3 }
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;
      const output = { success: true, finalPosition: 999 };

      const result = checkMovementCollision(combatants, movingActorId, 0, 5, output);

      expect(result).toBe(output); // Same object reference
      expect(result.success).toBe(false);
      expect(result.finalPosition).toBe(2);
      expect(result.error).toContain('Movement blocked');
    });
  });

  describe('batch processing performance', () => {
    it('should handle large numbers of combatants efficiently', () => {
      // Create participants object with many friendly combatants
      const participants: Record<string, any> = {
        'flux:actor:test:mover': {
          team: 'team1',
          position: { coordinate: 0 }
        }
      };

      // Add 100 friendly combatants (should not block movement)
      for (let i = 0; i < 100; i++) {
        participants[`flux:actor:test:friendly${i}`] = {
          team: 'team1', // Same team as mover
          position: { coordinate: i * 0.1 } // Spread them out
        };
      }

      const scenario = useCombatScenario(context, {
        participants,
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      const start = performance.now();
      const result = checkMovementCollision(combatants, movingActorId, 0, 10);
      const end = performance.now();

      expect(result.success).toBe(true);
      expect(result.finalPosition).toBe(10);
      expect(end - start).toBeLessThan(10); // Should complete in < 10ms
    });

    it('should benchmark throughput performance', () => {
      // Create a simple scenario for benchmarking
      const scenario = useCombatScenario(context, {
        participants: {
          'flux:actor:test:mover': {
            team: 'team1',
            position: { coordinate: 0 }
          },
          'flux:actor:test:enemy': {
            team: 'enemy',
            position: { coordinate: 50 } // Far away to avoid collisions
          }
        },
        weapons: []
      });

      const movingActorId = 'flux:actor:test:mover' as ActorURN;
      const combatants = scenario.session.data.combatants;

      // Warm up
      for (let i = 0; i < 100; i++) {
        checkMovementCollision(combatants, movingActorId, 0, 10);
      }

      // Benchmark throughput
      const iterations = 100000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        checkMovementCollision(combatants, movingActorId, 0, 10);
      }

      const end = performance.now();
      const duration = end - start;
      const throughput = iterations / (duration / 1000);

      console.log(`\n⚡ checkMovementCollision THROUGHPUT BENCHMARK`);
      console.log(`Iterations: ${iterations.toLocaleString()}`);
      console.log(`Duration: ${duration.toFixed(2)}ms`);
      console.log(`Throughput: ${throughput.toLocaleString()} calculations/sec`);
      console.log(`Average time per call: ${(duration * 1000 / iterations).toFixed(3)}μs`);
    });
  });
});
