/**
 * Optimized geometric Lichtenberg figure generation
 * Time complexity: O(N log N) with memory-for-speed optimizations
 * All impurities are injected for testability
 */

// Re-export the core types from the original implementation
export type {
  LichtenbergVertex,
  LichtenbergConnection,
  LichtenbergFigure,
  LichtenbergConfig
} from './lichtenberg';

// Dependency injection interfaces for all impurities
export interface RandomGenerator {
  random(): number;
}

export interface TrigonometricProvider {
  cos(angle: number): number;
  sin(angle: number): number;
}

export interface SpatialIndex {
  addBoundary(x: number, boundaryIndex: number): void;
  getNearbyBoundaries(x: number, y: number): number[];
}

export interface PerformanceOptimizations {
  randomGenerator: RandomGenerator;
  trigProvider: TrigonometricProvider;
  spatialIndex: SpatialIndex;
  preallocatedArraySize: number;
}

// Optimized batch random number generator
export class BatchRandomGenerator implements RandomGenerator {
  private seed: number;

  constructor(seed: number, batchSize = 1000) {
    this.seed = seed;
  }

  random(): number {
    const x = Math.sin(this.seed++) * 10000;
    return x - Math.floor(x);
  }
}

// Lookup table trigonometric provider
export class LookupTableTrigProvider implements TrigonometricProvider {
  private cosTable: Float32Array;
  private sinTable: Float32Array;
  private precision: number;

  constructor(precision = 10000) {
    this.precision = precision;
    this.cosTable = new Float32Array(precision);
    this.sinTable = new Float32Array(precision);

    for (let i = 0; i < precision; i++) {
      const angle = (i / precision) * 2 * Math.PI;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
  }

  cos(angle: number): number {
    const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const index = Math.floor((normalizedAngle / (2 * Math.PI)) * this.precision);
    return this.cosTable[Math.min(index, this.precision - 1)];
  }

  sin(angle: number): number {
    const normalizedAngle = ((angle % (2 * Math.PI)) + (2 * Math.PI)) % (2 * Math.PI);
    const index = Math.floor((normalizedAngle / (2 * Math.PI)) * this.precision);
    return this.sinTable[Math.min(index, this.precision - 1)];
  }
}

// Grid-based spatial index for O(1) boundary lookups
export class GridSpatialIndex implements SpatialIndex {
  private grid = new Map<string, number[]>();
  private cellSize: number;

  constructor(cellSize = 100) {
    this.cellSize = cellSize;
  }

  addBoundary(x: number, boundaryIndex: number): void {
    const key = this.getCellKey(x, 0);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key)!.push(boundaryIndex);
  }

  getNearbyBoundaries(x: number, y: number): number[] {
    const key = this.getCellKey(x, y);
    return this.grid.get(key) || [];
  }

  private getCellKey(x: number, y: number): string {
    const cellX = Math.floor(x / this.cellSize);
    const cellY = Math.floor(y / this.cellSize);
    return `${cellX},${cellY}`;
  }
}

// Optimized vertex and connection storage
class OptimizedStorage {
  public vertices: LichtenbergVertex[];
  public connections: LichtenbergConnection[];
  public vertexMap = new Map<string, number>(); // id -> array index
  public vertexCount = 0;
  public connectionCount = 0;

  constructor(capacity: number) {
    this.vertices = new Array(capacity);
    this.connections = new Array(capacity * 2); // Estimate 2 connections per vertex
  }

  addVertex(vertex: LichtenbergVertex): void {
    this.vertices[this.vertexCount] = vertex;
    this.vertexMap.set(vertex.id, this.vertexCount);
    this.vertexCount++;
  }

  addConnection(connection: LichtenbergConnection): void {
    this.connections[this.connectionCount] = connection;
    this.connectionCount++;
  }

  getVertexById(id: string): LichtenbergVertex | undefined {
    const index = this.vertexMap.get(id);
    return index !== undefined ? this.vertices[index] : undefined;
  }

  getVerticesSlice(): LichtenbergVertex[] {
    return this.vertices.slice(0, this.vertexCount);
  }

  getConnectionsSlice(): LichtenbergConnection[] {
    return this.connections.slice(0, this.connectionCount);
  }
}

// Import types from original implementation
import type { LichtenbergConfig, LichtenbergFigure, LichtenbergVertex, LichtenbergConnection } from './lichtenberg';

// Optimized Lichtenberg figure generation
export function generateOptimizedLichtenbergFigure(
  config: LichtenbergConfig,
  optimizations: PerformanceOptimizations,
  sparkDepth: number = 0
): LichtenbergFigure {
  const { randomGenerator, trigProvider, spatialIndex } = optimizations;

  // Pre-allocate storage with estimated capacity
  const storage = new OptimizedStorage(optimizations.preallocatedArraySize);

  // Initialize spatial index with boundary points
  if (config.sparking?.sparkingConditions.boundaryPoints) {
    config.sparking.sparkingConditions.boundaryPoints.forEach((boundaryX: any, index: number) => {
      spatialIndex.addBoundary(boundaryX * config.width, index);
    });
  }

  // Start with the initial vertex
  let vertexCounter = 0;
  const startVertex: LichtenbergVertex = {
    x: config.startX,
    y: config.startY,
    id: `vertex_${vertexCounter++}`
  };
  storage.addVertex(startVertex);

  // Queue for breadth-first generation
  const queue: Array<{ vertexIndex: number; depth: number }> = [{ vertexIndex: 0, depth: 0 }];

  while (queue.length > 0) {
    const { vertexIndex, depth } = queue.shift()!;
    const currentVertex = storage.vertices[vertexIndex];

    // Stop if we've reached max depth or max vertices
    if (depth >= config.maxDepth) continue;
    if (config.maxVertices && storage.vertexCount >= config.maxVertices) break;

    // Determine number of branches with soft minVertices adjustment
    let adjustedBranchingFactor = config.branchingFactor;
    if (config.minVertices && storage.vertexCount < config.minVertices * 0.8) {
      adjustedBranchingFactor = Math.min(1.0, config.branchingFactor * 1.5);
    }

    const branchCount = randomGenerator.random() < adjustedBranchingFactor ?
      Math.floor(randomGenerator.random() * 3) + 1 : 0;

    for (let i = 0; i < branchCount; i++) {
      // Check maxVertices before creating each new vertex
      if (config.maxVertices && storage.vertexCount >= config.maxVertices) break;

      // Calculate branch direction with optimized trigonometry
      const angle = calculateOptimizedFishSpineAngle(
        currentVertex, config, randomGenerator, trigProvider, depth
      );

      // Calculate new position using lookup tables
      const newX = currentVertex.x + trigProvider.cos(angle) * config.stepSize;
      const newY = currentVertex.y + trigProvider.sin(angle) * config.stepSize;

      // Check bounds
      if (newX < 0 || newX >= config.width || newY < 0 || newY >= config.height) {
        continue;
      }

      // Create new vertex
      const newVertex: LichtenbergVertex = {
        x: newX,
        y: newY,
        id: `vertex_${vertexCounter++}`,
        parentId: currentVertex.id
      };

      storage.addVertex(newVertex);

      // Create connection
      const connection: LichtenbergConnection = {
        from: currentVertex.id,
        to: newVertex.id,
        length: config.stepSize
      };
      storage.addConnection(connection);

      // Add to queue for further branching
      queue.push({ vertexIndex: storage.vertexCount - 1, depth: depth + 1 });
    }
  }

  // Handle recursive sparking with optimized merging
  if (config.sparking?.enabled && sparkDepth < (config.sparking.maxSparkDepth || 0)) {
    const currentVertices = storage.getVerticesSlice();

    for (const vertex of currentVertices) {
      const willSpark = shouldSparkOptimized(vertex, config, randomGenerator, spatialIndex, storage.vertexCount);
      if (!willSpark) continue;

      // Check maxVertices limit
      if (config.maxVertices && storage.vertexCount >= config.maxVertices) break;

      const sparkConfig = createOptimizedSparkConfig(vertex, config, randomGenerator);
      const sparkFigure = generateOptimizedLichtenbergFigure(sparkConfig, optimizations, sparkDepth + 1);

      // Optimized merging with O(M) complexity instead of O(M²)
      mergeSparkFigureOptimized(storage, sparkFigure, config.maxVertices);
    }
  }

  return {
    vertices: storage.getVerticesSlice(),
    connections: storage.getConnectionsSlice()
  };
}

// Optimized angle calculation with injected trigonometry
function calculateOptimizedFishSpineAngle(
  currentVertex: LichtenbergVertex,
  config: LichtenbergConfig,
  rng: RandomGenerator,
  trigProvider: TrigonometricProvider,
  depth: number
): number {
  let baseAngle = 0; // Default east

  if (config.sparking?.fishSpineBias) {
    const fishBias = config.sparking.fishSpineBias;
    const spineProgress = currentVertex.x / config.width;

    if (depth === 0) {
      // Main spine - strongly eastward with slight curvature
      baseAngle = 0 + (rng.random() - 0.5) * (1 - fishBias) * 0.2;
    } else {
      // Ribs - perpendicular to spine with fish-like structure
      const ribAngle = rng.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      const ribCurvature = (rng.random() - 0.5) * 0.3;

      // Ribs get more angled toward east as spine progresses
      const eastwardRibBias = spineProgress * fishBias * 0.5;
      baseAngle = ribAngle + ribCurvature + (ribAngle > 0 ? eastwardRibBias : -eastwardRibBias);
    }
  } else {
    // Standard directional bias logic
    baseAngle = 0;

    // Add vertical bias
    if (config.verticalBias) {
      baseAngle = rng.random() < config.verticalBias ?
        (rng.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : 0;
    }

    // Apply eastward bias
    baseAngle = baseAngle + (rng.random() - 0.5) * (1 - config.eastwardBias) * Math.PI;
  }

  // Add random angle variation
  return baseAngle + (rng.random() - 0.5) * config.branchingAngle;
}

// Optimized sparking decision with spatial indexing
function shouldSparkOptimized(
  vertex: LichtenbergVertex,
  config: LichtenbergConfig,
  rng: RandomGenerator,
  spatialIndex: SpatialIndex,
  currentVertexCount: number
): boolean {
  if (!config.sparking?.enabled) return false;

  const conditions = config.sparking.sparkingConditions;

  // Soft minVertices: increase sparking probability if below target
  let adjustedProbability = config.sparking.probability;
  if (config.minVertices && currentVertexCount < config.minVertices * 0.7) {
    adjustedProbability = Math.min(1.0, config.sparking.probability * 2.0);
  }

  // Random sparking
  if (conditions.randomSparking && rng.random() < adjustedProbability) {
    return true;
  }

  // Optimized boundary point sparking using spatial index
  const nearbyBoundaries = spatialIndex.getNearbyBoundaries(vertex.x, vertex.y);
  if (nearbyBoundaries.length > 0) {
    const normalizedX = vertex.x / config.width;

    for (const boundaryIndex of nearbyBoundaries) {
      const boundaryX = conditions.boundaryPoints[boundaryIndex];
      if (Math.abs(normalizedX - boundaryX) < 0.02) {
        return rng.random() < adjustedProbability;
      }
    }
  }

  return false;
}

// Optimized spark configuration creation
function createOptimizedSparkConfig(
  sparkVertex: LichtenbergVertex,
  parentConfig: LichtenbergConfig,
  rng: RandomGenerator
): LichtenbergConfig {
  // Generate a deterministic seed based on parent seed and vertex position
  const sparkSeed = (parentConfig.seed || 0) + Math.floor(sparkVertex.x) + Math.floor(sparkVertex.y);

  return {
    ...parentConfig,
    startX: sparkVertex.x,
    startY: sparkVertex.y,
    branchingFactor: parentConfig.branchingFactor * 0.7,
    maxDepth: Math.floor(parentConfig.maxDepth * 0.5),
    stepSize: parentConfig.stepSize * 0.8,
    seed: sparkSeed,

    // Scale down vertex constraints for sparked figures
    minVertices: parentConfig.minVertices ? Math.floor(parentConfig.minVertices * 0.3) : undefined,
    maxVertices: parentConfig.maxVertices ? Math.floor(parentConfig.maxVertices * 0.5) : undefined,

    sparking: {
      ...parentConfig.sparking!,
      probability: parentConfig.sparking!.probability * 0.5,
    }
  };
}

// Optimized O(M) figure merging instead of O(M²)
function mergeSparkFigureOptimized(
  storage: OptimizedStorage,
  sparkFigure: LichtenbergFigure,
  maxVertices?: number
): void {
  const remainingCapacity = maxVertices ? maxVertices - storage.vertexCount : sparkFigure.vertices.length;
  const verticesToAdd = sparkFigure.vertices.slice(0, remainingCapacity);

  // O(M) vertex ID set creation for fast lookups
  const vertexIdSet = new Set(verticesToAdd.map((v: any) => v.id));

  // O(M) connection filtering instead of O(M²)
  const connectionsToAdd = sparkFigure.connections.filter((conn: any) =>
    vertexIdSet.has(conn.from) && vertexIdSet.has(conn.to)
  );

  // Add vertices and connections to storage
  for (const vertex of verticesToAdd) {
    storage.addVertex(vertex);
  }

  for (const connection of connectionsToAdd) {
    storage.addConnection(connection);
  }
}

// Factory function for creating default optimizations
export function createDefaultOptimizations(
  seed: number,
  preallocatedArraySize = 10000
): PerformanceOptimizations {
  return {
    randomGenerator: new BatchRandomGenerator(seed),
    trigProvider: new LookupTableTrigProvider(),
    spatialIndex: new GridSpatialIndex(),
    preallocatedArraySize
  };
}

// Convenience function that mirrors the original API
export function generateLichtenbergFigureOptimized(
  config: LichtenbergConfig,
  seed?: number
): LichtenbergFigure {
  const actualSeed = seed ?? config.seed ?? Date.now();
  const optimizations = createDefaultOptimizations(
    actualSeed,
    config.maxVertices || 10000
  );

  return generateOptimizedLichtenbergFigure(config, optimizations);
}
