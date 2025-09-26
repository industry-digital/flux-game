<script setup>
import CommandList from '~/components/CommandList.vue';
import CommandListAlt from '~/components/CommandListAlt.vue';
import BeforeAfterBattlefield from '~/components/BeforeAfterBattlefield.vue';
import { BattlefieldNotation } from '@flux/ui';
</script>

# ADVANCE

Move forward on the battlefield. If `actor` is specified, move towards it, turning around if necessary.

::: tip Related Action
See [RETREAT](./retreat.md) for backward movement and creating distance from threats.
:::

## Commands

<CommandListAlt :commands="[
  {
    intent: 'advance',
    description: 'Move forward until blocked or until no AP'
  },
  {
    intent: 'advance distance',
    args: [
      { symbol: 'D', description: 'Distance in meters' }
    ],
    description: (args) => `Move ${args.D} meters forward`
  },
  {
    intent: 'advance ap',
    args: [
      { symbol: 'A', description: 'Action points to spend' }
    ],
    description: (args) => `Spend ${args.A} AP on forward movement`
  },
  {
    intent: 'advance',
    args: [
      { symbol: 'actor', description: 'Target actor name' }
    ],
    description: (args) => `Move towards ${args.actor}, turning around if necessary`
  },
  {
    intent: 'advance distance',
    args: [
      { symbol: 'D', description: 'Distance in meters' },
      { symbol: 'actor', description: 'Target actor name' }
    ],
    description: (args) => `Move ${args.D} meters towards ${args.actor}, turning around if necessary`
  },
  {
    intent: 'advance ap',
    args: [
      { symbol: 'A', description: 'Action points to spend' },
      { symbol: 'actor', description: 'Target actor name' }
    ],
    description: (args) => `Spend ${args.A} AP towards ${args.actor}, turning around if necessary`
  }
]" />


## Cost

- `distance D` guarantees exact positioning, AP cost varies
- `ap A` guarantees exact AP spending, distance varies

## Collision Rules

- Battlefield boundaries block movement completely.
- Enemy combatants block movement with 1-meter minimum separation.
- Allied combatants don't block. You can stack or pass through freely.

## Examples

In the following examples, you are Alice (`A₁`), facing an enemy combatant Bob (`B₁`).

### Unrestricted forward movement

Alice expends all her AP to move forward. She ends up 43 meters closer to Bob.

```
advance
```

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 100, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 200, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 143, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 200, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>



### Forward movement blocked by enemy combatant

Alice tries to advance forward but is blocked by Bob. The combat system enforces a **1-meter minimum separation** between enemy combatants, so Alice stops at position 29 (1 meter before Bob at position 30).

```
advance
```

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 20, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 30, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 29, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 30, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>

### Movement towards a target behind

```
> advance charlie
[Position 100 -> 68, AP 6.0 -> 0.0]
```

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 100, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 110, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 0, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 68, facing: 'left', team: 'alpha' },
        { name: 'Bob', position: 110, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 0, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>

### Move forward an exact distance

```
> advance distance 6
[Position 100 -> 106, AP 6.0 -> 5.8]
```

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 100, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 110, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 0, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 106, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 110, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 0, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>

### Move forward by AP

```
advance ap 0.2
```

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 100, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 110, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 0, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 105, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 110, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 0, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>
