import { describe, it, expect, beforeEach } from 'vitest';
import { Actor, Stat } from '~/types/entity/actor';
import { Shell } from '~/types/entity/shell';
import { createInventory } from '~/worldkit/entity/actor/inventory';
import {
  addShellToActor,
  removeShellFromActor,
  getShell,
  createShell,
  createSequentialShell,
  mutateShellStats,
  applyShellStats,
  cloneShell,
  generateRandomShellName,
  ShellInput,
  getShellStatValue,
} from './index';
import { createActor } from '../index';

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
      [Stat.POW]: 15,
      [Stat.FIN]: 12,
      [Stat.RES]: 18,
    },
    inventory: createInventory(DEFAULT_TIMESTAMP),
    equipment: {},
    ...overrides,
  };
};

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
      expect(actor.shells?.[shell.id]).toBeUndefined();
      addShellToActor(actor, shell);
      expect(actor.shells?.[shell.id]).toBe(shell);
    });

    it('should add default shell when no shell provided', () => {
      const initialShellCount = Object.keys(actor.shells!).length;
      addShellToActor(actor);
      const finalShellCount = Object.keys(actor.shells!).length;
      expect(finalShellCount).toBe(initialShellCount + 1);
    });
  });

  describe('removeShellFromActor', () => {
    it('should remove shell from actor shells collection', () => {
      addShellToActor(actor, shell);
      expect(actor.shells?.[shell.id]).toBe(shell);
      removeShellFromActor(actor, shell.id);
      expect(actor.shells?.[shell.id]).toBeUndefined();
    });
  });

  describe('getShellFromActor', () => {
    it('should return shell by id', () => {
      addShellToActor(actor, shell);
      const retrieved = getShell(actor, shell.id);
      expect(retrieved).toBe(shell);
    });

    it('should return undefined for non-existent shell', () => {
      const retrieved = getShell(actor, 'non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });
});

describe('Shell Creation', () => {
  describe('createShell() - no arguments', () => {
    it('should create shell with default values', () => {
      const shell = createShell();
      expect(shell.id).toBeDefined();
      expect(shell.name).toBeDefined();
      expect(getShellStatValue(shell, Stat.POW)).toBe(10);
      expect(getShellStatValue(shell, Stat.FIN)).toBe(10);
      expect(getShellStatValue(shell, Stat.RES)).toBe(10);
      expect(shell.stats[Stat.RES]).toBe(10);
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
        [Stat.POW]: 20,
        [Stat.FIN]: 15,
        [Stat.RES]: 25,
      };
      const shell = createShell({ stats: customStats });
      expect(getShellStatValue(shell, Stat.POW)).toBe(20);
      expect(getShellStatValue(shell, Stat.FIN)).toBe(15);
      expect(getShellStatValue(shell, Stat.RES)).toBe(25);
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
          count: 1,
          items: {},
          ammo: {},
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
          [Stat.POW]: 99,
        }
      });

      const shell = createShell(transform);
      expect(shell.name).toBe('Transformed Shell');
      expect(getShellStatValue(shell, Stat.POW)).toBe(99);
      expect(getShellStatValue(shell, Stat.FIN)).toBe(10); // Unchanged
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
      expect(getShellStatValue(shell, Stat.POW)).toBe(50);
      expect(getShellStatValue(shell, Stat.FIN)).toBe(30);
      expect(getShellStatValue(shell, Stat.RES)).toBe(70);
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
        [Stat.POW]: 25,
        // Missing FIN and RES
      };

      const shell = createShell({ stats: partialStats });
      expect(getShellStatValue(shell, Stat.POW)).toBe(25);
      expect(getShellStatValue(shell, Stat.FIN)).toBe(10); // Default
      expect(getShellStatValue(shell, Stat.RES)).toBe(10); // Default
    });

    it('should handle identity transform', () => {
      const identityTransform = (shell: Shell): Shell => shell;
      const shell = createShell(identityTransform);

      expect(shell.id).toBeDefined();
      expect(shell.name).toBeDefined();
      expect(getShellStatValue(shell, Stat.POW)).toBe(10);
    });
  });
});

describe('Zero-Allocation Stat Mutations', () => {
  let baseStats: Shell['stats'];

  beforeEach(() => {
    baseStats = {
      [Stat.POW]: 15,
      [Stat.FIN]: 12,
      [Stat.RES]: 18,
    };
  });

  describe('mutateShellStats', () => {
    it('should handle multiple stats', () => {
      const statsCopy = {
        [Stat.POW]: baseStats[Stat.POW],
        [Stat.FIN]: baseStats[Stat.FIN],
        [Stat.RES]: baseStats[Stat.RES],
      };

      mutateShellStats(statsCopy, {
        [Stat.POW]: 25,
        [Stat.FIN]: 20,
      });

      expect(statsCopy[Stat.POW]).toBe(25);
      expect(statsCopy[Stat.FIN]).toBe(20);
      expect(statsCopy[Stat.RES]).toBe(18); // Unchanged
    });
  });

  describe('applyShellStats', () => {
    it('should return shallow copy with mutated stats', () => {
      const newStats = applyShellStats(baseStats, { [Stat.POW]: 20 });

      // Returns shallow copy of stats container
      expect(newStats).not.toBe(baseStats);
      // But individual stat objects are same references (mutated in place)
      expect(newStats[Stat.POW]).toBe(20);
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
      expect(clonedShell.inventory).not.toBe(shell.inventory);
      expect(clonedShell.equipment).not.toBe(shell.equipment);
    });

    it('should preserve all values exactly', () => {
      const clonedShell = cloneShell(shell);

      expect(clonedShell.id).toBe(shell.id);
      expect(clonedShell.name).toBe(shell.name);
      expect(clonedShell.stats[Stat.POW]).toBe(shell.stats[Stat.POW]);
      expect(clonedShell.stats[Stat.POW]).toBe(shell.stats[Stat.POW]);
    });

    it('should allow independent mutations after cloning', () => {
      const clonedShell = cloneShell(shell);

      mutateShellStats(clonedShell.stats, { [Stat.POW]: 99 });

      // Original unchanged
      expect(shell.stats[Stat.POW]).toBe(15);
      // Clone changed
      expect(clonedShell.stats[Stat.POW]).toBe(99);
    });
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

describe('Sequential Shell Creation', () => {
  let actor: Actor;

  beforeEach(() => {
    actor = createTestActor();
  });

  describe('createSequentialShell', () => {
    it('should create shell with ID "1" for actor with no shells', () => {
      // Start with empty shells
      actor.shells = {};

      const shell = createSequentialShell(actor);

      expect(shell.id).toBe('1');
      expect(shell.name).toBeDefined();
      expect(shell.stats).toBeDefined();
    });

    it('should create shell with ID "2" when actor has one shell', () => {
      actor.shells = { '1': createShell({ id: '1' }) };
      const shell = createSequentialShell(actor);
      expect(shell.id).toBe('2');
    });

    it('should create shell with ID "3" when actor has two shells', () => {
      const shell = createSequentialShell(actor);
      // There are already three shells, so the next one is 4
      expect(shell.id).toBe('4');
    });

    it('should handle non-sequential existing IDs correctly', () => {
      // Create actor with shells having IDs "1", "5", "3"
      actor.shells = {
        '1': createShell({ id: '1' }),
        '5': createShell({ id: '5' }),
        '3': createShell({ id: '3' }),
      };

      const shell = createSequentialShell(actor);

      // Should use next ID after highest (5 + 1 = 6)
      expect(shell.id).toBe('6');
    });

    it('should accept input parameters like createShell', () => {
      actor.shells = {};

      const shell = createSequentialShell(actor, {
        name: 'Custom Shell',
        stats: {
          [Stat.POW]: 25,
        },
      });

      expect(shell.id).toBe('1');
      expect(shell.name).toBe('Custom Shell');
      expect(shell.stats[Stat.POW]).toBe(25);
    });

    it('should accept transform function like createShell', () => {
      actor.shells = {};

      const shell = createSequentialShell(actor, (shell) => ({
        ...shell,
        name: 'Transformed Shell',
      }));

      expect(shell.id).toBe('1');
      expect(shell.name).toBe('Transformed Shell');
    });

    it('should use custom dependencies', () => {
      actor.shells = {};
      const customDeps = createShellFactoryDependencies({
        generateRandomShellName: () => 'TestShell',
      });

      const shell = createSequentialShell(actor, undefined, customDeps);

      expect(shell.id).toBe('1');
      expect(shell.name).toBe('TestShell');
    });

    it('should work with string IDs that are not numbers', () => {
      // Mix of numeric and non-numeric IDs - should only consider numeric ones
      actor.shells = {
        '1': createShell({ id: '1' }),
        'custom-shell': createShell({ id: 'custom-shell' }),
        '3': createShell({ id: '3' }),
        'another-shell': createShell({ id: 'another-shell' }),
      };

      const shell = createSequentialShell(actor);

      // Should use next ID after highest numeric ID (3 + 1 = 4)
      expect(shell.id).toBe('4');
    });
  });

  describe('computeHighestShellId (internal function behavior)', () => {
    it('should return 0 for actor with no shells', () => {
      actor.shells = {};

      // Test via createSequentialShell behavior
      const shell = createSequentialShell(actor);
      expect(shell.id).toBe('1'); // 0 + 1 = 1
    });

    it('should return highest numeric ID', () => {
      actor.shells = {
        '1': createShell({ id: '1' }),
        '10': createShell({ id: '10' }),
        '5': createShell({ id: '5' }),
      };

      const shell = createSequentialShell(actor);
      expect(shell.id).toBe('11'); // 10 + 1 = 11
    });

    it('should ignore non-numeric IDs', () => {
      actor.shells = {
        'abc': createShell({ id: 'abc' }),
        '2': createShell({ id: '2' }),
        'xyz': createShell({ id: 'xyz' }),
      };

      const shell = createSequentialShell(actor);
      expect(shell.id).toBe('3'); // 2 + 1 = 3
    });

    it('should handle IDs that start with numbers but contain letters', () => {
      actor.shells = {
        '5abc': createShell({ id: '5abc' }), // parseInt('5abc') = 5
        '10xyz': createShell({ id: '10xyz' }), // parseInt('10xyz') = 10
        '3': createShell({ id: '3' }),
      };

      const shell = createSequentialShell(actor);
      expect(shell.id).toBe('11'); // 10 + 1 = 11
    });
  });
});
