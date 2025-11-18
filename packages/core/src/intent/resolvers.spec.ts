import {
  resolveActorUrn,
  resolvePlaceUrn,
  resolveItemUrn,
  ACTOR_URN_PREFIXES,
  PLACE_URN_PREFIXES,
  ITEM_URN_PREFIXES
} from './resolvers';
import { describe, it, expect } from 'vitest';

/**
 * Tests for pure URN resolution functions
 * These tests focus on syntax-only transformation without world state dependencies
 */
describe('URN Resolution Functions', () => {
  describe('resolveActorUrn', () => {
    describe('full URN pass-through', () => {
      it('should pass through valid full URNs unchanged', () => {
        expect(resolveActorUrn('flux:actor:bob')).toBe('flux:actor:bob');
        expect(resolveActorUrn('flux:actor:npc:guard')).toBe('flux:actor:npc:guard');
        expect(resolveActorUrn('flux:actor:player:alice')).toBe('flux:actor:player:alice');
      });
    });

    describe('prefix shorthand expansion', () => {
      it('should expand "a:" prefix to full URN', () => {
        expect(resolveActorUrn('a:bob')).toBe('flux:actor:bob');
        expect(resolveActorUrn('a:alice')).toBe('flux:actor:alice');
        expect(resolveActorUrn('a:npc:guard')).toBe('flux:actor:npc:guard');
      });

      it('should expand "actor:" prefix to full URN', () => {
        expect(resolveActorUrn('actor:bob')).toBe('flux:actor:bob');
        expect(resolveActorUrn('actor:alice')).toBe('flux:actor:alice');
        expect(resolveActorUrn('actor:npc:guard')).toBe('flux:actor:npc:guard');
      });
    });

    describe('URN fragment handling', () => {
      it('should treat colon patterns as URN fragments', () => {
        expect(resolveActorUrn('npc:guard')).toBe('flux:actor:npc:guard');
        expect(resolveActorUrn('player:alice')).toBe('flux:actor:player:alice');
        expect(resolveActorUrn('system:admin')).toBe('flux:actor:system:admin');
      });
    });

    describe('plain name conversion', () => {
      it('should convert plain names to standard URNs', () => {
        expect(resolveActorUrn('bob')).toBe('flux:actor:bob');
        expect(resolveActorUrn('alice')).toBe('flux:actor:alice');
        expect(resolveActorUrn('guard')).toBe('flux:actor:guard');
      });
    });

    describe('edge cases', () => {
      it('should handle empty/invalid tokens', () => {
        expect(resolveActorUrn('')).toBeUndefined();
        expect(resolveActorUrn(null as any)).toBeUndefined();
        expect(resolveActorUrn(undefined as any)).toBeUndefined();
      });

      it('should handle tokens with only colons', () => {
        expect(resolveActorUrn(':')).toBe('flux:actor::');
        expect(resolveActorUrn('::')).toBe('flux:actor:::');
      });

      it('should handle complex hierarchical patterns', () => {
        expect(resolveActorUrn('npc:merchant:tavern:bob')).toBe('flux:actor:npc:merchant:tavern:bob');
        expect(resolveActorUrn('a:system:admin:root')).toBe('flux:actor:system:admin:root');
      });
    });
  });

  describe('resolvePlaceUrn', () => {
    describe('full URN pass-through', () => {
      it('should pass through valid full URNs unchanged', () => {
        expect(resolvePlaceUrn('flux:place:tavern')).toBe('flux:place:tavern');
        expect(resolvePlaceUrn('flux:place:forest:clearing')).toBe('flux:place:forest:clearing');
      });
    });

    describe('prefix shorthand expansion', () => {
      it('should expand "p:" prefix to full URN', () => {
        expect(resolvePlaceUrn('p:tavern')).toBe('flux:place:tavern');
        expect(resolvePlaceUrn('p:forest')).toBe('flux:place:forest');
      });

      it('should expand "place:" prefix to full URN', () => {
        expect(resolvePlaceUrn('place:tavern')).toBe('flux:place:tavern');
        expect(resolvePlaceUrn('place:forest:clearing')).toBe('flux:place:forest:clearing');
      });
    });

    describe('URN fragment handling', () => {
      it('should treat colon patterns as URN fragments', () => {
        expect(resolvePlaceUrn('area:forest')).toBe('flux:place:area:forest');
        expect(resolvePlaceUrn('dungeon:level1')).toBe('flux:place:dungeon:level1');
      });
    });

    describe('plain name conversion', () => {
      it('should convert plain names to standard URNs', () => {
        expect(resolvePlaceUrn('tavern')).toBe('flux:place:tavern');
        expect(resolvePlaceUrn('forest')).toBe('flux:place:forest');
      });
    });
  });

  describe('resolveItemUrn', () => {
    describe('full URN pass-through', () => {
      it('should pass through valid full URNs unchanged', () => {
        expect(resolveItemUrn('flux:item:sword')).toBe('flux:item:sword');
        expect(resolveItemUrn('flux:item:weapon:sword:enchanted')).toBe('flux:item:weapon:sword:enchanted');
      });
    });

    describe('prefix shorthand expansion', () => {
      it('should expand "i:" prefix to full URN', () => {
        expect(resolveItemUrn('i:sword')).toBe('flux:item:sword');
        expect(resolveItemUrn('i:potion')).toBe('flux:item:potion');
      });

      it('should expand "item:" prefix to full URN', () => {
        expect(resolveItemUrn('item:sword')).toBe('flux:item:sword');
        expect(resolveItemUrn('item:weapon:sword')).toBe('flux:item:weapon:sword');
      });
    });

    describe('URN fragment handling', () => {
      it('should treat colon patterns as URN fragments', () => {
        expect(resolveItemUrn('weapon:sword')).toBe('flux:item:weapon:sword');
        expect(resolveItemUrn('armor:helmet')).toBe('flux:item:armor:helmet');
      });
    });

    describe('plain name conversion', () => {
      it('should convert plain names to standard URNs', () => {
        expect(resolveItemUrn('sword')).toBe('flux:item:sword');
        expect(resolveItemUrn('potion')).toBe('flux:item:potion');
      });
    });
  });

  describe('prefix configuration', () => {
    it('should export correct actor prefixes', () => {
      expect(ACTOR_URN_PREFIXES).toEqual(['a', 'actor']);
    });

    it('should export correct place prefixes', () => {
      expect(PLACE_URN_PREFIXES).toEqual(['p', 'place']);
    });

    it('should export correct item prefixes', () => {
      expect(ITEM_URN_PREFIXES).toEqual(['i', 'item']);
    });
  });

  describe('performance characteristics', () => {
    it('should handle high-frequency URN normalization efficiently', () => {
      const startTime = performance.now();

      // Test high-frequency normalization
      for (let i = 0; i < 1000; i++) {
        resolveActorUrn('a:bob');
        resolveActorUrn('actor:alice');
        resolveActorUrn('npc:guard');
        resolvePlaceUrn('p:tavern');
        resolveItemUrn('i:sword');
      }

      const duration = performance.now() - startTime;

      // Should complete very quickly with pure string operations
      expect(duration).toBeLessThan(50); // 50ms for 5000 operations
    });

    it('should have consistent performance regardless of URN complexity', () => {
      const simpleUrns = ['bob', 'alice', 'sword'];
      const complexUrns = ['npc:merchant:tavern:bob', 'area:dungeon:level5:boss', 'weapon:sword:enchanted:flame'];

      const startSimple = performance.now();
      for (let i = 0; i < 1000; i++) {
        simpleUrns.forEach(urn => resolveActorUrn(urn));
      }
      const simpleTime = performance.now() - startSimple;

      const startComplex = performance.now();
      for (let i = 0; i < 1000; i++) {
        complexUrns.forEach(urn => resolveActorUrn(urn));
      }
      const complexTime = performance.now() - startComplex;

      // Performance should be similar regardless of URN complexity
      expect(Math.abs(complexTime - simpleTime)).toBeLessThan(20);
    });
  });

  describe('type safety', () => {
    it('should return correct URN types', () => {
      const actorUrn = resolveActorUrn('bob');
      const placeUrn = resolvePlaceUrn('tavern');
      const itemUrn = resolveItemUrn('sword');

      // TypeScript should infer these as the correct URN types
      expect(typeof actorUrn).toBe('string');
      expect(typeof placeUrn).toBe('string');
      expect(typeof itemUrn).toBe('string');

      // Runtime validation of URN format
      expect(actorUrn?.startsWith('flux:actor:')).toBe(true);
      expect(placeUrn?.startsWith('flux:place:')).toBe(true);
      expect(itemUrn?.startsWith('flux:item:')).toBe(true);
    });
  });
});
