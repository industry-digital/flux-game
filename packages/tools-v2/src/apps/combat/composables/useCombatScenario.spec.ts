import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { nextTick, ref } from 'vue';
import { createComposableTestSuite } from '~/testing';
import { ALICE_ID, BOB_ID } from '../testing';
import { useCombatScenario, type CombatScenarioDependencies } from './useCombatScenario';
import type { CombatScenarioActorData, CombatScenarioData } from '../types';

describe('useCombatScenario', () => {
  const { setup, teardown, runWithContext } = createComposableTestSuite();

  beforeEach(setup);
  afterEach(teardown);

  // Create mock dependencies for each test
  const createMockDeps = (): CombatScenarioDependencies => {
    const mockStorage = ref<CombatScenarioData>({
      actors: {
        [ALICE_ID]: {
          stats: { pow: 10, fin: 10, res: 10, per: 10 },
          aiControlled: false,
          weapon: 'flux:schema:weapon:longsword' as any,
          skills: { 'flux:skill:evasion': 0, 'flux:skill:weapon:melee': 0 }
        },
        [BOB_ID]: {
          stats: { pow: 10, fin: 10, res: 10 },
          aiControlled: true,
          weapon: 'flux:schema:weapon:longsword' as any,
          skills: { 'flux:skill:evasion': 0, 'flux:skill:weapon:melee': 0 }
        }
      }
    });

    const mockSetStorage = vi.fn((newValue: CombatScenarioData) => {
      mockStorage.value = newValue;
    });

    return {
      useLocalStorage: vi.fn(() => [mockStorage, mockSetStorage]) as any,
      useLogger: vi.fn(() => ({
        info: vi.fn(),
        debug: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
        child: vi.fn().mockReturnThis(),
      })),
      setTimeout: vi.fn((_callback: () => void, _delay: number) => {
        // Don't execute callback immediately - let the test control timing
        return 'mock-timeout' as any;
      }),
      clearTimeout: vi.fn()
    };
  };

  it('should initialize with default scenario', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      expect(scenario.isLoaded.value).toBe(true);
      expect(scenario.actorCount.value).toBe(2);
      expect(scenario.hasActor(ALICE_ID)).toBe(true);
      expect(scenario.hasActor(BOB_ID)).toBe(true);
      expect(scenario.isDirty.value).toBe(false);
    });
  });

  it('should provide actor IDs and count', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      expect(scenario.actorIds.value).toContain(ALICE_ID);
      expect(scenario.actorIds.value).toContain(BOB_ID);
      expect(scenario.actorCount.value).toBe(2);
    });
  });

  it('should get actor data by ID', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      const aliceData = scenario.getActorData(ALICE_ID);
      expect(aliceData).toBeTruthy();
      expect(aliceData?.aiControlled).toBe(false);

      const bobData = scenario.getActorData(BOB_ID);
      expect(bobData).toBeTruthy();
      expect(bobData?.aiControlled).toBe(true);

      const nonExistentData = scenario.getActorData('flux:actor:nonexistent' as any);
      expect(nonExistentData).toBeNull();
    });
  });

  it('should update actor data', async () => {
    runWithContext(async () => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      const updates: Partial<CombatScenarioActorData> = {
        stats: { pow: 15, fin: 12 },
        aiControlled: true
      };

      scenario.updateActorData(ALICE_ID, updates);
      await nextTick();

      const aliceData = scenario.getActorData(ALICE_ID);
      expect(aliceData?.stats.pow).toBe(15);
      expect(aliceData?.stats.fin).toBe(12);
      expect(aliceData?.aiControlled).toBe(true);
      expect(scenario.isDirty.value).toBe(true);
    });
  });

  it('should add new actors', async () => {
    runWithContext(async () => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      const charlieId = 'flux:actor:charlie' as any;
      const charlieData: CombatScenarioActorData = {
        stats: { pow: 12, fin: 11, res: 10 },
        aiControlled: true,
        weapon: 'flux:schema:weapon:longsword' as any,
        skills: {
          'flux:skill:evasion': 1,
          'flux:skill:weapon:melee': 2
        }
      };

      const success = scenario.addActor(charlieId, charlieData);
      await nextTick();

      expect(success).toBe(true);
      expect(scenario.hasActor(charlieId)).toBe(true);
      expect(scenario.actorCount.value).toBe(3);
      expect(scenario.isDirty.value).toBe(true);
    });
  });

  it('should not add duplicate actors', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      const duplicateData: CombatScenarioActorData = {
        stats: { pow: 10 },
        aiControlled: false,
        weapon: 'flux:schema:weapon:longsword' as any,
        skills: {}
      };

      const success = scenario.addActor(ALICE_ID, duplicateData);
      expect(success).toBe(false);
      expect(scenario.actorCount.value).toBe(2); // Should remain unchanged
    });
  });

  it('should remove actors', async () => {
    runWithContext(async () => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      const success = scenario.removeActor(BOB_ID);
      await nextTick();

      expect(success).toBe(true);
      expect(scenario.hasActor(BOB_ID)).toBe(false);
      expect(scenario.actorCount.value).toBe(1);
      expect(scenario.isDirty.value).toBe(true);
    });
  });

  it('should not remove non-existent actors', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      const success = scenario.removeActor('flux:actor:nonexistent' as any);
      expect(success).toBe(false);
      expect(scenario.actorCount.value).toBe(2); // Should remain unchanged
    });
  });

  it('should reset to defaults', async () => {
    runWithContext(async () => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      // Modify the scenario
      scenario.updateActorData(ALICE_ID, { aiControlled: true });
      await nextTick();
      expect(scenario.isDirty.value).toBe(true);

      // Reset to defaults
      scenario.resetToDefaults();
      await nextTick();

      const aliceData = scenario.getActorData(ALICE_ID);
      expect(aliceData?.aiControlled).toBe(false); // Back to default
      expect(scenario.isDirty.value).toBe(true); // Should be dirty after reset
    });
  });

  it('should track unsaved changes', async () => {
    runWithContext(async () => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      expect(scenario.hasUnsavedChanges.value).toBe(false);

      scenario.updateActorData(ALICE_ID, { aiControlled: true });
      await nextTick();

      expect(scenario.hasUnsavedChanges.value).toBe(true);
    });
  });

  it('should save scenario', () => {
    runWithContext(() => {
      const mockDeps = createMockDeps();
      const scenario = useCombatScenario('test-scenario', mockDeps);

      // Make a change to mark as dirty
      scenario.updateActorData(ALICE_ID, { aiControlled: true });
      expect(scenario.isDirty.value).toBe(true);

      const success = scenario.saveScenario();

      expect(success).toBe(true);
      expect(scenario.isDirty.value).toBe(false);
      expect(scenario.lastSaved.value).toBeInstanceOf(Date);
    });
  });
});
