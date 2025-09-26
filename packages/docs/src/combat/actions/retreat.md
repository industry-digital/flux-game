<script setup>
import CommandList from '@vitepress/components/CommandList.vue';
import BattlefieldNotation from '@vitepress/components/BattlefieldNotation.vue';
import BeforeAfterBattlefield from '@vitepress/components/BeforeAfterBattlefield.vue';
</script>


# RETREAT

Move backward on the battlefield, creating distance from threats through tactical withdrawal. Retreat always moves opposite to your current facing direction without changing orientation.

::: tip Related Action
See [ADVANCE](./advance.md) for forward movement and closing distance with enemies.
:::

## Commands

<CommandList :commands="[
  {
    intent: 'retreat',
    description: 'Move backward until blocked or until no AP'
  },
  {
    intent: 'retreat distance',
    args: [
      { symbol: 'D', description: 'Distance in meters' }
    ],
    description: (args) => `Move ${args.D} meters backward`
  },
  {
    intent: 'retreat ap',
    args: [
      { symbol: 'A', description: 'Action points to spend' }
    ],
    description: (args) => `Spend ${args.A} AP on backward movement`
  },
  {
    intent: 'retreat',
    args: [
      { symbol: 'actor', description: 'Target actor name' }
    ],
    description: (args) => `Move away from ${args.actor} without changing facing`
  },
  {
    intent: 'retreat distance',
    args: [
      { symbol: 'D', description: 'Distance in meters' },
      { symbol: 'actor', description: 'Target actor name' }
    ],
    description: (args) => `Move ${args.D} meters away from ${args.actor} without changing facing`
  },
  {
    intent: 'retreat ap',
    args: [
      { symbol: 'A', description: 'Action points to spend' },
      { symbol: 'actor', description: 'Target actor name' }
    ],
    description: (args) => `Spend ${args.A} AP moving away from ${args.actor} without changing facing`
  }
]" />


## Cost

- `distance D` guarantees exact positioning, AP cost varies
- `ap A` guarantees exact AP spending, distance varies

### Collision Rules

- **Battlefield boundaries** block movement completely.
- **Enemy combatants** block movement with 1-meter minimum separation.
- **Allied combatants** don't block (you can pass through freely).

## Examples

In the following examples, you are Alice (`A₁`).

Bob (`B₁`) and Charlie (`C₁`) are enemy combatants.

### Basic backward movement

```
retreat
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
        { name: 'Alice', position: 57, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 200, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>



### Backward movement blocked by battlefield boundary

```
> retreat
[Position 5 -> 0, AP 6.0 -> 5.8]
```

Alice attempts to retreat but hits the battlefield boundary at position 0. The combat system prevents movement beyond battlefield limits, stopping Alice at the boundary.

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 5, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 50, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 0, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 50, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>

### Backward movement blocked by enemy combatant

```
> retreat
[Position 110 -> 101, AP 6.0 -> 5.2]
```

Alice tries to retreat but is blocked by Bob behind her. The combat system enforces a **1-meter minimum separation** between enemy combatants, so Alice stops at position 101 (1 meter before Bob at position 100).

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 110, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 100, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 101, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 100, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>

### Movement away from specific target

```
> retreat charlie
[Position 100 -> 68, AP 6.0 -> 0.0]
```

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 100, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 50, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 200, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 68, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 50, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 200, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>

### Move backward an exact distance

```
> retreat distance 6
[Position 100 -> 94, AP 6.0 -> 5.8]
```

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 100, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 200, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 50, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 94, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 200, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 50, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>

### Move backward by AP

```
retreat ap 0.2
```

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 100, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 200, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 50, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 95, facing: 'right', team: 'alpha' },
        { name: 'Bob', position: 200, facing: 'left', team: 'bravo' },
        { name: 'Charlie', position: 50, facing: 'right', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>

### Retreat with left-facing combatant

```
> retreat distance 8
[Position 100 -> 108, AP 6.0 -> 5.7]
```

Alice faces left, so retreating moves her rightward (opposite to her facing direction). Facing direction remains unchanged during retreat.

<BeforeAfterBattlefield>
  <template #before>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 100, facing: 'left', team: 'alpha' },
        { name: 'Bob', position: 50, facing: 'right', team: 'bravo' },
        { name: 'Charlie', position: 200, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>

  <template #after>
    <BattlefieldNotation
      currentActor="Alice"
      subjectTeam="alpha"
      :combatants="[
        { name: 'Alice', position: 108, facing: 'left', team: 'alpha' },
        { name: 'Bob', position: 50, facing: 'right', team: 'bravo' },
        { name: 'Charlie', position: 200, facing: 'left', team: 'bravo' },
      ]"
    />
  </template>
</BeforeAfterBattlefield>
