import { describe, it, expect, beforeEach } from 'vitest';
import { PlaceGraph } from './place';
import { Place } from '~/types/entity/place';
import { PlaceURN } from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';
import { Direction } from '~/types/world/space';

// Helper function to create test Place objects with all required properties
function createTestPlace(overrides: Partial<Place> = {}): Place {
  return {
    id: 'flux:place:test' as PlaceURN,
    name: 'Test Place',
    description: 'A test place',
    exits: {},
    entities: {},
    ecosystem: 'flux:eco:grassland:temperate' as any,
    weather: {
      temperature: 20,
      pressure: 1013,
      humidity: 50,
      precipitation: 0,
      ppfd: 1000,
      clouds: 30,
      ts: Date.now()
    },
    coordinates: [0, 0],
    type: EntityType.PLACE,
    resources: {
      ts: Date.now(),
      nodes: {}
    },
    ...overrides
  };
}

// Helper function to create proper Exit objects
function createExit(direction: Direction, to: PlaceURN, label?: string) {
  return {
    direction,
    to,
    label: label || `to ${to}`
  };
}

describe('PlaceGraph', () => {

  describe('constructor', () => {
    it('should create empty graph from empty array', () => {
      const graph = new PlaceGraph([]);
      expect(graph.size()).toBe(0);
      expect(graph.getAllPlaceIds()).toEqual([]);
    });

    it('should create graph with single place', () => {
      const places: Place[] = [
        createTestPlace()
      ];
      const graph = new PlaceGraph(places);

      expect(graph.size()).toBe(1);
      expect(graph.getAllPlaceIds()).toEqual(['flux:place:test']);
      expect(graph.getPlaceName('flux:place:test')).toBe('Test Place');
      expect(graph.getExits('flux:place:test')).toEqual({});
    });

    it('should create graph with connected places', () => {
      const places: Place[] = [
        createTestPlace({
          id: 'flux:place:test1' as PlaceURN,
          exits: {
            north: createExit(Direction.NORTH, 'flux:place:test2' as PlaceURN),
            south: createExit(Direction.SOUTH, 'flux:place:test3' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:test2' as PlaceURN,
          exits: {
            south: createExit(Direction.SOUTH, 'flux:place:test1' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:test3' as PlaceURN,
          exits: {
            north: createExit(Direction.NORTH, 'flux:place:test1' as PlaceURN)
          }
        })
      ];
      const graph = new PlaceGraph(places);

      expect(graph.size()).toBe(3);
      expect(graph.getAllPlaceIds()).toEqual(['flux:place:test1', 'flux:place:test2', 'flux:place:test3']);
      expect(graph.getExits('flux:place:test1')).toEqual({ north: 'flux:place:test2', south: 'flux:place:test3' });
      expect(graph.getExits('flux:place:test2')).toEqual({ south: 'flux:place:test1' });
      expect(graph.getExits('flux:place:test3')).toEqual({ north: 'flux:place:test1' });
    });

    it('should handle places without exits property', () => {
      const places: Place[] = [
        createTestPlace()
      ];
      const graph = new PlaceGraph(places);

      expect(graph.getExits('flux:place:test')).toEqual({});
    });

    it('should handle places with undefined exits', () => {
      const places: Place[] = [
        createTestPlace({ exits: undefined })
      ];
      const graph = new PlaceGraph(places);

      expect(graph.getExits('flux:place:test')).toEqual({});
    });
  });

  describe('getExits', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: Place[] = [
        createTestPlace({ id: 'flux:place:test1', exits: { north: { to: 'flux:place:test2' }, east: { to: 'flux:place:test3' } } }),
        createTestPlace({ id: 'flux:place:test2', exits: {} }),
        createTestPlace({ id: 'flux:place:test3', exits: {} })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return exits for existing place', () => {
      expect(graph.getExits('flux:place:test1')).toEqual({ north: 'flux:place:test2', east: 'flux:place:test3' });
    });

    it('should return empty object for place with no exits', () => {
      expect(graph.getExits('flux:place:test2')).toEqual({});
    });

    it('should return undefined for non-existent place', () => {
      expect(graph.getExits('nonexistent')).toBeUndefined();
    });
  });

  describe('getPlaceName', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: Place[] = [
        createTestPlace({ id: 'flux:place:test1' as PlaceURN, name: 'Named Place' }),
        createTestPlace({ id: 'flux:place:test2' as PlaceURN, name: undefined })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return name for place with name', () => {
      expect(graph.getPlaceName('flux:place:test1')).toBe('Named Place');
    });

    it('should return undefined for place without name', () => {
      expect(graph.getPlaceName('flux:place:test2')).toBeUndefined();
    });

    it('should return undefined for non-existent place', () => {
      expect(graph.getPlaceName('nonexistent')).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return 0 for empty graph', () => {
      const graph = new PlaceGraph([]);
      expect(graph.size()).toBe(0);
    });

    it('should return correct size for populated graph', () => {
      const places: Place[] = [
        createTestPlace({ id: 'flux:place:test1' as PlaceURN }),
        createTestPlace({ id: 'flux:place:test2' as PlaceURN }),
        createTestPlace({ id: 'flux:place:test3' as PlaceURN })
      ];
      const graph = new PlaceGraph(places);
      expect(graph.size()).toBe(3);
    });
  });

  describe('getAllPlaceIds', () => {
    it('should return empty array for empty graph', () => {
      const graph = new PlaceGraph([]);
      expect(graph.getAllPlaceIds()).toEqual([]);
    });

    it('should return all place IDs', () => {
      const places: Place[] = [
        createTestPlace({ id: 'flux:place:test1' as PlaceURN }),
        createTestPlace({ id: 'flux:place:test2' as PlaceURN }),
        createTestPlace({ id: 'flux:place:test3' as PlaceURN })
      ];
      const graph = new PlaceGraph(places);
      expect(graph.getAllPlaceIds()).toEqual(['flux:place:test1', 'flux:place:test2', 'flux:place:test3']);
    });
  });

  describe('getPlacesWithinDistance', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      // Create a linear chain: place1 -> place2 -> place3 -> place4
      const places: Place[] = [
        createTestPlace({ id: 'flux:place:test1' as PlaceURN, exits: { east: { to: 'flux:place:test2' } } }),
        createTestPlace({ id: 'flux:place:test2' as PlaceURN, exits: { west: { to: 'flux:place:test1' }, east: { to: 'flux:place:test3' } } }),
        createTestPlace({ id: 'flux:place:test3' as PlaceURN, exits: { west: { to: 'flux:place:test2' }, east: { to: 'flux:place:test4' } } }),
        createTestPlace({ id: 'flux:place:test4' as PlaceURN, exits: { west: { to: 'flux:place:test3' } } }),
        createTestPlace({ id: 'flux:place:isolated' as PlaceURN, exits: {} })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return only origin place for distance 0', () => {
      const result = graph.getPlacesWithinDistance('flux:place:test1', 0);
      expect(result).toEqual(['flux:place:test1']);
    });

    it('should return places within distance 1', () => {
      const result = graph.getPlacesWithinDistance('flux:place:test2', 1);
      expect(result).toContain('flux:place:test2');
      expect(result).toContain('flux:place:test1');
      expect(result).toContain('flux:place:test3');
      expect(result).toHaveLength(3);
    });

    it('should return places within distance 2', () => {
      const result = graph.getPlacesWithinDistance('flux:place:test2', 2);
      expect(result).toContain('flux:place:test2');
      expect(result).toContain('flux:place:test1');
      expect(result).toContain('flux:place:test3');
      expect(result).toContain('flux:place:test4');
      expect(result).toHaveLength(4);
    });

    it('should handle larger distances beyond precomputed range', () => {
      const result = graph.getPlacesWithinDistance('flux:place:test1', 5);
      expect(result).toContain('flux:place:test1');
      expect(result).toContain('flux:place:test2');
      expect(result).toContain('flux:place:test3');
      expect(result).toContain('flux:place:test4');
      expect(result).toHaveLength(4);
    });

    it('should return empty array for non-existent place', () => {
      const result = graph.getPlacesWithinDistance('nonexistent', 1);
      expect(result).toEqual([]);
    });

    it('should return empty array for negative distance', () => {
      const result = graph.getPlacesWithinDistance('flux:place:test1', -1);
      expect(result).toEqual([]);
    });

    it('should handle isolated places', () => {
      const result = graph.getPlacesWithinDistance('flux:place:isolated', 1);
      expect(result).toEqual(['flux:place:isolated']);
    });
  });

  describe('findShortestPath', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      // Create a more complex graph with multiple paths
      const places: Place[] = [
        createTestPlace({ id: 'flux:place:A' as PlaceURN, exits: { north: { to: 'flux:place:B' }, east: { to: 'flux:place:C' } } }),
        createTestPlace({ id: 'flux:place:B' as PlaceURN, exits: { south: { to: 'flux:place:A' }, east: { to: 'flux:place:D' } } }),
        createTestPlace({ id: 'flux:place:C' as PlaceURN, exits: { west: { to: 'flux:place:A' }, north: { to: 'flux:place:D' } } }),
        createTestPlace({ id: 'flux:place:D' as PlaceURN, exits: { west: { to: 'flux:place:B' }, south: { to: 'flux:place:C' } } }),
        createTestPlace({ id: 'flux:place:isolated' as PlaceURN, exits: {} })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return path with single place when from equals to', () => {
      const result = graph.findShortestPath('flux:place:A', 'flux:place:A');
      expect(result).toEqual(['flux:place:A']);
    });

    it('should find direct path between adjacent places', () => {
      const result = graph.findShortestPath('flux:place:A', 'flux:place:B');
      expect(result).toEqual(['flux:place:A', 'flux:place:B']);
    });

    it('should find shortest path between distant places', () => {
      const result = graph.findShortestPath('flux:place:A', 'flux:place:D');
      expect(result).toHaveLength(3);
      expect(result?.[0]).toBe('flux:place:A');
      expect(result?.[2]).toBe('flux:place:D');
      // Should be either A -> B -> D or A -> C -> D
      expect(['flux:place:B', 'flux:place:C']).toContain(result?.[1]);
    });

    it('should return null for non-existent source place', () => {
      const result = graph.findShortestPath('nonexistent', 'flux:place:A');
      expect(result).toBeNull();
    });

    it('should return null for non-existent destination place', () => {
      const result = graph.findShortestPath('flux:place:A', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null when no path exists', () => {
      const result = graph.findShortestPath('flux:place:A', 'flux:place:isolated');
      expect(result).toBeNull();
    });
  });

  describe('getNextStepToward', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: Place[] = [
        createTestPlace({ id: 'flux:place:A' as PlaceURN, exits: { north: { to: 'flux:place:B' } } }),
        createTestPlace({ id: 'flux:place:B' as PlaceURN, exits: { south: { to: 'flux:place:A' }, east: { to: 'flux:place:C' } } }),
        createTestPlace({ id: 'flux:place:C' as PlaceURN, exits: { west: { to: 'flux:place:B' } } }),
        createTestPlace({ id: 'flux:place:isolated' as PlaceURN, exits: {} })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return next step in shortest path', () => {
      const result = graph.getNextStepToward('flux:place:A', 'flux:place:C');
      expect(result).toBe('flux:place:B');
    });

    it('should return null when already at destination', () => {
      const result = graph.getNextStepToward('flux:place:A', 'flux:place:A');
      expect(result).toBeNull();
    });

    it('should return null when no path exists', () => {
      const result = graph.getNextStepToward('flux:place:A', 'flux:place:isolated');
      expect(result).toBeNull();
    });

    it('should return destination when directly connected', () => {
      const result = graph.getNextStepToward('flux:place:A', 'flux:place:B');
      expect(result).toBe('flux:place:B');
    });
  });

  describe('getStats', () => {
    it('should return correct stats for empty graph', () => {
      const graph = new PlaceGraph([]);
      const stats = graph.getStats();

      expect(stats.totalPlaces).toBe(0);
      expect(stats.totalExits).toBe(0);
      expect(stats.avgExitsPerPlace).toBe(0);
      expect(stats.maxExitsPerPlace).toBe(0);
    });

    it('should return correct stats for populated graph', () => {
      const places: Place[] = [
        createTestPlace({ id: 'flux:place:test1' as PlaceURN, exits: { north: { to: 'flux:place:test2' }, south: { to: 'flux:place:test3' } } }),
        createTestPlace({ id: 'flux:place:test2' as PlaceURN, exits: { south: { to: 'flux:place:test1' } } }),
        createTestPlace({ id: 'flux:place:test3' as PlaceURN, exits: {} })
      ];
      const graph = new PlaceGraph(places);
      const stats = graph.getStats();

      expect(stats.totalPlaces).toBe(3);
      expect(stats.totalExits).toBe(3);
      expect(stats.avgExitsPerPlace).toBe(1);
      expect(stats.maxExitsPerPlace).toBe(2);
    });
  });

  // New tests for entity access methods
  describe('entity access methods', () => {
    let graph: PlaceGraph;
    let testPlaces: Place[];

    beforeEach(() => {
      testPlaces = [
        createTestPlace({ id: 'flux:place:test1' as PlaceURN, name: 'Test Place 1' }),
        createTestPlace({ id: 'flux:place:test2' as PlaceURN, name: 'Test Place 2' }),
        createTestPlace({ id: 'flux:place:test3' as PlaceURN, name: 'Test Place 3' })
      ];
      graph = new PlaceGraph(testPlaces);
    });

    describe('getPlace', () => {
      it('should return full Place entity for existing place', () => {
        const place = graph.getPlace('flux:place:test1');
        expect(place).toBeDefined();
        expect(place?.name).toBe('Test Place 1');
        expect(place?.id).toBe('flux:place:test1');
        expect(place?.type).toBe(EntityType.PLACE);
      });

      it('should return undefined for non-existent place', () => {
        const place = graph.getPlace('nonexistent');
        expect(place).toBeUndefined();
      });
    });

    describe('getAllPlaces', () => {
      it('should return all Place entities', () => {
        const places = graph.getAllPlaces();
        expect(places).toHaveLength(3);
        expect(places.map(p => p.id)).toEqual(['flux:place:test1', 'flux:place:test2', 'flux:place:test3']);
      });

      it('should return empty array for empty graph', () => {
        const emptyGraph = new PlaceGraph([]);
        const places = emptyGraph.getAllPlaces();
        expect(places).toEqual([]);
      });
    });

    describe('updatePlace', () => {
      it('should update place entity', () => {
        const updatedPlace = { ...testPlaces[0], name: 'Updated Name' };
        graph.updatePlace('flux:place:test1', updatedPlace);

        const place = graph.getPlace('flux:place:test1');
        expect(place?.name).toBe('Updated Name');
      });

      it('should update weather data', () => {
        const updatedPlace = {
          ...testPlaces[0],
          weather: { ...testPlaces[0].weather, temperature: 25 }
        };
        graph.updatePlace('flux:place:test1', updatedPlace);

        const place = graph.getPlace('flux:place:test1');
        expect(place?.weather.temperature).toBe(25);
      });
    });

    describe('getPlaceEntitiesWithinDistance', () => {
      beforeEach(() => {
        // Create connected places for distance testing
        const connectedPlaces = [
          createTestPlace({
            id: 'flux:place:center' as PlaceURN,
            name: 'Center',
            exits: {
              north: createExit(Direction.NORTH, 'flux:place:north' as PlaceURN),
              south: createExit(Direction.SOUTH, 'flux:place:south' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:north' as PlaceURN,
            name: 'North',
            exits: {
              south: createExit(Direction.SOUTH, 'flux:place:center' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:south' as PlaceURN,
            name: 'South',
            exits: {
              north: createExit(Direction.NORTH, 'flux:place:center' as PlaceURN)
            }
          })
        ];
        graph = new PlaceGraph(connectedPlaces);
      });

      it('should return Place entities within distance', () => {
        const entities = graph.getPlaceEntitiesWithinDistance('flux:place:center', 1);
        expect(entities).toHaveLength(3);
        expect(entities.map(e => e.name)).toEqual(['Center', 'North', 'South']);
      });

      it('should return only origin for distance 0', () => {
        const entities = graph.getPlaceEntitiesWithinDistance('flux:place:center', 0);
        expect(entities).toHaveLength(1);
        expect(entities[0].name).toBe('Center');
      });

      it('should return empty array for non-existent place', () => {
        const entities = graph.getPlaceEntitiesWithinDistance('nonexistent', 1);
        expect(entities).toEqual([]);
      });
    });
  });
});
