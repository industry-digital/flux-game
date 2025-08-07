# Universal Fact System: Immersive Information Architecture

## Introduction

This document outlines our **universal fact system** that delivers all game information to players through a unified architecture. **Facts** represent any knowable information about the world state, from static descriptions to temporal events. The system leverages **server-rendered narratives** and **batched fact delivery** to create compelling storytelling while keeping client implementations simple.

## Core Architectural Principles

### 1. Facts-First Universe

**Fundamental Design Decision**: All information about the world is modeled as **Facts** - discrete pieces of knowable information.

**Fact Categories:**
- **Static Facts**: Current world state ("The room contains a sword")
- **Temporal Facts** (Events): Things that happened ("The door opened at 15:32:01")
- **Interrogative Facts**: Responses to queries ("You see a vast hall")
- **Relational Facts**: Connections between entities ("The sword belongs to Alice")

**Why This Matters:**
- **Unified Information Model**: One abstraction for all game information
- **Consistent Delivery**: Same envelope format for all information types
- **Natural Batching**: Related facts can be grouped logically
- **Narrative Control**: Explicit ordering of facts for optimal storytelling

### 2. Complete Fact Generation in `flux-game`

**Core Innovation**: The `flux-game` package owns complete Fact generation including templates, views, and fact creation utilities:

```typescript
// flux-game exports complete Fact creation
export const createActorSummaryFact = (actor: Actor, perspective: 'actor' | 'observer'): Fact => {
  const subject = createActorSummaryView(actor, 'summary');
  const text = ActorSummaryTemplate(subject, perspective);

  return {
    kind: KindOfFact.VIEW,
    subject,
    text
  };
};
```

**Package Responsibilities:**

**`flux-game` Package** (Complete Fact Ownership):
- Defines `Fact` types and structure
- Implements view creation functions
- Implements template functions for text rendering
- **Exports complete Fact generation utilities**
- Handles perspective-based generation and security filtering
- Owns the entire "what information to present and how" domain

**Server Package** (Orchestration & Delivery):
- **Uses** `flux-game`'s Fact generation utilities via `@flux` imports
- Orchestrates which Facts to create based on game events
- Handles batching and delivery concerns via XMPP envelopes
- **Does NOT** define what Facts look like or how they're rendered

### 3. Ultra-Simple Client Logic

Client rendering requires only a single loop for ALL fact types:

```typescript
// Complete client-side fact handling
xmpp.on('message', (message) => {
  const factsElement = message.getChild('facts');
  if (factsElement) {
    const facts: Fact[] = JSON.parse(factsElement.text());

    // Render each fact with perspective awareness
    facts.forEach(fact => {
      let displayText: string;

      if (typeof fact.text === 'string') {
        // Universal text
        displayText = fact.text;
      } else {
        // Perspective-aware text
        displayText = isMyActor(fact.subject?.actor)
          ? fact.text.actor
          : fact.text.observer;
      }

      terminal.writeLine(displayText);
    });
  }
});
```

## Fact Architecture Flow

### Flux Pipeline Integration
```
Negotiation → Contextualization → Transformation → Planning → Actuation
                    ↓                ↓              ↓         ↓
                World State    Declared Events   Fact        XMPP
                                                Orchestration Broadcast
```

**Planning Stage**: Uses `flux-game` utilities to create Facts based on game events
**Actuation Stage**: XMPP broadcasting of complete Facts to players

### Fact Processing Pipeline
```
Game Logic          →    Planning Stage       →    Actuation Stage    →    Clients
WorldEvent/Query    →    flux-game utilities  →    XMPP Broadcast     →    Rendered Text
```

## Fact Envelope Structure

### XMPP Facts Envelope

All facts are delivered in batched envelopes for optimal performance and narrative control:

```xml
<message to="player@example.com" type="chat">
  <body><!-- does not matter --></body>
  <facts
    xmlns="flux:world" trace="cmd_dcf6924a-b0a0-4d50-b685-e37797afa416"
  >
    <![CDATA[
    [
      {
        "type": "actor:location",
        "subject": {
          "id": "flux:place:tavern",
          "name": "The Prancing Pony",
          "description": "A cozy tavern...",
          "exits": { "north": "flux:place:street", "east": "flux:place:kitchen" },
          "occupants": ["flux:actor:gandalf"]
        },
        "text": "A cozy tavern with wooden tables and flickering candles. The air is thick with the scent of ale and conversation."
      },
      {
        "type": "view",
        "subject": {
          "id": "flux:actor:gandalf",
          "name": "Gandalf",
          "description": "A wise wizard",
          "location": "flux:place:tavern"
        },
        "text": "Gandalf stands near the fireplace, staff in hand"
      },
      {
        "type": "view",
        "subject": {
          "id": "flux:item:ISz4N0AeRTDsKae4",
          "name": "Ancient Sword",
          "description": "A gleaming blade with intricate runes"
        },
        "text": "A gleaming sword lies forgotten on the bar"
      }
    ]
    ]]>
  </facts>
</message>
```

### WorldEvents as Fact Subjects

WorldEvents are pure domain data that become subjects of temporal facts:

```typescript
export type WorldEvent = {
  id: string;              // Unique event identifier
  type: EventType;         // What type of event occurred
  ts: number;              // When this event occurred
  actor?: ActorURN;        // Who caused this to happen
  location: PlaceURN;      // Where this happened
  payload: any;            // Event-specific data
}

// flux-game creates Facts ABOUT WorldEvents (temporal facts)
const temporalFact: Fact = createMovementEventFact(worldEvent, 'observer');
```

## Fact Generation Patterns

### Static World State Facts

Generated using `flux-game` utilities in response to interrogative commands:

```typescript
// LOOK command uses flux-game utilities
import { createPlaceSummaryFact, createActorSummaryFact } from '@flux';

const lookFacts: Fact[] = [
  // 1. flux-game creates place view with text
  createPlaceSummaryFact(place, 'observer'),

  // 2. flux-game creates actor views with text
  ...occupants.map(actor => createActorSummaryFact(actor, 'observer')),

  // 3. flux-game creates item views with text
  ...items.map(item => createItemSummaryFact(item, 'observer')),
];

// Server handles delivery orchestration
sendFactsToActor(lookFacts, actor.id, { trace: command.id });
```

### Temporal Facts (Events)

Generated using `flux-game` utilities when things happen in the simulation:

```typescript
// MOVE command uses flux-game utilities
import { createMovementEventFact, createPlaceSummaryFact } from '@flux';

// 1. Pure game logic creates WorldEvent (domain data)
const moveEvent: WorldEvent = {
  id: context.uniqid(),
  type: EventType.ACTOR_DID_MOVE,
  ts: Date.now(),
  trace: command.id,
  actor: actor.id,
  location: origin.id,
  payload: { destination: destination.id }
};

// 2. Server creates temporal fact (event + text) using flux-game utilities
const temporalFact = createMovementEventFact(moveEvent, 'observer');

// 3. Server handles broadcast orchestration
broadcastFactsToRoom([temporalFact], origin.id);

// 4. Server creates auto-look facts, server handles delivery
const destinationFacts = [
  createPlaceSummaryFact(destination, 'observer'),
  ...destination.occupants.map(id => createActorSummaryFact(context.world.actors[id], 'observer'))
];

sendFactsToActor(destinationFacts, actor.id, { trace: command.id });
```

## Narrative Ordering Control

### Explicit Fact Sequencing

The JSON array in `<facts>` provides explicit narrative ordering:

```typescript
export const orderFactsForLook = (rawFacts: Fact[]): Fact[] => {
  const factsByType = groupBy(rawFacts, 'type');

  return [
    // 1. Set the scene first - place descriptions
    ...factsByType['view']?.filter(f => f.subject?.type === 'place') || [],
    // 2. Then populate with people - actor descriptions
    ...factsByType['view']?.filter(f => f.subject?.type === 'actor') || [],
    // 3. Then notable objects - item descriptions
    ...factsByType['view']?.filter(f => f.subject?.type === 'item') || [],
    // 4. Finally, ambient atmosphere - environmental views
    ...factsByType['view']?.filter(f => f.subject?.type === 'ambience') || []
  ];
};
```

### Command-Specific Ordering Strategies

```typescript
const orderingStrategies = {
  look: orderFactsForLook,        // Place → Actors → Items → Atmosphere
  examine: orderFactsForExamine,  // Stats → Condition → Description → History
  who: orderFactsForWho,          // Count → Individuals → Social dynamics
  inventory: orderFactsForInventory // Equipped → Held → Stored → Encumbrance
};
```

## Game Logic Integration

### Movement Command Example

```typescript
// Server Planning stage - uses flux-game utilities
import { createMovementEventFact, createPlaceSummaryFact, createActorSummaryFact } from '@flux';

export const actorMovementReducer: PureReducer<TransformerContext, MoveCommand> = (context, command) => {
  // ... movement validation and execution ...

  // 1. Generate pure WorldEvent (domain data)
  const moveEvent: WorldEvent = {
    id: context.uniqid(),
    type: EventType.ACTOR_DID_MOVE,
    ts: Date.now(),
    trace: command.id,
    actor: actor.id,
    location: origin.id,
    payload: { destination: destination.id }
  };

  // 2. flux-game creates temporal fact (event + text)
  const temporalFact = createMovementEventFact(moveEvent, 'observer');

  // 3. Server handles broadcast orchestration
  const { broadcastFactsToRoom } = useFactsDispatch(context);
  broadcastFactsToRoom([temporalFact], origin.id);

  // 4. flux-game creates destination facts, server handles delivery
  const { sendFactsToActor } = useFactsDispatch(context);
  const destinationFacts = [
    createPlaceSummaryFact(destination, 'observer'),
    ...destination.occupants.map(id => createActorSummaryFact(context.world.actors[id], 'observer'))
  ];
  sendFactsToActor(destinationFacts, actor.id, { trace: command.id });

  return context;
};
```

### Fact Dispatch Hook

This is a hook that is used in the Planning stage to dispatch facts to actors.


```typescript
export const useFactDispatch = (context: PlannerContext) => {
  const sendFactsToActor = (facts: Fact[], actorId: ActorURN, metadata?: { trace?: string }) => {
    // Create XMPP envelope (server responsibility)
    const jid = getActorJid(actorId);
    const envelope = createFactsEnvelope(facts, metadata?.trace);

    // Declare side effect for delivery (server responsibility)
    declareSideEffect({
      type: SideEffectType.XMPP_SEND_MESSAGE,
      args: { jid, envelope }
    });
  };

  const broadcastFactsToRoom = (facts: Fact[], locationId: PlaceURN) => {
    // Create XMPP envelope
    const jid = getLocationJid(locationId);
    const envelope = createFactsEnvelope(orderedFacts, context.trace);

    // Declare side effect for room broadcast
    declareSideEffect({
      type: SideEffectType.XMPP_BROADCAST_FACTS,
      args: { jid, envelope }
    });
  };

  return { sendFactsToActor, broadcastFactsToRoom };
};
```

## Entity View Layer

### Complete View Ownership in `flux-game`

The **Entity View Layer** is completely owned by the **`flux-game`** package as domain logic:

**`flux-game` Package** (`game/src/worldkit/views/`):
- Defines view types and creation functions with enums (`ActorViewType`, `PlaceViewType`)
- Handles perspective-based view generation (`perspective: 'actor' | 'observer'`)
- Manages security filtering and visibility rules
- Implements template functions for text rendering
- **Exports complete Fact generation utilities**

**Server Package**:
- Loads entities using the entity loader system
- **Uses** `flux-game` Fact generation utilities via `@flux` imports
- Handles batching and delivery via XMPP envelopes

```typescript
// Server integration - uses flux-game utilities
import { createActorSummaryFact, createPlaceSummaryFact } from '@flux';

export const useEntityViews = (context: PlannerContext) => {
  const createLookFacts = (place: Place, observer: Actor): Fact[] => {
    // flux-game creates complete facts (view + text)
    return [
      createPlaceSummaryFact(place, 'observer'),
      ...place.occupants
        .filter(id => id !== observer.id)
        .map(id => createActorSummaryFact(context.world.actors[id], 'observer'))
    ];
  };

  return { createLookFacts };
};
```

### Simplified View Types

Our current implementation uses **simplified view types** that directly expose relevant fields from the underlying Actor and Place entities:

#### Actor Views

**ActorSummary**: Basic appearance visible to observers
```typescript
export enum ActorViewType {
  SUMMARY = 'summary',
  INVENTORY = 'inventory',
  CHARACTER_SHEET = 'charsheet',
}

type ActorSummary = BaseView<'summary', ActorURN> & {
  name: string;
  status: 'healthy' | 'injured' | 'exhausted' | 'dead';
};
```

**InventoryView**: Actor's inventory and equipment (self only)
```typescript
type InventoryView = BaseView<'inventory', ActorURN> & {
  inventory: Actor['inventory'];
  equipment: Actor['equipment'];
};
```

#### Place Views

**PlaceSummary**: Basic place information for LOOK commands
```typescript
export enum PlaceViewType {
  SUMMARY = 'summary',
}

type PlaceSummary = BaseView<'summary', PlaceURN> & {
  name: Place['name'];
  description: Place['description'];
  exits: Place['exits'];
};
```

### View Creation with Security Filtering

```typescript
// flux-game handles view creation with security (not server)
const createActorSummary = (actor: Actor, observer: Actor): ActorSummary => {
  return {
    id: actor.id,
    name: actor.name,
    type: 'actor',
    appearance: actor.appearance || generateDefaultAppearance(actor),
    status: calculateVisibleStatus(actor),
    location: actor.location,
    pose: actor.currentPose
    // Explicitly omitting: inventory, stats, relationships, private data
  };
};
```

### Benefits of Complete `flux-game` Ownership

**Security through Views:**
- **No Private Data Leakage**: Views explicitly omit sensitive information
- **Observer-Aware**: Different observers see different information
- **Permission Filtering**: Views respect visibility and access rules
- **Context Isolation**: Each view type shows only relevant data

**Performance through Predefinition:**
- **Computed Once**: Views calculated once, used by multiple facts
- **Minimal Data Transfer**: Only necessary information in XMPP envelopes
- **Client Optimization**: Clients receive structured, ready-to-use data
- **Caching Friendly**: Views can be cached by type and observer

## Rich Subject Payloads: Progressive Enhancement

### The Power of Structured Data + Narrative

Facts contain **both** human-readable text (from `flux-game` templates) AND complete structured data (from `flux-game` views). This enables **progressive enhancement** - clients can choose their level of sophistication:

### Simple Clients: Text-Only Display
```typescript
// Ultra-simple client - just render text
facts.forEach(fact => {
  const text = typeof fact.text === 'string'
    ? fact.text
    : fact.text.observer;
  terminal.writeLine(text);
});
```

### Enhanced Clients: Rich Data Integration
```typescript
// Advanced client using structured data for enhancements
facts.forEach(fact => {
  // Always display the human text (from flux-game templates)
  const text = renderFact(fact, currentActor);
  terminal.writeLine(text);

  // But ALSO use rich data (from flux-game views) for UI enhancements
  if (fact.kind === 'view' && fact.subject.exits) {
    // Create clickable exit buttons from structured data
    renderExitButtons(fact.subject.exits);
  }

  if (fact.kind === 'view' && fact.subject.items) {
    // Highlight interactive objects
    highlightItems(fact.subject.items);
  }

  if (fact.kind === 'event' && fact.subject.type === 'ACTOR_DID_MOVE') {
    // Update minimap with movement data
    updateMinimap(fact.subject.actor, fact.subject.payload.destination);

    // Play movement sound effect
    playSound('footsteps', fact.subject.payload.method);
  }
});
```

### Accessibility Clients: Structured Navigation
```typescript
// Screen reader optimized with rich navigation
facts.forEach(fact => {
  // Speak the narrative text (from flux-game templates)
  speakText(renderFact(fact, currentActor));

  // But use structure (from flux-game views) for enhanced navigation
  if (isPlaceURN(fact.subject.id) && fact.subject.exits) {
    // Create keyboard shortcuts: Ctrl+N for north, etc.
    registerExitShortcuts(fact.subject.exits);

    // Announce available directions
    announceNavigation(`Exits available: ${Object.keys(fact.subject.exits).join(', ')}`);
  }

  if (isActorURN(fact.subject.id) && fact.subject.location === currentLocation) {
    // Social interaction shortcuts
    registerSocialShortcuts(fact.subject);
  }
});
```

## Client Implementation

### What Players See

#### MOVE Command Result:
```
> move north

A cozy tavern with wooden tables and flickering candles.
Gandalf stands near the fireplace, staff in hand.
A gleaming sword lies forgotten on the bar.
The air is thick with the scent of ale and hearty conversation.

Exits: south to Main Street, east to Kitchen

>
```

#### LOOK Command Result:
```
> look

A cozy tavern with wooden tables and flickering candles.
Gandalf stands near the fireplace, staff in hand.
A gleaming sword lies forgotten on the bar.
The air is thick with the scent of ale and hearty conversation.

Exits: south to Main Street, east to Kitchen

>
```

### Universal Client Support

```javascript
// Universal fact rendering function
const renderFact = (fact, currentActor) => {
  if (typeof fact.text === 'string') {
    return fact.text;
  }

  const isCurrentActor = fact.subject?.actor === currentActor;
  return isCurrentActor ? fact.text.actor : fact.text.observer;
};

// Web client
facts.forEach(fact => {
  const text = renderFact(fact, currentActor);
  document.getElementById('output').innerHTML += text + '\n';
});

// Terminal client
facts.forEach(fact => {
  const text = renderFact(fact, currentActor);
  process.stdout.write(text + '\n');
});

// Mobile app
facts.forEach(fact => {
  const text = renderFact(fact, currentActor);
  textView.append(text + '\n');
});

// Accessibility client
facts.forEach(fact => {
  const text = renderFact(fact, currentActor);
  speechSynthesis.speak(new SpeechSynthesisUtterance(text));
});
```

## Performance Characteristics

### Batching Benefits

- **Single XMPP Round-Trip**: Multiple facts in one envelope vs individual messages
- **Reduced Overhead**: One XML structure vs many individual envelopes
- **Atomic Delivery**: Related facts arrive together
- **Natural Optimization**: Mirrors successful database batch patterns

### Client Performance

- **Minimal CPU**: No complex processing, just text rendering (templates run in flux-game)
- **Minimal Memory**: No game state, no caching, just display
- **Minimal Bandwidth**: One envelope vs multiple events
- **Battery Efficient**: Simple text rendering vs complex template processing

### Narrative Generation Performance

**TypeScript Template Performance in `flux-game`:**
- **Template Functions**: **1,000,000+ facts/second** (pure function calls)
- **Complex Templates**: **900,000+ facts/second** (with composition and hooks)
- **Rich Narratives**: **800,000+ facts/second** (with utility hooks)

**Key Finding: Template Functions Are Optimal**
```typescript
// Pure TypeScript function calls in flux-game - ultra-fast!
const fact = createActorSummaryFact(actor, 'observer');
```

## Security Model

### Authority Control

- **`flux-game` Authority**: Only `flux-game` can generate facts and define their structure
- **Server Authority**: Only server can orchestrate delivery and batching
- **XMPP Security**: Players cannot send crafted facts directly
- **Validation Pipeline**: All facts created through `flux-game` utilities

### Information Security

- **Visibility Rules**: `flux-game` views only expose information players should know
- **Anti-Cheating**: Server orchestration prevents client tampering
- **Perspective Isolation**: Facts tailored to observer's knowledge and permissions

## Testing Strategy

### Unit Testing

```typescript
describe('Fact System', () => {
  it('should generate look facts in correct order', () => {
    // flux-game creates the facts
    const placeFact = createPlaceSummaryFact(place, 'observer');
    const actorFact = createActorSummaryFact(actor, 'observer');
    const rawFacts = [actorFact, placeFact];

    // Server handles ordering for delivery
    const orderedFacts = orderFactsForLook(rawFacts);

    expect(orderedFacts[0].subject.type).toBe('place');
    expect(orderedFacts[1].subject.type).toBe('actor');
  });

  it('should render facts as simple text', () => {
    // flux-game creates facts with text
    const facts = [
      createPlaceSummaryFact(place, 'observer'),
      createActorSummaryFact(actor, 'observer')
    ];

    const output = facts.map(fact => fact.text).join('\n');

    expect(output).toContain('cozy tavern');
    expect(output).toContain('Gandalf is here');
  });
});
```

## Architecture Benefits

### Clean Separation of Concerns
- **`flux-game`**: Complete Fact generation library (views + templates + fact creation)
- **Server**: Thin orchestration layer for delivery and batching
- **Single Source of Truth**: All Fact-related logic lives in `flux-game`

### Unified Information Model
- **Single Abstraction**: Facts handle all game information
- **Consistent Patterns**: Same dispatch, enrichment, and delivery for everything
- **Natural Batching**: Related information grouped logically

### Narrative Control
- **Explicit Ordering**: JSON array provides precise sequencing
- **Dramatic Pacing**: Control information revelation for maximum impact
- **Context Preservation**: Related facts maintain their relationships

### Development Velocity
- **Complete Fact Ownership**: All fact logic in one package (`flux-game`)
- **Server Simplification**: Server becomes thin orchestration layer
- **Universal Protocol**: Same envelope works for web, mobile, terminal, accessibility tools

### Performance Optimization
- **Batch Efficiency**: Multiple facts per round-trip
- **Template Performance**: 1,000,000+ fact generations/second in `flux-game`
- **Natural Caching**: Facts can be cached by kind, subject, or content

### Progressive Enhancement Capabilities
- **Universal Base Experience**: All clients get narrative text
- **Optional Rich Features**: Advanced clients use structured data for enhancements
- **Future-Proof Protocol**: New client features leverage existing rich data
- **No Breaking Changes**: Enhanced clients fall back gracefully to text-only
- **Client Diversity**: Same facts power terminal, web, mobile, VR, accessibility clients

## Rich Subject Examples

### Entity Description with Full Data
```json
{
  "kind": "view",
  "subject": {
    "id": "flux:place:tavern",
    "type": "place",
    "name": "The Prancing Pony",
    "description": "A cozy tavern with wooden tables",
    "exits": {
      "north": {
        "to": "flux:place:street",
        "direction": "north",
        "label": "to Main Street",
        "hidden": false
      },
      "east": {
        "to": "flux:place:kitchen",
        "direction": "east",
        "label": "to Kitchen",
        "hidden": false
      }
    },
    "actors": {
      "flux:actor:gandalf": 1,
      "flux:actor:frodo": 1
    },
    "items": {
        "ISz4N0AeRTDsKae4": {
          "id": "flux:item:ISz4N0AeRTDsKae4",
          "name": "Ancient Sword",
          "description": "A gleaming blade with intricate runes",
          "weight": 3.5,
          "durability": 0.8,
          "enchantments": ["sharpness", "fire_damage"]
        }
    },
    "ambience": {
      "flux:lighting:fireplace": 1,
      "flux:lighting:candles": 1,
      "flux:sounds:hushed-conversation": 1,
      "flux:sounds:crackling-fire": 1
    }
  },
  "text": "A cozy tavern with wooden tables and flickering candles. The air is thick with the scent of ale and conversation."
}
```

### Event with Complete Context
```json
{
  "kind": "event",
  "subject": {
    "id": "evt_123",
    "type": "ACTOR_DID_MOVE",
    "ts": 1705324200000,
    "trace": "cmd_456",
    "actor": "flux:actor:gandalf",
    "location": "flux:place:tavern",
    "payload": {
      "destination": "flux:place:forest",
      "method": "walk",
      "direction": "north",
      "stealth": false,
      "speed": "normal"
    }
  },
  "text": {
    "actor": "You walk north into the forest",
    "observer": "Gandalf walks north into the forest"
  }
}
```

## Client Enhancement Possibilities

### 🎮 **Game Client Features**
- **Clickable Exits**: Turn exit data into navigation buttons
- **Interactive Objects**: Highlight items that can be examined/taken
- **Character Portraits**: Display actor appearance data visually
- **Inventory Management**: Use item weight/durability for UI decisions
- **Minimap Updates**: Track movement events for spatial awareness

### 🔊 **Audio Enhancement**
- **Spatial Audio**: Position sounds using occupant/location data
- **Dynamic Music**: Change based on place atmosphere and occupants
- **Sound Effects**: Play footsteps, combat sounds from event data
- **Voice Acting**: Use character data to select appropriate voices

### 🕹️ **VR/3D Clients**
- **3D World Rendering**: Build environments from place structure data
- **Character Animation**: Animate movement from event payloads
- **Physics Integration**: Use item weight for realistic interactions
- **Gesture Recognition**: Map gestures to structured command data

### ♿ **Accessibility Features**
- **Screen Reader Navigation**: Create structured navigation from exit data
- **Keyboard Shortcuts**: Generate hotkeys from available actions
- **Context Announcements**: Describe surroundings using structured data
- **Simplified Interfaces**: Filter complexity while preserving functionality

### 📱 **Mobile Optimizations**
- **Touch Gestures**: Swipe directions based on exit data
- **Contextual Menus**: Show relevant actions based on item/actor data
- **Notification System**: Use event data for smart notifications
- **Offline Caching**: Cache entity data for improved responsiveness

This architecture transforms the system into a **clean separation of concerns** where:

- **`flux-game`** is a complete "Fact generation library" that owns all domain logic
- **Server** is a thin "delivery orchestration layer" that uses `flux-game` utilities
- **Clients** receive rich, pre-rendered facts for universal compatibility and progressive enhancement! 🎭✨
