import { describe, it, expect, beforeEach } from 'vitest';
import { Actor, Stat } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { ModifiableScalarAttribute } from '~/types/entity/attribute';
import { createInventory } from '~/worldkit/entity/actor/inventory';
import { createModifiableScalarAttribute } from '~/worldkit/entity';
import {
  addShellToActor,
  removeShellFromActor,
  getShellFromActor, findShellByNameOrId,
  createShell,
  mutateShellStats,
  applyShellStats,
  cloneShell,
  generateRandomShellName,
  ShellInput
} from './index';
import { createActor } from '../index';
import { createModifier } from '~/worldkit/entity/modifier';

const DEFAULT_TIMESTAMP = 1234567890000;

// Test fixtures
const createTestActor = (): Actor => {
  return createActor({
    name: 'Test Actor',
    description: { base: 'Test actor for shell tests' },
  });
};

const createTestShell = (overrides: Partial<Shell> = {}): Shell => {
  return {
    id: 'test-shell',
    name: 'Test Shell',
    stats: {
      [Stat.POW]: createModifiableScalarAttribute((attr) => ({ ...attr, nat: 15, eff: 15 })),
      [Stat.FIN]: createModifiableScalarAttribute((attr) => ({ ...attr, nat: 12, eff: 12 })),
      [Stat.RES]: createModifiableScalarAttribute((attr) => ({ ...attr, nat: 18, eff: 18 })),
    },
    inventory: createInventory(DEFAULT_TIMESTAMP),
    equipment: {},
    ...overrides,
  };
};

const createTestStat = (overrides: Partial<ModifiableScalarAttribute> = {}): ModifiableScalarAttribute => ({
  nat: 10,
  eff: 10,
  mods: {},
  ...overrides,
});

const createShellFactoryDependencies = (overrides: any = {}) => {
  return {
    hashUnsafeString: () => 'deterministic-id',
    createInventory: () => ({
      mass: 100,
      items: {},
      ts: DEFAULT_TIMESTAMP,
    }),
    generateRandomShellName: () => 'Test Shell',
    timestamp: () => DEFAULT_TIMESTAMP,
    ...overrides,
  };
};

describe('Shell Management Functions', () => {
  let actor: Actor;
  let shell: Shell;

  beforeEach(() => {
    actor = createTestActor();
    shell = createTestShell();
  });

  describe('addShellToActor', () => {
    it('should add shell to actor shells collection', () => {
      expect(actor.shells[shell.id]).toBeUndefined();
      addShellToActor(actor, shell);
      expect(actor.shells[shell.id]).toBe(shell);
    });

    it('should add default shell when no shell provided', () => {
      const initialShellCount = Object.keys(actor.shells).length;
      addShellToActor(actor);
      const finalShellCount = Object.keys(actor.shells).length;
      expect(finalShellCount).toBe(initialShellCount + 1);
    });
  });

  describe('removeShellFromActor', () => {
    it('should remove shell from actor shells collection', () => {
      addShellToActor(actor, shell);
      expect(actor.shells[shell.id]).toBe(shell);
      removeShellFromActor(actor, shell.id);
      expect(actor.shells[shell.id]).toBeUndefined();
    });
  });

  describe('getShellFromActor', () => {
    it('should return shell by id', () => {
      addShellToActor(actor, shell);
      const retrieved = getShellFromActor(actor, shell.id);
      expect(retrieved).toBe(shell);
    });

    it('should return undefined for non-existent shell', () => {
      const retrieved = getShellFromActor(actor, 'non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('findShellByNameOrId', () => {
    beforeEach(() => {
      const shell1 = createTestShell({ id: 'exact-id', name: 'Combat Shell' });
      const shell2 = createTestShell({ id: 'another-id', name: 'Stealth Shell' });
      addShellToActor(actor, shell1);
      addShellToActor(actor, shell2);
    });

    it('should find shell by exact id', () => {
      const result = findShellByNameOrId(actor, 'exact-id');
      expect(result).not.toBeNull();
      expect(result!.id).toBe('exact-id');
      expect(result!.shell.name).toBe('Combat Shell');
    });

    it('should find shell by fuzzy name match', () => {
      const result = findShellByNameOrId(actor, 'combat');
      expect(result).not.toBeNull();
      expect(result!.shell.name).toBe('Combat Shell');
    });

    it('should return null for no match', () => {
      const result = findShellByNameOrId(actor, 'non-existent');
      expect(result).toBeNull();
    });
  });
});

describe('Shell Creation', () => {
  describe('createShell() - no arguments', () => {
    it('should create shell with default values', () => {
      const shell = createShell();
      expect(shell.id).toBeDefined();
      expect(shell.name).toBeDefined();
      expect(shell.stats[Stat.POW].nat).toBe(10);
      expect(shell.stats[Stat.FIN].nat).toBe(10);
      expect(shell.stats[Stat.RES].nat).toBe(10);
      expect(shell.inventory).toBeDefined();
      expect(shell.equipment).toEqual({});
    });

    it('should generate unique IDs for multiple shells', () => {
      const shell1 = createShell();
      const shell2 = createShell();
      expect(shell1.id).not.toBe(shell2.id);
      expect(shell1.name).not.toBe(shell2.name);
    });
  });

  describe('createShell(input, deps?) - input with optional dependencies', () => {
    it('should create shell with custom input', () => {
      const input: ShellInput = {
        id: 'custom-id',
        name: 'Custom Shell',
      };
      const shell = createShell(input);
      expect(shell.id).toBe('custom-id');
      expect(shell.name).toBe('Custom Shell');
    });

    it('should use provided stats from input', () => {
      const customStats = {
        [Stat.POW]: createTestStat({ nat: 20, eff: 20 }),
        [Stat.FIN]: createTestStat({ nat: 15, eff: 15 }),
        [Stat.RES]: createTestStat({ nat: 25, eff: 25 }),
      };
      const shell = createShell({ stats: customStats });
      expect(shell.stats[Stat.POW].nat).toBe(20);
      expect(shell.stats[Stat.FIN].nat).toBe(15);
      expect(shell.stats[Stat.RES].nat).toBe(25);
    });

    it('should use provided inventory from input', () => {
      const customInventory = createInventory();
      customInventory.mass = 500;
      const shell = createShell({ inventory: customInventory });
      expect(shell.inventory.mass).toBe(500);
    });

    it('should use custom dependencies for deterministic creation', () => {
      const input: ShellInput = {
        name: 'Test Shell'
      };
      const deps = {
        hashUnsafeString: () => 'deterministic-id',
        createInventory: () => ({
          mass: 100,
          items: {},
          ts: DEFAULT_TIMESTAMP,
        }),
        generateRandomShellName: () => 'Test Shell',
        timestamp: () => DEFAULT_TIMESTAMP,
      };

      const shell = createShell(input, deps);
      expect(shell.id).toBe('deterministic-id');
      expect(shell.name).toBe('Test Shell');
      expect(shell.inventory.mass).toBe(100);
      expect(shell.inventory.ts).toBe(DEFAULT_TIMESTAMP);
    });

    it('should fall back to hashUnsafeString when no id provided in input', () => {
      const input: ShellInput = {
        name: 'No ID Shell'
      };
      const deps = createShellFactoryDependencies({
        hashUnsafeString: (name: string) => `hashed-${name}`,
        createInventory: () => createInventory()
      });

      const shell = createShell(input, deps);
      expect(shell.id).toBe('hashed-No ID Shell');
      expect(shell.name).toBe('No ID Shell');
    });
  });

  describe('createShell(transform, deps?) - transform with optional dependencies', () => {
    it('should apply transform function to default shell', () => {
      const transform = (shell: Shell): Shell => ({
        ...shell,
        name: 'Transformed Shell',
        stats: {
          ...shell.stats,
          [Stat.POW]: createTestStat({ nat: 99, eff: 99 })
        }
      });

      const shell = createShell(transform);
      expect(shell.name).toBe('Transformed Shell');
      expect(shell.stats[Stat.POW].nat).toBe(99);
      expect(shell.stats[Stat.FIN].nat).toBe(10); // Unchanged
    });

    it('should apply transform with custom dependencies', () => {
      const transform = (shell: Shell): Shell => ({
        ...shell,
        name: 'Transformed Shell'
      });

      const deps = createShellFactoryDependencies({
        hashUnsafeString: () => 'transform-id',
        generateRandomShellName: () => 'transform-name',
        createInventory: () => ({
          mass: 200,
          items: {},
          ts: 9876543210
        })
      });

      const shell = createShell(transform, deps);
      expect(shell.id).toBe('transform-id');
      expect(shell.name).toBe('Transformed Shell');
      expect(shell.inventory.mass).toBe(200);
      expect(shell.inventory.ts).toBe(9876543210);
    });

    it('should allow complex transformations', () => {
      const transform = (shell: Shell): Shell => {
        // Zero-allocation mutation pattern
        mutateShellStats(shell.stats, {
          [Stat.POW]: 50,
          [Stat.FIN]: 30,
          [Stat.RES]: 70
        });
        return {
          ...shell,
          name: 'Combat Shell'
        };
      };

      const shell = createShell(transform);
      expect(shell.name).toBe('Combat Shell');
      expect(shell.stats[Stat.POW].nat).toBe(50);
      expect(shell.stats[Stat.FIN].nat).toBe(30);
      expect(shell.stats[Stat.RES].nat).toBe(70);
    });
  });

  describe('Dependency injection patterns', () => {
    it('should use deterministic dependencies for testing', () => {
      const deterministicDeps = createShellFactoryDependencies({
        hashUnsafeString: () => 'test-id',
        createInventory: () => ({
          mass: 0,
          items: {},
          ts: 1234567890
        })
      });

      // Use the transform overload: createShell(transform, deps)
      const identityTransform = (shell: Shell): Shell => shell;
      const shell1 = createShell(identityTransform, deterministicDeps);
      const shell2 = createShell(identityTransform, deterministicDeps);

      // Same dependencies should produce identical results
      expect(shell1.id).toBe(shell2.id);
      expect(shell1.inventory.ts).toBe(shell2.inventory.ts);
    });

    it('should handle custom inventory creation', () => {
      const customInventoryCreator = () => ({
        mass: 999,
        items: { 'test-item': { id: 'test-item' as any, schema: 'test-schema' as any } },
        ts: 5555555555
      });

      const deps = createShellFactoryDependencies({
        hashUnsafeString: (name: string) => `custom-${name}`,
        createInventory: customInventoryCreator
      });

      // Use the transform overload: createShell(transform, deps)
      const identityTransform = (shell: Shell): Shell => shell;
      const shell = createShell(identityTransform, deps);
      expect(shell.inventory.mass).toBe(999);
      expect(shell.inventory.items['test-item']).toBeDefined();
      expect(shell.inventory.ts).toBe(5555555555);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty input object', () => {
      const shell = createShell({});
      expect(shell.id).toBeDefined();
      expect(shell.name).toBeDefined();
      expect(shell.stats).toBeDefined();
      expect(shell.inventory).toBeDefined();
      expect(shell.equipment).toEqual({});
    });

    it('should handle partial stats in input', () => {
      const partialStats = {
        [Stat.POW]: createTestStat({ nat: 25, eff: 25 })
        // Missing FIN and RES
      };

      const shell = createShell({ stats: partialStats });
      expect(shell.stats[Stat.POW].nat).toBe(25);
      expect(shell.stats[Stat.FIN].nat).toBe(10); // Default
      expect(shell.stats[Stat.RES].nat).toBe(10); // Default
    });

    it('should handle identity transform', () => {
      const identityTransform = (shell: Shell): Shell => shell;
      const shell = createShell(identityTransform);

      expect(shell.id).toBeDefined();
      expect(shell.name).toBeDefined();
      expect(shell.stats[Stat.POW].nat).toBe(10);
    });
  });
});

describe('Zero-Allocation Stat Mutations', () => {
  let baseStats: Shell['stats'];

  beforeEach(() => {
    baseStats = {
      [Stat.POW]: createTestStat({ nat: 15, eff: 15 }),
      [Stat.FIN]: createTestStat({ nat: 12, eff: 12 }),
      [Stat.RES]: createTestStat({ nat: 18, eff: 18 }),
    };
  });

  describe('mutateShellStats', () => {
    it('should mutate stats in place (zero allocations)', () => {
      const statsCopy = {
        [Stat.POW]: { ...baseStats[Stat.POW] },
        [Stat.FIN]: { ...baseStats[Stat.FIN] },
        [Stat.RES]: { ...baseStats[Stat.RES] },
      };
      const originalPowRef = statsCopy[Stat.POW];

      mutateShellStats(statsCopy, { [Stat.POW]: 20 });

      // Same object reference (zero allocations)
      expect(statsCopy[Stat.POW]).toBe(originalPowRef);
      // But values updated
      expect(statsCopy[Stat.POW].nat).toBe(20);
      expect(statsCopy[Stat.POW].eff).toBe(20);
    });

    it('should handle multiple stats', () => {
      const statsCopy = {
        [Stat.POW]: { ...baseStats[Stat.POW] },
        [Stat.FIN]: { ...baseStats[Stat.FIN] },
        [Stat.RES]: { ...baseStats[Stat.RES] },
      };

      mutateShellStats(statsCopy, {
        [Stat.POW]: 25,
        [Stat.FIN]: 20,
      });

      expect(statsCopy[Stat.POW].nat).toBe(25);
      expect(statsCopy[Stat.FIN].nat).toBe(20);
      expect(statsCopy[Stat.RES].nat).toBe(18); // Unchanged
    });

    it('should clear modifiers for updated stats', () => {
      const statsCopy = {
        [Stat.POW]: createTestStat({
          nat: 15,
          eff: 15,
          mods: {
            someModifier: createModifier({
              origin: 'stat:pow',
              value: 5,
              duration: -1,
              ts: DEFAULT_TIMESTAMP,
            }),
          },
        }),
        [Stat.FIN]: createTestStat({ nat: 12, eff: 12 }),
        [Stat.RES]: createTestStat({ nat: 18, eff: 18 }),
      };

      mutateShellStats(statsCopy, { [Stat.POW]: 20 });
      expect(statsCopy[Stat.POW].mods).toBeUndefined();
    });
  });

  describe('applyShellStats', () => {
    it('should return shallow copy with mutated stats', () => {
      const newStats = applyShellStats(baseStats, { [Stat.POW]: 20 });

      // Returns shallow copy of stats container
      expect(newStats).not.toBe(baseStats);
      // But individual stat objects are same references (mutated in place)
      expect(newStats[Stat.POW]).toBe(baseStats[Stat.POW]);
      expect(newStats[Stat.FIN]).toBe(baseStats[Stat.FIN]);
      expect(newStats[Stat.RES]).toBe(baseStats[Stat.RES]);
    });
  });
});

describe('Deep Cloning', () => {
  describe('cloneShell', () => {
    let shell: Shell;

    beforeEach(() => {
      shell = createTestShell();
    });

    it('should create completely independent deep copy', () => {
      const clonedShell = cloneShell(shell);

      // Different references at all levels
      expect(clonedShell).not.toBe(shell);
      expect(clonedShell.stats).not.toBe(shell.stats);
      expect(clonedShell.stats[Stat.POW]).not.toBe(shell.stats[Stat.POW]);
      expect(clonedShell.inventory).not.toBe(shell.inventory);
      expect(clonedShell.equipment).not.toBe(shell.equipment);
    });

    it('should preserve all values exactly', () => {
      const clonedShell = cloneShell(shell);

      expect(clonedShell.id).toBe(shell.id);
      expect(clonedShell.name).toBe(shell.name);
      expect(clonedShell.stats[Stat.POW].nat).toBe(shell.stats[Stat.POW].nat);
      expect(clonedShell.stats[Stat.POW].eff).toBe(shell.stats[Stat.POW].eff);
    });

    it('should allow independent mutations after cloning', () => {
      const clonedShell = cloneShell(shell);

      mutateShellStats(clonedShell.stats, { [Stat.POW]: 99 });

      // Original unchanged
      expect(shell.stats[Stat.POW].nat).toBe(15);
      // Clone changed
      expect(clonedShell.stats[Stat.POW].nat).toBe(99);
    });
  });
});

describe('Correct Usage Patterns', () => {
  it('should demonstrate performance pattern: direct mutation', () => {
    const shell = createTestShell();
    const originalPowRef = shell.stats[Stat.POW];

    // For performance-critical paths: mutate directly
    mutateShellStats(shell.stats, { [Stat.POW]: 30 });

    // Same object, updated values (zero allocations)
    expect(shell.stats[Stat.POW]).toBe(originalPowRef);
    expect(shell.stats[Stat.POW].nat).toBe(30);
  });

  it('should demonstrate safety pattern: clone then mutate', () => {
    const originalShell = createTestShell();

    // For workbench scenarios: clone first for safety
    const clonedShell = cloneShell(originalShell);
    mutateShellStats(clonedShell.stats, { [Stat.POW]: 30 });

    // Original completely unchanged
    expect(originalShell.stats[Stat.POW].nat).toBe(15);
    // Clone has new values
    expect(clonedShell.stats[Stat.POW].nat).toBe(30);
    // Completely independent objects
    expect(clonedShell.stats).not.toBe(originalShell.stats);
  });
});

describe('Shell Name Generation', () => {
  it('should generate deterministic names with custom random', () => {
    const name1 = generateRandomShellName(() => 0.5);
    const name2 = generateRandomShellName(() => 0.5);
    expect(name1).toBe(name2);
  });

  it('should generate different names with different random values', () => {
    const name1 = generateRandomShellName(() => 0.1);
    const name2 = generateRandomShellName(() => 0.9);
    expect(name1).not.toBe(name2);
  });
});
