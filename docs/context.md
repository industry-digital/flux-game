
1. Player issues raw text intent:

> `attack goblin`

2. Raw `Intent` enters the Contextualization stage of the pipeline.

3. A handler (many handlers?) converts a raw `Intent` into a `Command`. To do this, it loads whatever data it needs via the DataLoader

```typescript
context.loaderContext.entityLoader.loadEntity(intent.actor, (world, actor) => ({
  ...world,
  actors: {
    ...world.actors,
    [actor.id]: actor,
  },
}));

context.loaderContext.entityLoader.loadEntitiesInPlace(actor.location, (world, place) => ({
  ...world,
  places: {
    ...world.places,
    [place.id]: place,
  },
}));

await context.resolveLoaders();

// Later
const { self, place, actors } = context.world;
const actor = actors[self];
// ...
```
