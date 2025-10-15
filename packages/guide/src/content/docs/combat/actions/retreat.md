---
title: RETREAT
description: Move backward away from threats to create space and reposition defensively.
---

# RETREAT

```
retreat
retreat <distance>
retreat distance <meters>
retreat ap <action_points>
```

The `retreat` command moves your character backward, opposite to your facing direction. This is your primary defensive movement tool for creating space, escaping dangerous positions, or repositioning when overwhelmed.

*Examples*
```
retreat               # Move backward as far as possible with available AP
retreat 8             # Move backward 8 meters
retreat distance 3    # Move backward exactly 3 meters
retreat ap 4          # Use 4 action points to move backward
```

## How It Works

RETREAT always moves **opposite** to your facing direction:
- If facing **RIGHT** → moves leftward (decreasing position)
- If facing **LEFT** → moves rightward (increasing position)

**Important**: Backward movement is **less efficient** than forward movement due to biomechanical limitations. You'll cover less distance or spend more action points compared to advancing the same distance.

## Movement Variants

### Maximum Retreat
```
retreat
```
Uses all available action points to move as far backward as possible. Useful for emergency escapes when under pressure.

### Distance-Based Retreat
```
retreat 12
retreat distance 12
```
Moves exactly 12 meters backward (or as close as possible if blocked). The system automatically accounts for the efficiency penalty when calculating AP costs.

### AP-Based Retreat
```
retreat ap 2.5
```
Spends exactly 2.5 action points on backward movement. Due to the efficiency penalty, this covers less distance than `advance ap 2.5` would.

## Tactical Considerations

**Efficiency Penalty**: Retreating costs **35% more** action points than advancing the same distance. Plan your retreats carefully to avoid wasting precious AP.

**Defensive Positioning**: Use retreat to:
- Create space from aggressive melee attackers
- Move to safer battlefield positions
- Avoid being cornered against boundaries
- Reposition for better tactical options

**Timing**: Retreat early rather than late. Waiting until you're critically low on health or AP often means you can't retreat far enough to safety.

**Facing Strategy**: Consider your facing direction when planning retreats. Sometimes it's more efficient to turn around first, then advance, rather than retreating a long distance.

## Efficiency Comparison

| Action | Distance | AP Cost | Efficiency |
|--------|----------|---------|------------|
| `advance 10` | 10 meters | ~2.5 AP | 100% |
| `retreat 10` | 10 meters | ~3.4 AP | 65% |

*Note: Exact costs depend on your Power, Finesse, and equipment load.*

## Arguments

- `<distance>`: Distance in meters to move backward (shorthand syntax)
- `distance <meters>`: Distance in meters to move backward (explicit syntax)
- `ap <action_points>`: Specific amount of AP to spend on backward movement

*Remember: Retreat is less efficient than advance, but sometimes creating space is worth the extra cost.*
