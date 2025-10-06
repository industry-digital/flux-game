import { describe, it, expect } from 'vitest';
import { EntityType } from '~/types/entity/entity';
import { EntityURN } from '~/types/taxonomy';
import { parseEntityTypeFromURN } from './urn';

describe('URN parsing', () => {
  const validTestCases: Array<[EntityURN, EntityType]> = [
    ['flux:place:nightcity', EntityType.PLACE],
    ['flux:actor:pc:123', EntityType.ACTOR],
    ['flux:item:weapon:sword', EntityType.ITEM],
    ['flux:group:party:adventurers', EntityType.GROUP],
    ['flux:session:combat:123', EntityType.SESSION],
    ['flux:place:city:tokyo:district:shibuya', EntityType.PLACE],
    ['flux:actor:monster:goblin:elite', EntityType.ACTOR],
  ];

  it('should parse valid URNs correctly', () => {
    validTestCases.forEach(([urn, expectedType]) => {
      expect(parseEntityTypeFromURN(urn)).toBe(expectedType);
    });
  });

  it('should handle various URN lengths', () => {
    expect(parseEntityTypeFromURN('flux:place:a' as EntityURN)).toBe(EntityType.PLACE);
    expect(parseEntityTypeFromURN('flux:actor:very:long:deeply:nested:path' as EntityURN)).toBe(EntityType.ACTOR);
  });
});
