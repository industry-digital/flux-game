/**
 * Combat testing utilities
 *
 * Provides domain-specific test helpers, mocks, and assertions
 * for combat-related functionality.
 */

export {
  createMockTransformerContext,
  createTestActor,
  createMockWeaponSchema,
  createMockCombatSession,
  createTestCombatScenario,
  createMockIntentSystem,
  createMockWorldEvent,
  combatAssertions,
  // Test constants
  TEST_PLACE_ID,
  ALICE_ID,
  BOB_ID,
  CHARLIE_ID,
} from './combat-helpers';
