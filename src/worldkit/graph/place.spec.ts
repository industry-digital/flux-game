import { describe, it, expect, beforeEach } from 'vitest';
import { PlaceGraph, PlaceLike } from './place';

describe('PlaceGraph', () => {

  describe('constructor', () => {
    it('should create empty graph from empty array', () => {
      const graph = new PlaceGraph([]);
      expect(graph.size()).toBe(0);
      expect(graph.getAllPlaceIds()).toEqual([]);
    });

    it('should create graph with single place', () => {
      const places: PlaceLike[] = [
        { id: 'place1', name: 'Place One', exits: {} }
      ];
      const graph = new PlaceGraph(places);

      expect(graph.size()).toBe(1);
      expect(graph.getAllPlaceIds()).toEqual(['place1']);
      expect(graph.getPlaceName('place1')).toBe('Place One');
      expect(graph.getExits('place1')).toEqual({});
    });

    it('should create graph with connected places', () => {
      const places: PlaceLike[] = [
        {
          id: 'place1',
          name: 'Place One',
          exits: { north: { to: 'place2' }, south: { to: 'place3' } }
        },
        {
          id: 'place2',
          name: 'Place Two',
          exits: { south: { to: 'place1' } }
        },
        {
          id: 'place3',
          name: 'Place Three',
          exits: { north: { to: 'place1' } }
        }
      ];
      const graph = new PlaceGraph(places);

      expect(graph.size()).toBe(3);
      expect(graph.getAllPlaceIds()).toEqual(['place1', 'place2', 'place3']);
      expect(graph.getExits('place1')).toEqual({ north: 'place2', south: 'place3' });
      expect(graph.getExits('place2')).toEqual({ south: 'place1' });
      expect(graph.getExits('place3')).toEqual({ north: 'place1' });
    });

    it('should handle places without exits property', () => {
      const places: PlaceLike[] = [
        { id: 'place1', name: 'Place One' }
      ];
      const graph = new PlaceGraph(places);

      expect(graph.getExits('place1')).toEqual({});
    });

    it('should handle places with undefined exits', () => {
      const places: PlaceLike[] = [
        { id: 'place1', name: 'Place One', exits: undefined }
      ];
      const graph = new PlaceGraph(places);

      expect(graph.getExits('place1')).toEqual({});
    });
  });

  describe('getExits', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: PlaceLike[] = [
        {
          id: 'place1',
          exits: { north: { to: 'place2' }, east: { to: 'place3' } }
        },
        { id: 'place2', exits: {} },
        { id: 'place3', exits: {} }
      ];
      graph = new PlaceGraph(places);
    });

    it('should return exits for existing place', () => {
      expect(graph.getExits('place1')).toEqual({ north: 'place2', east: 'place3' });
    });

    it('should return empty object for place with no exits', () => {
      expect(graph.getExits('place2')).toEqual({});
    });

    it('should return undefined for non-existent place', () => {
      expect(graph.getExits('nonexistent')).toBeUndefined();
    });
  });

  describe('getPlaceName', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: PlaceLike[] = [
        { id: 'place1', name: 'Named Place' },
        { id: 'place2' }
      ];
      graph = new PlaceGraph(places);
    });

    it('should return name for place with name', () => {
      expect(graph.getPlaceName('place1')).toBe('Named Place');
    });

    it('should return undefined for place without name', () => {
      expect(graph.getPlaceName('place2')).toBeUndefined();
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
      const places: PlaceLike[] = [
        { id: 'place1' },
        { id: 'place2' },
        { id: 'place3' }
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
      const places: PlaceLike[] = [
        { id: 'place1' },
        { id: 'place2' },
        { id: 'place3' }
      ];
      const graph = new PlaceGraph(places);
      expect(graph.getAllPlaceIds()).toEqual(['place1', 'place2', 'place3']);
    });
  });

  describe('getPlacesWithinDistance', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      // Create a linear chain: place1 -> place2 -> place3 -> place4
      const places: PlaceLike[] = [
        { id: 'place1', exits: { east: { to: 'place2' } } },
        { id: 'place2', exits: { west: { to: 'place1' }, east: { to: 'place3' } } },
        { id: 'place3', exits: { west: { to: 'place2' }, east: { to: 'place4' } } },
        { id: 'place4', exits: { west: { to: 'place3' } } },
        { id: 'isolated', exits: {} }
      ];
      graph = new PlaceGraph(places);
    });

    it('should return only origin place for distance 0', () => {
      const result = graph.getPlacesWithinDistance('place1', 0);
      expect(result).toEqual(['place1']);
    });

    it('should return places within distance 1', () => {
      const result = graph.getPlacesWithinDistance('place2', 1);
      expect(result).toContain('place2');
      expect(result).toContain('place1');
      expect(result).toContain('place3');
      expect(result).toHaveLength(3);
    });

    it('should return places within distance 2', () => {
      const result = graph.getPlacesWithinDistance('place2', 2);
      expect(result).toContain('place2');
      expect(result).toContain('place1');
      expect(result).toContain('place3');
      expect(result).toContain('place4');
      expect(result).toHaveLength(4);
    });

    it('should handle larger distances beyond precomputed range', () => {
      const result = graph.getPlacesWithinDistance('place1', 5);
      expect(result).toContain('place1');
      expect(result).toContain('place2');
      expect(result).toContain('place3');
      expect(result).toContain('place4');
      expect(result).toHaveLength(4);
    });

    it('should return empty array for non-existent place', () => {
      const result = graph.getPlacesWithinDistance('nonexistent', 1);
      expect(result).toEqual([]);
    });

    it('should return empty array for negative distance', () => {
      const result = graph.getPlacesWithinDistance('place1', -1);
      expect(result).toEqual([]);
    });

    it('should handle isolated places', () => {
      const result = graph.getPlacesWithinDistance('isolated', 1);
      expect(result).toEqual(['isolated']);
    });
  });

  describe('findShortestPath', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      // Create a more complex graph with multiple paths
      const places: PlaceLike[] = [
        { id: 'A', exits: { north: { to: 'B' }, east: { to: 'C' } } },
        { id: 'B', exits: { south: { to: 'A' }, east: { to: 'D' } } },
        { id: 'C', exits: { west: { to: 'A' }, north: { to: 'D' } } },
        { id: 'D', exits: { west: { to: 'B' }, south: { to: 'C' } } },
        { id: 'isolated', exits: {} }
      ];
      graph = new PlaceGraph(places);
    });

    it('should return path with single place when from equals to', () => {
      const result = graph.findShortestPath('A', 'A');
      expect(result).toEqual(['A']);
    });

    it('should find direct path between adjacent places', () => {
      const result = graph.findShortestPath('A', 'B');
      expect(result).toEqual(['A', 'B']);
    });

    it('should find shortest path between distant places', () => {
      const result = graph.findShortestPath('A', 'D');
      expect(result).toHaveLength(3);
      expect(result?.[0]).toBe('A');
      expect(result?.[2]).toBe('D');
      // Should be either A -> B -> D or A -> C -> D
      expect(['B', 'C']).toContain(result?.[1]);
    });

    it('should return null for non-existent source place', () => {
      const result = graph.findShortestPath('nonexistent', 'A');
      expect(result).toBeNull();
    });

    it('should return null for non-existent destination place', () => {
      const result = graph.findShortestPath('A', 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null when no path exists', () => {
      const result = graph.findShortestPath('A', 'isolated');
      expect(result).toBeNull();
    });
  });

  describe('getNextStepToward', () => {
    let graph: PlaceGraph;

    beforeEach(() => {
      const places: PlaceLike[] = [
        { id: 'A', exits: { north: { to: 'B' } } },
        { id: 'B', exits: { south: { to: 'A' }, east: { to: 'C' } } },
        { id: 'C', exits: { west: { to: 'B' } } },
        { id: 'isolated', exits: {} }
      ];
      graph = new PlaceGraph(places);
    });

    it('should return next step in shortest path', () => {
      const result = graph.getNextStepToward('A', 'C');
      expect(result).toBe('B');
    });

    it('should return null when already at destination', () => {
      const result = graph.getNextStepToward('A', 'A');
      expect(result).toBeNull();
    });

    it('should return null when no path exists', () => {
      const result = graph.getNextStepToward('A', 'isolated');
      expect(result).toBeNull();
    });

    it('should return destination when directly connected', () => {
      const result = graph.getNextStepToward('A', 'B');
      expect(result).toBe('B');
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
      const places: PlaceLike[] = [
        { id: 'place1', exits: { north: { to: 'place2' }, south: { to: 'place3' } } },
        { id: 'place2', exits: { south: { to: 'place1' } } },
        { id: 'place3', exits: {} }
      ];
      const graph = new PlaceGraph(places);
      const stats = graph.getStats();

      expect(stats.totalPlaces).toBe(3);
      expect(stats.totalExits).toBe(3);
      expect(stats.avgExitsPerPlace).toBe(1);
      expect(stats.maxExitsPerPlace).toBe(2);
    });
  });
});
