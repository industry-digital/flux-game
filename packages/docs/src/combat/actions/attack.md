# ATTACK

```
attack <target>
```

The `attack` command provides AI-assisted combat that handles tactical decisions automatically. When you use `attack`, the system analyzes your situation and executes an appropriate sequence of combat actions without requiring manual control of individual moves.

*Example*
```
attack bob
```

## How It Works

The AI evaluates your current position, available action points, weapon capabilities, and target location to determine the best course of action. This might involve moving into optimal range, acquiring the target, and executing strikes; the specific actions depend on the tactical situation.

You can rely on `attack` to make competent decisions in any combat scenario. The AI performs reasonably well across different situations, though experienced players who master individual combat commands can achieve superior results through precise manual control.

## When to Use Attack

New players can use `attack` as their primary combat command while learning the system. Experienced players often use it for convenience during routine encounters or when managing multiple priorities simultaneously.

The command works with any target you can engage in combat. If you specify a target, the system switches focus to that opponent; without a target parameter, it continues engaging your current target.

## Arguments

- `target`: The target actor to attack (optional if you already have a target selected)
