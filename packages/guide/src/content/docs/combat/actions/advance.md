---
title: ADVANCE
description: Move forward in your facing direction to close distance or reposition tactically.
---

# ADVANCE

```
advance
advance <distance>
advance distance <meters>
advance ap <action_points>
```

The `advance` command moves your character forward in the direction you're currently facing. This is your primary tool for closing distance with enemies, pursuing retreating opponents, or repositioning to gain tactical advantage.

*Examples*
```
advance           # Move as far as possible with available AP
advance 10        # Move forward 10 meters
advance distance 5    # Move forward exactly 5 meters
advance ap 2.5    # Use 2.5 action points to move forward
```

## How It Works

ADVANCE always moves in your **facing direction**:
- If facing **RIGHT** → moves rightward (increasing position)
- If facing **LEFT** → moves leftward (decreasing position)

The system calculates movement costs based on your character's **Power** and **Finesse** stats, as well as your total mass (body weight + equipment + inventory). Movement stops automatically if you hit a battlefield boundary or collide with another combatant.

## Movement Variants

### Maximum Advance
```
advance
```
Uses all available action points to move as far as possible forward. This is often the most efficient way to close distance quickly.

### Distance-Based Movement
```
advance 15
advance distance 15
```
Moves exactly 15 meters forward (or as close as possible if blocked). The system calculates the required action points automatically.

### AP-Based Movement
```
advance ap 3
```
Spends exactly 3 action points on forward movement. The distance covered depends on your stats and equipment load.

## Tactical Considerations

**Efficiency**: Forward movement is naturally efficient - your character moves at 100% effectiveness when advancing.

**Positioning**: Use advance to:
- Close distance for melee attacks
- Pursue retreating enemies
- Move to advantageous battlefield positions
- Escape from corners or boundaries

**Resource Management**: Consider your remaining action points carefully. Advancing too far might leave you without enough AP to attack or defend effectively.

## Arguments

- `<distance>`: Distance in meters to move forward (shorthand syntax)
- `distance <meters>`: Distance in meters to move forward (explicit syntax)
- `ap <action_points>`: Specific amount of AP to spend on movement

*Note: All movement is forward-only. To move backward, use the `retreat` command.*
