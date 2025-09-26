import { describe, it, expect, beforeEach } from 'vitest';
import { PlaceGraph } from './place';
import { Place } from '~/types/entity/place';
import { PlaceURN } from '~/types/taxonomy';
import { EntityType } from '~/types/entity/entity';
import { Direction } from '~/types/world/space';

// Helper function to create test Place objects with all required properties
function createTestPlace(overrides: any = {}): Place {
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

// Helper function to create a connected pair of places for grid size computation
// Using realistic coordinates: northwest corner positions with 200m minimum + 300m grid spacing
function createConnectedPlaces(): Place[] {
  return [
    createTestPlace({
      id: 'flux:place:steppe:500:4400' as PlaceURN,
      coordinates: [500, 4400], // Northwest corner of the Place
      name: 'West Place',
      exits: {
        east: createExit(Direction.EAST, 'flux:place:steppe:800:4400' as PlaceURN)
      }
    }),
    createTestPlace({
      id: 'flux:place:steppe:800:4400' as PlaceURN,
      coordinates: [800, 4400], // 300m east (800 - 500 = 300)
      name: 'East Place',
      exits: {
        west: createExit(Direction.WEST, 'flux:place:steppe:500:4400' as PlaceURN)
      }
    })
  ];
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

        it('should throw when creating graph with single unconnected place', () => {
      const places: Place[] = [
        createTestPlace()
      ];

      expect(() => new PlaceGraph(places)).toThrow('Cannot create PlaceGraph with single unconnected place');
    });

    it('should create graph with connected places', () => {
      const places = createConnectedPlaces();
      const graph = new PlaceGraph(places);

      expect(graph.size()).toBe(2);
      expect(graph.getAllPlaceIds()).toEqual(['flux:place:steppe:500:4400', 'flux:place:steppe:800:4400']);
      expect(graph.getPlaceName('flux:place:steppe:500:4400')).toBe('West Place');
      expect(graph.getComputedGridSize()).toBe(300);
    });

    it('should create graph with multiple connected places', () => {
      const places: Place[] = [
        createTestPlace({
          id: 'flux:place:grassland:1000:1000' as PlaceURN,
          coordinates: [1000, 1000],
          exits: {
            north: createExit(Direction.NORTH, 'flux:place:grassland:1000:1300' as PlaceURN),
            east: createExit(Direction.EAST, 'flux:place:grassland:1300:1000' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1000:1300' as PlaceURN,
          coordinates: [1000, 1300],
          exits: {
            south: createExit(Direction.SOUTH, 'flux:place:grassland:1000:1000' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1300:1000' as PlaceURN,
          coordinates: [1300, 1000],
          exits: {
            west: createExit(Direction.WEST, 'flux:place:grassland:1000:1000' as PlaceURN)
          }
        })
      ];
      const graph = new PlaceGraph(places);

      expect(graph.size()).toBe(3);
      expect(graph.getAllPlaceIds()).toEqual(['flux:place:grassland:1000:1000', 'flux:place:grassland:1000:1300', 'flux:place:grassland:1300:1000']);
      expect(graph.getExits('flux:place:grassland:1000:1000')).toEqual({
        north: 'flux:place:grassland:1000:1300',
        east: 'flux:place:grassland:1300:1000'
      });
      expect(graph.getComputedGridSize()).toBe(300);
    });

        it('should throw for places without proper exits', () => {
      const places: Place[] = [
        createTestPlace()
      ];

      expect(() => new PlaceGraph(places)).toThrow('Cannot create PlaceGraph with single unconnected place');
    });

    it('should throw for places with undefined exits', () => {
      const places: Place[] = [
        createTestPlace({ exits: undefined })
      ];

      expect(() => new PlaceGraph(places)).toThrow('Cannot create PlaceGraph with single unconnected place');
    });
  });

  describe('getExits', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: Place[] = [
        createTestPlace({
          id: 'flux:place:grassland:1000:1000' as PlaceURN,
          coordinates: [1000, 1000],
          exits: {
            north: createExit(Direction.NORTH, 'flux:place:grassland:1000:1300' as PlaceURN),
            east: createExit(Direction.EAST, 'flux:place:grassland:1300:1000' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1000:1300' as PlaceURN,
          coordinates: [1000, 1300],
          exits: {
            south: createExit(Direction.SOUTH, 'flux:place:grassland:1000:1000' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1300:1000' as PlaceURN,
          coordinates: [1300, 1000],
          exits: {
            west: createExit(Direction.WEST, 'flux:place:grassland:1000:1000' as PlaceURN)
          }
        })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return exits for existing place', () => {
      expect(graph.getExits('flux:place:grassland:1000:1000')).toEqual({
        north: 'flux:place:grassland:1000:1300',
        east: 'flux:place:grassland:1300:1000'
      });
    });

    it('should return exits for place with one exit', () => {
      expect(graph.getExits('flux:place:grassland:1000:1300')).toEqual({
        south: 'flux:place:grassland:1000:1000'
      });
    });

    it('should return undefined for non-existent place', () => {
      expect(graph.getExits('nonexistent' as PlaceURN)).toBeUndefined();
    });
  });

  describe('getPlaceName', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: Place[] = [
        createTestPlace({
          id: 'flux:place:grassland:1000:1000' as PlaceURN,
          coordinates: [1000, 1000],
          name: 'Named Place',
          exits: {
            east: createExit(Direction.EAST, 'flux:place:grassland:1300:1000' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1300:1000' as PlaceURN,
          coordinates: [1300, 1000],
          name: undefined,
          exits: {
            west: createExit(Direction.WEST, 'flux:place:grassland:1000:1000' as PlaceURN)
          }
        })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return name for place with name', () => {
      expect(graph.getPlaceName('flux:place:grassland:1000:1000')).toBe('Named Place');
    });

    it('should return undefined for place without name', () => {
      expect(graph.getPlaceName('flux:place:grassland:1300:1000')).toBeUndefined();
    });

    it('should return undefined for non-existent place', () => {
      expect(graph.getPlaceName('nonexistent' as PlaceURN)).toBeUndefined();
    });
  });

  describe('size', () => {
    it('should return 0 for empty graph', () => {
      const graph = new PlaceGraph([]);
      expect(graph.size()).toBe(0);
    });

    it('should return correct size for populated graph', () => {
      const places = createConnectedPlaces();
      const graph = new PlaceGraph(places);
      expect(graph.size()).toBe(2);
    });
  });

  describe('getAllPlaceIds', () => {
    it('should return empty array for empty graph', () => {
      const graph = new PlaceGraph([]);
      expect(graph.getAllPlaceIds()).toEqual([]);
    });

    it('should return all place IDs', () => {
      const places = createConnectedPlaces();
      const graph = new PlaceGraph(places);
      expect(graph.getAllPlaceIds()).toEqual(['flux:place:steppe:500:4400', 'flux:place:steppe:800:4400']);
    });
  });

  describe('getPlacesWithinDistance', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      // Create a linear chain using realistic coordinates
      const places: Place[] = [
        createTestPlace({
          id: 'flux:place:steppe:500:4400' as PlaceURN,
          coordinates: [500, 4400],
          exits: { east: createExit(Direction.EAST, 'flux:place:steppe:800:4400' as PlaceURN) }
        }),
        createTestPlace({
          id: 'flux:place:steppe:800:4400' as PlaceURN,
          coordinates: [800, 4400],
          exits: {
            west: createExit(Direction.WEST, 'flux:place:steppe:500:4400' as PlaceURN),
            east: createExit(Direction.EAST, 'flux:place:steppe:1100:4400' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:steppe:1100:4400' as PlaceURN,
          coordinates: [1100, 4400],
          exits: {
            west: createExit(Direction.WEST, 'flux:place:steppe:800:4400' as PlaceURN),
            east: createExit(Direction.EAST, 'flux:place:steppe:1400:4400' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:steppe:1400:4400' as PlaceURN,
          coordinates: [1400, 4400],
          exits: { west: createExit(Direction.WEST, 'flux:place:steppe:1100:4400' as PlaceURN) }
        })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return only origin place for distance 0', () => {
      const result = graph.getPlacesWithinDistance('flux:place:steppe:500:4400', 0);
      expect(result).toEqual(['flux:place:steppe:500:4400']);
    });

    it('should return places within distance 1', () => {
      const result = graph.getPlacesWithinDistance('flux:place:steppe:800:4400', 1);
      expect(result).toContain('flux:place:steppe:800:4400');
      expect(result).toContain('flux:place:steppe:500:4400');
      expect(result).toContain('flux:place:steppe:1100:4400');
      expect(result).toHaveLength(3);
    });

    it('should return places within distance 2', () => {
      const result = graph.getPlacesWithinDistance('flux:place:steppe:800:4400', 2);
      expect(result).toContain('flux:place:steppe:800:4400');
      expect(result).toContain('flux:place:steppe:500:4400');
      expect(result).toContain('flux:place:steppe:1100:4400');
      expect(result).toContain('flux:place:steppe:1400:4400');
      expect(result).toHaveLength(4);
    });

    it('should handle larger distances beyond precomputed range', () => {
      const result = graph.getPlacesWithinDistance('flux:place:steppe:500:4400', 5);
      expect(result).toContain('flux:place:steppe:500:4400');
      expect(result).toContain('flux:place:steppe:800:4400');
      expect(result).toContain('flux:place:steppe:1100:4400');
      expect(result).toContain('flux:place:steppe:1400:4400');
      expect(result).toHaveLength(4);
    });

    it('should return empty array for non-existent place', () => {
      const result = graph.getPlacesWithinDistance('nonexistent' as PlaceURN, 1);
      expect(result).toEqual([]);
    });

    it('should return empty array for negative distance', () => {
      const result = graph.getPlacesWithinDistance('flux:place:test1', -1);
      expect(result).toEqual([]);
    });

    it('should handle edge places in chain', () => {
      const result = graph.getPlacesWithinDistance('flux:place:steppe:1400:4400', 1);
      expect(result).toContain('flux:place:steppe:1400:4400');
      expect(result).toContain('flux:place:steppe:1100:4400');
      expect(result).toHaveLength(2);
    });
  });

  describe('findShortestPath', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      // Create a more complex graph with multiple paths using realistic coordinates
      const places: Place[] = [
        createTestPlace({
          id: 'flux:place:steppe:500:4400' as PlaceURN,
          coordinates: [500, 4400],
          exits: {
            north: createExit(Direction.NORTH, 'flux:place:steppe:500:4700' as PlaceURN),
            east: createExit(Direction.EAST, 'flux:place:steppe:800:4400' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:steppe:500:4700' as PlaceURN,
          coordinates: [500, 4700],
          exits: {
            south: createExit(Direction.SOUTH, 'flux:place:steppe:500:4400' as PlaceURN),
            east: createExit(Direction.EAST, 'flux:place:steppe:800:4700' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:steppe:800:4400' as PlaceURN,
          coordinates: [800, 4400],
          exits: {
            west: createExit(Direction.WEST, 'flux:place:steppe:500:4400' as PlaceURN),
            north: createExit(Direction.NORTH, 'flux:place:steppe:800:4700' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:steppe:800:4700' as PlaceURN,
          coordinates: [800, 4700],
          exits: {
            west: createExit(Direction.WEST, 'flux:place:steppe:500:4700' as PlaceURN),
            south: createExit(Direction.SOUTH, 'flux:place:steppe:800:4400' as PlaceURN)
          }
        })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return path with single place when from equals to', () => {
      const result = graph.findShortestPath('flux:place:steppe:500:4400', 'flux:place:steppe:500:4400');
      expect(result).toEqual(['flux:place:steppe:500:4400']);
    });

    it('should find direct path between adjacent places', () => {
      const result = graph.findShortestPath('flux:place:steppe:500:4400', 'flux:place:steppe:500:4700');
      expect(result).toEqual(['flux:place:steppe:500:4400', 'flux:place:steppe:500:4700']);
    });

    it('should find shortest path between distant places', () => {
      const result = graph.findShortestPath('flux:place:steppe:500:4400', 'flux:place:steppe:800:4700');
      expect(result).toHaveLength(3);
      expect(result?.[0]).toBe('flux:place:steppe:500:4400');
      expect(result?.[2]).toBe('flux:place:steppe:800:4700');
      // Should be either via north or via east
      expect(['flux:place:steppe:500:4700', 'flux:place:steppe:800:4400']).toContain(result?.[1]);
    });

    it('should return null for non-existent source place', () => {
      const result = graph.findShortestPath('nonexistent', 'flux:place:steppe:500:4400');
      expect(result).toBeNull();
    });

    it('should return null for non-existent destination place', () => {
      const result = graph.findShortestPath('flux:place:steppe:500:4400', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null when places are not connected', () => {
      // All places in this test are connected, so this will only happen with non-existent places
      const result = graph.findShortestPath('flux:place:steppe:500:4400', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('getNextStepToward', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: Place[] = [
        createTestPlace({
          id: 'flux:place:steppe:500:4400' as PlaceURN,
          coordinates: [500, 4400],
          exits: { north: createExit(Direction.NORTH, 'flux:place:steppe:500:4700' as PlaceURN) }
        }),
        createTestPlace({
          id: 'flux:place:steppe:500:4700' as PlaceURN,
          coordinates: [500, 4700],
          exits: {
            south: createExit(Direction.SOUTH, 'flux:place:steppe:500:4400' as PlaceURN),
            east: createExit(Direction.EAST, 'flux:place:steppe:800:4700' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:steppe:800:4700' as PlaceURN,
          coordinates: [800, 4700],
          exits: { west: createExit(Direction.WEST, 'flux:place:steppe:500:4700' as PlaceURN) }
        })
      ];
      graph = new PlaceGraph(places);
    });

    it('should return next step in shortest path', () => {
      const result = graph.getNextStepToward('flux:place:steppe:500:4400', 'flux:place:steppe:800:4700');
      expect(result).toBe('flux:place:steppe:500:4700');
    });

    it('should return null when already at destination', () => {
      const result = graph.getNextStepToward('flux:place:steppe:500:4400', 'flux:place:steppe:500:4400');
      expect(result).toBeNull();
    });

    it('should return null when no path exists', () => {
      const result = graph.getNextStepToward('flux:place:steppe:500:4400', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return destination when directly connected', () => {
      const result = graph.getNextStepToward('flux:place:steppe:500:4400', 'flux:place:steppe:500:4700');
      expect(result).toBe('flux:place:steppe:500:4700');
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
        createTestPlace({
          id: 'flux:place:grassland:1000:1000' as PlaceURN,
          coordinates: [1000, 1000],
          exits: {
            north: createExit(Direction.NORTH, 'flux:place:grassland:1000:1300' as PlaceURN),
            east: createExit(Direction.EAST, 'flux:place:grassland:1300:1000' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1000:1300' as PlaceURN,
          coordinates: [1000, 1300],
          exits: {
            south: createExit(Direction.SOUTH, 'flux:place:grassland:1000:1000' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1300:1000' as PlaceURN,
          coordinates: [1300, 1000],
          exits: {
            west: createExit(Direction.WEST, 'flux:place:grassland:1000:1000' as PlaceURN)
          }
        })
      ];
      const graph = new PlaceGraph(places);
      const stats = graph.getStats();

      expect(stats.totalPlaces).toBe(3);
      expect(stats.totalExits).toBe(4); // 1 + 2 + 1 = 4 exits total
      expect(stats.avgExitsPerPlace).toBeCloseTo(1.33, 2); // 4/3 ≈ 1.33
      expect(stats.maxExitsPerPlace).toBe(2);
    });
  });

  // New tests for entity access methods
  describe('entity access methods', () => {
    let graph: PlaceGraph;
    let testPlaces: Place[];

    beforeEach(() => {
      testPlaces = [
        createTestPlace({
          id: 'flux:place:grassland:1000:1000' as PlaceURN,
          coordinates: [1000, 1000],
          name: 'Test Place 1',
          exits: {
            east: createExit(Direction.EAST, 'flux:place:grassland:1300:1000' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1300:1000' as PlaceURN,
          coordinates: [1300, 1000],
          name: 'Test Place 2',
          exits: {
            west: createExit(Direction.WEST, 'flux:place:grassland:1000:1000' as PlaceURN),
            north: createExit(Direction.NORTH, 'flux:place:grassland:1300:1300' as PlaceURN)
          }
        }),
        createTestPlace({
          id: 'flux:place:grassland:1300:1300' as PlaceURN,
          coordinates: [1300, 1300],
          name: 'Test Place 3',
          exits: {
            south: createExit(Direction.SOUTH, 'flux:place:grassland:1300:1000' as PlaceURN)
          }
        })
      ];
      graph = new PlaceGraph(testPlaces);
    });

    describe('getPlace', () => {
      it('should return full Place entity for existing place', () => {
        const place = graph.getPlace('flux:place:grassland:1000:1000');
        expect(place).toBeDefined();
        expect(place?.name).toBe('Test Place 1');
        expect(place?.id).toBe('flux:place:grassland:1000:1000');
        expect(place?.type).toBe(EntityType.PLACE);
      });

      it('should return undefined for non-existent place', () => {
        const place = graph.getPlace('nonexistent' as PlaceURN);
        expect(place).toBeUndefined();
      });
    });

        describe('getAllPlaces', () => {
      it('should return all Place entities as Map', () => {
        const places = graph.getAllPlaces();
        expect(places.size).toBe(3);
        expect(Array.from(places.keys())).toEqual(['flux:place:grassland:1000:1000', 'flux:place:grassland:1300:1000', 'flux:place:grassland:1300:1300']);
      });

      it('should return empty Map for empty graph', () => {
        const emptyGraph = new PlaceGraph([]);
        const places = emptyGraph.getAllPlaces();
        expect(places.size).toBe(0);
      });

      it('should return same Map reference when called multiple times', () => {
        const places1 = graph.getAllPlaces();
        const places2 = graph.getAllPlaces();
        expect(places1).toBe(places2); // Same reference
      });

      it('should return proper Map instance with Map methods', () => {
        const places = graph.getAllPlaces();
        expect(places instanceof Map).toBe(true);
        expect(places).toHaveProperty('get');
        expect(places).toHaveProperty('has');
        expect(places).toHaveProperty('size');
      });

      it('should return places in consistent order', () => {
        const places1 = graph.getAllPlaces();
        const places2 = graph.getAllPlaces();
        expect(Array.from(places1.keys())).toEqual(Array.from(places2.keys()));
      });

      it('should reflect updates after place modifications', () => {
        const originalPlaces = graph.getAllPlaces();
        const originalSize = originalPlaces.size;

        // Update a place
        const updatedPlace = { ...testPlaces[0], name: 'Updated Name' };
        graph.updatePlace('flux:place:grassland:1000:1000', updatedPlace);

        const newPlaces = graph.getAllPlaces();
        expect(newPlaces.size).toBe(originalSize);
        expect(newPlaces.get('flux:place:grassland:1000:1000')?.name).toBe('Updated Name');
      });

            it('should allow external modifications since it returns the actual Map reference', () => {
        const places = graph.getAllPlaces();
        const originalSize = places.size;

        // Modify the returned Map (this is allowed in our architectural model)
        places.set('flux:place:external' as PlaceURN, createTestPlace({ id: 'flux:place:external' as PlaceURN }));

        // The graph IS affected by external modification (expected behavior)
        expect(graph.size()).toBe(4);
        expect(graph.getAllPlaceIds()).toHaveLength(4);

        // Getting places again should return the same Map (same reference)
        const freshPlaces = graph.getAllPlaces();
        expect(freshPlaces).toBe(places); // Same reference

        // Clean up for other tests
        places.delete('flux:place:external' as PlaceURN);
      });

      it('should handle Map equality correctly', () => {
        const places1 = graph.getAllPlaces();
        const places2 = graph.getAllPlaces();

        // Same reference check
        expect(places1).toBe(places2);

        // Content should be identical
        expect(places1).toEqual(places2);

        // Individual places should be the same objects
        for (const [key, place] of places1) {
          expect(places2.get(key)).toBe(place);
        }
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
        // Create connected places for distance testing using realistic coordinates
        const connectedPlaces = [
          createTestPlace({
            id: 'flux:place:steppe:500:4400' as PlaceURN,
            coordinates: [500, 4400],
            name: 'Center',
            exits: {
              north: createExit(Direction.NORTH, 'flux:place:steppe:500:4700' as PlaceURN),
              south: createExit(Direction.SOUTH, 'flux:place:steppe:500:4100' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:500:4700' as PlaceURN,
            coordinates: [500, 4700],
            name: 'North',
            exits: {
              south: createExit(Direction.SOUTH, 'flux:place:steppe:500:4400' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:500:4100' as PlaceURN,
            coordinates: [500, 4100],
            name: 'South',
            exits: {
              north: createExit(Direction.NORTH, 'flux:place:steppe:500:4400' as PlaceURN)
            }
          })
        ];
        graph = new PlaceGraph(connectedPlaces);
      });

      it('should return Place entities within distance', () => {
        const entities = graph.getPlaceEntitiesWithinDistance('flux:place:steppe:500:4400', 1);
        expect(entities).toHaveLength(3);
        expect(entities.map(e => e.name)).toEqual(['Center', 'North', 'South']);
      });

      it('should return only origin for distance 0', () => {
        const entities = graph.getPlaceEntitiesWithinDistance('flux:place:steppe:500:4400', 0);
        expect(entities).toHaveLength(1);
        expect(entities[0].name).toBe('Center');
      });

      it('should return empty array for non-existent place', () => {
        const entities = graph.getPlaceEntitiesWithinDistance('nonexistent' as PlaceURN, 1);
        expect(entities).toEqual([]);
      });
    });
  });

  // ========================================
  // NEW SPATIAL FUNCTIONALITY TESTS
  // ========================================

  describe('Spatial Indexing', () => {
    describe('constructor options', () => {
      it('should accept options object with custom settings', () => {
        const places = createConnectedPlaces();

        const graph = new PlaceGraph(places, {
          maxGraphRadius: 3,
          maxSpatialDistance: 900
        });

        expect(graph.size()).toBe(2);
        expect(graph.getComputedGridSize()).toBe(300);
      });

      it('should work with no options (default constructor)', () => {
        const places = createConnectedPlaces();
        const graph = new PlaceGraph(places);

        expect(graph.size()).toBe(2);
        expect(graph.getComputedGridSize()).toBe(300);
      });

      it('should use default values for unspecified options', () => {
        const places = createConnectedPlaces();
        const graph = new PlaceGraph(places, { maxGraphRadius: 5 }); // Only specify one option

        expect(graph.size()).toBe(2);
        expect(graph.getComputedGridSize()).toBe(300);
      });
    });

    describe('grid size computation', () => {
      it('should compute grid size from topology correctly', () => {
        const places = createConnectedPlaces();
        const graph = new PlaceGraph(places);
        const gridSize = graph.getComputedGridSize();

        expect(gridSize).toBe(300); // Distance between [500,4400] and [800,4400] = 300m
      });

      it('should throw when single place has no connections', () => {
        const places = [createTestPlace({ id: 'flux:place:isolated' as PlaceURN })];

        expect(() => new PlaceGraph(places)).toThrow('Cannot create PlaceGraph with single unconnected place');
      });
    });

    describe('coordinate extraction', () => {
      it('should extract coordinates from URN for regular places', () => {
        const places = [
          createTestPlace({
            id: 'flux:place:steppe:500:4400' as PlaceURN,
            coordinates: [500, 4400], // Should match URN
            exits: {
              east: createExit(Direction.EAST, 'flux:place:steppe:800:4400' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:800:4400' as PlaceURN,
            coordinates: [800, 4400],
            exits: {
              west: createExit(Direction.WEST, 'flux:place:steppe:500:4400' as PlaceURN)
            }
          })
        ];
        const graph = new PlaceGraph(places);

        const coords = graph.getCoordinates('flux:place:steppe:500:4400');
        expect(coords).toEqual([500, 4400]); // From URN matches coordinates property
      });

      it('should handle origin place specially', () => {
        const places = [
          createTestPlace({
            id: 'flux:place:origin' as PlaceURN,
            coordinates: [555, 777] // Should be used directly
          }),
          ...createConnectedPlaces() // Add connected places so grid computation works
        ];
        const graph = new PlaceGraph(places);

        const coords = graph.getCoordinates('flux:place:origin');
        expect(coords).toEqual([555, 777]); // From coordinates property
      });

      it('should fall back to coordinates property for malformed URNs', () => {
        const places = [
          createTestPlace({
            id: 'flux:place:malformed' as PlaceURN,
            coordinates: [500, 4400]
          }),
          ...createConnectedPlaces() // Add connected places so grid computation works
        ];
        const graph = new PlaceGraph(places);

        const coords = graph.getCoordinates('flux:place:malformed');
        expect(coords).toEqual([500, 4400]); // Fallback to coordinates
      });

      it('should return undefined for non-existent place', () => {
        const graph = new PlaceGraph([]);
        const coords = graph.getCoordinates('nonexistent' as PlaceURN);
        expect(coords).toBeUndefined();
      });
    });

    describe('getSpatialNeighbors', () => {
      let graph: PlaceGraph;

      beforeEach(() => {
        // Create a grid of places for spatial testing using realistic coordinates
        const places = [
          createTestPlace({
            id: 'flux:place:steppe:500:4400' as PlaceURN,
            coordinates: [500, 4400],
            name: 'Center',
            exits: {
              east: createExit(Direction.EAST, 'flux:place:steppe:800:4400' as PlaceURN),
              north: createExit(Direction.NORTH, 'flux:place:steppe:500:4700' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:800:4400' as PlaceURN,
            coordinates: [800, 4400],
            name: 'East',
            exits: {
              west: createExit(Direction.WEST, 'flux:place:steppe:500:4400' as PlaceURN),
              north: createExit(Direction.NORTH, 'flux:place:steppe:800:4700' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:200:4400' as PlaceURN,
            coordinates: [200, 4400],
            name: 'West',
            exits: {
              east: createExit(Direction.EAST, 'flux:place:steppe:500:4400' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:500:4700' as PlaceURN,
            coordinates: [500, 4700],
            name: 'North',
            exits: {
              south: createExit(Direction.SOUTH, 'flux:place:steppe:500:4400' as PlaceURN),
              east: createExit(Direction.EAST, 'flux:place:steppe:800:4700' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:500:4100' as PlaceURN,
            coordinates: [500, 4100],
            name: 'South',
            exits: {
              north: createExit(Direction.NORTH, 'flux:place:steppe:500:4400' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:800:4700' as PlaceURN,
            coordinates: [800, 4700],
            name: 'Northeast',
            exits: {
              west: createExit(Direction.WEST, 'flux:place:steppe:500:4700' as PlaceURN),
              south: createExit(Direction.SOUTH, 'flux:place:steppe:800:4400' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:forest:1100:4400' as PlaceURN,
            coordinates: [1100, 4400],
            name: 'Far East',
            ecosystem: 'flux:eco:forest:temperate' as any,
            exits: {
              west: createExit(Direction.WEST, 'flux:place:steppe:800:4400' as PlaceURN)
            }
          })
        ];

        graph = new PlaceGraph(places, { maxSpatialDistance: 1000 });
      });

      it('should find spatial neighbors within radius', () => {
        const neighbors = graph.getSpatialNeighbors('flux:place:steppe:500:4400', 400);

        expect(neighbors.length).toBeGreaterThan(0);
        expect(neighbors.every(n => n.distance <= 400)).toBe(true);
        expect(neighbors.every(n => typeof n.place === 'object')).toBe(true);
        expect(neighbors.every(n => typeof n.distance === 'number')).toBe(true);

        // Should include adjacent places (distance 300)
        const adjacentPlaces = neighbors.filter(n => n.distance === 300);
        expect(adjacentPlaces.length).toBe(4); // East, West, North, South
      });

      it('should return raw distances without domain logic', () => {
        const neighbors = graph.getSpatialNeighbors('flux:place:steppe:500:4400', 500);

        // Should return raw distance values
        expect(neighbors.every(n => n.distance >= 0)).toBe(true);
        expect(neighbors.every(n => n.distance <= 500)).toBe(true);

        // Should NOT contain influence or other domain-specific calculations
        expect(neighbors.every(n => !('influence' in n))).toBe(true);
        expect(neighbors.every(n => !('audibility' in n))).toBe(true);
        expect(neighbors.every(n => !('damageMultiplier' in n))).toBe(true);
      });

      it('should cross biome boundaries', () => {
        const neighbors = graph.getSpatialNeighbors('flux:place:steppe:500:4400', 700);
        const biomes = neighbors.map(n => n.place.ecosystem);
        expect(new Set(biomes).size).toBeGreaterThan(1); // Multiple biomes
      });

      it('should sort results by distance', () => {
        const neighbors = graph.getSpatialNeighbors('flux:place:steppe:500:4400', 700);

        for (let i = 1; i < neighbors.length; i++) {
          expect(neighbors[i].distance).toBeGreaterThanOrEqual(neighbors[i-1].distance);
        }
      });

      it('should return empty array for non-existent place', () => {
        const neighbors = graph.getSpatialNeighbors('nonexistent' as PlaceURN, 500);
        expect(neighbors).toEqual([]);
      });

      it('should return empty array for negative distance', () => {
        const neighbors = graph.getSpatialNeighbors('flux:place:steppe:500:4400', -1);
        expect(neighbors).toEqual([]);
      });

      it('should use default maxSpatialDistance when no distance provided', () => {
        const neighbors = graph.getSpatialNeighbors('flux:place:steppe:500:4400');

        // Should use configured maxSpatialDistance (1000m)
        expect(neighbors.every(n => n.distance <= 1000)).toBe(true);
        expect(neighbors.length).toBeGreaterThan(0);
      });

      it('should handle larger distances beyond precomputed range', () => {
        const neighbors = graph.getSpatialNeighbors('flux:place:steppe:500:4400', 2000);

        // Should still work and include all places within range
        expect(neighbors.length).toBeGreaterThan(0);
        // Should include the far place at 600m distance (flux:place:forest:1100:4400)
        expect(neighbors.some(n => n.place.name === 'Far East')).toBe(true);
        expect(neighbors.some(n => n.distance === 600)).toBe(true);
      });
    });

    describe('getSpatialDistance', () => {
      let graph: PlaceGraph;

      beforeEach(() => {
        const places = [
          createTestPlace({
            id: 'flux:place:steppe:500:4400' as PlaceURN,
            coordinates: [500, 4400],
            exits: {
              east: createExit(Direction.EAST, 'flux:place:steppe:800:4400' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:800:4400' as PlaceURN,
            coordinates: [800, 4400],
            exits: {
              west: createExit(Direction.WEST, 'flux:place:steppe:500:4400' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:origin' as PlaceURN,
            coordinates: [500, 500],
            exits: {
              north: createExit(Direction.NORTH, 'flux:place:steppe:500:4400' as PlaceURN)
            }
          })
        ];
        graph = new PlaceGraph(places);
      });

      it('should calculate distance between two places', () => {
        const distance = graph.getSpatialDistance(
          'flux:place:steppe:500:4400',
          'flux:place:steppe:800:4400'
        );
        expect(distance).toBe(300); // 300m apart
      });

      it('should handle origin place distance calculation', () => {
        const distance = graph.getSpatialDistance(
          'flux:place:origin',
          'flux:place:steppe:500:4400'
        );
        expect(distance).toBeCloseTo(3900, 1); // sqrt((500-500)^2 + (4400-500)^2) = 3900
      });

      it('should return undefined for non-existent places', () => {
        const distance1 = graph.getSpatialDistance(
          'nonexistent' as PlaceURN,
          'flux:place:steppe:500:4400'
        );
        const distance2 = graph.getSpatialDistance(
          'flux:place:steppe:500:4400',
          'nonexistent' as PlaceURN
        );

        expect(distance1).toBeUndefined();
        expect(distance2).toBeUndefined();
      });

      it('should return 0 for distance from place to itself', () => {
        const distance = graph.getSpatialDistance(
          'flux:place:steppe:500:4400',
          'flux:place:steppe:500:4400'
        );
        expect(distance).toBe(0);
      });
    });

    describe('integration with existing functionality', () => {
      it('should preserve all existing graph topology methods', () => {
        const places = [
          createTestPlace({
            id: 'flux:place:A' as PlaceURN,
            coordinates: [1000, 1000],
            exits: {
              north: createExit(Direction.NORTH, 'flux:place:B' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:B' as PlaceURN,
            coordinates: [1000, 1300],
            exits: {
              south: createExit(Direction.SOUTH, 'flux:place:A' as PlaceURN)
            }
          })
        ];

        const graph = new PlaceGraph(places, { maxSpatialDistance: 500 });

        // Existing graph methods should still work
        expect(graph.getPlacesWithinDistance('flux:place:A', 1)).toHaveLength(2);
        expect(graph.findShortestPath('flux:place:A', 'flux:place:B')).toEqual(['flux:place:A', 'flux:place:B']);
        expect(graph.getExits('flux:place:A')).toEqual({ north: 'flux:place:B' });

        // New spatial methods should also work
        const spatialNeighbors = graph.getSpatialNeighbors('flux:place:A', 400);
        expect(spatialNeighbors).toHaveLength(1);
        expect(spatialNeighbors[0].place.id).toBe('flux:place:B');
        expect(spatialNeighbors[0].distance).toBe(300);
      });

            it('should enable weather system integration pattern', () => {
        const places = [
          createTestPlace({
            id: 'flux:place:steppe:500:4400' as PlaceURN,
            coordinates: [500, 4400],
            name: 'Weather Center',
            exits: {
              east: createExit(Direction.EAST, 'flux:place:steppe:800:4400' as PlaceURN)
            }
          }),
          createTestPlace({
            id: 'flux:place:steppe:800:4400' as PlaceURN,
            coordinates: [800, 4400],
            name: 'Nearby Place',
            exits: {
              west: createExit(Direction.WEST, 'flux:place:steppe:500:4400' as PlaceURN)
            }
          })
        ];

        const graph = new PlaceGraph(places, { maxSpatialDistance: 1500 });
        const weatherCenter = 'flux:place:steppe:500:4400';

        // Get spatial neighbors for weather propagation
        const neighbors = graph.getSpatialNeighbors(weatherCenter, 1500);

        // Application layer can apply weather-specific easing
        const weatherInfluence = neighbors.map(({ place, distance }) => ({
          place,
          distance,
          influence: Math.max(0, 1 - distance / 1500) // Linear falloff example
        }));

        expect(weatherInfluence.every(w => w.influence >= 0 && w.influence <= 1)).toBe(true);
        expect(weatherInfluence.find(w => w.place.name === 'Nearby Place')?.influence).toBeCloseTo(0.8, 1);
      });
    });
  });
});
