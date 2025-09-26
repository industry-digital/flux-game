import { describe, it, expect } from 'vitest';
import { AnsiColors, ColorStrategies, renderBattlefieldNotation } from './battlefield-notation';
// Import internal functions for micro-benchmarking
import { Battlefield, BattlefieldPosition, FullyQualifiedCombatant, CombatFacing } from '~/types/combat';
import { Actor } from '~/types/entity/actor';
import { ActorURN } from '~/types/taxonomy';
import { createCombatant } from '~/worldkit/combat/combatant';
import { createActor } from '~/worldkit/entity/actor';

type TestCombatantInput = {
  actor: Actor;
  team: string;
  position?: BattlefieldPosition;
  initiative?: number; // Initiative roll result
};

const createTestActor = (actorName: string) : Actor => {
  const actorId = `flux:actor:${actorName.toLowerCase().replace(/\s+/g, '-')}` as ActorURN;
  return createActor({}, (a) => ({
    ...a,
    id: actorId,
    name: actorName,
  }));
};

const createTestCombatant = ({ actor, team, position, initiative }: TestCombatantInput) : FullyQualifiedCombatant => {
  const baseCombatant = createCombatant(actor, team, (c) => ({
    ...c,
    actorId: actor.id,
    team,
    position: position || { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 },
  }));

  // Add initiative roll result
  return {
    ...baseCombatant,
    initiative: {
      dice: '1d20' as const,
      result: initiative || 10, // Default initiative of 10
      natural: initiative || 10,
      values: [initiative || 10],
      mods: {},
    }
  };
};

const createSingleActorTestData = (input: TestCombatantInput) => {
  const battlefield: Battlefield = { length: 300, margin: 100, cover: [] };
  const combatant = createTestCombatant(input);

  return {
    battlefield,
    combatants: new Map([[input.actor.id, combatant]]),
    actors: { [input.actor.id]: input.actor }
  };
};

const createMultiCombatantTestData = (inputs: TestCombatantInput[]) => {
  const battlefield: Battlefield = { length: 300, margin: 100, cover: [] };

  const combatantEntries: [ActorURN, FullyQualifiedCombatant][] = Array(inputs.length);
  const actors: Record<ActorURN, Actor> = {};

  let i = 0;
  for (const input of inputs) {
    const combatant = createTestCombatant(input);
    actors[input.actor.id] = input.actor;
    combatantEntries[i] = [input.actor.id, combatant];
    i++;
  }

  const combatants = new Map<ActorURN, FullyQualifiedCombatant>(combatantEntries);

  return { battlefield, combatants, actors };
};

describe('AnsiColors', () => {
  it('provides correct ANSI color codes', () => {
    expect(AnsiColors.RED).toBe('\x1b[91m');
    expect(AnsiColors.GREEN).toBe('\x1b[38;5;46m'); // Updated to vibrant green
    expect(AnsiColors.CYAN).toBe('\x1b[36m');
    expect(AnsiColors.RESET).toBe('\x1b[0m');
  });

  it('provides higher-order color functions', () => {
    expect(AnsiColors.red('test')).toBe('\x1b[91mtest\x1b[0m');
    expect(AnsiColors.green('test')).toBe('\x1b[38;5;46mtest\x1b[0m'); // Updated to vibrant green
    expect(AnsiColors.cyan('test')).toBe('\x1b[36mtest\x1b[0m');
  });
});

describe('ColorStrategies', () => {
  it('provides DEFAULT strategy with cyan subject, magenta enemy', () => {
    const strategy = ColorStrategies.DEFAULT;
    expect(strategy.subject('JS')).toBe('\x1b[36mJS\x1b[0m'); // Cyan
    expect(strategy.enemy('BT')).toBe('\x1b[95mBT\x1b[0m'); // Bright magenta
    expect(strategy.neutral('AL')).toBe('AL');
  });

  it('provides DEBUG strategy with cyan subject, red enemy', () => {
    const strategy = ColorStrategies.DEBUG;
    expect(strategy.subject('JS')).toBe('\x1b[36mJS\x1b[0m');
    expect(strategy.enemy('BT')).toBe('\x1b[91mBT\x1b[0m');
    expect(strategy.neutral('AL')).toBe('AL');
  });

  it('provides PLAIN strategy with no coloring', () => {
    const strategy = ColorStrategies.PLAIN;
    expect(strategy.subject('JS')).toBe('JS');
    expect(strategy.enemy('BT')).toBe('BT');
    expect(strategy.neutral('AL')).toBe('AL');
  });

  it('provides HIGH_CONTRAST strategy with bold colors', () => {
    const strategy = ColorStrategies.HIGH_CONTRAST;
    expect(strategy.subject('JS')).toBe('\x1b[1;92mJS\x1b[0m');
    expect(strategy.enemy('BT')).toBe('\x1b[1;91mBT\x1b[0m');
    expect(strategy.neutral('AL')).toBe('\x1b[1;37mAL\x1b[0m');
  });

  it('provides GRUVBOX strategy with 256-color codes', () => {
    const strategy = ColorStrategies.GRUVBOX;
    expect(strategy.subject('JS')).toBe('\x1b[38;5;142mJS\x1b[0m');
    expect(strategy.enemy('BT')).toBe('\x1b[38;5;167mBT\x1b[0m');
    expect(strategy.neutral('AL')).toBe('\x1b[38;5;223mAL\x1b[0m');
  });
});

describe('Battlefield Notation with First Letter Symbols', () => {
  it('generates single letter symbols with uniform subscripts', () => {
    const { battlefield, combatants, actors } = createSingleActorTestData({
      actor: createTestActor('Alice'),
      team: 'alpha',
      position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 }
    });

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });

    expect(result).toBe('[ A₁> ]'); // With padding inside brackets
  });

  it('handles name collisions with sequential subscripts', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Arthur'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Anna'), team: 'alpha', position: { coordinate: 200, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });

    // All A names get sequential subscripts: A₁, A₂, A₃ (with padding)
    expect(result).toBe('[ A₁> ]─50m─[ <A₂ ]─50m─[ A₃> ]');
  });

  it('maintains uniform subscripts even for unique letters', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Charlie'), team: 'alpha', position: { coordinate: 200, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });

    // Each unique letter gets subscript ₁ (with padding)
    expect(result).toBe('[ A₁> ]─50m─[ <B₁ ]─50m─[ C₁> ]');
  });

  it('groups combatants at same position with spaces', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });

    // Left-facing first, then right-facing, grouped in same brackets with boundary space
    expect(result).toBe('[ <A₁ B₁> ]');
  });

  it('applies team colors correctly', () => {
    const alice = createTestActor('Alice');
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: alice, team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Charlie'), team: 'alpha', position: { coordinate: 200, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: alice.id,
      colorStrategy: ColorStrategies.DEFAULT
    });

    // Alice (currently acting) gets inverted cyan, Bob (enemy) magenta, Charlie (ally) cyan
    expect(result).toContain('\x1b[7m\x1b[36mA₁\x1b[0m>\x1b[0m'); // Alice acting with inversion
    expect(result).toContain('<\x1b[95mB₁\x1b[0m'); // Bob magenta
    expect(result).toContain('\x1b[36mC₁\x1b[0m>'); // Charlie cyan (same team as Alice)
  });

  it('highlights currently acting combatant with inverted background', () => {
    const alice = createTestActor('Alice');
    const bob = createTestActor('Bob');
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: alice, team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: bob, team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: bob.id,
      colorStrategy: ColorStrategies.PLAIN
    });

    // Bob should have inverted background (includes chevron)
    expect(result).toBe('[ A₁> ]─50m─[ \x1b[7m<B₁\x1b[0m ]');
  });

  it('handles empty names with fallback symbol', () => {
    const { battlefield, combatants, actors } = createSingleActorTestData({
      actor: createTestActor(''),
      team: 'alpha',
      position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 }
    });

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });

    expect(result).toBe('[ X₁> ]'); // Fallback to X with subscript and padding
  });

  it('handles empty battlefield', () => {
    const battlefield: Battlefield = { length: 300, margin: 100, cover: [] };
    const result = renderBattlefieldNotation(battlefield, new Map(), {});
    expect(result).toBe('');
  });

  it('sorts by facing within same position (left before right)', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Charlie'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });

    // Left-facing (Bob, Charlie) should appear before right-facing (Alice) (with margins)
    expect(result).toBe('[ <B₁<C₁ A₁> ]');
  });
});

describe('Margin and Chevron Styling', () => {
  it('shows new margin and uncolored chevron approach', () => {
    console.log('\n=== MARGIN AND CHEVRON STYLING ===\n');

    const alice = createTestActor('Alice');
    const bob = createTestActor('Bob');
    const charlie = createTestActor('Charlie');

    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: alice, team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: bob, team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: charlie, team: 'alpha', position: { coordinate: 200, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    // Normal display
    const normal = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: alice.id,
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('Normal (with margins):', normal);

    // With Alice acting (subject acting)
    const aliceActing = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: alice.id,
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('Alice acting (subject):', aliceActing);

    // With Bob acting (enemy acting)
    const bobActing = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: bob.id,
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('Bob acting (enemy):', bobActing);

    // Same position grouping with margins
    const { battlefield: bf2, combatants: c2, actors: a2 } = createMultiCombatantTestData([
      { actor: createTestActor('Tank'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Healer'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);
    const grouped = renderBattlefieldNotation(bf2, c2, a2, {
      colorStrategy: ColorStrategies.PLAIN
    });
    console.log('Same position grouping:', grouped);

    // Test different subscript lengths to show padding balance
    const { battlefield: bf3, combatants: c3, actors: a3 } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Arthur'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Anna'), team: 'alpha', position: { coordinate: 200, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);
    const subscriptTest = renderBattlefieldNotation(bf3, c3, a3, {
      currentlyActingId: Object.values(a3).find(actor => actor.name === 'Arthur')?.id as ActorURN, // Arthur acting
      colorStrategy: ColorStrategies.PLAIN
    });
    console.log('Subscript padding test:', subscriptTest);

    console.log('\nAnalysis:');
    console.log('- Left-facing: <A₁  (chevron left, margin right)');
    console.log('- Right-facing:  A₁> (left padding matches subscript width)');
    console.log('- A₁ gets 1 space padding, A₂ gets 1 space, etc.');
    console.log('- Only the symbol (A₁) is colored, not the chevron or padding');
    console.log('- Inversion applies to entire representation for balanced width');

    console.log('\n=== END MARGIN AND CHEVRON STYLING ===\n');

    expect(normal).toBeTruthy();
  });
});

describe('Green Background Inversion Exploration', () => {
  it('shows inverted green background options for acting combatant', () => {
    console.log('\n=== GREEN BACKGROUND INVERSION EXAMPLES ===\n');

    const alice = createTestActor('Alice');
    const bob = createTestActor('Bob');
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: alice, team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: bob, team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    // Current approach: standard inversion (\x1b[7m)
    const current = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: alice.id, // Alice is acting
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('Current inversion (Alice acting):', current);

    // Test different green background approaches
    const backgroundOptions = [
      { name: 'Green bg + black text', code: '\x1b[48;5;46m\x1b[30m' },
      { name: 'Green bg + white text', code: '\x1b[48;5;46m\x1b[97m' },
      { name: 'Green bg + dark text', code: '\x1b[48;5;46m\x1b[38;5;232m' },
      { name: 'Bright green bg + black', code: '\x1b[48;5;82m\x1b[30m' },
      { name: 'Matrix green bg + bright white', code: '\x1b[48;5;40m\x1b[97m' },
    ];

    for (const option of backgroundOptions) {
      // Create a custom strategy that uses green background for acting combatant
      const customStrategy = {
        subject: (text: string) => `\x1b[38;5;46m${text}\x1b[0m`,
        enemy: (text: string) => `\x1b[91m${text}\x1b[0m`,
        neutral: (text: string) => text,
      };

      // Manually construct what it would look like with custom background
      const aliceSymbol = `${option.code}A₁>\x1b[0m`;
      const bobSymbol = `\x1b[91m<B₁\x1b[0m`;
      const mockResult = `[${aliceSymbol}]─100m─[${bobSymbol}]`;

      console.log(`${option.name}: ${mockResult}`);
    }

    // Also test with Bob acting (enemy with green background)
    console.log('\n--- Enemy Acting Examples ---');
    const bobActing = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: bob.id, // Bob (enemy) is acting
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('Current inversion (Bob enemy acting):', bobActing);

    console.log('\n=== END GREEN BACKGROUND EXAMPLES ===\n');

    expect(current).toBeTruthy();
  });
});

describe('Green Color Vibrancy Exploration', () => {
  it('compares different green color options', () => {
    console.log('\n=== GREEN COLOR VIBRANCY COMPARISON ===\n');

    const alice = createTestActor('Alice');
    const { battlefield, combatants, actors } = createSingleActorTestData({
      actor: alice,
      team: 'alpha',
      position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 }
    });

    // Current vibrant green (256-color 46)
    const current = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: alice.id,
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('Current vibrant green (256-color 46):', current);

    // Test other green options by creating custom strategies
    const greenOptions = [
      { name: 'Standard bright green (92)', code: '\x1b[92m' },
      { name: 'Bold standard green (1;32)', code: '\x1b[1;32m' },
      { name: 'Lime green (256-color 10)', code: '\x1b[38;5;10m' },
      { name: 'Electric green (256-color 82)', code: '\x1b[38;5;82m' },
      { name: 'Neon green (256-color 118)', code: '\x1b[38;5;118m' },
      { name: 'Matrix green (256-color 40)', code: '\x1b[38;5;40m' },
      { name: 'Radioactive green (256-color 154)', code: '\x1b[38;5;154m' },
      { name: 'Ultra bright (256-color 196 on green bg)', code: '\x1b[48;5;46m\x1b[38;5;0m' },
    ];

    for (const option of greenOptions) {
      const customStrategy = {
        subject: (text: string) => `${option.code}${text}\x1b[0m`,
        enemy: (text: string) => `\x1b[91m${text}\x1b[0m`,
        neutral: (text: string) => text,
      };

      const result = renderBattlefieldNotation(battlefield, combatants, actors, {
        currentlyActingId: alice.id,
        colorStrategy: customStrategy
      });
      console.log(`${option.name}:`, result);
    }

    console.log('\n=== END GREEN COLOR COMPARISON ===\n');

    expect(current).toBeTruthy();
  });
});

describe('Facing Symbol Coloring Exploration', () => {
  it('compares current vs full coloring approaches', () => {
    console.log('\n=== FACING SYMBOL COLORING COMPARISON ===\n');

    const alice = createTestActor('Alice');
    const bob = createTestActor('Bob');
    const charlie = createTestActor('Charlie');

    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: alice, team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: bob, team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: charlie, team: 'alpha', position: { coordinate: 200, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    // NEW approach - full coloring (symbol + chevron)
    const fullColored = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: alice.id,
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('NEW (full coloring):', fullColored);

    // Analysis
    console.log('\nAnalysis:');
    console.log('  - Subject Alice: Green A₁ AND green > chevron');
    console.log('  - Enemy Bob:     Red < chevron AND red B₁');
    console.log('  - Ally Charlie:  No color (neutral)');

    // With acting combatant
    const withActing = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: bob.id,
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('\nWith acting combatant (full coloring):', withActing);
    console.log('Note: Bob has inverted background over the entire colored representation');

    console.log('\n=== END FACING SYMBOL COMPARISON ===\n');

    expect(fullColored).toBeTruthy();
  });
});

describe('Performance Benchmarks', () => {

  it('benchmarks 6-combatant spread formation (3v3)', () => {
    console.log('\n=== PERFORMANCE BENCHMARKS ===\n');

    // Create realistic 3v3 combat scenario
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      // Team Alpha (3 combatants)
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 120, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Arthur'), team: 'alpha', position: { coordinate: 130, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Anna'), team: 'alpha', position: { coordinate: 140, facing: CombatFacing.RIGHT, speed: 0 } },

      // Team Bravo (3 combatants)
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 180, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Betty'), team: 'bravo', position: { coordinate: 170, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Bruno'), team: 'bravo', position: { coordinate: 160, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const iterations = 1000;
    const warmupIterations = 500;
    console.log(`Running ${iterations} iterations of spread formation rendering (with ${warmupIterations} warmup iterations)...`);

    // Benchmark 1: No colors, no acting combatant (minimal processing)
    const plainOptions = { colorStrategy: ColorStrategies.PLAIN };

    // Warmup phase - let TurboFan optimize
    for (let i = 0; i < warmupIterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, plainOptions);
    }

    // Actual benchmark
    const startPlain = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, plainOptions);
    }
    const endPlain = performance.now();
    const plainTime = endPlain - startPlain;

    // Benchmark 2: Full colors with fixed acting combatant
    const aliceId = Object.values(actors).find(a => a.name === 'Alice')?.id as ActorURN;
    const coloredOptions = { currentlyActingId: aliceId, colorStrategy: ColorStrategies.DEFAULT };

    // Warmup phase - let TurboFan optimize
    for (let i = 0; i < warmupIterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, coloredOptions);
    }

    // Actual benchmark
    const startColored = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, coloredOptions);
    }
    const endColored = performance.now();
    const coloredTime = endColored - startColored;

    // Benchmark 3: Dynamic acting combatant (simulates real combat turns)
    const actorIds = Object.keys(actors) as ActorURN[];

    // Warmup phase - let TurboFan optimize
    for (let i = 0; i < warmupIterations; i++) {
      const currentlyActingId = actorIds[i % actorIds.length];
      renderBattlefieldNotation(battlefield, combatants, actors, {
        currentlyActingId,
        colorStrategy: ColorStrategies.DEFAULT
      });
    }

    // Actual benchmark
    const startRotating = performance.now();
    for (let i = 0; i < iterations; i++) {
      const currentlyActingId = actorIds[i % actorIds.length];
      renderBattlefieldNotation(battlefield, combatants, actors, {
        currentlyActingId,
        colorStrategy: ColorStrategies.DEFAULT
      });
    }
    const endRotating = performance.now();
    const rotatingTime = endRotating - startRotating;

    // Results
    console.log(`\nBenchmark Results (${iterations} iterations):`);
    console.log(`Minimal processing:  ${plainTime.toFixed(2)}ms (${(plainTime/iterations).toFixed(4)}ms per call)`);
    console.log(`Fixed acting:        ${coloredTime.toFixed(2)}ms (${(coloredTime/iterations).toFixed(4)}ms per call)`);
    console.log(`Dynamic acting:      ${rotatingTime.toFixed(2)}ms (${(rotatingTime/iterations).toFixed(4)}ms per call)`);

    const throughputPlain = (iterations / plainTime * 1000).toFixed(0);
    const throughputColored = (iterations / coloredTime * 1000).toFixed(0);
    const throughputRotating = (iterations / rotatingTime * 1000).toFixed(0);

    console.log(`\nThroughput:`);
    console.log(`Minimal processing:  ${throughputPlain} renders/sec`);
    console.log(`Fixed acting:        ${throughputColored} renders/sec`);
    console.log(`Dynamic acting:      ${throughputRotating} renders/sec`);

    // Sample output
    const sampleOutput = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: aliceId,
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log(`\nSample 3v3 output: ${sampleOutput}`);

    console.log('\n=== END PERFORMANCE BENCHMARKS ===\n');

    // No assertions - this is purely for performance measurement
  });

  it('benchmarks clustered formation (all combatants at same position)', () => {
    console.log('\n=== CLUSTERED FORMATION BENCHMARK ===\n');

    // All 6 combatants at the same position (tests grouping and boundary space logic)
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      // All at position 150, mixed facing directions
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Arthur'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Anna'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Betty'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Bruno'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const iterations = 1000;
    const warmupIterations = 500;
    console.log(`Running ${iterations} iterations of clustered formation (all at same position, with ${warmupIterations} warmup iterations)...`);

    const clusteredOptions = { colorStrategy: ColorStrategies.DEFAULT };

    // Warmup phase - let TurboFan optimize
    for (let i = 0; i < warmupIterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, clusteredOptions);
    }

    // Actual benchmark
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, clusteredOptions);
    }
    const end = performance.now();
    const totalTime = end - start;

    console.log(`\nClustered Formation Results (${iterations} iterations):`);
    console.log(`Total time:          ${totalTime.toFixed(2)}ms (${(totalTime/iterations).toFixed(4)}ms per call)`);
    console.log(`Throughput:          ${(iterations / totalTime * 1000).toFixed(0)} renders/sec`);

    // Sample output showing boundary space working correctly
    const sampleOutput = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });
    console.log(`\nSample clustered output: ${sampleOutput}`);
    console.log('Note: Shows boundary space between left-facing and right-facing groups');

    console.log('\n=== END CLUSTERED FORMATION BENCHMARK ===\n');

    // No assertions - this is purely for performance measurement
  });

  it('displays all color strategies for visual comparison', () => {
    console.log('\n=== COLOR STRATEGY COMPARISON ===\n');

    // Create a diverse battlefield scenario for testing all color strategies
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      // Team Alpha - spread formation
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 120, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Arthur'), team: 'alpha', position: { coordinate: 140, facing: CombatFacing.RIGHT, speed: 0 } },

      // Team Bravo - defensive line
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 180, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Betty'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } },

      // Team Charlie - clustered at chokepoint
      { actor: createTestActor('Charlie'), team: 'charlie', position: { coordinate: 160, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Carol'), team: 'charlie', position: { coordinate: 160, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const aliceId = Object.values(actors).find(a => a.name === 'Alice')?.id as ActorURN;

    console.log('Scenario: 6 combatants, 3 teams, mixed formations');
    console.log('Acting combatant: Alice (Team Alpha)');
    console.log('Expected: Alice highlighted + inverted, Arthur same color as Alice, other teams as enemies\n');

    // Test each color strategy
    const strategies = [
      { name: 'DEFAULT', strategy: ColorStrategies.DEFAULT },
      { name: 'DEBUG', strategy: ColorStrategies.DEBUG },
      { name: 'PLAIN', strategy: ColorStrategies.PLAIN },
      { name: 'HIGH_CONTRAST', strategy: ColorStrategies.HIGH_CONTRAST },
      { name: 'GRUVBOX', strategy: ColorStrategies.GRUVBOX }
    ];

    for (const { name, strategy } of strategies) {
      const output = renderBattlefieldNotation(battlefield, combatants, actors, {
        currentlyActingId: aliceId,
        colorStrategy: strategy
      });

      console.log(`${name.padEnd(12)}: ${output}`);
    }

    console.log('\n=== ACCESSIBILITY NOTES ===');
    console.log('• DEFAULT: Cyan/Magenta - excellent accessibility, good contrast for colorblind users');
    console.log('• DEBUG: Cyan/Red - good accessibility, cyan is distinguishable from red');
    console.log('• PLAIN: No colors - fully accessible, good for logs/files');
    console.log('• HIGH_CONTRAST: Bold colors - improved visibility and contrast');
    console.log('• GRUVBOX: Warm palette - retro aesthetic with good contrast');

    console.log('\n=== COLORBLIND-FRIENDLY RECOMMENDATIONS ===');
    console.log('• Best: DEFAULT (cyan/magenta) or HIGH_CONTRAST (bold colors)');
    console.log('• Good: DEBUG (cyan/red) for traditional red/blue team distinction');
    console.log('• Alternative: Use PLAIN + rely on background inversion for acting combatant');

    console.log('\n=== END COLOR STRATEGY COMPARISON ===\n');

    // No assertions - this is purely for visual comparison
  });

  it('displays dual-perspective battlefield (two acting combatants from different teams)', () => {
    console.log('\n=== DUAL-PERSPECTIVE BATTLEFIELD ===\n');

    // Create a battlefield with two potential acting combatants from different teams
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      // Team Alpha - Alice will be acting from this perspective
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 120, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Arthur'), team: 'alpha', position: { coordinate: 140, facing: CombatFacing.RIGHT, speed: 0 } },

      // Team Bravo - Bob will be acting from this perspective
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 180, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Betty'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } },

      // Team Charlie - neutral observers
      { actor: createTestActor('Charlie'), team: 'charlie', position: { coordinate: 160, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Carol'), team: 'charlie', position: { coordinate: 160, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const aliceId = Object.values(actors).find(a => a.name === 'Alice')?.id as ActorURN;
    const bobId = Object.values(actors).find(a => a.name === 'Bob')?.id as ActorURN;

    console.log('Scenario: 6 combatants, 3 teams');
    console.log('Demonstrating how the same battlefield looks from different team perspectives\n');

    // Show the battlefield from Alice's team perspective (Alice acting)
    console.log('=== ALICE\'S TEAM PERSPECTIVE (Team Alpha) ===');
    console.log('Alice acting - her team should be green, Bob\'s team should be red\n');

    const strategies = [
      { name: 'DEFAULT', strategy: ColorStrategies.DEFAULT },
      { name: 'DEBUG', strategy: ColorStrategies.DEBUG },
      { name: 'HIGH_CONTRAST', strategy: ColorStrategies.HIGH_CONTRAST }
    ];

    for (const { name, strategy } of strategies) {
      const alicePerspective = renderBattlefieldNotation(battlefield, combatants, actors, {
        currentlyActingId: aliceId,
        colorStrategy: strategy
      });
      console.log(`${name.padEnd(12)}: ${alicePerspective}`);
    }

    console.log('\n=== BOB\'S TEAM PERSPECTIVE (Team Bravo) ===');
    console.log('Bob acting - his team should be green/cyan, Alice\'s team should be red\n');

    for (const { name, strategy } of strategies) {
      const bobPerspective = renderBattlefieldNotation(battlefield, combatants, actors, {
        currentlyActingId: bobId,
        colorStrategy: strategy
      });
      console.log(`${name.padEnd(12)}: ${bobPerspective}`);
    }

    console.log('\n=== ANALYSIS ===');
    console.log('• Alice perspective: Alice inverted + green, Arthur green, Bob/Betty red, Charlie/Carol red');
    console.log('• Bob perspective: Bob inverted + green/cyan, Betty green/cyan, Alice/Arthur red, Charlie/Carol red');
    console.log('• Team Charlie appears as enemies to both perspectives (different team)');
    console.log('• Background inversion clearly shows who is currently acting');
    console.log('• Team colors switch based on perspective - "us vs them" coloring');

    console.log('\n=== END DUAL-PERSPECTIVE BATTLEFIELD ===\n');

    // No assertions - this is purely for visual comparison
  });

  it('demonstrates observerId vs currentlyActingId separation', () => {
    console.log('\n=== OBSERVER vs ACTING COMBATANT SEPARATION ===\n');

    // Create a battlefield with Alice acting, but viewed from Bob's perspective
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 120, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Arthur'), team: 'alpha', position: { coordinate: 140, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 180, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Betty'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const aliceId = Object.values(actors).find(a => a.name === 'Alice')?.id as ActorURN;
    const bobId = Object.values(actors).find(a => a.name === 'Bob')?.id as ActorURN;

    console.log('Scenario: Alice is acting (ONLY Alice gets inversion), viewed from Bob\'s perspective (team coloring)\n');

    // Alice acting, Alice's perspective (old behavior - same as currentlyActingId only)
    const aliceActingAlicePerspective = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: aliceId,
      colorStrategy: ColorStrategies.DEBUG
    });
    console.log('Alice acting, Alice perspective: ' + aliceActingAlicePerspective);

    // Alice acting, Bob's perspective (new behavior - separate observerId)
    const aliceActingBobPerspective = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: aliceId,  // Alice gets inversion highlight
      observerId: bobId,           // Bob's team gets subject color
      colorStrategy: ColorStrategies.DEBUG
    });
    console.log('Alice acting, Bob perspective:   ' + aliceActingBobPerspective);

    console.log('\n=== ANALYSIS ===');
    console.log('• Alice perspective: Alice cyan+inverted, Arthur cyan, Bob/Betty red');
    console.log('• Bob perspective: Alice red+inverted, Arthur red, Bob/Betty cyan');
    console.log('• CRITICAL: ONLY Alice gets inversion (she is currentlyActingId)');
    console.log('• Team colors flip based on observerId, but inversion is ONLY for currentlyActingId');
    console.log('• This enables "acting enemy" visualization - enemy gets inversion when it\'s their turn');

    console.log('\n=== END OBSERVER vs ACTING SEPARATION ===\n');

    // No assertions - this is purely for visual comparison
  });
});

describe('Boundary Markers', () => {
  it('renders no boundaries by default (backward compatibility)', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });

    expect(result).toBe('[ A₁> ]─100m─[ <B₁ ]');
  });

  it('renders left boundary only', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true
    });

    expect(result).toBe('▐─99m─[ A₁> ]─100m─[ <B₁ ]');
  });

  it('renders right boundary only', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      rightBoundary: true
    });

    expect(result).toBe('[ A₁> ]─100m─[ <B₁ ]─100m─▌');
  });

  it('renders both boundaries', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true,
      rightBoundary: true
    });

    expect(result).toBe('▐─99m─[ A₁> ]─100m─[ <B₁ ]─100m─▌');
  });

  it('handles single combatant with both boundaries', () => {
    const { battlefield, combatants, actors } = createSingleActorTestData({
      actor: createTestActor('Alice'),
      team: 'alpha',
      position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 }
    });

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true,
      rightBoundary: true
    });

    expect(result).toBe('▐─149m─[ A₁> ]─150m─▌');
  });

  it('handles combatant at position 1 (left edge)', () => {
    const { battlefield, combatants, actors } = createSingleActorTestData({
      actor: createTestActor('Alice'),
      team: 'alpha',
      position: { coordinate: 1, facing: CombatFacing.RIGHT, speed: 0 }
    });

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true,
      rightBoundary: true
    });

    expect(result).toBe('▐[ A₁> ]─299m─▌');
  });

  it('handles combatant at position 300 (right edge)', () => {
    const { battlefield, combatants, actors } = createSingleActorTestData({
      actor: createTestActor('Alice'),
      team: 'alpha',
      position: { coordinate: 300, facing: CombatFacing.LEFT, speed: 0 }
    });

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true,
      rightBoundary: true
    });

    expect(result).toBe('▐─299m─[ <A₁ ]▌');
  });

  it('handles combatants at both edges', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 1, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 300, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true,
      rightBoundary: true
    });

    expect(result).toBe('▐[ A₁> ]─299m─[ <B₁ ]▌');
  });

  it('handles empty battlefield with boundaries (should remain empty)', () => {
    const battlefield: Battlefield = { length: 300, margin: 100, cover: [] };

    const result = renderBattlefieldNotation(battlefield, new Map(), {}, {
      leftBoundary: true,
      rightBoundary: true
    });

    expect(result).toBe('');
  });

  it('works with colors and acting combatant', () => {
    const alice = createTestActor('Alice');
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: alice, team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      currentlyActingId: alice.id,
      colorStrategy: ColorStrategies.DEFAULT,
      leftBoundary: true,
      rightBoundary: true
    });

    // Should contain boundaries and colored/inverted Alice
    expect(result).toContain('▐─99m─');
    expect(result).toContain('─100m─▌');
    expect(result).toContain('\x1b[7m\x1b[36mA₁\x1b[0m>\x1b[0m'); // Alice acting with inversion
  });
});

describe('Tactical Boundary Examples', () => {
  it('shows retreat to left boundary scenario', () => {
    console.log('\n=== TACTICAL BOUNDARY EXAMPLES ===\n');

    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 6, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 106, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true
    });

    console.log('Retreat to left boundary:', result);
    expect(result).toBe('▐─5m─[ <A₁ ]─100m─[ B₁> ]');
  });

  it('shows advance to right boundary scenario', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 295, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      rightBoundary: true
    });

    console.log('Advance to right boundary:', result);
    expect(result).toBe('[ A₁> ]─195m─[ B₁> ]─5m─▌');
  });

  it('shows pincer movement with full battlefield context', () => {
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 11, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 91, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Charlie'), team: 'alpha', position: { coordinate: 290, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const result = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true,
      rightBoundary: true
    });

    console.log('Pincer movement:', result);
    expect(result).toBe('▐─10m─[ <A₁ ]─80m─[ B₁> ]─199m─[ C₁> ]─10m─▌');

    console.log('\n=== END TACTICAL EXAMPLES ===\n');
  });

  it('validates boundary calculation performance impact', () => {
    console.log('\n=== BOUNDARY PERFORMANCE VALIDATION ===\n');

    // Create large formation to test performance
    const { battlefield, combatants, actors } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 50, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Bob'), team: 'bravo', position: { coordinate: 100, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Charlie'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('David'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Eve'), team: 'alpha', position: { coordinate: 250, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);

    const iterations = 1000;
    const warmupIterations = 500;

    // Benchmark without boundaries
    for (let i = 0; i < warmupIterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, {
        colorStrategy: ColorStrategies.PLAIN
      });
    }

    const startNoBoundaries = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, {
        colorStrategy: ColorStrategies.PLAIN
      });
    }
    const endNoBoundaries = performance.now();
    const noBoundariesTime = endNoBoundaries - startNoBoundaries;

    // Benchmark with both boundaries
    for (let i = 0; i < warmupIterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, {
        colorStrategy: ColorStrategies.PLAIN,
        leftBoundary: true,
        rightBoundary: true
      });
    }

    const startWithBoundaries = performance.now();
    for (let i = 0; i < iterations; i++) {
      renderBattlefieldNotation(battlefield, combatants, actors, {
        colorStrategy: ColorStrategies.PLAIN,
        leftBoundary: true,
        rightBoundary: true
      });
    }
    const endWithBoundaries = performance.now();
    const withBoundariesTime = endWithBoundaries - startWithBoundaries;

    const overheadPercentage = ((withBoundariesTime - noBoundariesTime) / noBoundariesTime) * 100;

    console.log(`Performance Results (${iterations} iterations):`);
    console.log(`No boundaries:    ${noBoundariesTime.toFixed(2)}ms (${(noBoundariesTime/iterations).toFixed(4)}ms per call)`);
    console.log(`With boundaries:  ${withBoundariesTime.toFixed(2)}ms (${(withBoundariesTime/iterations).toFixed(4)}ms per call)`);
    console.log(`Overhead:         ${overheadPercentage.toFixed(1)}%`);

    // Sample outputs
    const noBoundariesSample = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN
    });
    const withBoundariesSample = renderBattlefieldNotation(battlefield, combatants, actors, {
      colorStrategy: ColorStrategies.PLAIN,
      leftBoundary: true,
      rightBoundary: true
    });

    console.log(`\nSample without boundaries: ${noBoundariesSample}`);
    console.log(`Sample with boundaries:    ${withBoundariesSample}`);

    console.log('\n=== END BOUNDARY PERFORMANCE VALIDATION ===\n');

    // No assertions, we're only interested in stdout
    expect(true).toBeTruthy();
  });
});

describe('Debug Output', () => {
  it('shows various battlefield notation examples with new symbols', () => {
    console.log('\n=== NEW BATTLEFIELD NOTATION DEBUG OUTPUT ===\n');

    // Single combatant
    const { battlefield: bf1, combatants: c1, actors: a1 } = createSingleActorTestData({
      actor: createTestActor('John Smith'),
      team: 'alpha',
      position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 }
    });
    const single = renderBattlefieldNotation(bf1, c1, a1, { colorStrategy: ColorStrategies.PLAIN });
    console.log('Single combatant (John Smith):', single);

    // Name collisions
    const { battlefield: bf2, combatants: c2, actors: a2 } = createMultiCombatantTestData([
      { actor: createTestActor('Alice'), team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Arthur'), team: 'bravo', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Anna'), team: 'alpha', position: { coordinate: 200, facing: CombatFacing.RIGHT, speed: 0 } }
    ]);
    const collisions = renderBattlefieldNotation(bf2, c2, a2, { colorStrategy: ColorStrategies.PLAIN });
    console.log('Name collisions (Alice, Arthur, Anna):', collisions);

    // Same position grouping
    const { battlefield: bf3, combatants: c3, actors: a3 } = createMultiCombatantTestData([
      { actor: createTestActor('Tank'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.LEFT, speed: 0 } },
      { actor: createTestActor('Healer'), team: 'alpha', position: { coordinate: 150, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: createTestActor('Enemy'), team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);
    const formation = renderBattlefieldNotation(bf3, c3, a3, { colorStrategy: ColorStrategies.PLAIN });
    console.log('Formation (same position):', formation);

    // With colors and acting combatant
    const alice = createTestActor('Alice');
    const bob = createTestActor('Bob');
    const { battlefield: bf4, combatants: c4, actors: a4 } = createMultiCombatantTestData([
      { actor: alice, team: 'alpha', position: { coordinate: 100, facing: CombatFacing.RIGHT, speed: 0 } },
      { actor: bob, team: 'bravo', position: { coordinate: 200, facing: CombatFacing.LEFT, speed: 0 } }
    ]);
    const colored = renderBattlefieldNotation(bf4, c4, a4, {
      currentlyActingId: alice.id,
      colorStrategy: ColorStrategies.DEFAULT
    });
    console.log('Colored with acting (Alice perspective, Bob acting):', colored);

    console.log('\n=== END NEW DEBUG OUTPUT ===\n');

    expect(single).toBeTruthy();
  });
});
