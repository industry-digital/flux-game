# Place Entity

A **Place** represents a physical location in the game world. Every Place has an associated MUD room (XMPP MUC chat room) and can represent anything from a single room to larger areas like cities or regions.

## Core Concepts

- **Hierarchical Topology**: All Places exist in a containment hierarchy via natural relationships
- **Root Places**: All Places belong to either `world` (the root of all Places) or `nowhere` (a special void place)
- **Bidirectional Travel**: Exits are one-way; bidirectional travel requires exits in both Places
- **Entity Containers**: Places can contain other entities (characters, items, etc.)

## Type Structure

```typescript
type Place = AbstractEntity<EntityType.PLACE> & DescribableMixin & {
  exits: Exits;
  entities: PlaceEntities;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `EntityType.PLACE` | Always `"place"` |
| `id` | `PlaceURN` | Unique identifier in format `flux:place:world:...` |
| `name` | `string` | Human-readable name |
| `description` | `string \| EmergentNarrative` | Detailed description |
| `exits` | `Exits` | Available exits keyed by direction |
| `entities` | `PlaceEntities` | Entities currently in this place |

## Factory Functions

### `createPlace(transform?, options?)`

Creates a new Place with sensible defaults.

**Parameters:**
- `transform` - Optional function to customize the place
- `options` - Factory options (UUID generator, timestamp)

**Example:**
```typescript
import { createPlace } from '~/worldkit/entity/place';
import { createTranslationUrn, Translatable } from '~/i18n';

// Basic place with defaults
const basicPlace = createPlace();

// Customized place
const tavern = createPlace(place => ({
  ...place,
  name: createTranslationUrn(place.id, Translatable.NAME),
  description: createTranslationUrn(place.id, Translatable.DESCRIPTION)
}));
```

### `createExit(transform?, options?)`

Creates an Exit connecting one place to another.

**Parameters:**
- `transform` - Optional function to customize the exit
- `options` - Factory options (UUID generator)

**Example:**
```typescript
import { createExit } from '~/worldkit/entity/place';
import { createPlaceUrn } from '~/lib/taxonomy';
import { createExitTranslationUrn } from '~/i18n';
import { Direction } from '~/types/world/space';

const sourcePlaceUrn = createPlaceUrn('inn', 'lobby');
const exit = createExit(exit => ({
  ...exit,
  label: createExitTranslationUrn(sourcePlaceUrn, Direction.NORTH),
  to: createPlaceUrn('tavern', 'common-room')
}));
```

## Working with PlaceInput

For creating groups of related places (like entire regions or buildings), use `PlaceInput` objects that can be converted to actual Place entities.

### PlaceInput Structure

```typescript
type PlaceInput = {
  name?: string;
  description?: string;
  exits?: Exits;
  entities?: PlaceEntities;
}
```

### Creating Place Fixtures

```typescript
import { PlaceInput } from '~/types/entity/place';
import { createExit } from '~/worldkit/entity/place';
import { createPlaceUrn } from '~/lib/taxonomy';
import { createExitTranslationUrn } from '~/i18n';
import { Direction } from '~/types/world/space';

const tavernFixture = (): PlaceInput[] => {
  return [
    {
      name: 'The Rusty Dragon Inn',
      description: 'A cozy tavern filled with the aroma of roasted meat and ale.',
      exits: {
        [Direction.NORTH]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('tavern', 'rusty-dragon'), Direction.NORTH),
          to: createPlaceUrn('town', 'square')
        })),
        [Direction.UP]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('tavern', 'rusty-dragon'), Direction.UP),
          to: createPlaceUrn('tavern', 'upstairs')
        }))
      },
      entities: {}
    },
    {
      name: 'Tavern Upstairs',
      description: 'A quiet floor with rooms for weary travelers.',
      exits: {
        [Direction.DOWN]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('tavern', 'upstairs'), Direction.DOWN),
          to: createPlaceUrn('tavern', 'rusty-dragon')
        }))
      },
      entities: {}
    }
  ];
};
```

### Converting PlaceInput to Place Entities

```typescript
import { createPlace } from '~/worldkit/entity/place';
import { createTranslationUrn, Translatable } from '~/i18n';

// Convert a PlaceInput to a Place entity
const createPlaceFromInput = (input: PlaceInput): Place => {
  return createPlace(place => ({
    ...place,
    name: input.name ? createTranslationUrn(place.id, Translatable.NAME) : '',
    description: input.description ? createTranslationUrn(place.id, Translatable.DESCRIPTION) : '',
    exits: input.exits || {},
    entities: input.entities || {}
  }));
};

// Create multiple places from fixture
const tavernPlaces = tavernFixture().map(createPlaceFromInput);
```

## Creating Places with Exits

### Place with Multiple Exits

```typescript
import { createPlace, createExit } from '~/worldkit/entity/place';
import { createPlaceUrn } from '~/lib/taxonomy';
import { createTranslationUrn, createExitTranslationUrn, Translatable } from '~/i18n';
import { Direction } from '~/types/world/space';

const townSquare = createPlace(place => ({
  ...place,
  name: createTranslationUrn(place.id, Translatable.NAME),
  description: createTranslationUrn(place.id, Translatable.DESCRIPTION),
  exits: {
    [Direction.NORTH]: createExit(exit => ({
      ...exit,
      label: createExitTranslationUrn(place.id, Direction.NORTH),
      to: createPlaceUrn('town', 'residential', 'main-street')
    })),
    [Direction.SOUTH]: createExit(exit => ({
      ...exit,
      label: createExitTranslationUrn(place.id, Direction.SOUTH),
      to: createPlaceUrn('town', 'gates', 'main-entrance')
    })),
    [Direction.EAST]: createExit(exit => ({
      ...exit,
      label: createExitTranslationUrn(place.id, Direction.EAST),
      to: createPlaceUrn('temple', 'courtyard')
    })),
    [Direction.WEST]: createExit(exit => ({
      ...exit,
      label: createExitTranslationUrn(place.id, Direction.WEST),
      to: createPlaceUrn('market', 'central-plaza')
    })),
    [Direction.UP]: createExit(exit => ({
      ...exit,
      label: createExitTranslationUrn(place.id, Direction.UP),
      to: createPlaceUrn('tower', 'watchtower', 'observation-deck')
    }))
  }
}));
```

## Available Directions

Places support exits in the following directions:

**Cardinal Directions:**
- `NORTH`, `SOUTH`, `EAST`, `WEST`
- `NORTHEAST`, `NORTHWEST`, `SOUTHEAST`, `SOUTHWEST`

**Vertical Movement:**
- `UP`, `DOWN`

**Relative Movement:**
- `IN`, `OUT`
- `FORWARD`, `BACKWARD`
- `LEFT`, `RIGHT`

## Best Practices

### Fixture Organization
- Create fixtures for related places (buildings, districts, regions)
- Use descriptive names that reflect the area's theme
- Include bidirectional exits for normal navigation

```typescript
// Good: Organized by theme/location
const nightCityFixture = (): PlaceInput[] => { /* ... */ };
const castleFixture = (): PlaceInput[] => { /* ... */ };
const dungeonFixture = (): PlaceInput[] => { /* ... */ };
```

### Exit Labels
- Always use `createExitTranslationUrn` for direction-based exits
- Use `createTranslationUrn` only for special/unique exits
- Include the source place and direction for context

```typescript
// Standard exit translation URN
label: createExitTranslationUrn(sourcePlaceUrn, Direction.NORTH)
// Result: flux:i18n:exit:world:castle:throne-room:north:label

// Special exit with custom identifier
label: createTranslationUrn(createPlaceUrn('castle', 'secret-door'), Translatable.LABEL)
// Result: flux:i18n:place:world:castle:secret-door:label
```

### Place URNs
- Use hierarchical paths that reflect logical containment
- Keep path segments lowercase and hyphenated
- Make paths intuitive for navigation

```typescript
// Good structure
createPlaceUrn('city', 'district', 'building', 'room')

// Examples
createPlaceUrn('castle', 'throne-room')
createPlaceUrn('dungeon', 'level-1', 'prison-cells')
createPlaceUrn('forest', 'clearing', 'ancient-oak')
```

### Bidirectional Travel
Always create return exits for normal passage:

```typescript
// Room A -> Room B
const roomA = createPlace(place => ({
  ...place,
  name: createTranslationUrn(place.id, Translatable.NAME),
  description: createTranslationUrn(place.id, Translatable.DESCRIPTION),
  exits: {
    [Direction.EAST]: createExit(exit => ({
      ...exit,
      label: createExitTranslationUrn(place.id, Direction.EAST),
      to: createPlaceUrn('building', 'room-b')
    }))
  }
}));

// Room B -> Room A
const roomB = createPlace(place => ({
  ...place,
  name: createTranslationUrn(place.id, Translatable.NAME),
  description: createTranslationUrn(place.id, Translatable.DESCRIPTION),
  exits: {
    [Direction.WEST]: createExit(exit => ({
      ...exit,
      label: createExitTranslationUrn(place.id, Direction.WEST),
      to: createPlaceUrn('building', 'room-a')
    }))
  }
}));
```

## Special Places

### Well-Known Places
- `world` - The root of all Places
- `nowhere` - A void space for entities not in the world

```typescript
// Reference well-known places
createPlaceUrn('world')     // flux:place:world
createPlaceUrn('nowhere')   // flux:place:nowhere
```

### Secret or Hidden Areas
Use translation URNs for special exits:

```typescript
const sourcePlaceUrn = createPlaceUrn('dungeon', 'cell-block');
const secretExit = createExit(exit => ({
  ...exit,
  label: createTranslationUrn(createPlaceUrn('dungeon', 'secret-passage'), Translatable.LABEL),
  to: createPlaceUrn('nowhere')
}));
```

## Translation System

All human-readable text uses translation URNs instead of hardcoded strings. This enables internationalization and centralized content management.

### Translation URN Patterns

```typescript
// Entity properties (name, description)
createTranslationUrn(entityUrn, Translatable.NAME)
// Result: flux:i18n:place:world:tavern:rusty-dragon:name

// Exit labels (direction-based)
createExitTranslationUrn(sourcePlaceUrn, Direction.NORTH)
// Result: flux:i18n:exit:world:tavern:rusty-dragon:north:label

// Custom labels for special exits
createTranslationUrn(customUrn, Translatable.LABEL)
// Result: flux:i18n:place:world:dungeon:secret-door:label
```

### Example Translation Keys

```typescript
// Generated translation URNs for a tavern
const tavernUrn = createPlaceUrn('tavern', 'rusty-dragon');

// These would map to actual translations:
createTranslationUrn(tavernUrn, Translatable.NAME)
// -> "The Rusty Dragon Inn"

createTranslationUrn(tavernUrn, Translatable.DESCRIPTION)
// -> "A cozy tavern filled with the aroma of roasted meat and ale."

createExitTranslationUrn(tavernUrn, Direction.NORTH)
// -> "A wooden door leading to the inn's common room"
```

### Translation File Structure

```typescript
// game/src/i18n/en_US.ts
export const translations = {
  // Place names and descriptions
  "flux:i18n:place:world:nightcity:afterlife-bar:name": "The Afterlife",
  "flux:i18n:place:world:nightcity:afterlife-bar:description": "The legendary mercenary bar...",

  // Exit labels
  "flux:i18n:exit:world:nightcity:afterlife-bar:north:label": "Take the NCART to Watson Market",
  "flux:i18n:exit:world:nightcity:afterlife-bar:east:label": "Drive downtown to Corpo Plaza",

  // Special exits
  "flux:i18n:place:world:dungeon:secret-passage:label": "A barely perceptible crack in the stone wall"
};
```

## Entity Management

Places automatically track entities within them via the `entities` property. This is managed by the system when entities move between places.

```typescript
// Entities are typically managed by movement systems, not manually
// The entities property structure:
type PlaceEntities = Partial<Record<EntityURN, PlaceEntityDescriptor>>;
```

## Related Types

- [`Exit`](./exit.md) - Connection between places
- [`Direction`](../world/space.md) - Available movement directions
- [`EntityType`](./entity.md) - Base entity types
- [`PlaceURN`](../taxonomy.md) - Place identifier format
