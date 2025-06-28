import { describe, it, expect } from 'vitest';
import { createPlace, createExit, createPlaces, addActorToPlace, removeActorFromPlace } from './place';
import { Direction } from '~/types/world/space';
import { EntityType } from '~/types/entity/entity';
import { createPlaceUrn } from '~/lib/taxonomy';
import { PlaceInput, ExitInput } from '~/types/entity/place';
import { SpecialVisibility } from '~/types/world/visibility';

describe('createPlace', () => {
  describe('basic place creation', () => {
    it('should create a place with minimal input', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'tavern'),
      };

      const place = createPlace(input);

      expect(place.id).toBe('flux:place:test:tavern');
      expect(place.type).toBe(EntityType.PLACE);
      expect(place.name).toBe('');
      expect(place.description).toBe('');
      expect(place.exits).toEqual({});
      expect(place.entities).toEqual({});
    });

    it('should create a place with all fields specified', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'inn'),
        name: 'The Golden Griffin Inn',
        description: 'A warm and welcoming inn with comfortable rooms and hearty meals.',
      };

      const place = createPlace(input);

      expect(place.id).toBe('flux:place:test:inn');
      expect(place.name).toBe('The Golden Griffin Inn');
      expect(place.description).toBe('A warm and welcoming inn with comfortable rooms and hearty meals.');
      expect(place.exits).toEqual({});
      expect(place.entities).toEqual({});
    });

    it('should handle empty string values', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'empty'),
        name: '',
        description: '',
      };

      const place = createPlace(input);

      expect(place.name).toBe('');
      expect(place.description).toBe('');
    });
  });

  describe('exits processing', () => {
    it('should create place with no exits', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'isolated'),
        exits: [],
      };

      const place = createPlace(input);

      expect(place.exits).toEqual({});
      expect(Object.keys(place.exits)).toHaveLength(0);
    });

    it('should transform single exit from array to dictionary', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'plaza'),
        exits: [
          {
            direction: Direction.NORTH,
            label: 'Northern District',
            to: createPlaceUrn('world', 'north'),
          },
        ],
      };

      const place = createPlace(input);

      expect(Array.isArray(place.exits)).toBe(false);
      expect(place.exits).toBeTypeOf('object');
      expect(place.exits[Direction.NORTH]).toBeDefined();
      expect(place.exits[Direction.NORTH]?.direction).toBe(Direction.NORTH);
      expect(place.exits[Direction.NORTH]?.label).toBe('Northern District');
      expect(place.exits[Direction.NORTH]?.to).toBe('flux:place:world:north');
    });

    it('should transform multiple exits from array to dictionary', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'crossroads'),
        exits: [
          {
            direction: Direction.NORTH,
            label: 'To the Forest',
            to: createPlaceUrn('world', 'forest'),
          },
          {
            direction: Direction.SOUTH,
            label: 'To the Village',
            to: createPlaceUrn('world', 'village'),
          },
          {
            direction: Direction.EAST,
            label: 'To the Mountains',
            to: createPlaceUrn('world', 'mountains'),
          },
        ],
      };

      const place = createPlace(input);

      expect(Array.isArray(place.exits)).toBe(false);
      expect(Object.keys(place.exits)).toHaveLength(3);

      expect(place.exits[Direction.NORTH]).toBeDefined();
      expect(place.exits[Direction.NORTH]?.label).toBe('To the Forest');

      expect(place.exits[Direction.SOUTH]).toBeDefined();
      expect(place.exits[Direction.SOUTH]?.label).toBe('To the Village');

      expect(place.exits[Direction.EAST]).toBeDefined();
      expect(place.exits[Direction.EAST]?.label).toBe('To the Mountains');
    });

    it('should handle exits with minimal data', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'minimal-exit'),
        exits: [
          {
            direction: Direction.UP,
          },
        ],
      };

      const place = createPlace(input);

      expect(place.exits[Direction.UP]).toBeDefined();
      expect(place.exits[Direction.UP]?.direction).toBe(Direction.UP);
      expect(place.exits[Direction.UP]?.label).toBe('');
      expect(place.exits[Direction.UP]?.to).toBe('flux:place:nowhere');
    });

    it('should handle all direction types', () => {
      const directions = [
        Direction.NORTH,
        Direction.SOUTH,
        Direction.EAST,
        Direction.WEST,
        Direction.NORTHEAST,
        Direction.NORTHWEST,
        Direction.SOUTHEAST,
        Direction.SOUTHWEST,
        Direction.UP,
        Direction.DOWN,
        Direction.IN,
        Direction.OUT,
      ];

      const exits: ExitInput[] = directions.map((dir, index) => ({
        direction: dir,
        label: `Exit ${index}`,
        to: createPlaceUrn('world', `destination-${index}`),
      }));

      const input: PlaceInput = {
        id: createPlaceUrn('test', 'hub'),
        exits,
      };

      const place = createPlace(input);

      expect(Object.keys(place.exits)).toHaveLength(directions.length);

      directions.forEach((dir, index) => {
        expect(place.exits[dir]).toBeDefined();
        expect(place.exits[dir]?.direction).toBe(dir);
        expect(place.exits[dir]?.label).toBe(`Exit ${index}`);
      });
    });
  });

  describe('transform function', () => {
    it('should apply transform function to the created place', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'transformable'),
        name: 'Original Name',
      };

      const transform = (place: any) => ({
        ...place,
        name: 'Transformed Name',
        customField: 'added by transform',
      });

      const place = createPlace(input, transform);

      expect(place.name).toBe('Transformed Name');
      expect((place as any).customField).toBe('added by transform');
    });

    it('should work with identity transform', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'identity'),
        name: 'Identity Test',
      };

      const place = createPlace(input, (p) => p);

      expect(place.name).toBe('Identity Test');
    });
  });

  describe('options parameter', () => {
    it('should pass options to createEntity', () => {
      const input: PlaceInput = {
        id: createPlaceUrn('test', 'options-test'),
      };

      const mockUniqueId = () => 'test-unique-id';
      const options = {
        generateUniqueId: mockUniqueId,
      };

      const place = createPlace(input, undefined, options);

      expect(place.id).toBe('flux:place:test:options-test');
    });
  });
});

describe('createExit', () => {
  it('should create exit with full input', () => {
    const input: ExitInput = {
      direction: Direction.NORTH,
      label: 'To the Castle',
      to: createPlaceUrn('world', 'castle'),
    };

    const exit = createExit(input);

    expect(exit.direction).toBe(Direction.NORTH);
    expect(exit.label).toBe('To the Castle');
    expect(exit.to).toBe('flux:place:world:castle');
  });

  it('should create exit with minimal input', () => {
    const input: ExitInput = {
      direction: Direction.DOWN,
    };

    const exit = createExit(input);

    expect(exit.direction).toBe(Direction.DOWN);
    expect(exit.label).toBe('');
    expect(exit.to).toBe('flux:place:nowhere');
  });

  it('should apply transform function', () => {
    const input: ExitInput = {
      direction: Direction.EAST,
      label: 'Original Label',
    };

    const transform = (exit: any) => ({
      ...exit,
      label: 'Transformed Label',
    });

    const exit = createExit(input, transform);

    expect(exit.label).toBe('Transformed Label');
  });
});

describe('createPlaces', () => {
  it('should create multiple places from inputs', () => {
    const inputs: PlaceInput[] = [
      {
        id: createPlaceUrn('test', 'place1'),
        name: 'Place One',
      },
      {
        id: createPlaceUrn('test', 'place2'),
        name: 'Place Two',
      },
    ];

    const places = createPlaces(inputs);

    expect(Object.keys(places)).toHaveLength(2);
    expect(places['flux:place:test:place1']).toBeDefined();
    expect(places['flux:place:test:place1'].name).toBe('Place One');
    expect(places['flux:place:test:place2']).toBeDefined();
    expect(places['flux:place:test:place2'].name).toBe('Place Two');
  });

  it('should handle empty inputs array', () => {
    const places = createPlaces([]);
    expect(places).toEqual({});
  });
});

describe('addActorToPlace', () => {
  it('should add actor to place entities', () => {
    const place = createPlace({
      id: createPlaceUrn('test', 'tavern'),
      name: 'Test Tavern',
    });

    const actor = {
      id: 'flux:actor:test-character',
      type: EntityType.ACTOR,
      name: 'Test Character',
    } as any;

    const updatedPlace = addActorToPlace(actor, place);

    expect(updatedPlace.entities['flux:actor:test-character']).toBeDefined();
    expect(updatedPlace.entities['flux:actor:test-character']?.vis).toBe(SpecialVisibility.VISIBLE_TO_EVERYONE);
  });
});

describe('removeActorFromPlace', () => {
  it('should remove actor from place entities', () => {
    const actor = {
      id: 'flux:actor:test-character',
      type: EntityType.ACTOR,
      name: 'Test Character',
    } as any;

    const place = createPlace({
      id: createPlaceUrn('test', 'tavern'),
      name: 'Test Tavern',
    });

    const placeWithActor = addActorToPlace(actor, place);
    const placeWithoutActor = removeActorFromPlace(actor, placeWithActor);

    expect(placeWithoutActor.entities['flux:actor:test-character']).toBeUndefined();
  });
});
