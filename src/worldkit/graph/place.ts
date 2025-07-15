import { Direction } from '~/types/world/space';
import { PlaceURN } from '~/types/taxonomy';

/**
 * Lightweight place topology node containing only connectivity information
 */
export type PlaceNode = {
  id: string;
  name?: string;
  exits: Record<string, string>; // direction -> destination place ID
}

/**
 * Place entity interface (matches your domain Place type)
 */
export type PlaceLike = {
  id: string;
  name?: string;
  exits?: Record<string, { to: string }>;
}

/**
 * Lightweight precomputed data focused on wolf pack coordination
 * Only stores essential spatial relationships, not full distance matrices
 */
export type PlaceGraphMemoization = {
  /** All places within each distance from each origin (up to maxRadius) */
  radialLookups: Map<string, Map<number, string[]>>;
}

/**
 * In-memory place topology graph optimized for O(1) spatial queries.
 *
 * Stores only the connectivity information (place ID -> exits mapping),
 * not full place state or entities within places.
 *
 * All expensive pathfinding/distance calculations are precomputed once during
 * construction, making runtime spatial queries O(1) lookups.
 *
    * Memory usage for 20k places:
 * - Topology: ~350 bytes per place = ~7MB
 * - Radial lookups: ~(N × maxRadius × avgPlacesInRadius × 32) = ~50MB
 * - Total: ~57MB
 *
 * Provides O(1) radial queries (perfect for wolf howl propagation) and keeps
 * runtime pathfinding for movement. Much more memory-efficient approach.
 */
export class PlaceGraph {
  private readonly topology: Map<string, PlaceNode>;
  private readonly memo: PlaceGraphMemoization;

  /**
   * Initialize place graph from array of Place entities
   * @param places Array of place-like objects with connectivity information
   * @param maxRadius Maximum radius for precomputed radial lookups (default: 2)
   */
  constructor(places: PlaceLike[], maxRadius: number = 2) {
    this.topology = new Map();

    // Build topology first
    for (const place of places) {
      // Convert place exits format to simplified topology format
      const exits: Record<string, string> = {};

      if (place.exits) {
        for (const [direction, exit] of Object.entries(place.exits)) {
          exits[direction] = exit.to;
        }
      }

      this.topology.set(place.id, {
        id: place.id,
        name: place.name,
        exits
      });
    }

    // Precompute all spatial relationships
    this.memo = this.buildMemoization(maxRadius);
  }

      /**
   * Precompute only radial lookups using BFS from each origin
   * Memory-efficient approach focused on wolf pack coordination needs
   */
  private buildMemoization(maxRadius: number): PlaceGraphMemoization {
    const placeIds = Array.from(this.topology.keys());

    // Precompute radial lookups using BFS from each origin
    const radialLookups = new Map<string, Map<number, string[]>>();

    for (const origin of placeIds) {
      radialLookups.set(origin, new Map());

      // BFS to find all places within maxRadius
      const visited = new Set<string>();
      const queue: Array<{ placeId: string; distance: number }> = [
        { placeId: origin, distance: 0 }
      ];

      // Group places by distance
      const placesByDistance = new Map<number, string[]>();
      for (let r = 0; r <= maxRadius; r++) {
        placesByDistance.set(r, []);
      }

      while (queue.length > 0) {
        const { placeId, distance } = queue.shift()!;

        if (visited.has(placeId) || distance > maxRadius) {
          continue;
        }

        visited.add(placeId);
        placesByDistance.get(distance)!.push(placeId);

        // Explore neighbors if we haven't reached max distance
        if (distance < maxRadius) {
          const exits = this.topology.get(placeId)?.exits;
          if (exits) {
            for (const neighborId of Object.values(exits)) {
              if (this.topology.has(neighborId) && !visited.has(neighborId)) {
                queue.push({ placeId: neighborId, distance: distance + 1 });
              }
            }
          }
        }
      }

      // Store cumulative results (places within distance X includes all places within distance < X)
      for (let radius = 0; radius <= maxRadius; radius++) {
        const placesInRadius: string[] = [];
        for (let r = 0; r <= radius; r++) {
          placesInRadius.push(...placesByDistance.get(r)!);
        }
        radialLookups.get(origin)!.set(radius, placesInRadius);
      }
    }

    return { radialLookups };
  }

  /**
   * Get all available exits from a place
   * @returns Record of direction -> destination place ID, or undefined if place not found
   */
  getExits(placeId: string): Record<Direction, PlaceURN> | undefined {
    return this.topology.get(placeId)?.exits as Record<Direction, PlaceURN> | undefined;
  }

    /**
   * Get place name for debugging/logging
   */
  getPlaceName(placeId: string): string | undefined {
    return this.topology.get(placeId)?.name;
  }

  /**
   * Get total number of places in the graph
   */
  size(): number {
    return this.topology.size;
  }

  /**
   * Get all place IDs in the graph
   */
  getAllPlaceIds(): string[] {
    return Array.from(this.topology.keys());
  }

  /**
   * Find all places within maxDistance exits from the origin place
   * Uses precomputed radial lookups for maxDistance <= 2, falls back to BFS for larger distances
   * @returns Array of place IDs within the specified distance
   */
  getPlacesWithinDistance(originPlaceId: string, maxDistance: number): string[] {
    if (!this.topology.has(originPlaceId) || maxDistance < 0) {
      return [];
    }

    // Use precomputed data for common distances (howl range)
    const precomputed = this.memo.radialLookups.get(originPlaceId)?.get(maxDistance);
    if (precomputed !== undefined) {
      return precomputed;
    }

    // Fall back to runtime BFS for larger distances
    const visited = new Set<string>();
    const queue: Array<{ placeId: string; distance: number }> = [
      { placeId: originPlaceId, distance: 0 }
    ];
    const result: string[] = [];

    while (queue.length > 0) {
      const { placeId, distance } = queue.shift()!;

      if (visited.has(placeId)) {
        continue;
      }

      visited.add(placeId);
      result.push(placeId);

      // Only explore further if we haven't reached max distance
      if (distance < maxDistance) {
        const exits = this.getExits(placeId);
        if (exits) {
          for (const destinationId of Object.values(exits)) {
            if (!visited.has(destinationId)) {
              queue.push({ placeId: destinationId, distance: distance + 1 });
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Find the shortest path between two places
   * @returns Array of place IDs representing the path, or null if no path exists
   */
  findShortestPath(fromPlaceId: string, toPlaceId: string): string[] | null {
    if (!this.topology.has(fromPlaceId) || !this.topology.has(toPlaceId)) {
      return null;
    }

    if (fromPlaceId === toPlaceId) {
      return [fromPlaceId];
    }

    const visited = new Set<string>();
    const queue: Array<{ placeId: string; path: string[] }> = [
      { placeId: fromPlaceId, path: [fromPlaceId] }
    ];

    while (queue.length > 0) {
      const { placeId, path } = queue.shift()!;

      if (visited.has(placeId)) {
        continue;
      }

      visited.add(placeId);

      const exits = this.getExits(placeId);
      if (exits) {
        for (const destinationId of Object.values(exits)) {
          if (destinationId === toPlaceId) {
            return [...path, destinationId];
          }

          if (!visited.has(destinationId)) {
            queue.push({
              placeId: destinationId,
              path: [...path, destinationId]
            });
          }
        }
      }
    }

    return null; // No path found
  }

  /**
   * Get the next place to move toward a destination
   * @returns The next place ID in the shortest path, or null if no path exists
   */
  getNextStepToward(fromPlaceId: string, toPlaceId: string): string | null {
    const path = this.findShortestPath(fromPlaceId, toPlaceId);
    return path && path.length > 1 ? path[1] : null;
  }

  /**
   * Debug method to get topology statistics
   */
  getStats(): {
    totalPlaces: number;
    totalExits: number;
    avgExitsPerPlace: number;
    maxExitsPerPlace: number;
  } {
    let totalExits = 0;
    let maxExits = 0;

    for (const node of this.topology.values()) {
      const exitCount = Object.keys(node.exits).length;
      totalExits += exitCount;
      maxExits = Math.max(maxExits, exitCount);
    }

    return {
      totalPlaces: this.topology.size,
      totalExits,
      avgExitsPerPlace: this.topology.size > 0 ? totalExits / this.topology.size : 0,
      maxExitsPerPlace: maxExits
    };
  }
}
