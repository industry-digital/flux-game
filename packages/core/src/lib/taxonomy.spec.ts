import { describe, it, expect } from 'vitest';
import { parseEntityType, createEntityUrn, createPlaceUrn, isActorUrn, isPlaceUrn, isSessionUrn, isGroupUrn, isItemUrn } from './taxonomy';
import { EntityType } from '~/types/entity/entity';
import { EntityURN, ActorURN, PlaceURN, SessionURN, GroupURN, ItemURN } from '~/types/taxonomy';

describe('parseEntityType', () => {
  describe('valid URNs', () => {
    const validTestCases: Array<[EntityURN, EntityType]> = [
      // Basic entity types
      ['flux:place:nightcity', EntityType.PLACE],
      ['flux:actor:pc:123', EntityType.ACTOR],
      ['flux:group:party:adventurers', EntityType.GROUP],
      ['flux:session:combat:123', EntityType.SESSION],

      // Minimal URNs (shortest possible)
      ['flux:place:a', EntityType.PLACE],
      ['flux:actor:b', EntityType.ACTOR],
      ['flux:group:c', EntityType.GROUP],
      ['flux:session:d', EntityType.SESSION],

      // Complex nested URNs
      ['flux:place:city:tokyo:district:shibuya:building:tower', EntityType.PLACE],
      ['flux:actor:monster:goblin:elite:boss:legendary', EntityType.ACTOR],
      ['flux:group:party:adventurers:guild:heroes:elite', EntityType.GROUP],
      ['flux:session:combat:arena:tournament:final:round', EntityType.SESSION],

      // URNs with special characters in paths
      ['flux:place:city-center', EntityType.PLACE],
      ['flux:actor:npc_123', EntityType.ACTOR],
      ['flux:group:team.alpha', EntityType.GROUP],
      ['flux:session:battle@arena', EntityType.SESSION],
    ];

    it('should parse valid URNs correctly', () => {
      validTestCases.forEach(([urn, expectedType]) => {
        expect(parseEntityType(urn)).toBe(expectedType);
      });
    });

    it('should handle URNs with varying path lengths', () => {
      // Single path segment
      expect(parseEntityType('flux:place:home' as EntityURN)).toBe(EntityType.PLACE);

      // Multiple path segments
      expect(parseEntityType('flux:actor:very:long:deeply:nested:path:structure' as EntityURN)).toBe(EntityType.ACTOR);

      // Many colons in path
      expect(parseEntityType('flux:group:a:b:c:d:e:f:g:h:i:j' as EntityURN)).toBe(EntityType.GROUP);
    });
  });

  describe('invalid URN formats', () => {
    const invalidFormatCases = [
      // Missing namespace
      'place:nightcity',
      'actor:pc:123',

      // Wrong namespace
      'wrong:place:nightcity',
      'other:actor:pc:123',

      // Missing entity type
      'flux:',
      'flux',

      // Missing path after entity type
      'flux:place',
      'flux:actor',

      // No colons at all
      'fluxplacenight',
      'completely-invalid',

      // Empty string
      '',

      // Only colons
      ':::',

      // Malformed with extra colons at start
      ':flux:place:nightcity',
      '::flux:place:nightcity',
    ];

    it('should throw error for invalid URN formats', () => {
      invalidFormatCases.forEach((invalidUrn) => {
        expect(() => parseEntityType(invalidUrn as EntityURN)).toThrow('Invalid URN format');
      });
    });
  });

  describe('unknown entity types', () => {
    const unknownTypeCases = [
      'flux:unknown:something',
      'flux:invalid:path',
      'flux:item:weapon:sword', // 'item' is not a valid EntityType
      'flux:monster:goblin:elite', // 'monster' is not a valid EntityType
      'flux:weapon:sword:steel', // 'weapon' is not a valid EntityType
      'flux:armor:helmet:iron', // 'armor' is not a valid EntityType
      'flux:skill:combat:melee', // 'skill' is not a valid EntityType
      'flux:effect:buff:haste', // 'effect' is not a valid EntityType
    ];

    it('should throw error for unknown entity types', () => {
      unknownTypeCases.forEach((urn) => {
        expect(() => parseEntityType(urn as EntityURN)).toThrow('Unknown entity type');
      });
    });
  });

  describe('edge cases', () => {
    it('should handle URNs with empty path segments', () => {
      // These should still parse the entity type correctly even with empty segments
      expect(parseEntityType('flux:place::empty' as EntityURN)).toBe(EntityType.PLACE);
      expect(parseEntityType('flux:actor:name::more' as EntityURN)).toBe(EntityType.ACTOR);
    });

    it('should handle URNs with whitespace in paths', () => {
      expect(parseEntityType('flux:place: space ' as EntityURN)).toBe(EntityType.PLACE);
      expect(parseEntityType('flux:actor:	tab	' as EntityURN)).toBe(EntityType.ACTOR);
    });

    it('should be case sensitive for entity types', () => {
      // These should fail because entity types are case sensitive
      expect(() => parseEntityType('flux:PLACE:nightcity' as EntityURN)).toThrow('Unknown entity type: PLACE');
      expect(() => parseEntityType('flux:Place:nightcity' as EntityURN)).toThrow('Unknown entity type: Place');
      expect(() => parseEntityType('flux:ACTOR:pc:123' as EntityURN)).toThrow('Unknown entity type: ACTOR');
    });

    it('should handle very long URNs', () => {
      const longPath = 'a'.repeat(1000);
      const longUrn = `flux:place:${longPath}` as EntityURN;
      expect(parseEntityType(longUrn)).toBe(EntityType.PLACE);
    });

    it('should handle URNs with many colons', () => {
      const manyColons = Array(100).fill('segment').join(':');
      const urnWithManyColons = `flux:group:${manyColons}` as EntityURN;
      expect(parseEntityType(urnWithManyColons)).toBe(EntityType.GROUP);
    });
  });

  describe('performance characteristics', () => {
    it('should handle batch processing efficiently', () => {
      const testUrns: EntityURN[] = [
        'flux:place:city:tokyo',
        'flux:actor:npc:merchant',
        'flux:group:party:heroes',
        'flux:session:combat:arena',
      ];

      // Process many URNs - this should complete quickly due to zero-allocation approach
      const results = testUrns.map(urn => parseEntityType(urn));

      expect(results).toEqual([
        EntityType.PLACE,
        EntityType.ACTOR,
        EntityType.GROUP,
        EntityType.SESSION,
      ]);
    });
  });
});

describe('createEntityUrn', () => {
  it('should create valid entity URNs', () => {
    expect(createEntityUrn(EntityType.PLACE, 'nightcity')).toBe('flux:place:nightcity');
    expect(createEntityUrn(EntityType.ACTOR, 'pc', '123')).toBe('flux:actor:pc:123');
    expect(createEntityUrn(EntityType.GROUP, 'party', 'adventurers')).toBe('flux:group:party:adventurers');
    expect(createEntityUrn(EntityType.SESSION, 'combat', '123')).toBe('flux:session:combat:123');
  });

  it('should handle multiple terms', () => {
    expect(createEntityUrn(EntityType.PLACE, 'city', 'tokyo', 'district', 'shibuya'))
      .toBe('flux:place:city:tokyo:district:shibuya');
  });

  it('should handle single terms', () => {
    expect(createEntityUrn(EntityType.ACTOR, 'hero')).toBe('flux:actor:hero');
  });
});

describe('createPlaceUrn (deprecated)', () => {
  it('should create place URNs', () => {
    expect(createPlaceUrn('nightcity')).toBe('flux:place:nightcity');
    expect(createPlaceUrn('city', 'tokyo')).toBe('flux:place:city:tokyo');
  });

  it('should throw error for empty terms', () => {
    expect(() => createPlaceUrn()).toThrow('At least one term is required to create a place URN');
  });
});

describe('type guards', () => {
  describe('isActorUrn', () => {
    it('should identify actor URNs correctly', () => {
      expect(isActorUrn('flux:actor:pc:123')).toBe(true);
      expect(isActorUrn('flux:actor:npc:merchant')).toBe(true);
      expect(isActorUrn('flux:place:nightcity')).toBe(false);
      expect(isActorUrn('flux:group:party')).toBe(false);
      expect(isActorUrn('invalid:actor:test')).toBe(false);
    });
  });

  describe('isPlaceUrn', () => {
    it('should identify place URNs correctly', () => {
      expect(isPlaceUrn('flux:place:nightcity')).toBe(true);
      expect(isPlaceUrn('flux:place:city:tokyo')).toBe(true);
      expect(isPlaceUrn('flux:actor:pc:123')).toBe(false);
      expect(isPlaceUrn('flux:group:party')).toBe(false);
      expect(isPlaceUrn('invalid:place:test')).toBe(false);
    });
  });

  describe('isSessionUrn', () => {
    it('should identify session URNs correctly', () => {
      expect(isSessionUrn('flux:session:combat:123')).toBe(true);
      expect(isSessionUrn('flux:session:trade:456')).toBe(true);
      expect(isSessionUrn('flux:actor:pc:123')).toBe(false);
      expect(isSessionUrn('flux:place:nightcity')).toBe(false);
      expect(isSessionUrn('invalid:session:test')).toBe(false);
    });
  });

  describe('isGroupUrn', () => {
    it('should identify group URNs correctly', () => {
      expect(isGroupUrn('flux:group:party:adventurers')).toBe(true);
      expect(isGroupUrn('flux:group:guild:thieves')).toBe(true);
      expect(isGroupUrn('flux:actor:pc:123')).toBe(false);
      expect(isGroupUrn('flux:place:nightcity')).toBe(false);
      expect(isGroupUrn('invalid:group:test')).toBe(false);
    });
  });

  describe('isItemUrn', () => {
    it('should identify item URNs correctly', () => {
      expect(isItemUrn('flux:item:weapon:sword')).toBe(true);
      expect(isItemUrn('flux:item:armor:helmet')).toBe(true);
      expect(isItemUrn('flux:actor:pc:123')).toBe(false);
      expect(isItemUrn('flux:place:nightcity')).toBe(false);
      expect(isItemUrn('invalid:item:test')).toBe(false);
    });
  });
});
