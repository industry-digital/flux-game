import { Direction } from '~/types/world/space';
import { PlaceURN } from '~/types/taxonomy';
import { Place } from '~/types/entity/place';

/**
 * Lightweight precomputed data focused on wolf pack coordination
 * Only stores essential spatial relationships, not full distance matrices
 */
export type PlaceGraphMemoization = {
  /** All places within each distance from each origin (up to maxRadius) */
  radialLookups: Map<string, Map<number, string[]>>;
  /** Cached extracted exits for each place (performance optimization) */
  exitCache: Map<string, Record<string, string>>;
}

/**
 * In-memory place topology graph optimized for O(1) spatial queries.
 *
 * Stores only Place entities as single source of truth for both connectivity
 * and full place data. Spatial relationships are extracted from Place.exits.
 *
 * All expensive pathfinding/distance calculations are precomputed once during
 * construction, making runtime spatial queries O(1) lookups.
 *
 * Memory usage for 20k places:
 * - Place entities: ~1KB per place = ~20MB
 * - Radial lookups: ~75MB (increased range)
 * - Exit cache: ~7MB
 * - Total: ~102MB
 *
 * Provides O(1) radial queries (perfect for wolf howl propagation) and keeps
 * runtime pathfinding for movement. Optimized for performance with caching.
 */
export class PlaceGraph {
  public readonly topology: Record<PlaceURN, Place>;
  private readonly memo: PlaceGraphMemoization;

  /**
   * Initialize place graph from array of Place entities
   * @param places Array of Place entities
   * @param maxRadius Maximum radius for precomputed radial lookups (default: 4, increased for better performance)
   */
  constructor(places: Place[], maxRadius: number = 4) {
    this.topology = {};

    // Build topology from Place entities
    for (const place of places) {
      this.topology[place.id as PlaceURN] = place;
    }

    // Precompute all spatial relationships and caches
    this.memo = this.buildMemoization(maxRadius);
  }

  /**
   * Extract connectivity information from Place.exits (cached for performance)
   * @param placeId The place ID to extract exits for
   * @returns Record of direction -> destination place ID
   */
  private getExitsFromCache(placeId: string): Record<string, string> {
    return this.memo.exitCache.get(placeId) || {};
  }

  /**
   * Build exit cache for all places (performance optimization)
   * @returns Map of place ID -> extracted exits
   */
  private buildExitCache(): Map<string, Record<string, string>> {
    const exitCache = new Map<string, Record<string, string>>();

    for (const [placeId, place] of Object.entries(this.topology)) {
      const exits: Record<string, string> = {};

      if (place.exits) {
        for (const [direction, exit] of Object.entries(place.exits)) {
          exits[direction] = exit.to;
        }
      }

      exitCache.set(placeId, exits);
    }

    return exitCache;
  }

  /**
   * Precompute radial lookups and build performance caches
   * Memory-efficient approach with extended precomputed range
   */
  private buildMemoization(maxRadius: number): PlaceGraphMemoization {
    const placeIds = Object.keys(this.topology);

    // Build exit cache first for performance
    const exitCache = this.buildExitCache();

    // Precompute radial lookups using BFS from each origin
    const radialLookups = new Map<string, Map<number, string[]>>();

    for (const origin of placeIds) {
      const originLookups = new Map<number, string[]>();

      // BFS to find all places within maxRadius
      const visited = new Set<string>();
      const queue: Array<{ placeId: string; distance: number }> = [
        { placeId: origin, distance: 0 }
      ];

      // Group places by distance for efficient access
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
          const exits = exitCache.get(placeId) || {};

          for (const neighborId of Object.values(exits)) {
            if (neighborId in this.topology && !visited.has(neighborId)) {
              queue.push({ placeId: neighborId, distance: distance + 1 });
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
        originLookups.set(radius, placesInRadius);
      }

      radialLookups.set(origin, originLookups);
    }

    return { radialLookups, exitCache };
  }

  /**
   * Get all available exits from a place
   * @returns Record of direction -> destination place ID, or undefined if place not found
   */
  getExits(placeId: string): Record<Direction, PlaceURN> | undefined {
    const place = this.topology[placeId as PlaceURN];
    if (!place) {
      return undefined;
    }
    return this.getExitsFromCache(placeId) as Record<Direction, PlaceURN>;
  }

  /**
   * Get place name for debugging/logging
   */
  getPlaceName(placeId: string): string | undefined {
    const place = this.topology[placeId as PlaceURN];
    return place?.name;
  }

  /**
   * Get total number of places in the graph
   */
  size(): number {
    return Object.keys(this.topology).length;
  }

  /**
   * Get all place IDs in the graph
   */
  getAllPlaceIds(): string[] {
    return Object.keys(this.topology);
  }

  /**
   * Find all places within maxDistance exits from the origin place
   * Uses precomputed radial lookups for maxDistance <= configured radius, falls back to BFS for larger distances
   * @returns Array of place IDs within the specified distance
   */
  getPlacesWithinDistance(originPlaceId: string, maxDistance: number): string[] {
    if (!(originPlaceId in this.topology) || maxDistance < 0) {
      return [];
    }

    // Use precomputed data for common distances
    const precomputed = this.memo.radialLookups.get(originPlaceId)?.get(maxDistance);
    if (precomputed !== undefined) {
      return precomputed;
    }

    // Fall back to runtime BFS for larger distances (much less common now)
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
        const exits = this.getExitsFromCache(placeId);
        for (const destinationId of Object.values(exits)) {
          if (!visited.has(destinationId)) {
            queue.push({ placeId: destinationId, distance: distance + 1 });
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
    if (!(fromPlaceId in this.topology) || !(toPlaceId in this.topology)) {
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

      const exits = this.getExitsFromCache(placeId);
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
   * Get full Place entity by ID
   * @returns Place entity or undefined if not found
   */
  getPlace(placeId: string): Place | undefined {
    return this.topology[placeId as PlaceURN];
  }

  /**
   * Get all Place entities
   * @returns Array of all Place entities
   */
  getAllPlaces(): Place[] {
    return Object.values(this.topology);
  }

  /**
   * Update place entity (for services like WeatherSimulationService)
   * Note: This invalidates exit cache, so exits are re-extracted on next access
   * @param placeId The place ID to update
   * @param updatedPlace The updated Place entity
   */
  updatePlace(placeId: string, updatedPlace: Place): void {
    this.topology[placeId as PlaceURN] = updatedPlace;

    // Update exit cache if exits changed
    const exits: Record<string, string> = {};
    if (updatedPlace.exits) {
      for (const [direction, exit] of Object.entries(updatedPlace.exits)) {
        exits[direction] = exit.to;
      }
    }
    this.memo.exitCache.set(placeId, exits);
  }

  /**
   * Get place entities within distance (optimized version)
   * @param originPlaceId The origin place ID
   * @param maxDistance Maximum distance to search
   * @returns Array of Place entities within the specified distance
   */
  getPlaceEntitiesWithinDistance(originPlaceId: string, maxDistance: number): Place[] {
    const placeIds = this.getPlacesWithinDistance(originPlaceId, maxDistance);
    const result: Place[] = [];

    // Optimized: direct access instead of map+filter
    for (const placeId of placeIds) {
      const place = this.topology[placeId as PlaceURN];
      if (place) {
        result.push(place);
      }
    }

    return result;
  }

  /**
   * Debug method to get topology statistics
   */
  getStats(): {
    totalPlaces: number;
    totalExits: number;
    avgExitsPerPlace: number;
    maxExitsPerPlace: number;
    cacheHitRate?: number;
  } {
    let totalExits = 0;
    let maxExits = 0;

    for (const placeId of Object.keys(this.topology)) {
      const exits = this.getExitsFromCache(placeId);
      const exitCount = Object.keys(exits).length;
      totalExits += exitCount;
      maxExits = Math.max(maxExits, exitCount);
    }

    return {
      totalPlaces: this.size(),
      totalExits,
      avgExitsPerPlace: this.size() > 0 ? totalExits / this.size() : 0,
      maxExitsPerPlace: maxExits
    };
  }
}
