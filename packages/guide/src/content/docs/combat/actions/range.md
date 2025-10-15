# RANGE Command

The `RANGE` command provides tactical distance information about other actors on the battlefield, helping you assess positioning and weapon effectiveness.

## Syntax

```
range <actor>
```

- **`<actor>`** - Name of the target actor to measure distance to

## Examples

### Basic Range Check
```
> range bob
Bob is 61m away, in front of you.
Your longsword's optimal range is 1m.

> range charlie
Charlie is 2m away, behind you.
Your longsword's optimal range is 1m.
```

### Different Weapon Contexts
```
> range alice
Alice is 15m away, in front of you.
Your crossbow's optimal range is 50m.

> range dave
Dave is 85m away, in front of you.
Your crossbow's optimal range is 50m.
```

## Output Format

The command provides two key pieces of information:

1. **Distance and Direction**: Exact distance and relative position (front/behind)
2. **Weapon Context**: Your current weapon's optimal engagement range

## Tactical Applications

- **Positioning Assessment**: Determine if you need to advance or retreat
- **Weapon Effectiveness**: Compare target distance to your weapon's optimal range
- **Movement Planning**: Calculate how much movement is needed for optimal engagement
- **Situational Awareness**: Track enemy positions during combat

## Range Categories

Understanding weapon ranges helps with tactical decisions:

- **Melee Weapons** (1-2m): Swords, axes, hammers
- **Ranged Weapons** (20-100m): Crossbows, bows
- **Thrown Weapons** (5-15m): Javelins, throwing knives

## Related Commands

- **`advance`** - Move toward enemies to close distance
- **`retreat`** - Move away from enemies to create distance
- **`target <actor>`** - Select a target for combat actions

## Notes

- Range is measured as straight-line distance on the battlefield
- Direction is relative to your current facing (front = facing direction, behind = opposite)
- Weapon optimal range indicates the distance where your weapon is most effective
- Some weapons have maximum ranges beyond which they cannot hit targets
