# Movement

Combat uses a [linear battlefield](./index.md#linear-battlefield) where positioning affects weapon effectiveness and tactical options.

## Movement Types

Players can express movement intent in terms of:

- **Distance**. Specify meters to move. AP cost varies by character stats.
- **Time**. Specify AP to spend. Distance varies by character stats.

## Actions

- **[ADVANCE](./actions/advance.md)**: Move forward
- **[RETREAT](./actions/retreat.md)**: Move backward

## Physics

Movement costs depend on Power (POW), Finesse (FIN), and total mass. Physics modeling calculates realistic acceleration and movement costs.

## Stat Effects

**Finesse**: Better acceleration, good for short distances
**Power**: Higher top speed, good for long distances
**Mass**: Higher mass reduces top speed and acceleration

## Rounding

Distances round up to nearest meter. AP costs round up to nearest 0.1 AP.

## Efficiency

Single large movements cost less AP than multiple small movements due to acceleration costs.

## Late Joiners

New combatants enter at battlefield edges on their team's side.
