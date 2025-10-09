# Planning System

The planning system allows you to build and preview sequences of actions before executing them. This tactical tool lets you compose complex multi-action plans, review their cumulative effects, and commit to execution only when satisfied with the complete strategy.

## Basic Usage

Use the `plan` verb followed by any valid command to add it to your action queue:

```
plan advance distance 30
plan strike goblin
plan defend
```

Each planned action enters the queue and shows its projected effects based on the cumulative state changes from previous actions in the sequence. The system calculates costs, positioning, and outcomes as if all prior actions had been executed.

## Queue Management

### Building Your Plan

Actions accumulate in your planning queue as you add them:

```
plan advance distance 20    # Queue: [advance 20m]
plan strike orc            # Queue: [advance 20m, strike orc]
plan defend   # Queue: [advance 20m, strike orc, defend]
```

### Reviewing Your Queue

Use `plan` without arguments to review your current action sequence and see the cumulative effects of all planned actions.

### Modifying Your Plan

Remove the most recent action with `plan undo`:

```
plan undo    # Removes last planned action from queue
```

Clear your entire planning queue with `plan reset`:

```
plan reset   # Empties the planning queue completely
```

### Executing Your Plan

Commit to your planned sequence with `plan commit`:

```
plan commit  # Executes all actions in queue order
```

The system executes each action in sequence, consuming the appropriate resources and applying all effects. Your planning queue clears automatically after successful execution.

## Information Provided

Planning output includes comprehensive details about command execution, including:

- Resource costs: AP and energy expenditure for the planned action
- Movement changes: New position and facing direction after movement commands
- Failure conditions: Reasons why a command might fail or be blocked
- Alternative suggestions: More efficient approaches when applicable

## Strategic Applications

### Multi-Action Sequences

Build complex tactical combinations by chaining actions together:

```
plan advance distance 30   # Move into range
plan strike orc           # Attack primary target
plan retreat distance 15  # Fall back to safety
```

The system shows cumulative AP costs and validates that your character has sufficient resources to complete the entire sequence.

### Resource Management

Planning reveals the total cost of action sequences:

```
plan advance distance 50  # Queue total: 5.2 AP
plan strike enemy        # Queue total: 9.0 AP
```

This shows whether you can complete both actions in a single turn or need to split the sequence across multiple turns.

### Risk Assessment

Combat planning shows potential outcomes before committing to dangerous actions:

```
plan strike heavily_armored_knight
```

The preview might reveal low hit probability or insufficient damage potential, suggesting alternative tactics like repositioning or targeting a different enemy.

### Positioning Optimization

Movement planning prevents costly positioning mistakes:

```
plan advance distance 75  # Might show: "Would exceed battlefield boundary"
plan advance distance 60  # Shows: Valid movement to optimal range
```

## Tactical Workflow

Effective planning follows a systematic approach to decision-making. Begin by assessing your current situation and identifying your tactical objectives. Build your action sequence incrementally, adding each step and reviewing the cumulative effects. Use `plan undo` to remove actions that don't contribute to your strategy; use `plan reset` to start over when your approach changes completely.

The queue system encourages experimentation with different tactical approaches. You can explore aggressive sequences focused on maximum damage, defensive combinations that prioritize survival, or positioning strategies that set up future opportunities. Each approach reveals different resource requirements and risk profiles.

Planning becomes particularly valuable in complex scenarios involving multiple enemies, limited resources, or precise positioning requirements. The system accounts for all game mechanics, including collision detection, energy physics, and combat calculations across the entire action sequence.

## Integration with Combat

Planning seamlessly integrates with the combat system's turn-based structure. You can build and modify your action queue during your turn, exploring different tactical approaches before committing to execution. The planning system uses the same calculation engine as actual command execution, ensuring complete accuracy in its projections.

Queue management does not consume time or resources; you can build, modify, and rebuild your action sequence as many times as needed. Only the `plan commit` command consumes AP and executes your planned actions. This encourages tactical thinking and helps players understand how different actions combine to create effective strategies.

The planning queue persists across turns, allowing you to build long-term tactical sequences that span multiple rounds of combat. However, changing battlefield conditions may invalidate portions of your plan, requiring adjustments as the situation evolves.
