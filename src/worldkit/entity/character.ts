import { Character, CharacterInput, EntityType, SymbolicLink } from '@flux';
import { createEntity, FactoryOptions } from './util';
import { createSymbolicLink } from './util';
import { createModifiableScalarAttribute, createModifiableBoundedAttribute } from './attribute';
import { merge } from 'lodash';

const identity = <T>(x: T): T => x;

export const createCharacterInput = (
  transform: (input: CharacterInput) => CharacterInput = identity,
): CharacterInput => {
  const defaults: CharacterInput = {
    name: '',
    description: ''
  };

  return transform(defaults);
};

export const createCharacter = (
  transform: (character: Character) => Character = identity,
  options: FactoryOptions = {},
): Character => {
  const base = createEntity<EntityType.CHARACTER, Character>(
    EntityType.CHARACTER,
    (entity) => {
      const defaults: Partial<Character> = {
        name: entity.name || '',
        description: entity.description || '',
        location: createSymbolicLink(EntityType.PLACE, ['nowhere']) as SymbolicLink<EntityType.PLACE>,
        level: createModifiableScalarAttribute(),
        hp: createModifiableBoundedAttribute(),
        traits: {},
        stats: {},
        injuries: {},
        mana: {},
        effects: {},
        inventory: {
          mass: 0,
          items: {},
          ts: Date.now()
        },
        equipment: {},
        memberships: {},
        reputation: {},
        subscriptions: {},
        skills: {},
        specializations: {
          primary: [],
          secondary: []
        },
        prefs: {}
      };

      return merge({}, entity, defaults) as Character;
    },
    options,
  );

  return transform(base);
};
