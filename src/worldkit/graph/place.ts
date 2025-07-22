import { Direction } from '~/types/world/space';
import { PlaceURN } from '~/types/taxonomy';
import { Place } from '~/types/entity/place';

/**
 * Spatial neighborhood data for a place
 */
export type SpatialNeighborhood = {
  neighbors: Array<{
    placeId: PlaceURN;
    distance: number;               // Precomputed Euclidean distance in meters
    coordinates: [number, number]; // Cached coordinates (no URN parsing at runtime)
  }>;
  // Performance metadata
  boundingBox: {
    minX: number, maxX: number,
    minY: number, maxY: number
  }; // Early termination for out-of-bounds queries
}

/**
 * Configuration options for PlaceGraph
 */
export type PlaceGraphOptions = {
  maxGraphRadius?: number;     // Maximum radius for precomputed graph topology lookups (default: 4)
  maxSpatialDistance?: number; // Maximum distance in meters for precomputed spatial queries (default: 3000)
}

/**
 * Lightweight precomputed data focused on wolf pack coordination
 * Now includes spatial indexing for coordinate-based proximity
 */
export type PlaceGraphMemoization = {
  /** All places within each distance from each origin (up to maxRadius) */
  radialLookups: Map<PlaceURN, Map<number, string[]>>;
  /** Cached extracted exits for each place (performance optimization) */
  exitCache: Map<string, Record<string, string>>;

  // NEW: High-performance spatial lookups
  /** Precomputed spatial neighborhoods */
  spatialIndex: Map<PlaceURN, SpatialNeighborhood>;
  /** "x,y" -> PlaceURN for O(1) position lookup */
  coordinateIndex: Map<string, PlaceURN>;
  /** "id1:id2" -> distance cache for expensive calculations */
  distanceCache: Map<string, number>;
  /** "gridX,gridY" -> nearby places for grid-aligned search */
  gridIndex: Map<string, PlaceURN[]>;

  // Configuration for runtime optimization
  maxSpatialDistance: number;
  gridSize: number;                // Computed from topology during construction
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
  private readonly topology: Map<PlaceURN, Place>;
  private readonly memo: PlaceGraphMemoization;

  /**
   * Initialize place graph from array of Place entities
   * @param places Array of Place entities
   * @param options Configuration options for graph and spatial indexing
   */
  constructor(places: Place[], options?: PlaceGraphOptions) {
    this.topology = new Map(places.map(place => [place.id as PlaceURN, place]));

    const config = options || {};
    const maxGraphRadius = config.maxGraphRadius ?? 3;
    const maxSpatialDistance = config.maxSpatialDistance ?? 3000;

    // Precompute all spatial relationships and caches
    this.memo = this.buildMemoization(maxGraphRadius, maxSpatialDistance);
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

    for (const [placeId, place] of this.topology) {
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
  private buildMemoization(maxGraphRadius: number, maxSpatialDistance: number): PlaceGraphMemoization {
    // Build exit cache first for performance
    const exitCache = this.buildExitCache();

    // Handle special cases for grid size computation
    let gridSize: number;
    if (this.topology.size === 0) {
      // Empty graph: use default grid size
      gridSize = 300;
    } else if (this.topology.size === 1) {
      // Single place: throw error as this indicates missing connectivity
      throw new Error('Cannot create PlaceGraph with single unconnected place. PlaceGraph requires connected topology for spatial operations.');
    } else {
      // Multi-place graph: compute grid size from topology
      gridSize = this.computeGridSizeFromTopology();
    }

    // Build coordinate and grid indexes
    const coordinateIndex = new Map<string, PlaceURN>();
    const gridIndex = new Map<string, PlaceURN[]>();
    const distanceCache = new Map<string, number>();

    // Populate coordinate and grid indexes
    for (const [placeId, place] of this.topology) {
      const coords = this.getPlaceCoordinates(place);
      coordinateIndex.set(`${coords[0]},${coords[1]}`, placeId);

      // Add to grid index
      const gridX = Math.floor(coords[0] / gridSize);
      const gridY = Math.floor(coords[1] / gridSize);
      const gridKey = `${gridX},${gridY}`;

      if (!gridIndex.has(gridKey)) {
        gridIndex.set(gridKey, []);
      }
      gridIndex.get(gridKey)!.push(placeId);
    }

    // Precompute radial lookups using BFS from each origin
    const radialLookups = new Map<PlaceURN, Map<number, string[]>>();

    for (const [originPlaceId] of this.topology) {

      const originLookups = new Map<number, string[]>();

      // BFS to find all places within maxGraphRadius
      const visited = new Set<string>();
      const queue: Array<{ placeId: PlaceURN; distance: number }> = [
        { placeId: originPlaceId, distance: 0 }
      ];

      // Group places by distance for efficient access
      const placesByDistance = new Map<number, string[]>();
      for (let r = 0; r <= maxGraphRadius; r++) {
        placesByDistance.set(r, []);
      }

      while (queue.length > 0) {
        const { placeId, distance } = queue.shift()!;

        if (visited.has(placeId) || distance > maxGraphRadius) {
          continue;
        }

        visited.add(placeId);
        placesByDistance.get(distance)!.push(placeId);

        // Explore neighbors if we haven't reached max distance
        if (distance < maxGraphRadius) {
          const exits = exitCache.get(placeId) || {};

          const neighborUrns = Object.values(exits) as PlaceURN[];
          for (const neighborId of neighborUrns) {
            if (this.topology.has(neighborId) && !visited.has(neighborId)) {
              queue.push({ placeId: neighborId, distance: distance + 1 });
            }
          }
        }
      }

      // Store cumulative results (places within distance X includes all places within distance < X)
      for (let radius = 0; radius <= maxGraphRadius; radius++) {
        const placesInRadius: string[] = [];
        for (let r = 0; r <= radius; r++) {
          placesInRadius.push(...placesByDistance.get(r)!);
        }
        originLookups.set(radius, placesInRadius);
      }

      radialLookups.set(originPlaceId, originLookups);
    }

    // Build spatial index with precomputed neighborhoods
    const spatialIndex = this.buildSpatialIndex(maxSpatialDistance, gridSize, coordinateIndex, distanceCache);

    return {
      radialLookups,
      exitCache,
      spatialIndex,
      coordinateIndex,
      distanceCache,
      gridIndex,
      maxSpatialDistance,
      gridSize
    };
  }

  /**
   * Compute grid spacing from actual PlaceGraph topology
   * Performance: O(N) during construction, O(1) thereafter
   * Robustness: Adapts to any world generation parameters automatically
   */
  private computeGridSizeFromTopology(): number {
    const placeMap = new Map(Array.from(this.topology.entries()));

    // Find adjacent (non-diagonal) place pairs via graph topology
    for (const [placeId, place] of this.topology) {
      if (!place.exits) continue;

      const currentCoords = this.getPlaceCoordinates(place);

      for (const exit of Object.values(place.exits)) {
        const neighbor = placeMap.get(exit.to);
        if (!neighbor) continue;

        const neighborCoords = this.getPlaceCoordinates(neighbor);

        // Check if this is an adjacent (not diagonal) neighbor
        const dx = Math.abs(neighborCoords[0] - currentCoords[0]);
        const dy = Math.abs(neighborCoords[1] - currentCoords[1]);

        // Adjacent = movement in exactly one axis (horizontal or vertical)
        if ((dx > 0 && dy === 0) || (dx === 0 && dy > 0)) {
          const distance = this.calculateDistanceOptimized(currentCoords, neighborCoords);

          // Validate expected geometry
          if (distance > 50 && distance < 1000) { // Sanity check
            return distance;
          }
        }
      }
    }

    // No adjacent pairs found - this indicates a problem with the topology data
    throw new Error('Could not compute grid size from topology: no adjacent place pairs found with valid exits. This suggests the place data lacks proper connectivity.');
  }

  /**
   * Get coordinates from Place, handling origin special case
   */
  private getPlaceCoordinates(place: Place): [number, number] {
    return place.coordinates;
  }

  /**
   * High-performance distance calculation with SIMD-friendly operations
   */
  private calculateDistanceOptimized(
    coord1: [number, number],
    coord2: [number, number]
  ): number {
    const dx = coord2[0] - coord1[0];
    const dy = coord2[1] - coord1[1];
    // Use Math.hypot for better numerical stability and potential SIMD optimization
    return Math.hypot(dx, dy);
  }

  /**
   * Build spatial index with precomputed neighborhoods
   */
  private buildSpatialIndex(
    maxSpatialDistance: number,
    gridSize: number,
    coordinateIndex: Map<string, PlaceURN>,
    distanceCache: Map<string, number>
  ): Map<PlaceURN, SpatialNeighborhood> {
    const spatialIndex = new Map<PlaceURN, SpatialNeighborhood>();

    for (const [placeId, place] of this.topology) {
      const neighbors = this.findSpatialNeighborsForPlace(
        place, maxSpatialDistance, gridSize, coordinateIndex, distanceCache
      );

      // Compute bounding box for early termination
      const coords = this.getPlaceCoordinates(place);
      const boundingBox = {
        minX: coords[0] - maxSpatialDistance,
        maxX: coords[0] + maxSpatialDistance,
        minY: coords[1] - maxSpatialDistance,
        maxY: coords[1] + maxSpatialDistance
      };

      spatialIndex.set(placeId, { neighbors, boundingBox });
    }

    return spatialIndex;
  }

  /**
   * Find spatial neighbors for a specific place
   */
  private findSpatialNeighborsForPlace(
    place: Place,
    maxDistance: number,
    gridSize: number,
    coordinateIndex: Map<string, PlaceURN>,
    distanceCache: Map<string, number>
  ): Array<{ placeId: PlaceURN; distance: number; coordinates: [number, number] }> {
    const coords = this.getPlaceCoordinates(place);
    const [centerX, centerY] = coords;
    const neighbors = [];

    const gridRadius = Math.ceil(maxDistance / gridSize);

    // Grid-aligned search: only check grid positions
    for (let gx = -gridRadius; gx <= gridRadius; gx++) {
      for (let gy = -gridRadius; gy <= gridRadius; gy++) {
        const x = centerX + (gx * gridSize);
        const y = centerY + (gy * gridSize);

        const coordKey = `${x},${y}`;
        const neighborId = coordinateIndex.get(coordKey);

        if (!neighborId || neighborId === place.id) continue;

        // Use cached distance if available
        const distanceCacheKey = `${place.id}:${neighborId}`;
        let distance = distanceCache.get(distanceCacheKey);

        if (distance === undefined) {
          const neighborCoords = this.getPlaceCoordinates(this.topology.get(neighborId)!);
          distance = this.calculateDistanceOptimized(coords, neighborCoords);
          distanceCache.set(distanceCacheKey, distance);
        }

        if (distance <= maxDistance && distance > 0) {
          const neighborCoords = this.getPlaceCoordinates(this.topology.get(neighborId)!);
          neighbors.push({
            placeId: neighborId,
            distance,
            coordinates: neighborCoords
          });
        }
      }
    }

    // Sort by distance for consistent results
    return neighbors.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get all available exits from a place
   * @returns Record of direction -> destination place ID, or undefined if place not found
   */
  getExits(placeId: PlaceURN): Record<Direction, PlaceURN> | undefined {
    const place = this.topology.get(placeId);
    if (!place) {
      return undefined;
    }
    return this.getExitsFromCache(placeId) as Record<Direction, PlaceURN>;
  }

  /**
   * Get place name for debugging/logging
   */
  getPlaceName(placeId: PlaceURN): string | undefined {
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
   * Uses precomputed radial lookups for maxDistance <= configured radius, falls back to BFS for larger distances
   * @returns Array of place IDs within the specified distance
   */
  getPlacesWithinDistance(originPlaceId: PlaceURN, maxDistance: number): PlaceURN[] {
    if (!this.topology.has(originPlaceId) || maxDistance < 0) {
      return [];
    }

    // Use precomputed data for common distances
    const precomputed = this.memo.radialLookups.get(originPlaceId)?.get(maxDistance);
    if (precomputed !== undefined) {
      return precomputed as PlaceURN[];
    }

    // Fall back to runtime BFS for larger distances (much less common now)
    const visited = new Set<PlaceURN>();
    const queue: Array<{ placeId: PlaceURN; distance: number }> = [
      { placeId: originPlaceId, distance: 0 }
    ];

    const result: PlaceURN[] = [];

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
          const destinationPlaceId = destinationId as PlaceURN;
          if (!visited.has(destinationPlaceId)) {
            queue.push({ placeId: destinationPlaceId, distance: distance + 1 });
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
    if (!this.topology.has(fromPlaceId as PlaceURN) || !this.topology.has(toPlaceId as PlaceURN)) {
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
  getPlace(placeId: PlaceURN): Place | undefined {
    return this.topology.get(placeId);
  }

  /**
   * Get all Place entities
   * @returns Map of all Place entities
   */
  getAllPlaces(): Map<PlaceURN, Place> {
    return this.topology;
  }

  /**
   * Update place entity (for services like WeatherSimulationService)
   * Note: This invalidates exit cache, so exits are re-extracted on next access
   * @param placeId The place ID to update
   * @param updatedPlace The updated Place entity
   */
  updatePlace(placeId: PlaceURN, updatedPlace: Place): void {
    this.topology.set(placeId, updatedPlace);

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
  getPlaceEntitiesWithinDistance(originPlaceId: PlaceURN, maxDistance: number): Place[] {
    const placeIds = this.getPlacesWithinDistance(originPlaceId, maxDistance);
    const result: Place[] = [];

    // Optimized: direct access instead of map+filter
    for (const placeId of placeIds) {
      const place = this.topology.get(placeId);
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

    for (const placeId of this.topology.keys()) {
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

  // ========================================
  // NEW SPATIAL METHODS: Additive enhancements only
  // ========================================

  /**
   * Find all places within spatial distance (meters) from the origin place
   * Uses precomputed spatial index for fast O(1) lookups within configured radius,
   * falls back to grid-aligned search for larger distances
   * @param origin The origin place ID
   * @param maxMeters Maximum distance in meters (default: use configured maxSpatialDistance)
   * @returns Array of places with their distances, sorted by distance
   */
  getSpatialNeighbors(
    origin: PlaceURN,
    maxMeters?: number
  ): Array<{ place: Place; distance: number }> {
    const place = this.topology.get(origin);
    if (!place) {
      return [];
    }

    const searchDistance = maxMeters ?? this.memo.maxSpatialDistance;

    if (searchDistance < 0) {
      return [];
    }

    // Use precomputed spatial index if within configured range
    const precomputed = this.memo.spatialIndex.get(origin);
    if (precomputed && searchDistance <= this.memo.maxSpatialDistance) {
      return precomputed.neighbors
        .filter(n => n.distance <= searchDistance)
        .map(n => ({
          place: this.topology.get(n.placeId)!,
          distance: n.distance
        }));
    }

    // Fallback: grid-aligned search for larger distances
    return this.findSpatialNeighborsRuntime(place, searchDistance);
  }

  /**
   * Get spatial distance between two places in meters
   * @param place1 First place ID
   * @param place2 Second place ID
   * @returns Distance in meters, or undefined if either place doesn't exist
   */
  getSpatialDistance(place1: PlaceURN, place2: PlaceURN): number | undefined {
    const p1 = this.topology.get(place1);
    const p2 = this.topology.get(place2);

    if (!p1 || !p2) {
      return undefined;
    }

    // Check distance cache first
    const cacheKey = `${place1}:${place2}`;
    let distance = this.memo.distanceCache.get(cacheKey);

    if (distance === undefined) {
      const coords1 = this.getPlaceCoordinates(p1);
      const coords2 = this.getPlaceCoordinates(p2);
      distance = this.calculateDistanceOptimized(coords1, coords2);
      this.memo.distanceCache.set(cacheKey, distance);
    }

    return distance;
  }

  /**
   * Get coordinates of a place by ID
   * @param placeId The place ID
   * @returns Coordinates as [x, y] or undefined if place doesn't exist
   */
  getCoordinates(placeId: PlaceURN): [number, number] | undefined {
    const place = this.topology.get(placeId);
    if (!place) {
      return undefined;
    }
    return this.getPlaceCoordinates(place);
  }

  /**
   * Get the computed grid size for debugging and testing
   * @returns Grid size in meters
   */
  getComputedGridSize(): number {
    return this.memo.gridSize;
  }

  /**
   * Runtime spatial neighbor search for distances beyond precomputed range
   * Uses grid-aligned algorithm for efficiency
   */
  private findSpatialNeighborsRuntime(
    place: Place,
    maxDistance: number
  ): Array<{ place: Place; distance: number }> {
    const coords = this.getPlaceCoordinates(place);
    const [centerX, centerY] = coords;
    const neighbors = [];

    const gridRadius = Math.ceil(maxDistance / this.memo.gridSize);

    // Grid-aligned search: check grid cells within radius
    for (let gx = -gridRadius; gx <= gridRadius; gx++) {
      for (let gy = -gridRadius; gy <= gridRadius; gy++) {
        const gridX = Math.floor(centerX / this.memo.gridSize) + gx;
        const gridY = Math.floor(centerY / this.memo.gridSize) + gy;
        const gridKey = `${gridX},${gridY}`;

        const gridPlaces = this.memo.gridIndex.get(gridKey);
        if (!gridPlaces) continue;

        for (const neighborId of gridPlaces) {
          if (neighborId === place.id) continue;

          // Use cached distance if available
          const distanceCacheKey = `${place.id}:${neighborId}`;
          let distance = this.memo.distanceCache.get(distanceCacheKey);

          if (distance === undefined) {
            const neighborPlace = this.topology.get(neighborId)!;
            const neighborCoords = this.getPlaceCoordinates(neighborPlace);
            distance = this.calculateDistanceOptimized(coords, neighborCoords);
            this.memo.distanceCache.set(distanceCacheKey, distance);
          }

          if (distance <= maxDistance && distance > 0) {
            const neighbor = this.topology.get(neighborId);
            if (neighbor) {
              neighbors.push({ place: neighbor, distance });
            }
          }
        }
      }
    }

    // Sort by distance for consistent results
    return neighbors.sort((a, b) => a.distance - b.distance);
  }
}
