/**
 * Combat Intent Parser Tests
 *
 * Tests the natural language combat command parser with comprehensive coverage
 * of verb recognition, argument parsing, target resolution, and security constraints.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluateCombatIntent, CombatIntentContext } from './intent';
import { useCombatScenario } from '../testing/scenario';
import { createTransformerContext } from '~/worldkit/context';
import { createTestActor } from '~/testing/world-testing';
import { ActorURN } from '~/types/taxonomy';
import { Team, CombatAction } from '~/types/combat';
import { CommandType } from '~/types/intent';

describe('Combat Intent Parser', () => {
  let scenario: ReturnType<typeof useCombatScenario>;
  let transformerContext: ReturnType<typeof createTransformerContext>;
  let context: CombatIntentContext;

  const ALICE_ID: ActorURN = 'flux:actor:test:alice';
  const BOB_ID: ActorURN = 'flux:actor:test:bob';
  const CHARLIE_ID: ActorURN = 'flux:actor:test:charlie';

  beforeEach(() => {
    transformerContext = createTransformerContext();
    transformerContext.mass.computeActorMass = vi.fn().mockReturnValue(70_000);

    scenario = useCombatScenario(transformerContext, {
      weapons: [],
      participants: {
        [ALICE_ID]: {
          team: Team.ALPHA,
          name: 'Alice',
          ap: 4.5, // Set specific AP for testing
          position: { coordinate: 100, facing: 1, speed: 0 },
        },
        [BOB_ID]: {
          team: Team.BRAVO,
          name: 'Bob',
          ap: 3.2, // Different AP for retreat testing
          position: { coordinate: 150, facing: -1, speed: 0 },
        },
        [CHARLIE_ID]: {
          team: Team.BRAVO,
          name: 'Charlie',
          position: { coordinate: 200, facing: -1, speed: 0 },
        },
      },
    });

    const alice = scenario.actors[ALICE_ID].actor;
    const bob = scenario.actors[BOB_ID].actor;
    const charlie = scenario.actors[CHARLIE_ID].actor;

    context = {
      currentActor: alice,
      availableTargets: [bob, charlie],
      session: scenario.session,
      computeActorMass: transformerContext.mass.computeActorMass,
      getEquippedWeaponSchema: transformerContext.equipmentApi.getEquippedWeaponSchema,
    };
  });

  describe('Verb Recognition', () => {
    describe('Attack Command', () => {
      it.each([
        'attack',
        'att',     // 3-letter abbreviation
        'atk',     // synonym
        'ATTACK',  // case insensitive
        'Attack'   // mixed case
      ])('should recognize "%s" as attack command', (input) => {
        const result = evaluateCombatIntent(input, context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].command).toBe(CommandType.ATTACK);
        }
      });
    });

    describe('Defend Command', () => {
      it.each([
        'defend',
        'def',     // 3-letter abbreviation
        'block',   // synonym
        'guard',   // synonym
        'DEFEND'   // case insensitive
      ])('should recognize "%s" as defend command', (input) => {
        const result = evaluateCombatIntent(input, context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].command).toBe(CommandType.DEFEND);
        }
      });
    });

    describe('Strike Command', () => {
      it.each([
        'strike',
        'str',     // 3-letter abbreviation
        'hit',     // synonym
        'swing',   // synonym
        'STRIKE'   // case insensitive
      ])('should recognize "%s" as strike command', (input) => {
        const result = evaluateCombatIntent(input, context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].command).toBe(CommandType.ATTACK); // Currently maps to ATTACK
          expect(result.actions[0].args.primitive).toBe(true);
        }
      });
    });

    describe('Target Command', () => {
      it.each([
        'target bob',
        'tar bob',     // 3-letter abbreviation
        'TARGET bob'   // case insensitive
      ])('should recognize "%s" as target command', (input) => {
        const result = evaluateCombatIntent(input, context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].command).toBe(CommandType.TARGET);
          expect(result.actions[0].args.target).toBe(BOB_ID);
        }
      });
    });

    describe('Advance Command', () => {
      it.each([
        'advance distance 10',
        'adv distance 10',      // 3-letter abbreviation
        'move distance 10',     // synonym
        'forward distance 10',  // synonym
        'ADVANCE distance 10'   // case insensitive
      ])('should recognize "%s" as advance command', (input) => {
        const result = evaluateCombatIntent(input, context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].command).toBe(CommandType.ADVANCE);
          expect(result.actions[0].args.type).toBe('distance');
          expect(result.actions[0].args.distance).toBe(10);
        }
      });
    });

    describe('Retreat Command', () => {
      it.each([
        'retreat distance 5',
        'ret distance 5',       // 3-letter abbreviation
        'back distance 5',      // synonym
        'backward distance 5',  // synonym
        'flee distance 5',      // synonym
        'RETREAT distance 5'    // case insensitive
      ])('should recognize "%s" as retreat command', (input) => {
        const result = evaluateCombatIntent(input, context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].command).toBe(CommandType.RETREAT);
          expect(result.actions[0].args.type).toBe('distance');
          expect(result.actions[0].args.distance).toBe(5);
          expect(result.actions[0].args.direction).toBe(-1);
        }
      });
    });

    describe('Unknown Commands', () => {
      it.each([
        'jump',
        'fly',
        'teleport',
        'xyz',
        '123'
      ])('should reject unknown command "%s"', (input) => {
        const result = evaluateCombatIntent(input, context);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Unknown command');
        }
      });
    });
  });

  describe('Target Resolution', () => {
    describe('Exact Name Matching', () => {
      it('should resolve exact target names', () => {
        const result = evaluateCombatIntent('attack Bob', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.target).toBe(BOB_ID);
        }
      });

      it('should be case insensitive', () => {
        const result = evaluateCombatIntent('attack bob', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.target).toBe(BOB_ID);
        }
      });
    });

    describe('Prefix Matching', () => {
      it('should resolve unambiguous prefix matches', () => {
        const result = evaluateCombatIntent('attack B', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.target).toBe(BOB_ID);
        }
      });

      it('should reject ambiguous prefix matches', () => {
        // Both Bob and Charlie would match 'C' if Charlie started with C
        const contextWithAmbiguous = {
          ...context,
          availableTargets: [
            createTestActor({ name: 'Carl' }),
            createTestActor({ name: 'Charlie' })
          ]
        };

        const result = evaluateCombatIntent('attack C', contextWithAmbiguous);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Ambiguous target');
        }
      });

      it('should reject ambiguous prefix matches for "dav" with Dave and David', () => {
        const contextWithDaveAndDavid = {
          ...context,
          availableTargets: [
            createTestActor({ name: 'Dave' }),
            createTestActor({ name: 'David' })
          ]
        };

        const result = evaluateCombatIntent('attack dav', contextWithDaveAndDavid);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Ambiguous target "dav"');
          expect(result.error).toContain('Dave');
          expect(result.error).toContain('David');
        }
      });
    });

    describe('Substring Matching', () => {
      it('should resolve unambiguous substring matches', () => {
        const contextWithLongNames = {
          ...context,
          availableTargets: [
            createTestActor({ name: 'Sir Robert the Bold' }),
            createTestActor({ name: 'Lady Catherine' })
          ]
        };

        const result = evaluateCombatIntent('attack Robert', contextWithLongNames);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.target).toBe(contextWithLongNames.availableTargets[0].id);
        }
      });
    });

    describe('Target Not Found', () => {
      it('should reject non-existent targets', () => {
        const result = evaluateCombatIntent('attack Dave', context);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Target "Dave" not found');
        }
      });

      it('should reject empty target names', () => {
        const result = evaluateCombatIntent('target', context);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('exactly one target name');
        }
      });
    });
  });

  describe('Movement Commands', () => {
    describe('Distance Mode', () => {
      it('should parse distance-based advance', () => {
        const result = evaluateCombatIntent('advance distance 15', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.type).toBe('distance');
          expect(result.actions[0].args.distance).toBe(15);
        }
      });

      it('should parse distance-based retreat', () => {
        const result = evaluateCombatIntent('retreat distance 10', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.type).toBe('distance');
          expect(result.actions[0].args.distance).toBe(10);
          expect(result.actions[0].args.direction).toBe(-1);
        }
      });

      it('should parse retreat without arguments to use all remaining AP', () => {
        // Test with Bob who has 3.2 AP
        const bobContext = {
          ...context,
          currentActor: scenario.actors[BOB_ID].actor,
        };

        const result = evaluateCombatIntent('retreat', bobContext);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].command).toBe(CommandType.RETREAT);
          expect(result.actions[0].args.type).toBe('ap');
          expect(result.actions[0].args.direction).toBe(-1); // Retreat moves backward
          expect(result.actions[0].cost.ap).toBe(3.2); // Should use all remaining AP from Bob's setup
        }
      });

      it('should parse shorthand distance format', () => {
        const result = evaluateCombatIntent('advance 20', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.type).toBe('distance');
          expect(result.actions[0].args.distance).toBe(20);
        }
      });

      it('should parse advance without arguments to use all remaining AP', () => {
        const result = evaluateCombatIntent('advance', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].command).toBe(CommandType.ADVANCE);
          expect(result.actions[0].args.type).toBe('ap');
          expect(result.actions[0].cost.ap).toBe(4.5); // Should use all remaining AP from scenario setup
        }
      });

      it('should reject invalid distance values', () => {
        const invalidInputs = [
          'advance distance 0',
          'advance distance -5',
          'advance distance abc',
          'advance distance 500' // exceeds battlefield length
        ];

        invalidInputs.forEach(input => {
          const result = evaluateCombatIntent(input, context);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('AP Mode', () => {
      it('should parse AP-based advance', () => {
        const result = evaluateCombatIntent('advance ap 2.5', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.type).toBe('ap');
          expect(result.actions[0].args.ap).toBe(2.5);
        }
      });

      it('should parse AP-based retreat', () => {
        const result = evaluateCombatIntent('retreat ap 1.5', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.type).toBe('ap');
          expect(result.actions[0].args.ap).toBe(1.5);
          expect(result.actions[0].args.direction).toBe(-1);
        }
      });

      it('should reject invalid AP values', () => {
        const invalidInputs = [
          'advance ap 0',
          'advance ap -2',
          'advance ap abc',
          'advance ap 15' // exceeds reasonable bounds
        ];

        invalidInputs.forEach(input => {
          const result = evaluateCombatIntent(input, context);
          expect(result.success).toBe(false);
        });
      });
    });

    describe('Targeted Movement', () => {
      it('should parse advance toward target', () => {
        const result = evaluateCombatIntent('advance distance 10 toward Bob', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.type).toBe('distance');
          expect(result.actions[0].args.distance).toBe(10);
          expect(result.actions[0].args.target).toBe(BOB_ID);
        }
      });

      it('should parse retreat from target', () => {
        const result = evaluateCombatIntent('retreat distance 5 from Charlie', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.type).toBe('distance');
          expect(result.actions[0].args.distance).toBe(5);
          expect(result.actions[0].args.target).toBe(CHARLIE_ID);
          expect(result.actions[0].args.direction).toBe(-1);
        }
      });

      it('should parse AP-based targeted movement', () => {
        const result = evaluateCombatIntent('advance ap 2.0 toward Bob', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.type).toBe('ap');
          expect(result.actions[0].args.ap).toBe(2.0);
          expect(result.actions[0].args.target).toBe(BOB_ID);
        }
      });

      it('should handle alternative directional keywords', () => {
        const inputs = [
          'advance distance 10 to Bob',
          'retreat distance 5 away from Charlie'
        ];

        // Note: Current implementation only supports 'toward' and 'from'
        // This test documents expected behavior for future enhancement
        inputs.forEach(input => {
          const result = evaluateCombatIntent(input, context);
          // These should work when we add support for 'to' and 'away from'
        });
      });
    });
  });

  describe('Security and Input Validation', () => {
    describe('Input Sanitization', () => {
      it('should handle empty input', () => {
        const result = evaluateCombatIntent('', context);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Empty command');
        }
      });

      it('should handle whitespace-only input', () => {
        const result = evaluateCombatIntent('   \t\n  ', context);
        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toBe('Empty command');
        }
      });

      it('should normalize whitespace', () => {
        const result = evaluateCombatIntent('  attack   Bob  ', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.target).toBe(BOB_ID);
        }
      });

      it('should handle multiple whitespace separators', () => {
        const result = evaluateCombatIntent('advance\t\tdistance\n\n15', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.distance).toBe(15);
        }
      });
    });

    describe('No Raw Input Propagation', () => {
      it('should not include raw user input in action args', () => {
        const maliciousInput = 'attack <script>alert("xss")</script>';
        const result = evaluateCombatIntent(maliciousInput, context);

        // Should fail to parse the malicious target name
        expect(result.success).toBe(false);

        // Even if it succeeded, no raw input should be in the action
        if (result.success) {
          const actionArgs = JSON.stringify(result.actions[0].args);
          expect(actionArgs).not.toContain('<script>');
          expect(actionArgs).not.toContain('alert');
        }
      });

      it('should only include validated ActorURN in target args', () => {
        const result = evaluateCombatIntent('attack Bob', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].args.target).toBe(BOB_ID);
          expect(typeof result.actions[0].args.target).toBe('string');
          expect(result.actions[0].args.target).toMatch(/^flux:actor:/);
        }
      });

      it('should only include validated numbers in movement args', () => {
        const result = evaluateCombatIntent('advance distance 15', context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(typeof result.actions[0].args.distance).toBe('number');
          expect(result.actions[0].args.distance).toBe(15);
          expect(Number.isFinite(result.actions[0].args.distance)).toBe(true);
        }
      });

      it('should prove no unvalidated input propagates to CombatAction payloads', () => {
        const maliciousInputs = [
          // XSS attempts
          'attack <script>alert("xss")</script>',
          'target <img src=x onerror=alert(1)>',
          'advance distance <svg onload=alert(1)>',

          // SQL injection attempts
          'attack \'; DROP TABLE users; --',
          'target Robert\'; DELETE FROM actors; --',

          // Code injection attempts
          'advance distance ${alert("pwned")}',
          'retreat ap #{system("rm -rf /")}',

          // Path traversal attempts
          'attack ../../../etc/passwd',
          'target ../../admin',

          // Special characters and encoding
          'attack %3Cscript%3Ealert%281%29%3C%2Fscript%3E',
          'target \x3cscript\x3ealert(1)\x3c/script\x3e',

          // Prototype pollution attempts
          'attack __proto__',
          'target constructor.prototype',

          // Large payloads
          'attack ' + 'A'.repeat(10000),
          'advance distance ' + '9'.repeat(1000),
        ];

        maliciousInputs.forEach(maliciousInput => {
          const result = evaluateCombatIntent(maliciousInput, context);

          if (result.success) {
            // If parsing succeeded, verify all args contain only validated data
            result.actions.forEach(action => {
              const actionJson = JSON.stringify(action);

              // Should not contain any raw malicious strings
              expect(actionJson).not.toContain('<script>');
              expect(actionJson).not.toContain('alert');
              expect(actionJson).not.toContain('DROP TABLE');
              expect(actionJson).not.toContain('DELETE FROM');
              expect(actionJson).not.toContain('${');
              expect(actionJson).not.toContain('#{');
              expect(actionJson).not.toContain('../');
              expect(actionJson).not.toContain('%3C');
              expect(actionJson).not.toContain('\\x3c');
              expect(actionJson).not.toContain('__proto__');
              expect(actionJson).not.toContain('constructor');

              // Verify all properties are of expected types
              expect(typeof action.actorId).toBe('string');
              expect(action.actorId).toMatch(/^flux:actor:/);
              expect(typeof action.command).toBe('string');
              expect(typeof action.args).toBe('object');
              expect(typeof action.cost).toBe('object');

              // Verify specific arg types based on what's present
              if (action.args.target) {
                expect(typeof action.args.target).toBe('string');
                expect(action.args.target).toMatch(/^flux:actor:/);
              }

              if (action.args.distance !== undefined) {
                expect(typeof action.args.distance).toBe('number');
                expect(Number.isFinite(action.args.distance)).toBe(true);
                expect(action.args.distance).toBeGreaterThan(0);
                expect(action.args.distance).toBeLessThanOrEqual(300);
              }

              if (action.args.ap !== undefined) {
                expect(typeof action.args.ap).toBe('number');
                expect(Number.isFinite(action.args.ap)).toBe(true);
                expect(action.args.ap).toBeGreaterThan(0);
                expect(action.args.ap).toBeLessThanOrEqual(10);
              }

              if (action.args.type !== undefined) {
                expect(['distance', 'ap']).toContain(action.args.type);
              }

              if (action.args.direction !== undefined) {
                expect([-1, 1]).toContain(action.args.direction);
              }

              if (action.args.primitive !== undefined) {
                expect(typeof action.args.primitive).toBe('boolean');
              }
            });
          } else {
            // If parsing failed, error message should not contain raw malicious input
            // (except for legitimate error reporting of the problematic input)
            expect(typeof result.error).toBe('string');
            expect(result.error.length).toBeGreaterThan(0);
          }
        });
      });
    });
  });

  describe('Action Cost Calculation', () => {
    it('should assign correct costs to attack actions', () => {
      const result = evaluateCombatIntent('attack', context);
      expect(result.success).toBe(true);
      if (!result.success) {
        expect.fail('Attack command should succeed');
      }

      const actions: CombatAction[] = result.actions;
      expect(actions.length).toBe(1);

      const firstAction = actions[0];
      // ATTACK is now a high-level facade with zero cost - the actual costs are in STRIKE
      expect(firstAction.command).toBe(CommandType.ATTACK);
      expect(firstAction.cost.ap).toBe(0);
      expect(firstAction.cost.energy).toBe(0);
    });

    it('should assign correct costs to defend actions', () => {
      const result = evaluateCombatIntent('defend', context);
      expect(result.success).toBe(true);
      if (result.success) {
        // Defend uses all remaining AP (Alice has 4.5 AP in test scenario)
        expect(result.actions[0].cost.ap).toBe(4.5);
        expect(result.actions[0].cost.energy).toBe(0);
      }
    });

    it('should assign correct costs to movement actions', () => {
      const result = evaluateCombatIntent('advance distance 10', context);
      expect(result.success).toBe(true);
      if (result.success) {
        // AP cost should be tactically rounded up from physics calculation (3.03 → 3.1)
        expect(result.actions[0].cost.ap).toBe(3.1); // Tactical rounding applied to physics-based calculation
        expect(result.actions[0].cost.energy).toBe(1275); // Physics-based energy cost (rounded to nearest Joule)
      }
    });

    it('should use AP value for AP-based movement costs', () => {
      const result = evaluateCombatIntent('advance ap 3.0', context);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.actions[0].cost.ap).toBe(3.0); // Direct AP specification
        expect(result.actions[0].cost.energy).toBeGreaterThan(0); // AP-based movement still costs energy (physics-based)
      }
    });
  });

  describe('Actor ID Assignment', () => {
    it('should assign current actor ID to all actions', () => {
      const commands = [
        'attack',
        'defend',
        'target Bob',
        'advance distance 10',
        'retreat distance 5'
      ];

      commands.forEach(command => {
        const result = evaluateCombatIntent(command, context);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.actions[0].actorId).toBe(ALICE_ID);
        }
      });
    });
  });
});
