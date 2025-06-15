# Character Entity

A **Character** represents a player or NPC in the game world. Characters are actors that can perform actions, move between places, interact with other entities, and progress through gameplay mechanics.

## Core Concepts

- **Actor-Based**: Characters are the primary actors in the game, capable of initiating commands and actions
- **Location-Aware**: Every character has a location (Place) within the world hierarchy
- **Progression System**: Characters have stats, skills, levels, and other progression mechanics
- **Inventory Management**: Characters can carry items and equipment
- **Social Interactions**: Characters can form relationships, join groups, and interact socially

## Type Structure

```typescript
type Character = AbstractEntity<EntityType.CHARACTER> & DescribableMixin & {
  location: SymbolicLink<EntityType.PLACE>;
  level: ModifiableScalarAttribute;
  hp: ModifiableBoundedAttribute;
  traits: Record<string, TraitURN>;
  stats: Record<CharacterStatName, ModifiableBoundedAttribute>;
  injuries: Record<string, Injury>;
  mana: Record<string, ModifiableBoundedAttribute>;
  effects: Record<string, AppliedEffect>;
  inventory: Inventory;
  equipment: Record<string, ItemURN>;
  memberships: Record<string, Membership>;
  reputation: Record<string, number>;
  subscriptions: Record<string, Subscription>;
  skills: Record<string, SkillState>;
  specializations: {
    primary: SkillURN[];
    secondary: SkillURN[];
  };
  prefs: Record<string, any>;
}
```

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `EntityType.CHARACTER` | Always `"char"` |
| `id` | `CharacterURN` | Unique identifier in format `flux:char:...` |
| `name` | `string` | Character's name |
| `description` | `string \| EmergentNarrative` | Character's description |
| `location` | `SymbolicLink<EntityType.PLACE>` | Current place in the world |
| `level` | `ModifiableScalarAttribute` | Character level |
| `hp` | `ModifiableBoundedAttribute` | Health points (current/max) |
| `traits` | `Record<TraitURN, number>` | Character traits and their values |
| `stats` | `Record<CharacterStatName, ModifiableBoundedAttribute>` | Core attributes (strength, dexterity, constitution, etc.) |
| `injuries` | `Record<string, Injury>` | Active injuries affecting the character |
| `mana` | `Record<string, ModifiableBoundedAttribute>` | Magic/energy pools |
| `effects` | `Record<EffectURN, Effect>` | Active buffs, debuffs, and conditions |
| `inventory` | `Inventory` | Items carried by the character |
| `equipment` | `Record<string, ItemURN>` | Currently equipped items |
| `memberships` | `Record<GroupURN, Membership>` | Guild/group memberships |
| `reputation` | `Record<string, number>` | Reputation with various factions |
| `subscriptions` | `Record<string, Subscription>` | Event subscriptions |
| `skills` | `Record<SkillURN, Skill>` | Character skills and proficiencies |
| `specializations` | `object` | Primary and secondary specializations |
| `prefs` | `Record<string, any>` | Player preferences and settings |

## Factory Functions

### `createCharacter(input, options?)`

Creates a new Character with sensible defaults.

**Parameters:**
- `input` - CharacterInput with required name and description
- `options` - Factory options (UUID generator, timestamp)

**Example:**
```typescript
import { createCharacter } from '~/worldkit/entity/character';
import { createTranslationUrn, Translatable } from '~/i18n';

// Basic character creation
const warrior = createCharacter({
  name: createTranslationUrn(characterUrn, Translatable.NAME),
  description: createTranslationUrn(characterUrn, Translatable.DESCRIPTION),
  location: 'flux:place:world:town:square'
});

// Character with custom location
const mage = createCharacter({
  name: createTranslationUrn(characterUrn, Translatable.NAME),
  description: createTranslationUrn(characterUrn, Translatable.DESCRIPTION),
  location: 'flux:place:world:tower:library'
});
```

### `createCharacterInput(transform?)`

Creates a CharacterInput object with sensible defaults and optional customization.

**Parameters:**
- `transform` - Optional function to customize the character input

**Example:**
```typescript
import { createCharacterInput } from '~/worldkit/entity/character';

const characterInput = createCharacterInput(input => ({
  ...input,
  name: 'Aria Blackwood',
  description: 'A skilled ranger from the northern forests.',
  location: 'flux:place:world:forest:ranger-cabin'
}));
```

## Working with CharacterInput

For creating groups of related characters (like NPCs for a quest or area), use `CharacterInput` objects that can be converted to actual Character entities.

### CharacterInput Structure

```typescript
type CharacterInput = {
  name: string;
  description: string;
  location?: PlaceURN;
}
```

### Creating Character Fixtures

```typescript
import { CharacterInput } from '@flux';
import { createCharacterInput } from '~/worldkit/entity/character';

const tavernNPCsFixture = (): CharacterInput[] => {
  return [
    createCharacterInput(input => ({
      ...input,
      name: 'Barkeep Magnus',
      description: 'A burly dwarf with calloused hands and a knowing smile. Magnus has run The Rusty Dragon for decades and knows every rumor in town.',
      location: 'flux:place:world:tavern:rusty-dragon'
    })),
    createCharacterInput(input => ({
      ...input,
      name: 'Elara the Bard',
      description: 'A traveling musician with a lute and a repertoire of songs from distant lands. Her melodies can lift spirits or bring tears.',
      location: 'flux:place:world:tavern:rusty-dragon'
    })),
    createCharacterInput(input => ({
      ...input,
      name: 'Old Tom',
      description: 'A weathered regular who sits in the corner nursing his ale. Tom has seen three kings come and go, and his stories are legendary.',
      location: 'flux:place:world:tavern:rusty-dragon'
    }))
  ];
};
```

### Converting CharacterInput to Character Entities

```typescript
import { createCharacter } from '~/worldkit/entity/character';
import { createTranslationUrn, Translatable } from '~/i18n';

// Convert a CharacterInput to a Character entity
const createCharacterFromInput = (input: CharacterInput): Character => {
  return createCharacter({
    name: createTranslationUrn(generateCharacterUrn(), Translatable.NAME),
    description: createTranslationUrn(generateCharacterUrn(), Translatable.DESCRIPTION),
    location: input.location
  });
};

// Create multiple characters from fixture
const tavernNPCs = tavernNPCsFixture().map(createCharacterFromInput);
```

## Character Progression

### Stats and Attributes

```typescript
// Characters have modifiable bounded attributes for stats
const character = createCharacter((char) => {
  return transform({
  name: 'Aria Blackwood', // not a translation
  stats: { ...char.stats, str: 10, dex: 10, con: 10 },


});

// Stats are automatically initialized with default values
// character.stats contains: strength, dexterity, constitution, etc.
// Each stat has current/max values and modifiers
```

### Health and Vitals

```typescript
// Health points with current/max tracking
character.hp.current = 85;
character.hp.max = 100;

// Multiple mana pools for different magic types
character.mana['arcane'] = {
  current: 40,
  max: 50,
  modifiers: {}
};
```

### Skills and Specializations

```typescript
// Skills with proficiency levels
character.skills['flux:skill:combat:swordsmanship'] = {
  level: 5,
  experience: 1200,
  modifiers: {}
};

// Primary and secondary specializations
character.specializations.primary['warrior'] = {
  name: 'Guardian',
  level: 3,
  abilities: ['flux:ability:combat:shield-wall']
};
```

## Inventory and Equipment

### Inventory Management

```typescript
// Inventory with mass tracking
character.inventory = {
  mass: 15.5,
  items: {
    'flux:item:weapon:iron-sword': { quantity: 1, condition: 0.9 },
    'flux:item:consumable:health-potion': { quantity: 3, condition: 1.0 }
  },
  ts: Date.now()
};
```

### Equipment System

```typescript
// Equipment slots
character.equipment = {
  'main-hand': 'flux:item:weapon:iron-sword',
  'off-hand': 'flux:item:armor:wooden-shield',
  'armor': 'flux:item:armor:leather-vest',
  'helmet': 'flux:item:armor:iron-helm'
};
```

## Location and Movement

### Character Location

```typescript
import { createSymbolicLink } from '~/worldkit/entity/util';
import { EntityType } from '@flux';

// Characters have a location that references a Place
character.location = createSymbolicLink(
  EntityType.PLACE,
  ['world', 'town', 'square']
) as SymbolicLink<EntityType.PLACE>;
```

### Location Updates

Location is typically managed by the movement system, not directly:

```typescript
// Movement is handled by the useActorMovement hook
const { move } = useActorMovement(context);
const result = move(Direction.NORTH);

// The movement system updates character.location automatically
```

## Social Systems

### Group Memberships

```typescript
// Guild and group memberships
character.memberships['flux:group:guild:warriors'] = {
  role: 'member',
  joined: Date.now(),
  rank: 'Initiate',
  permissions: ['training', 'common-areas']
};
```

### Reputation System

```typescript
// Reputation with various factions
character.reputation = {
  'town-guard': 750,    // Friendly
  'thieves-guild': -200, // Hostile
  'merchants': 300      // Neutral to Friendly
};
```

## Effects and Conditions

### Active Effects

```typescript
// Buffs, debuffs, and conditions
character.effects['flux:effect:buff:strength'] = {
  magnitude: 5,
  duration: 300000, // 5 minutes in milliseconds
  source: 'flux:item:potion:strength',
  applied: Date.now()
};
```

### Injuries and Conditions

```typescript
// Injuries that affect performance
character.injuries['broken-arm'] = {
  severity: 'moderate',
  affects: ['melee-combat', 'climbing'],
  healing: {
    timeRemaining: 86400000, // 24 hours
    treatment: 'basic-care'
  }
};
```

## Translation System

All character-related human-readable text uses translation URNs for internationalization.

### Character Translation Patterns

```typescript
// Character properties
createTranslationUrn(characterUrn, Translatable.NAME)
// Result: flux:i18n:char:alice-123:name

createTranslationUrn(characterUrn, Translatable.DESCRIPTION)
// Result: flux:i18n:char:alice-123:description

// Custom character attributes
createTranslationUrn(createCharacterUrn('background', 'noble'), Translatable.NAME)
// Result: flux:i18n:char:background:noble:name
```

### Example Translation Keys

```typescript
// Generated translation URNs for a character
const characterUrn = 'flux:char:aria-blackwood';

// These would map to actual translations:
createTranslationUrn(characterUrn, Translatable.NAME)
// -> "Aria Blackwood"

createTranslationUrn(characterUrn, Translatable.DESCRIPTION)
// -> "A skilled ranger from the northern forests, known for her tracking abilities."
```

### Translation File Structure

```typescript
// game/src/i18n/en_US.ts
export const translations = {
  // Character names and descriptions
  "flux:i18n:char:aria-blackwood:name": "Aria Blackwood",
  "flux:i18n:char:aria-blackwood:description": "A skilled ranger from the northern forests...",

  // NPC characters
  "flux:i18n:char:barkeep-magnus:name": "Barkeep Magnus",
  "flux:i18n:char:barkeep-magnus:description": "A burly dwarf with calloused hands...",

  // Character backgrounds/archetypes
  "flux:i18n:char:background:noble:name": "Noble",
  "flux:i18n:char:background:noble:description": "Born into aristocracy with education and wealth."
};
```

## Best Practices

### Character Design
- Create characters with clear motivations and backgrounds
- Use descriptive names that fit the world setting
- Balance character abilities and weaknesses
- Consider the character's role in the narrative

```typescript
// Good: Clear character concept
const createRangerCharacter = (): Character => createCharacter({
  name: createTranslationUrn(characterUrn, Translatable.NAME),
  description: createTranslationUrn(characterUrn, Translatable.DESCRIPTION),
  location: 'flux:place:world:forest:ranger-outpost'
});
```

### Fixture Organization
- Group related NPCs together (by location, quest, or purpose)
- Use consistent naming conventions
- Include rich descriptions that enhance immersion

```typescript
// Good: Organized by location/purpose
const tavernNPCsFixture = (): CharacterInput[] => { /* ... */ };
const questGiversFixture = (): CharacterInput[] => { /* ... */ };
const merchantsFixture = (): CharacterInput[] => { /* ... */ };
```

### Character Progression
- Start characters with appropriate stats for their background
- Design clear progression paths
- Balance power levels across character types

```typescript
// Good: Balanced starting character
const noviceWarrior = createCharacter({
  name: createTranslationUrn(characterUrn, Translatable.NAME),
  description: createTranslationUrn(characterUrn, Translatable.DESCRIPTION),
  // Default stats and equipment are appropriate for level 1
});
```

### Location Management
- Always place characters in valid locations
- Consider the narrative context of character placement
- Use well-known places for special cases

```typescript
// Good: Meaningful character placement
location: 'flux:place:world:library:reading-room'  // Scholar NPC
location: 'flux:place:world:smithy:workshop'       // Blacksmith NPC
location: 'flux:place:nowhere'                     // Character in limbo
```

## Character Lifecycle

### Creation and Initialization
1. Create CharacterInput with basic properties
2. Convert to Character entity using createCharacter
3. Set initial location and stats
4. Add to appropriate place entities list

### Progression and Updates
1. Experience gains update skills and level
2. Equipment changes modify stats and abilities
3. Social interactions affect reputation and memberships
4. Location changes trigger movement events

### Persistence and Fragments
Characters are stored as fragments in the database:
- `base` - Core identity, name, level, location
- `vitals` - Health, mana, status effects
- `stats` - Attributes, skills, levels
- `inventory` - Items, quantities, equipment
- `social` - Relationships, reputation, memberships

## Related Types

- [`Place`](./place.md) - Locations where characters exist
- [`Item`](./item.md) - Objects characters can carry and use
- [`Skill`](./skill.md) - Character abilities and proficiencies
- [`Effect`](./effect.md) - Temporary conditions affecting characters
- [`Group`](./group.md) - Organizations characters can join

## Complete Character Example

Here is a fully-formed Character entity showing all properties with realistic values:

```typescript
const exampleCharacter: Character = {
  // AbstractEntity properties
  type: EntityType.CHARACTER,
  id: 'flux:char:aria-shadowblade-7f3a9b2c',
  path: ['aria-shadowblade-7f3a9b2c'],

  // DescribableMixin properties
  name: 'flux:i18n:char:aria-shadowblade-7f3a9b2c:name',
  description: {
    base: 'flux:i18n:char:aria-shadowblade-7f3a9b2c:description',
    emergent: 'Recently returned from a dangerous mission in the Combat Zone, bearing new scars and a haunted look in her eyes. Her cybernetic arm gleams with fresh maintenance work.'
  },

  location: {
    type: EntityType.PLACE,
    id: 'flux:place:world:riverdale:library',
    path: ['world', 'riverdale', 'library']
  },

  party: {
    type: EntityType.COLLECTION,
    id: 'flux:collection:D6nJUQrCaqNJ7razZmkzqZWV',
    path: ['world', 'riverdale', 'library']
  },

  level: {
    nat: 12
  },

  hp: {
    nat: {
      cur: 85,
      max: 100
    },
    eff: {
      cur: 85,
      max: 110
    },
    mods: {
      'cyberware-boost': {
        type: 'flux:modifier:stat:hp',
        origin: {
          type: 'flux:item:cyberware:subdermal-armor'
        },
        value: 10,
        duration: 'permanent'
      }
    }
  },

  traits: {
    'flux:trait:personality:cautious': 1,
    'flux:trait:background:street-kid': 1,
    'flux:trait:augmentation:cybernetic-arm': 1
  },

  stats: {
    STR: {
      nat: 14,
      eff: 16,
      mods: {
        'cybernetic-arm': {
          type: 'flux:modifier:stat:str',
          origin: {
            type: 'flux:item:cyberware:cybernetic-arm'
          },
          value: 2,
          duration: 'permanent'
        }
      }
    },
    DEX: {
      nat: 18,
      eff: 20,
      mods: {
        'neural-boost': {
          type: 'flux:modifier:stat:dex',
          origin: {
            type: 'flux:item:cyberware:neural-boost'
          },
          value: 2,
          duration: 'permanent'
        }
      }
    },
    AGI: { nat: 16 },
    CON: { nat: 13 },
    INT: { nat: 15 },
    WIS: { nat: 17 },
    PRS: { nat: 12 },
    LCK: { nat: 14 }
  },

  injuries: {
    'flux:anatomy:torso': {
      integrity: 0.85,
      effects: {
        'old-gunshot-wound': {
          type: 'flux:effect:injury:scar',
          magnitude: -1,
          duration: 'permanent',
          source: 'flux:event:combat:gunshot',
          applied: 1698234567000
        }
      }
    }
  },

  mana: {
    'flux:mana:neural': {
      nat: {
        cur: 45,
        max: 50
      }
    },
    'flux:mana:cyber': {
      nat: {
        cur: 30,
        max: 35
      }
    }
  },

  effects: {
    'combat-stim': {
      type: 'flux:effect:buff:combat-stim',
      magnitude: 3,
      duration: {
        start: 1698234567000,
        end: 1698234867000
      },
      source: 'flux:item:consumable:combat-stim',
      applied: 1698234567000
    }
  },

  inventory: {
    mass: 8750, // 8.75 kg in grams
    items: {
      'flux:item:weapon:smartgun-pistol': {
        quantity: 1,
        condition: 0.92,
        ts: 1698234567000
      },
      'flux:item:consumable:health-stim': {
        quantity: 3,
        condition: 1.0,
        ts: 1698234567000
      },
      'flux:item:consumable:combat-stim': {
        quantity: 1,
        condition: 1.0,
        ts: 1698234567000
      },
      'flux:item:gear:hacking-deck': {
        quantity: 1,
        condition: 0.88,
        ts: 1698234567000
      },
      'flux:item:currency:eurodollars': {
        quantity: 2500,
        condition: 1.0,
        ts: 1698234567000
      }
    },
    ts: 1698234567000
  },

  equipment: {
    'flux:anatomy:hand:right': {
      'flux:item:weapon:smartgun-pistol': 1
    },
    'flux:anatomy:torso': {
      'flux:item:armor:armored-jacket': 1
    },
    'flux:anatomy:head': {
      'flux:item:gear:tactical-goggles': 1
    },
    'flux:anatomy:arm:left': {
      'flux:item:cyberware:cybernetic-arm': 1
    }
  },

  wallet: {
    'flux:currency:eurodollars': 2500,
    'flux:currency:bitcoin': 0.15,
    'flux:currency:street-cred': 750
  },

  memberships: {
    'flux:faction:mercenaries:afterlife': {
      role: 'veteran-merc',
      ts: 1690234567000,
      duration: undefined // permanent
    },
    'flux:faction:fixers:rogue-network': {
      role: 'trusted-operative',
      ts: 1692234567000
    }
  },

  reputation: {
    'flux:faction:corpo:arasaka': -0.7, // Hostile
    'flux:faction:gang:maelstrom': 0.3,  // Neutral-friendly
    'flux:faction:mercenaries:afterlife': 0.8, // Very friendly
    'flux:faction:police:ncpd': -0.4 // Unfriendly
  },

  subscriptions: {
    'flux:topic:combat:initiative': 1,
    'flux:topic:social:reputation-change': 1,
    'flux:topic:location:nightcity': 1
  },

  skills: {
    'flux:skill:weapon:gun:pistol': {
      xp: 15000,
      pxp: 250,
      conc: {
        nat: {
          cur: 80,
          max: 100
        }
      },
      ts: 1698234567000
    },
    'flux:skill:defense:evade': {
      xp: 12000,
      pxp: 180,
      conc: {
        nat: {
          cur: 70,
          max: 85
        }
      },
      ts: 1698234567000
    },
    'flux:skill:knowledge:tech': {
      xp: 8500,
      pxp: 120,
      conc: {
        nat: {
          cur: 60,
          max: 75
        }
      },
      ts: 1698234567000
    },
    'flux:skill:survival:stealth': {
      xp: 11000,
      pxp: 200,
      conc: {
        nat: {
          cur: 75,
          max: 90
        }
      },
      ts: 1698234567000
    },
    'flux:skill:social:influence': {
      xp: 6000,
      pxp: 80,
      conc: {
        nat: {
          cur: 45,
          max: 60
        }
      },
      ts: 1698234567000
    }
  },

  specializations: {
    primary: {
      'flux:skill:weapon:gun:pistol': 1,
      'flux:skill:survival:stealth': 1,
      'flux:skill:defense:evade': 1
    },
    secondary: {
      'flux:skill:knowledge:tech': 1,
      'flux:skill:craft:tech': 1
    }
  },

  prefs: {
    'flux:pref:ui:combat-auto-target': true,
    'flux:pref:ui:inventory-sort': 'by-type',
    'flux:pref:gameplay:difficulty': 'normal',
    'flux:pref:social:auto-decline-party-invites': false,
    'flux:pref:audio:combat-music': true
  }
};
```

This example demonstrates:

- **Complete Type Coverage**: Every property from the Character type definition
- **Realistic Values**: Stats, skills, and equipment appropriate for a mid-level cyberpunk character
- **Translation URNs**: Proper use of the translation system for names and descriptions
- **Emergent Narrative**: Dynamic description that evolves with gameplay
- **Complex Relationships**: Party membership, faction reputation, equipment slots
- **Progression Systems**: Experience points, skill concentrations, specializations
- **Cyberpunk Setting**: Appropriate items, factions, and augmentations
- **Temporal Data**: Timestamps for inventory updates, effect applications, etc.
- **Modifiers**: Equipment bonuses affecting stats and attributes
- **Fragment-Ready*A skilled ranger from the northern forests, known for her tracking abilities.
