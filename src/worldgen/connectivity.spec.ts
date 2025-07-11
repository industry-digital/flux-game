/**
 * Unit tests for worldgen connectivity preservation
 * Ensures that ecosystem connectivity adjustments never orphan subgraphs
 */

import { describe, it, expect } from 'vitest';
import { Place } from '~/types';
import { Direction } from '~/types/world/space';
import { EcosystemName } from './types';

// Test helper to create a mock place
function createMockPlace(id: string, name: string, ecosystem: EcosystemName): Place {
  return {
    id: id as PlaceURN,
    name,
    description: `A ${ecosystem} location`,
    exits: {},
    entities: {},
    ecology: {
      ecosystem: `flux:eco:${ecosystem}` as any,
      temperature: [10, 30],
      pressure: [1000, 1020],
      humidity: [40, 60]
    },
    weather: {
      temperature: 20,
      pressure: 1013,
      humidity: 50,
      precipitation: 0,
      ppfd: 1000,
      clouds: 20,
      ts: Date.now()
    },
    resources: {
      generators: []
    },
    entityType: 'place' as any,
    namespace: 'flux' as any,
    urn: id as PlaceURN
  };
}

// Test helper to create bidirectional connection
function connectPlaces(place1: Place, place2: Place, direction1: Direction, direction2: Direction): void {
  place1.exits[direction1] = {
    direction: direction1,
    label: `Path to ${place2.name}`,
    to: place2.id
  };

  place2.exits[direction2] = {
    direction: direction2,
    label: `Path to ${place1.name}`,
    to: place1.id
  };
}

// Test helper to check if graph is connected
function isGraphConnected(places: Place[]): boolean {
  if (places.length <= 1) return true;

  const visited = new Set<string>();
  const queue = [places[0].id];
  visited.add(places[0].id);

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const currentPlace = places.find(p => p.id === currentId);

    if (currentPlace) {
      Object.values(currentPlace.exits).forEach(exit => {
        if (!visited.has(exit.to)) {
          visited.add(exit.to);
          queue.push(exit.to);
        }
      });
    }
  }

  return visited.size === places.length;
}

// Test helper that simulates the connection removal logic
function removeRandomConnections(place: Place, count: number, allPlaces: Place[]): number {
  const exitDirections = Object.keys(place.exits) as Direction[];
  let removed = 0;
  const shuffledDirections = [...exitDirections].sort(() => Math.random() - 0.5);

  for (const direction of shuffledDirections) {
    if (removed >= count) break;

    const exit = place.exits[direction];
    if (!exit) continue;

    // Temporarily remove the connection
    delete place.exits[direction];

    // Check if the graph is still connected
    if (isGraphConnected(allPlaces)) {
      // Safe to remove - graph stays connected
      removed++;
    } else {
      // This is a bridge connection - restore it
      place.exits[direction] = exit;
    }
  }

  return removed;
}

describe('Worldgen Connectivity Preservation', () => {
  describe('Graph Connectivity Detection', () => {
    it('should detect connected simple chain', () => {
      const places = [
        createMockPlace('place1', 'Forest A', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place2', 'Forest B', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place3', 'Forest C', EcosystemName.FOREST_TEMPERATE)
      ];

      // A -> B -> C
      connectPlaces(places[0], places[1], Direction.EAST, Direction.WEST);
      connectPlaces(places[1], places[2], Direction.EAST, Direction.WEST);

      expect(isGraphConnected(places)).toBe(true);
    });

    it('should detect disconnected graph', () => {
      const places = [
        createMockPlace('place1', 'Forest A', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place2', 'Forest B', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place3', 'Forest C', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place4', 'Forest D', EcosystemName.FOREST_TEMPERATE)
      ];

      // A -> B  (isolated from C -> D)
      connectPlaces(places[0], places[1], Direction.EAST, Direction.WEST);
      connectPlaces(places[2], places[3], Direction.EAST, Direction.WEST);

      expect(isGraphConnected(places)).toBe(false);
    });

    it('should handle single node as connected', () => {
      const places = [createMockPlace('place1', 'Forest A', EcosystemName.FOREST_TEMPERATE)];
      expect(isGraphConnected(places)).toBe(true);
    });

    it('should handle empty graph', () => {
      expect(isGraphConnected([])).toBe(true);
    });
  });

  describe('Bridge Connection Preservation', () => {
    it('should preserve bridge connections that maintain connectivity', () => {
      const places = [
        createMockPlace('place1', 'Forest A', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place2', 'Forest B', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place3', 'Forest C', EcosystemName.FOREST_TEMPERATE)
      ];

      // Linear chain: A - B - C (B-C is a bridge)
      connectPlaces(places[0], places[1], Direction.EAST, Direction.WEST);
      connectPlaces(places[1], places[2], Direction.EAST, Direction.WEST);

      const initialConnections = Object.keys(places[1].exits).length; // B has 2 connections

      // Try to remove 1 connection from B
      const removed = removeRandomConnections(places[1], 1, places);

      // Should remove 0 connections because both are bridges
      expect(removed).toBe(0);
      expect(Object.keys(places[1].exits).length).toBe(initialConnections);
      expect(isGraphConnected(places)).toBe(true);
    });

    it('should allow removal of non-bridge connections', () => {
      const places = [
        createMockPlace('place1', 'Forest A', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place2', 'Forest B', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place3', 'Forest C', EcosystemName.FOREST_TEMPERATE)
      ];

      // Triangle: A - B - C - A (redundant connections)
      connectPlaces(places[0], places[1], Direction.EAST, Direction.WEST);
      connectPlaces(places[1], places[2], Direction.EAST, Direction.WEST);
      connectPlaces(places[2], places[0], Direction.WEST, Direction.EAST);

      const initialConnections = Object.keys(places[0].exits).length; // A has 2 connections

      // Try to remove 1 connection from A
      const removed = removeRandomConnections(places[0], 1, places);

      // Should successfully remove 1 connection (triangle allows redundancy)
      expect(removed).toBe(1);
      expect(Object.keys(places[0].exits).length).toBe(initialConnections - 1);
      expect(isGraphConnected(places)).toBe(true);
    });

    it('should never create isolated nodes', () => {
      // Test with various graph topologies
      const testCases = [
        // Linear chain
        { connections: [[0,1], [1,2], [2,3]], removeFrom: 1, removeCount: 1 },
        // Star topology
        { connections: [[0,1], [0,2], [0,3], [0,4]], removeFrom: 0, removeCount: 2 },
        // Tree structure
        { connections: [[0,1], [1,2], [1,3], [2,4], [3,5]], removeFrom: 1, removeCount: 1 }
      ];

      testCases.forEach((testCase, index) => {
        const places = Array.from({ length: 6 }, (_, i) =>
          createMockPlace(`place${i}`, `Node ${i}`, EcosystemName.FOREST_TEMPERATE)
        );

        // Create connections
        testCase.connections.forEach(([from, to]) => {
          connectPlaces(places[from], places[to], Direction.NORTH, Direction.SOUTH);
        });

        // Verify initial connectivity
        expect(isGraphConnected(places.slice(0, Math.max(...testCase.connections.flat()) + 1))).toBe(true);

        // Try to remove connections
        const activeNodeCount = Math.max(...testCase.connections.flat()) + 1;
        const activePlaces = places.slice(0, activeNodeCount);
        removeRandomConnections(places[testCase.removeFrom], testCase.removeCount, activePlaces);

        // Verify connectivity is preserved
        expect(isGraphConnected(activePlaces)).toBe(true);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle place with no connections', () => {
      const places = [createMockPlace('place1', 'Forest A', EcosystemName.FOREST_TEMPERATE)];

      const removed = removeRandomConnections(places[0], 5, places);

      expect(removed).toBe(0);
      expect(isGraphConnected(places)).toBe(true);
    });

    it('should handle removal request larger than available connections', () => {
      const places = [
        createMockPlace('place1', 'Forest A', EcosystemName.FOREST_TEMPERATE),
        createMockPlace('place2', 'Forest B', EcosystemName.FOREST_TEMPERATE)
      ];

      connectPlaces(places[0], places[1], Direction.EAST, Direction.WEST);

      // Try to remove more connections than exist
      const removed = removeRandomConnections(places[0], 10, places);

      // Should not remove the only connection (it's a bridge)
      expect(removed).toBe(0);
      expect(Object.keys(places[0].exits).length).toBe(1);
      expect(isGraphConnected(places)).toBe(true);
    });
  });
});
