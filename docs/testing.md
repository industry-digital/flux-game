# Game Logic Experiment Tool

## Overview

The Experiment tool provides an isolated testing environment for game logic by running commands through the Transformation stage pipeline using a controlled world state. Game programmers can specify initial conditions, execute a command, and examine the resulting world state changes without requiring a full server environment.

## Purpose

Game logic in the Transformation stage consists of pure reducers that take a world state and command, then return a modified world state with declared events. These reducers have no side effects and no external dependencies, making them ideal candidates for isolated testing.

The Experiment tool exploits this purity to enable rapid iteration on game mechanics. Programmers can test complex scenarios instantly without deploying code, starting servers, or creating in-game test conditions.

## Architecture

### Core Components

```typescript
interface Experiment {
  id: string;                        // Unique identifier
  name: string;
  description?: string;
  initialWorldState: WorldProjection;
  commands: Command[];
  expectedEvents?: EventType[];
  assertions?: ExperimentAssertion[];

  // Immutability & versioning
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly parentExperimentId?: string;  // Fork lineage
  readonly version: string;              // Semantic versioning
  readonly isImmutable: boolean;         // True once saved
}

interface ExperimentFork {
  id: string;
  parentExperimentId: string;
  forkName: string;
  description: string;
  changes: ExperimentChange[];
  createdAt: Date;
  createdBy: string;
}

interface ExperimentChange {
  type: 'modify_command' | 'add_command' | 'remove_command' | 'change_initial_state' | 'modify_assertions';
  commandIndex?: number;
  before?: any;
  after?: any;
  description: string;
}

interface ExperimentResult {
  experimentId: string;
  experimentVersion: string;
  initialState: WorldProjection;
  finalState: WorldProjection;
  stateProgression: WorldProjection[];
  commandResults: CommandExecutionResult[];
  totalDeclaredEvents: WorldEvent[];
  totalDeclaredErrors: ExecutionError[];
  success: boolean;
  executedAt: Date;
}

interface CommandExecutionResult {
  command: Command;
  stateBefore: WorldProjection;
  stateAfter: WorldProjection;
  declaredEvents: WorldEvent[];
  declaredErrors: ExecutionError[];
  transformersExecuted: TransformerInterface<Command>[];
  executionTime: number;
}
```

### Execution Pipeline

The tool executes a sequence of commands against the same world projection, maintaining the progression of world states for time-travel debugging:

```typescript
export function runExperiment(experiment: Experiment): ExperimentResult {
  let currentWorldState = experiment.initialWorldState;
  const stateProgression: WorldProjection[] = [currentWorldState];
  const commandResults: CommandExecutionResult[] = [];
  const allEvents: WorldEvent[] = [];
  const allErrors: ExecutionError[] = [];

  // Execute each command in sequence
  for (const command of experiment.commands) {
    const result = executeCommand(currentWorldState, command);

    // Update world state for next command
    currentWorldState = result.stateAfter;

    // Track progression
    stateProgression.push(currentWorldState);
    commandResults.push(result);
    allEvents.push(...result.declaredEvents);
    allErrors.push(...result.declaredErrors);
  }

  return {
    initialState: experiment.initialWorldState,
    finalState: currentWorldState,
    stateProgression,
    commandResults,
    totalDeclaredEvents: allEvents,
    totalDeclaredErrors: allErrors,
    success: validateAssertions(commandResults, experiment.assertions)
  };
}

function executeCommand(
  worldState: WorldProjection,
  command: Command
): CommandExecutionResult {
  const startTime = performance.now();

  // Create isolated transformation context
  const context: TransformerContext = {
    world: worldState,
    random: () => 0.5, // Deterministic for testing
    timestamp: () => Date.now(),
    uniqid: () => `test-${Math.random()}`,
    debug: (...args) => console.log('[Experiment]', ...args),
    declareEvent: (input: WorldEventInput) => { /* collect events */ },
    declareError: (error: Error | string) => { /* collect errors */ }
  };

  const finalContext = executeTransformerDAG(context, command);
  const executionTime = performance.now() - startTime;

  return {
    command,
    stateBefore: worldState,
    stateAfter: finalContext.world,
    declaredEvents: finalContext.getDeclaredEvents(),
    declaredErrors: finalContext.getDeclaredErrors(),
    transformersExecuted: getExecutedTransformers(command),
    executionTime
  };
}
```

## Use Cases

### Mechanic Development

When implementing new game mechanics, programmers can test edge cases immediately:

```typescript
const stealthSequenceTest: Experiment = {
  name: "Multi-Step Stealth Infiltration",
  initialWorldState: {
    actors: {
      "flux:actor:thief": {
        urn: "flux:actor:thief",
        location: "flux:place:tavern",
        stealth: true,
        stealthSkill: 85,
        energy: 100,
        // ... other Actor properties
      },
      "flux:actor:guard": {
        urn: "flux:actor:guard",
        location: "flux:place:courtyard",
        perception: 75,
        alertness: "normal",
        // ... other Actor properties
      }
    },
    places: {
      "flux:place:tavern": {
        urn: "flux:place:tavern",
        lighting: "dim",
        crowdLevel: "moderate",
        // ... other Place properties
      },
      "flux:place:alley": {
        urn: "flux:place:alley",
        lighting: "dark",
        // ... other Place properties
      },
      "flux:place:courtyard": {
        urn: "flux:place:courtyard",
        lighting: "bright",
        guardPatrol: true,
        // ... other Place properties
      }
    }
  },
  commands: [
    // Step 1: Leave tavern stealthily
    {
      type: CommandType.MOVE,
      actor: "flux:actor:thief",
      args: { dest: "flux:place:alley" },
      trace: "step-1",
      ts: 1000
    },
    // Step 2: Wait for guard to pass
    {
      type: CommandType.WAIT,
      actor: "flux:actor:thief",
      args: { duration: 30 },
      trace: "step-2",
      ts: 2000
    },
    // Step 3: Attempt to enter guarded courtyard
    {
      type: CommandType.MOVE,
      actor: "flux:actor:thief",
      args: { dest: "flux:place:courtyard" },
      trace: "step-3",
      ts: 3000
    }
  ],
  assertions: [
    { type: "eventNotDeclared", eventType: EventType.ACTOR_SPOTTED },
    { type: "finalActorLocation", actor: "flux:actor:thief", expectedLocation: "flux:place:courtyard" },
    { type: "energyConsumed", actor: "flux:actor:thief", minConsumed: 10 }
  ]
};
```

### Regression Testing

Successful experiments can be saved as regression tests. When game logic changes, the tool can re-run all saved experiments to detect unintended behavior changes:

```typescript
const regressionSuite = [
  combatDamageCalculation,
  stealthDetectionThresholds,
  spellManaCosts,
  itemEquipmentRules,
  socialInteractionOutcomes
];

function validateGameLogicChanges(): boolean {
  return regressionSuite.every(experiment =>
    runExperiment(experiment).success
  );
}
```

### Bug Investigation

When players report unexpected behavior, programmers can recreate the exact sequence of actions that led to the issue:

```typescript
const bugReport: Experiment = {
  name: "Player Report: Sword not doing damage in combat sequence",
  initialWorldState: recreatePlayerState(bugReportData.initialState),
  commands: extractCommandSequenceFromLogs(bugReportData.playerActions),
  assertions: [
    { type: "eventDeclaredInSequence", eventType: "DAMAGE_APPLIED" },
    { type: "healthChangeOverTime", actor: "target", expectedChange: "decrease" }
  ]
};

// Time-travel debugging to isolate the issue
const debugger = new TimeTravelDebugger(bugReport);
debugger.jumpToCommand(bugReportData.suspectedFailureIndex);
const stateAtFailure = debugger.getCurrentWorldState();
```

### Complex Scenario Testing

Multi-command experiments enable testing of complex emergent behaviors:

```typescript
const combatSequenceTest: Experiment = {
  name: "Full Combat Encounter with Status Effects",
  initialWorldState: createCombatScenario(),
  commands: [
    // Round 1: Warrior attacks orc
    { type: CommandType.ATTACK, actor: "warrior", args: { target: "orc" } },
    // Round 2: Orc counterattacks
    { type: CommandType.ATTACK, actor: "orc", args: { target: "warrior" } },
    // Round 3: Mage casts poison spell
    { type: CommandType.CAST_SPELL, actor: "mage", args: { spell: "poison", target: "orc" } },
    // Round 4: Poisoned orc attacks (reduced damage)
    { type: CommandType.ATTACK, actor: "orc", args: { target: "warrior" } },
    // Round 5: Poison tick damage
    { type: CommandType.TICK_POISON, actor: "orc", args: {} }
  ],
  assertions: [
    { type: "healthProgression", actor: "orc", expectedPattern: "decrease" },
    { type: "statusEffectActive", actor: "orc", effect: "poisoned", atCommandIndex: 4 },
    { type: "damageReduction", actor: "orc", expectedReduction: 0.5, atCommandIndex: 3 }
  ]
};
```

## Implementation Details

### World State Builder

The tool provides a visual interface for constructing world states:

```typescript
interface WorldStateBuilder {
  addActor(urn: ActorURN, actorData: Partial<Actor>): void;
  addPlace(urn: PlaceURN, placeData: Partial<Place>): void;
  setProjectionType(type: 'minimal' | 'combat' | 'trade'): void;
  exportState(): WorldProjection;
}

// Example usage:
const builder = new WorldStateBuilder();
builder.setProjectionType('minimal');
builder.addActor('flux:actor:thief', {
  urn: 'flux:actor:thief',
  location: 'flux:place:tavern',
  stealth: true
});
builder.addPlace('flux:place:tavern', {
  urn: 'flux:place:tavern',
  lighting: 'dim'
});
const worldState = builder.exportState();
```

### Command Builder

Commands are constructed through a type-safe interface that validates arguments against the current world state:

```typescript
interface CommandBuilder {
  selectCommandType(type: CommandType): void;
  setActor(actorUrn: ActorURN): void;
  setArguments(args: Record<string, any>): void;
  setTrace(trace: string): void;
  setTimestamp(ts: number): void;
  validateCommand(worldState: WorldProjection): ValidationResult;
  exportCommand(): Command;
}

// Example usage:
const builder = new CommandBuilder();
builder.selectCommandType(CommandType.MOVE);
builder.setActor('flux:actor:thief');
builder.setArguments({ dest: 'flux:place:alley' });
builder.setTrace('experiment-test-123');
builder.setTimestamp(Date.now());
const command = builder.exportCommand();
```

### Result Visualization

Results are displayed through multiple views:

- **State Diff**: Shows exactly what changed in the world state
- **Event Timeline**: Lists all declared events in execution order
- **Execution Trace**: Shows which reducers modified which parts of the state
- **Assertion Results**: Indicates which expectations were met or violated

### Time-Travel Debugging

The tool provides bidirectional stepping through command sequences, enabling true time-travel debugging:

```typescript
interface TimeTravelDebugger {
  experiment: Experiment;
  currentCommandIndex: number;
  currentTransformerIndex: number;

  // Command-level navigation
  stepForwardCommand(): CommandExecutionResult | null;
  stepBackwardCommand(): CommandExecutionResult | null;
  jumpToCommand(commandIndex: number): CommandExecutionResult;

  // Transformer-level navigation within current command
  stepForwardTransformer(): TransformerExecutionResult | null;
  stepBackwardTransformer(): TransformerExecutionResult | null;
  jumpToTransformer(transformerIndex: number): TransformerExecutionResult;

  // State inspection
  getCurrentWorldState(): WorldProjection;
  getWorldStateAtCommand(commandIndex: number): WorldProjection;
  getCommandHistory(): CommandExecutionResult[];
  getEventHistory(): WorldEvent[];

  // Replay capabilities
  replayFromCommand(startIndex: number): ExperimentResult;
  replayWithModifiedCommand(commandIndex: number, newCommand: Command): ExperimentResult;
}

interface TransformerExecutionResult {
  transformer: TransformerInterface<Command>;
  worldStateBefore: WorldProjection;
  worldStateAfter: WorldProjection;
  declaredEvents: WorldEvent[];
  declaredErrors: ExecutionError[];
  executionTime: number;
}

// Example usage:
const debugger = new TimeTravelDebugger(stealthSequenceTest);

// Step through the entire sequence
while (debugger.stepForwardCommand()) {
  console.log(`Command ${debugger.currentCommandIndex}:`,
    debugger.getCurrentWorldState().actors["flux:actor:thief"].location);
}

// Go back to step 2 and examine what happened
debugger.jumpToCommand(1);
const worldAtStep2 = debugger.getCurrentWorldState();

// Replay from step 2 with a modified command
const modifiedResult = debugger.replayWithModifiedCommand(2, {
  type: CommandType.MOVE,
  actor: "flux:actor:thief",
  args: { dest: "flux:place:tavern" }, // Different destination
  trace: "modified-step-3",
  ts: 3000
});
```

## Technical Advantages

### Isolation

Experiments run in complete isolation from the production environment. No database connections, network calls, or file system access occur during execution. This isolation ensures:

- Experiments cannot affect production data
- Tests run at maximum speed without I/O overhead
- Results are perfectly reproducible
- Multiple experiments can run simultaneously without interference

### Determinism

Since the Transformation stage consists entirely of pure functions, identical inputs always produce identical outputs. This determinism enables:

- Reliable regression testing
- Reproducible bug investigation
- Consistent performance benchmarking
- Predictable behavior validation

### Performance

Pure function execution is extremely fast. Even complex multi-command experiments typically complete in under 10 milliseconds, enabling:

- Real-time feedback during development
- Instantaneous time-travel debugging (stepping backward/forward)
- Large-scale regression suite execution with hundreds of command sequences
- Interactive exploration of complex emergent behaviors
- Rapid iteration cycles with immediate visual feedback
- Replay experiments with modified commands in real-time

## Integration with Development Workflow

### Development Phase

During initial development, programmers can use experiments to validate logic before integration:

1. Write reducer logic
2. Create experiments covering expected scenarios
3. Run experiments to verify behavior
4. Iterate on logic until experiments pass
5. Integrate into main codebase

### Testing Phase

Experiments supplement traditional unit tests by providing higher-level scenario validation:

- Unit tests verify individual function behavior
- Experiments verify integrated system behavior
- Both approaches provide comprehensive coverage

### Maintenance Phase

As the game evolves, experiments serve as living documentation of expected behavior:

- New developers can understand systems by exploring experiments
- Changes can be validated against existing experiment suites
- Complex interactions can be debugged through step-by-step execution

## Experiment Collections

The tool supports organizing experiments into thematic collections:

```typescript
interface ExperimentCollection {
  name: string;
  description: string;
  experiments: Experiment[];
  tags: string[];
}

const combatMechanics: ExperimentCollection = {
  name: "Combat Mechanics",
  description: "Tests for all combat-related game logic",
  experiments: [
    basicMeleeAttack,
    criticalHitCalculation,
    armorDamageReduction,
    weaponDurabilityLoss,
    statusEffectApplication
  ],
  tags: ["combat", "damage", "weapons"]
};
```

## Future Enhancements

### Branching Timeline Debugging

The tool could support branching timelines where different command sequences are explored from any point:

```typescript
interface TimelineBranch {
  branchPoint: number; // Command index where branch starts
  branchName: string;
  alternativeCommands: Command[];
  result: ExperimentResult;
}

interface BranchingDebugger extends TimeTravelDebugger {
  createBranch(name: string, fromCommandIndex: number): TimelineBranch;
  switchToBranch(branchName: string): void;
  compareBranches(branch1: string, branch2: string): BranchComparison;
}
```

### Differential Command Analysis

Compare how the same command sequence behaves with different initial world states:

```typescript
interface DifferentialExperiment {
  name: string;
  commands: Command[];
  worldStateVariants: WorldProjection[];
  comparisonMetrics: DifferentialMetric[];
}
```

### Collaborative Time-Travel Sessions

Multiple developers could share and explore the same experiment timeline:

```typescript
interface CollaborativeSession {
  experiment: Experiment;
  participants: Developer[];
  sharedTimelinePosition: number;
  annotations: TimelineAnnotation[];

  // Real-time synchronization
  syncTimelinePosition(commandIndex: number): void;
  addAnnotation(commandIndex: number, note: string): void;
  highlightStateChanges(actor: string, property: string): void;
}
```

### LLM-Powered Unit Test Generation

Generate comprehensive unit test suites from experiments using LLM analysis. The structured experiment format and pure functional architecture creates ideal conditions for automated test generation:

```typescript
interface LLMTestGenerator {
  generateUnitTests(experiment: Experiment): GeneratedTestSuite;
  generateEdgeCaseTests(experiment: Experiment): GeneratedTestSuite;
  generatePerformanceTests(experiment: Experiment): GeneratedTestSuite;
  generateRegressionTests(experiments: Experiment[]): GeneratedTestSuite;
}

interface GeneratedTestSuite {
  testFileName: string;
  imports: string[];
  testCases: GeneratedTestCase[];
  helperFunctions: string[];
  mockData: Record<string, any>;
}

interface GeneratedTestCase {
  testName: string;
  description: string;
  code: string;
  assertionCount: number;
  coverageAreas: string[];
}

// Example usage:
const generator = new LLMTestGenerator();
const testSuite = generator.generateUnitTests(stealthSequenceTest);

// Generated output example:
/*
describe('Multi-Step Stealth Infiltration', () => {
  let initialWorldState: WorldProjection;
  let mockContext: TransformerContext;

  beforeEach(() => {
    initialWorldState = createTestWorldState({
      actors: {
        'flux:actor:thief': { stealth: true, stealthSkill: 85, energy: 100 },
        'flux:actor:guard': { perception: 75, alertness: 'normal' }
      }
    });
    mockContext = createMockTransformerContext(initialWorldState);
  });

  it('should allow thief to move stealthily from tavern to alley without detection', () => {
    const moveCommand = createMoveCommand('flux:actor:thief', 'flux:place:alley');
    const result = executeCommand(mockContext, moveCommand);

    expect(result.declaredEvents).not.toContainEventType(EventType.ACTOR_SPOTTED);
    expect(result.stateAfter.actors['flux:actor:thief'].location).toBe('flux:place:alley');
  });

  it('should consume energy during stealth movement', () => {
    const moveCommand = createMoveCommand('flux:actor:thief', 'flux:place:alley');
    const result = executeCommand(mockContext, moveCommand);

    expect(result.stateAfter.actors['flux:actor:thief'].energy).toBeLessThan(
      initialWorldState.actors['flux:actor:thief'].energy
    );
  });

  it('should handle guard detection when stealth fails', () => {
    // Test edge case: low stealth skill
    const lowStealthState = {
      ...initialWorldState,
      actors: {
        ...initialWorldState.actors,
        'flux:actor:thief': { ...initialWorldState.actors['flux:actor:thief'], stealthSkill: 10 }
      }
    };

    const context = createMockTransformerContext(lowStealthState);
    const moveCommand = createMoveCommand('flux:actor:thief', 'flux:place:courtyard');
    const result = executeCommand(context, moveCommand);

    expect(result.declaredEvents).toContainEventType(EventType.ACTOR_SPOTTED);
  });
});
*/

// LLM Generation Process:
interface LLMGenerationContext {
  experiment: Experiment;
  gameTypes: TypeDefinition[];
  existingTransformers: TransformerInterface<Command>[];
  domainKnowledge: GameMechanicDescription[];
}

class LLMTestGenerator {
  async generateUnitTests(experiment: Experiment): Promise<GeneratedTestSuite> {
    const prompt = this.buildGenerationPrompt(experiment);
    const llmResponse = await this.callLLM(prompt);
    return this.parseGeneratedTests(llmResponse);
  }

  private buildGenerationPrompt(experiment: Experiment): string {
    return `
Generate comprehensive unit tests for this game logic experiment:

Experiment: ${experiment.name}
Commands: ${JSON.stringify(experiment.commands, null, 2)}
Initial State: ${JSON.stringify(experiment.initialWorldState, null, 2)}
Assertions: ${JSON.stringify(experiment.assertions, null, 2)}

The game uses pure functional transformers with TypeScript. Generate tests that:
1. Test each command individually
2. Test the full command sequence
3. Include edge cases (boundary conditions, invalid inputs)
4. Test state transitions between commands
5. Verify all declared events and errors
6. Include performance benchmarks
7. Test failure scenarios

Use Jest testing framework with the existing TransformerContext pattern.
    `;
  }
}
```

#### Why This Works Exceptionally Well

**Structured Semantics**: Experiments provide rich semantic context that LLMs can understand:
- Command types have clear meaning (MOVE, ATTACK, CAST_SPELL)
- World state properties are self-documenting (stealth, perception, health)
- Event types describe observable outcomes (ACTOR_SPOTTED, DAMAGE_APPLIED)

**Pure Function Testing**: The deterministic nature simplifies test generation:
- No mocking of external dependencies required
- Predictable input/output relationships
- No side effects to account for

**Domain Knowledge Transfer**: Experiments serve as examples of game mechanics:
- LLM learns game rules from experiment structure
- Can infer edge cases from command parameters
- Understands relationships between world state and outcomes

**Type Safety**: TypeScript types guide test generation:
- LLM can generate type-correct test code
- Compile-time validation ensures generated tests work
- IntelliSense provides real-time feedback during generation

#### Development Workflow Integration

```typescript
// Proposed workflow:
class ExperimentToDevelopment {
  async generateFullTestSuite(experiment: Experiment): Promise<void> {
    // 1. Generate unit tests from experiment
    const unitTests = await llmGenerator.generateUnitTests(experiment);

    // 2. Generate integration tests
    const integrationTests = await llmGenerator.generateIntegrationTests(experiment);

    // 3. Generate performance benchmarks
    const performanceTests = await llmGenerator.generatePerformanceTests(experiment);

    // 4. Write test files
    await this.writeTestFiles([unitTests, integrationTests, performanceTests]);

    // 5. Run tests to validate generation
    const testResults = await this.runGeneratedTests();

    // 6. If tests pass, add to regression suite
    if (testResults.allPassed) {
      await this.addToRegressionSuite(experiment, unitTests);
    }
  }
}

// Example usage in development:
const experiment = await experimentTool.createExperiment("Combat Mechanics");
await experimentTool.runExperiment(experiment); // Verify it works
await experimentTool.generateTestSuite(experiment); // Auto-generate comprehensive tests
// Now you have both interactive debugging AND comprehensive test coverage
```

This workflow enables **experiment-driven development** where game mechanics are:
1. **Designed** as interactive experiments
2. **Debugged** with time-travel capabilities
3. **Tested** with LLM-generated comprehensive test suites
4. **Deployed** with automatic regression coverage

## Experiment Versioning & Collaboration

### Immutable Snapshot Model

Once saved, experiments become **immutable snapshots** that provide perfect reproducibility and enable safe collaboration:

```typescript
interface ExperimentRepository {
  // Save makes experiment immutable
  save(experiment: Experiment): Promise<ImmutableExperiment>;

  // Fork creates new experiment based on existing one
  fork(parentId: string, forkName: string, changes: ExperimentChange[]): Promise<Experiment>;

  // Load exact historical version
  load(experimentId: string, version?: string): Promise<ImmutableExperiment>;

  // Get fork lineage
  getForkTree(experimentId: string): Promise<ExperimentForkTree>;
}

// Example workflow:
const repository = new ExperimentRepository();

// 1. Create and save base experiment
const baseExperiment = await repository.save(stealthSequenceTest);
// baseExperiment.isImmutable === true (cannot be modified)

// 2. Fork for different approach
const stealthWithMagicFork = await repository.fork(baseExperiment.id, "Stealth with Magic Items", [
  {
    type: 'change_initial_state',
    description: 'Add invisibility cloak to thief',
    before: { stealth: true },
    after: { stealth: true, hasInvisibilityCloak: true }
  },
  {
    type: 'add_command',
    commandIndex: 0,
    description: 'Use invisibility cloak before movement',
    after: { type: CommandType.USE_ITEM, args: { item: 'invisibility_cloak' } }
  }
]);

// 3. Fork for edge case testing
const detectionEdgeCaseFork = await repository.fork(baseExperiment.id, "Detection Edge Cases", [
  {
    type: 'modify_command',
    commandIndex: 2,
    description: 'Test movement in bright daylight',
    before: { args: { dest: "flux:place:courtyard" } },
    after: { args: { dest: "flux:place:courtyard", timeOfDay: "noon" } }
  }
]);
```

### Fork Tree Visualization

```typescript
interface ExperimentForkTree {
  root: ImmutableExperiment;
  forks: ExperimentForkNode[];
}

interface ExperimentForkNode {
  experiment: ImmutableExperiment;
  parent: string;
  children: ExperimentForkNode[];
  changes: ExperimentChange[];
  results?: ExperimentResult[];
}

// Example fork tree:
/*
📊 Base Stealth Sequence (v1.0.0)
├── 🎭 Stealth with Magic Items (v1.1.0)
│   ├── 🧙 Advanced Magic Combinations (v1.1.1)
│   └── ⚡ Performance Optimized Magic (v1.1.2)
├── 🔍 Detection Edge Cases (v1.2.0)
│   ├── 🌞 Daylight Detection (v1.2.1)
│   └── 👁️ Enhanced Perception Guards (v1.2.2)
└── 🎯 Combat Integration (v1.3.0)
    └── ⚔️ Full Combat + Stealth (v1.3.1)
*/
```

### Collaboration Workflows

#### Team Development
```typescript
// Developer A creates base experiment
const combatBase = await repository.save(basicCombatExperiment);

// Developer B forks for magic system integration
const magicCombatFork = await repository.fork(combatBase.id, "Magic Combat", [
  { type: 'add_command', description: 'Add spell casting' }
]);

// Developer C forks for performance testing
const performanceFork = await repository.fork(combatBase.id, "Performance Stress Test", [
  { type: 'change_initial_state', description: 'Add 100 actors for stress testing' }
]);

// All experiments remain perfectly reproducible
```

#### Bug Investigation & Fixes
```typescript
// QA reports bug with specific experiment
const buggyExperiment = await repository.load("stealth-sequence-v1.2.1");

// Developer forks to isolate bug
const bugFixFork = await repository.fork(buggyExperiment.id, "Bug Fix: Stealth Detection", [
  {
    type: 'modify_command',
    commandIndex: 1,
    description: 'Fix stealth calculation bug',
    before: { stealthSkill: 85 },
    after: { stealthSkill: 85, stealthModifier: 'environmental' }
  }
]);

// Fix can be tested without affecting original
const result = await experimentTool.runExperiment(bugFixFork);
if (result.success) {
  await repository.save(bugFixFork); // Save as new immutable version
}
```

### Benefits of Immutable Experiments

#### Perfect Reproducibility
```typescript
// Any experiment can be re-run exactly as it was
const historicalResult = await experimentTool.runExperiment(
  await repository.load("combat-v1.0.0")
);
// Guaranteed to produce identical results to original run
```

#### Safe Parallel Development
```typescript
// Multiple developers can work on variations simultaneously
const teamExperiments = await Promise.all([
  repository.fork(base.id, "Approach A", changesA),
  repository.fork(base.id, "Approach B", changesB),
  repository.fork(base.id, "Approach C", changesC)
]);
// No risk of developers interfering with each other
```

#### Experiment Archaeology
```typescript
// Trace the evolution of game mechanics over time
const forkHistory = await repository.getForkTree("stealth-mechanics");
const evolutionTimeline = forkHistory.forks.map(fork => ({
  date: fork.experiment.createdAt,
  changes: fork.changes,
  author: fork.experiment.createdBy,
  results: fork.results
}));
// Understand how mechanics evolved and why decisions were made
```

#### Regression Prevention
```typescript
// Saved experiments serve as permanent regression tests
const regressionSuite = await repository.getAllExperiments({
  tags: ['regression', 'core-mechanics'],
  status: 'saved'
});

// Re-run all historical experiments to detect regressions
const regressionResults = await Promise.all(
  regressionSuite.map(exp => experimentTool.runExperiment(exp))
);
// Any failure indicates a regression in game logic
```

### Automated Scenario Generation

Generate experiment scenarios from production gameplay logs:

```typescript
interface ScenarioGenerator {
  generateFromLogs(playerLogs: GameplayLog[]): Experiment[];
  extractInterestingSequences(logs: GameplayLog[], criteria: InterestCriteria): Experiment[];
  createRegressionSuite(logs: GameplayLog[], coverage: CoverageTarget): Experiment[];
}
```

## Conclusion

The Experiment tool leverages the pure functional architecture of the Transformation stage to provide a powerful development environment for game logic. By utilizing the `TransformerInterface` pattern and `PureReducer` functions, the tool can execute game logic in complete isolation from the production environment.

The tool's effectiveness stems directly from architectural decisions made in the core game engine:

- **Pure Reducers**: `PureReducer<TransformerContext, Command>` functions have zero side effects and can be executed anywhere
- **Immutable World State**: `WorldProjection` types ensure consistent state throughout testing
- **Event Declaration System**: The `EventDeclarationProducer` pattern allows transparent event collection during testing
- **Error Handling**: The `ErrorDeclarationProducer` pattern enables comprehensive error tracking

This architecture makes comprehensive testing not just possible, but natural and efficient. The same `TransformerInterface` implementations that power the production server can be executed in the browser for interactive development and debugging.
