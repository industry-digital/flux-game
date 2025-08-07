# Template System: TypeScript Function-Based Text Rendering

## Overview

The Template System is a lightweight, [React](https://react.dev)-inspired approach to generating human-readable text content using pure TypeScript functions. Templates are simple, composable functions that transform structured data into formatted strings with exceptional performance and complete type safety.

**Core Principle**: Templates are pure functions that take structured input and return formatted text strings. No parsing, no external dependencies, just fast function calls with full IDE support.

## Table of Contents

1. [Core Architecture](#core-architecture)
2. [Template Function Interface](#template-function-interface)
3. [Template Categories](#template-categories)
4. [Perspective-Aware Rendering](#perspective-aware-rendering)
5. [Template Composition](#template-composition)
6. [Pattern Matching Templates](#pattern-matching-templates)
7. [Performance Characteristics](#performance-characteristics)
8. [Implementation Examples](#implementation-examples)
9. [Testing Patterns](#testing-patterns)
10. [Best Practices](#best-practices)

---

## Core Architecture

### Template Function Type

Every template in the system implements the same simple interface:

```typescript
export type Template<Input = any> = (input: Input) => string;
```

This is the fundamental building block - a pure function that takes any input and returns a string.

### Basic Template Example

```typescript
import { Template } from "~/types/template";
import { ActorSummary } from "~/worldkit/view/actor";

export const renderActorSummary: Template<ActorSummary> = (actor) => {
  return `${actor.name}\n${actor.description}`;
};
```

### Template Organization

Templates are organized by domain functionality:

```
game/src/template/
├── index.ts              # Main exports
├── actor.ts              # Actor-related templates
├── place.ts              # Place description templates
├── movement.ts           # Movement event templates
└── anatomy.ts            # Anatomical part templates
```

---

## Template Function Interface

### Input-Output Pattern

All templates follow the same pattern:
- **Input**: Strongly-typed data structure
- **Output**: Formatted string
- **Behavior**: Pure function (no side effects)

```typescript
export type PlaceTemplateProps = { place: PlaceSummaryLike };
export type PlaceTemplate = Template<PlaceTemplateProps>;

export const renderPlaceDescription: PlaceTemplate = ({ place }) => {
  if (typeof place.description === 'string') {
    return place.description;
  }

  const { base, emergent } = place.description;
  return `${base}\n${emergent}`;
};
```

### Type Safety

Templates leverage TypeScript's type system for compile-time safety:

```typescript
// Input type is enforced
export const renderExits: PlaceTemplate = ({ place }) => {
  // TypeScript knows 'place' has 'exits' property
  return Object.entries(place.exits).map(([direction, exit]) => {
    return `- ${direction}: ${exit.label}`;
  }).join('\n');
};
```

---

## Template Categories

### 1. Entity Description Templates

Templates that render static entity information:

```typescript
// Actor summary rendering
export const renderActorSummary: Template<ActorSummary> = (actor) => {
  return `${actor.name}\n${actor.description}`;
};

// Place summary with composition
export const renderPlaceSummary: PlaceTemplate = (props) => {
  const description = renderPlaceDescription(props);
  const exits = renderExits(props);

  return `${props.place.name}\n${description}\n\n${exits}`;
};
```

### 2. Event Description Templates

Templates that render dynamic events with perspective awareness:

```typescript
export type ActorMovementProps = {
  actor: ActorSummaryLike;
  direction: Direction;
  perspective: keyof WorldEventMessageDictionary;
};

export const renderActorDidDepart: Template<ActorMovementProps> = ({ actor, direction, perspective }) => {
  const subject = perspective === 'actor' ? 'You' : actor.name;
  const verb = perspective === 'actor' ? 'move' : 'moves';
  return `${subject} ${verb} ${direction}.`;
};
```

### 3. Specialized Processing Templates

Templates that handle complex data transformation:

```typescript
export const renderHumanoidAnatomicalPart: Template<Taxonomy.Anatomy> = (urn) => {
  for (const [partName, isBilateral, match] of partMatchers) {
    if (isBilateral) {
      const side = isLeft(urn) ? 'left' : 'right';
      if (match(urn)) {
        return `${side} ${partName}`;
      }
    } else {
      if (match(urn)) {
        return partName;
      }
    }
  }

  return urn; // Fallback to original URN
};
```

---

## Perspective-Aware Rendering

### First vs Third Person Perspective

Many templates support perspective-aware rendering for immersive storytelling:

```typescript
export const renderActorDidArrive: Template<ActorMovementProps> = ({ actor, direction, perspective }) => {
  const subject = perspective === 'actor' ? 'You' : actor.name;
  const verb = perspective === 'actor' ? 'arrive' : 'arrives';

  switch (direction) {
    case Direction.NORTH:
    case Direction.SOUTH:
    case Direction.EAST:
    case Direction.WEST:
      return `${subject} ${verb} from the ${direction}.`;
    case Direction.UP:
      return `${subject} ${verb} from above.`;
    case Direction.DOWN:
      return `${subject} ${verb} from below.`;
    default:
      return `${subject} ${verb}.`;
  }
};
```

### Perspective Types

```typescript
export type WorldEventMessageDictionary = {
  actor: string;    // First person: "You move north."
  observer: string; // Third person: "Alice moves north."
};
```

---

## Template Composition

### Composable Template Design

Templates can be composed to build complex output from simpler components:

```typescript
export const renderPlaceSummary: PlaceTemplate = (props) => {
  // Compose multiple templates
  const description = renderPlaceDescription(props);
  const exits = renderExits(props);

  // Combine with proper formatting
  return `${props.place.name}\n${description}\n\n${exits}`;
};
```

### Conditional Composition

Templates handle different data structures gracefully:

```typescript
export const renderPlaceDescription: PlaceTemplate = ({ place }) => {
  // Handle both string and object descriptions
  if (typeof place.description === 'string') {
    return place.description;
  }

  // Compose emergent narrative
  const { base, emergent } = place.description;
  return `${base}\n${emergent}`;
};
```

---

## Pattern Matching Templates

### Advanced Pattern Processing

Some templates use sophisticated pattern matching for complex data:

```typescript
const createAnatomyMatcher = (subpattern: string) =>
  picomatch(`${ROOT_NAMESPACE}:anatomy:${subpattern}`);

const partMatchers: PartMatcher[] = [
  ['head', false, isHead],
  ['neck', false, isNeck],
  ['ear', true, isEar],    // Bilateral parts
  ['eye', true, isEye],
  // ... more matchers
];

export const renderHumanoidAnatomicalPart: Template<Taxonomy.Anatomy> = (urn) => {
  for (const [partName, isBilateral, match] of partMatchers) {
    if (isBilateral) {
      const side = isLeft(urn) ? 'left' : 'right';
      if (match(urn)) {
        return `${side} ${partName}`;
      }
    } else {
      if (match(urn)) {
        return partName;
      }
    }
  }

  return urn; // Fallback
};
```

---

## Performance Characteristics

### Ultra-Fast Execution

Template functions deliver exceptional performance with **sub-microsecond latency**:

- **No Parsing Overhead**: Direct function calls, no template parsing
- **3M+ renders/second**: Measured performance for complex place descriptions
- **Sub-Microsecond Latency**: 0.3-0.8μs per template render
- **Zero External Dependencies**: Pure TypeScript functions
- **Minimal Memory Footprint**: Stateless functions with no caching needed

### Measured Performance Results

Real-world performance testing of place description templates (V8-optimized):

```
> flux-game@0.1.12 test
> vitest run --run place.spec.ts


 RUN  v3.1.3 /Users/rchoy/var/flux/game

 ✓ src/worldkit/entity/place.spec.ts (18 tests) 6ms
stdout | src/template/place.spec.ts > place templates > performance > should render place summaries at high throughput

🚀 Template Performance Results:
   Iterations: 1,000,000
   Duration: 238.84ms
   Renders/sec: 4,186,979
   Avg render time: 0.239μs


stdout | src/template/place.spec.ts > place templates > performance > should render complex emergent narrative at high throughput

⚡ Complex Template Performance Results:
   Iterations: 50,000
   Duration: 14.51ms
   Renders/sec: 3,446,671
   Avg render time: 0.290μs


stdout | src/template/place.spec.ts > place templates > performance > should measure hot performance after V8 optimization

🔥 V8 Warm-up Phase:
   Warm-up iterations: 10,000
   Warm-up duration: 3.94ms
   Warm-up RPS: 2,540,463

🚀 Hot Performance Measurement:
   Hot iterations: 1,000,000
   Hot duration: 301.19ms
   Hot renders/sec: 3,320,145
   Avg render time: 0.301μs
   V8 optimization gain: +30.7%


 ✓ src/template/place.spec.ts (14 tests) 577ms
   ✓ place templates > performance > should measure hot performance after V8 optimization  306ms
```

## Implementation Examples

### Simple Template Implementation

```typescript
// Basic entity template
export const renderActorSummary: Template<ActorSummary> = (actor) => {
  return `${actor.name}\n${actor.description}`;
};
```

### Complex Template with Logic

```typescript
// Multi-format place description
export const renderPlaceDescription: PlaceTemplate = ({ place }) => {
  if (typeof place.description === 'string') {
    return place.description;
  }

  const { base, emergent } = place.description;
  return emergent ? `${base}\n${emergent}` : base;
};
```

### Template with External Dependencies

```typescript
// Pattern matching with picomatch
export const renderHumanoidAnatomicalPart: Template<Taxonomy.Anatomy> = (urn) => {
  // Use external library for pattern matching
  for (const [partName, isBilateral, match] of partMatchers) {
    if (match(urn)) {
      const side = isBilateral && isLeft(urn) ? 'left' : 'right';
      return isBilateral ? `${side} ${partName}` : partName;
    }
  }

  return urn;
};
```

---

## Testing Patterns

### Unit Testing Templates

Templates are pure functions, making them ideal for unit testing:

```typescript
describe('place templates', () => {
  describe('renderPlaceSummary', () => {
    it('should render a basic place with string description and no exits', () => {
      const place = createPlace({
        id: 'flux:place:test:empty-room',
        name: 'Empty Room',
        description: 'A simple empty room.',
        exits: [],
      });

      const result = renderPlaceSummary({ place });

      expect(result).toBe('Empty Room\nA simple empty room.\n\n');
    });

    it('should render a place with emergent narrative description', () => {
      const place: Place = {
        ...createPlace({
          id: 'flux:place:test:mysterious-chamber',
          name: 'Mysterious Chamber',
          description: 'An ancient stone chamber.',
          exits: [],
        }),
        description: {
          base: 'An ancient stone chamber.',
          emergent: 'Strange runes glow faintly on the walls.',
        },
      };

      const result = renderPlaceSummary({ place });

      expect(result).toBe('Mysterious Chamber\nAn ancient stone chamber.\nStrange runes glow faintly on the walls.\n\n');
    });
  });
});
```

### Testing Edge Cases

```typescript
it('should handle place with empty exits object', () => {
  const place = createPlace({
    id: 'flux:place:test:isolated-room',
    name: 'Isolated Room',
    description: 'A room with no way out.',
    exits: [],
  });

  const result = renderPlaceSummary({ place });

  expect(result).toBe('Isolated Room\nA room with no way out.\n\n');
});
```

---

## Best Practices

### 1. Keep Templates Pure

Templates should have no side effects:

```typescript
// ✅ Good - pure function
export const renderActorSummary: Template<ActorSummary> = (actor) => {
  return `${actor.name}\n${actor.description}`;
};

// ❌ Bad - side effects
export const renderActorSummary: Template<ActorSummary> = (actor) => {
  console.log('Rendering actor:', actor.name); // Side effect!
  return `${actor.name}\n${actor.description}`;
};
```

### 2. Use Strong Typing

Leverage TypeScript for compile-time safety:

```typescript
// ✅ Good - strongly typed
export type PlaceTemplateProps = { place: PlaceSummaryLike };
export const renderPlaceDescription: Template<PlaceTemplateProps> = ({ place }) => {
  // TypeScript enforces correct property access
  return place.description;
};

// ❌ Bad - loosely typed
export const renderPlaceDescription: Template<any> = (input) => {
  return input.place.description; // No type safety
};
```

### 3. Handle Edge Cases Gracefully

Templates should handle unexpected input gracefully:

```typescript
export const renderExits: PlaceTemplate = ({ place }) => {
  // Handle empty exits
  const exitEntries = Object.entries(place.exits || {});

  if (exitEntries.length === 0) {
    return ''; // Graceful empty case
  }

  return exitEntries.map(([direction, exit]) => {
    return `- ${direction}: ${exit.label}`;
  }).join('\n');
};
```

### 4. Compose Templates for Complexity

Build complex templates from simpler ones:

```typescript
export const renderPlaceSummary: PlaceTemplate = (props) => {
  const name = props.place.name;
  const description = renderPlaceDescription(props);
  const exits = renderExits(props);

  // Compose with proper formatting
  return [name, description, '', exits]
    .filter(Boolean)
    .join('\n');
};
```

### 5. Use Descriptive Names

Template names should clearly indicate their purpose:

```typescript
// ✅ Good - descriptive names
export const renderActorSummary: Template<ActorSummary> = ...
export const renderPlaceDescription: Template<PlaceTemplateProps> = ...
export const renderHumanoidAnatomicalPart: Template<Taxonomy.Anatomy> = ...

// ❌ Bad - generic names
export const actorTemplate: Template<ActorSummary> = ...
export const placeTemplate: Template<PlaceTemplateProps> = ...
export const process: Template<Taxonomy.Anatomy> = ...
```

---

## Integration Patterns

### Export Organization

Templates are organized and exported systematically:

```typescript
// Movement templates
export type { ActorMovementProps } from './movement';
export { renderActorDidDepart, renderActorDidArrive } from './movement';

// Place templates
export type { PlaceTemplateProps, PlaceTemplate } from './place';
export { renderExits, renderPlaceDescription, renderPlaceSummary } from './place';

// Actor templates
export { renderActorSummary } from './actor';

// Anatomy templates
export { renderHumanoidAnatomicalPart } from './anatomy';
```
