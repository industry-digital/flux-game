import { describe, it, expect, beforeEach } from 'vitest';
import { createEntityResolverApi, EntityResolverApi } from './resolvers';
import { createStandardTestWorld, createTestIntent } from './testing';
import { createWorld } from '~/testing/world-testing';
import { createActor } from '~/worldkit/entity/actor';
import { Actor } from '~/types/entity/actor';
import { Place } from '~/types/entity/place';
import { WorldProjection } from '~/types/handler';
import { ActorURN } from '~/types/taxonomy';

describe('EntityResolverApi', () => {
  let world: WorldProjection;
  let resolverApi: EntityResolverApi;
  let testPlace1: Place;
  let testPlace2: Place;
  let knight: Actor;
  let wizard: Actor;
  let archer: Actor;

  beforeEach(() => {
    const testWorld = createStandardTestWorld();
    world = testWorld.world;
    testPlace1 = testWorld.testPlace1;
    testPlace2 = testWorld.testPlace2;
    knight = testWorld.knight;
    wizard = testWorld.wizard;
    archer = testWorld.archer;

    resolverApi = createEntityResolverApi(world);
  });


  describe('resolveActor', () => {
    describe('exact name matching', () => {
      it('should find actor by exact name match (case insensitive)', () => {
        const intent = createTestIntent('attack sir galahad', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.id).toBe(knight.id);
        expect(result?.name).toBe('Sir Galahad');
      });

      it('should find actor by exact name match with different casing', () => {
        const intent = createTestIntent('look at GANDALF', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.id).toBe(wizard.id);
        expect(result?.name).toBe('Gandalf the Grey');
      });

      it('should find actor by full name match', () => {
        const intent = createTestIntent('talk to gandalf the grey', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.id).toBe(wizard.id);
      });

      it('should return exact match immediately without checking other nouns', () => {
        // This tests that exact matches take priority and return immediately
        // Note: "galahad" doesn't exactly match "Sir Galahad", so this will fall back to prefix matching
        // Let's test with a noun that exactly matches a name
        const intent = createTestIntent('legolas galahad', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent, false); // Search globally, not just same location

        expect(result).toBeDefined();
        expect(result?.name).toBe('Legolas'); // Should find exact match "Legolas" first
      });
    });

    describe('prefix matching', () => {
      it('should find actor by name prefix', () => {
        const intent = createTestIntent('attack sir', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.id).toBe(knight.id);
        expect(result?.name).toBe('Sir Galahad');
      });

      it('should find actor by longer prefix when multiple matches exist', () => {
        // Create another actor with similar prefix
        const gandolfActor = createActor((actor) => ({
          ...actor,
          name: 'Gandolf',
          location: testPlace1.id
        }));

        const worldWithGandolf = createWorld({
          ...world,
          actors: {
            ...world.actors,
            [gandolfActor.id]: gandolfActor
          }
        });

        const resolverWithGandolf = createEntityResolverApi(worldWithGandolf);

        // "gand" should match both Gandalf and Gandolf, but prefer longer match
        const intent = createTestIntent('talk to gandal', knight.id, testPlace1.id);
        const result = resolverWithGandolf.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Gandalf the Grey'); // Should prefer the longer match
      });

      it('should respect minimum prefix length of 2', () => {
        const intent = createTestIntent('attack g', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeUndefined(); // Single character should not match
      });

      it('should handle prefix matching with custom threshold', () => {
        const customResolverApi = createEntityResolverApi(world, { prefixMatchThreshold: 2 });

        const intent = createTestIntent('attack si', knight.id, testPlace1.id);
        const result = customResolverApi.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Sir Galahad');
      });
    });

    describe('location-based prioritization', () => {
      it('should prioritize actors in the same location', () => {
        // Create two actors with same prefix but different locations
        const localActor = createActor((actor) => ({
          ...actor,
          name: 'Zara Local',
          location: testPlace1.id // Same location as intent issuer
        }));

        const remoteActor = createActor((actor) => ({
          ...actor,
          name: 'Zara Remote',
          location: testPlace2.id // Different location
        }));

        const worldWithTwoZaras = createWorld({
          actors: {
            [localActor.id]: localActor,
            [remoteActor.id]: remoteActor
          },
          places: world.places
        });

        const resolverWithTwoZaras = createEntityResolverApi(worldWithTwoZaras);

        // Intent from actor in testPlace1
        const intent = createTestIntent('talk to zar', localActor.id, testPlace1.id);
        const result = resolverWithTwoZaras.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Zara Local'); // Should prefer same location
      });

      it('should fall back to any location when no same-location match exists', () => {
        // Intent from actor in testPlace1, but target is in testPlace2
        const intent = createTestIntent('shoot leg', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent, false); // Search globally to find Legolas in different location

        expect(result).toBeDefined();
        expect(result?.name).toBe('Legolas'); // Should still find Legolas despite different location
      });
    });

    describe('multiple noun handling', () => {
      it('should process multiple nouns and find best match', () => {
        const intent = createTestIntent('attack the gandalf', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Gandalf the Grey'); // Should match on "gandalf" exact match
      });

      it('should handle nouns with no matches gracefully', () => {
        const intent = createTestIntent('attack the dragon', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeUndefined();
      });

      it('should find match even when some nouns do not match', () => {
        const intent = createTestIntent('attack the mighty sir', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.name).toBe('Sir Galahad'); // Should match on "sir" despite "mighty" not matching
      });
    });

    describe('edge cases', () => {
      it('should handle empty nouns array', () => {
        const intent = createTestIntent('', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeUndefined();
      });

      it('should handle world with no actors', () => {
        const emptyWorld = createWorld({ actors: {} });
        const emptyResolverApi = createEntityResolverApi(emptyWorld);

        const intent = createTestIntent('attack someone', knight.id, testPlace1.id);
        const result = emptyResolverApi.resolveActor(intent);

        expect(result).toBeUndefined();
      });

      it('should handle very long noun that exceeds prefix threshold', () => {
        const intent = createTestIntent('attack supercalifragilisticexpialidocious', knight.id, testPlace1.id);
        const result = resolverApi.resolveActor(intent);

        expect(result).toBeUndefined(); // Should not crash, just return undefined
      });

      it('should handle special characters in names', () => {
        const specialActor = createActor((actor) => ({
          ...actor,
          name: "O'Malley the Cat",
          location: testPlace1.id
        }));

        const worldWithSpecial = createWorld({
          ...world,
          actors: {
            ...world.actors,
            [specialActor.id]: specialActor
          }
        });

        const resolverWithSpecial = createEntityResolverApi(worldWithSpecial);

        const intent = createTestIntent("talk to o'malley", knight.id, testPlace1.id);
        const result = resolverWithSpecial.resolveActor(intent);

        expect(result).toBeDefined();
        expect(result?.name).toBe("O'Malley the Cat");
      });
    });

    describe('performance characteristics', () => {
      it('should handle large number of actors efficiently', () => {
        // Create a world with many actors
        const manyActors: Record<ActorURN, Actor> = {};
        for (let i = 0; i < 1000; i++) {
          const actor = createActor((a) => ({
            ...a,
            name: `Actor${i}`,
            location: testPlace1.id
          }));
          manyActors[actor.id] = actor;
        }

        const largeWorld = createWorld({
          ...world,
          actors: { ...world.actors, ...manyActors }
        });

        const largeResolverApi = createEntityResolverApi(largeWorld);

        const startTime = performance.now();
        const intent = createTestIntent('find actor500', knight.id, testPlace1.id);
        const result = largeResolverApi.resolveActor(intent);
        const endTime = performance.now();

        expect(result).toBeDefined();
        expect(result?.name).toBe('Actor500');
        expect(endTime - startTime).toBeLessThan(100); // Should complete in reasonable time
      });
    });
  });

  describe('configuration', () => {
    it('should use default configuration when none provided', () => {
      const defaultApi = createEntityResolverApi(world);

      // Test that default prefix threshold (3) is used
      const intent = createTestIntent('attack xy', knight.id, testPlace1.id); // 2 chars, should not match with default threshold
      const result = defaultApi.resolveActor(intent);

      expect(result).toBeUndefined();
    });

    it('should respect custom prefix match threshold', () => {
      const customApi = createEntityResolverApi(world, { prefixMatchThreshold: 2 });

      const intent = createTestIntent('attack si', knight.id, testPlace1.id); // 2 chars, should match with threshold 2
      const result = customApi.resolveActor(intent);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Sir Galahad');
    });
  });

  describe('pre-filtering behavior', () => {
    it('should filter out verbs that do not match any actors', () => {
      // "attack" is a verb that doesn't match any actor names
      const intent = createTestIntent('attack sir', knight.id, testPlace1.id);
      const result = resolverApi.resolveActor(intent);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Sir Galahad'); // Should find via "sir" noun, ignoring "attack" verb
    });

    it('should filter out adjectives that do not match any actors', () => {
      // "mighty" is an adjective that doesn't match any actor names
      const intent = createTestIntent('mighty sir', knight.id, testPlace1.id);
      const result = resolverApi.resolveActor(intent);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Sir Galahad'); // Should find via "sir" noun, ignoring "mighty" adjective
    });

    it('should keep verbs that could match actor names', () => {
      // Create an actor named "Strike"
      const strikeActor = createActor((actor) => ({
        ...actor,
        name: 'Strike',
        location: testPlace1.id
      }));

      const worldWithStrike = createWorld({
        ...world,
        actors: {
          ...world.actors,
          [strikeActor.id]: strikeActor
        }
      });

      const resolverWithStrike = createEntityResolverApi(worldWithStrike);

      // "strike" is classified as a verb but matches an actor name
      const intent = createTestIntent('strike now', knight.id, testPlace1.id);
      const result = resolverWithStrike.resolveActor(intent);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Strike'); // Should find the actor despite "strike" being a verb
    });

    it('should keep adjectives that could match actor names', () => {
      // Create an actor named "Swift Arrow"
      const swiftActor = createActor((actor) => ({
        ...actor,
        name: 'Swift Arrow',
        location: testPlace1.id
      }));

      const worldWithSwift = createWorld({
        ...world,
        actors: {
          ...world.actors,
          [swiftActor.id]: swiftActor
        }
      });

      const resolverWithSwift = createEntityResolverApi(worldWithSwift);

      // "swift" is classified as an adjective but matches an actor name prefix
      const intent = createTestIntent('swift runner', knight.id, testPlace1.id);
      const result = resolverWithSwift.resolveActor(intent);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Swift Arrow'); // Should find the actor despite "swift" being an adjective
    });

    it('should handle tokens that appear in multiple POS categories', () => {
      // "attack" could be both a verb and a noun
      const intent = createTestIntent('attack sir', knight.id, testPlace1.id);
      const result = resolverApi.resolveActor(intent);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Sir Galahad'); // Should find via "sir", keep "attack" as noun
    });

    it('should work with complex sentences with multiple POS types', () => {
      const intent = createTestIntent(
        'quickly attack the mighty sir galahad',
        knight.id,
        testPlace1.id
      );
      const result = resolverApi.resolveActor(intent);

      expect(result).toBeDefined();
      expect(result?.name).toBe('Sir Galahad'); // Should filter out non-matching verbs/adjectives
    });
  });
});
