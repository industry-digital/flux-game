/**
 * Realistic Lichtenberg figure generation
 * Physics-based electrical discharge simulation with field-based frontier sampling
 * Based on electrical field physics rather than geometric branching
 */

// Core types for Lichtenberg figure generation
export type LichtenbergVertex = {
  x: number;
  y: number;
  id: string;
  parentId?: string;
};

export type LichtenbergConnection = {
  from: string;
  to: string;
  length: number;
  artificial?: boolean;  // Mark artificial inter-ecosystem connections
  ecosystemTransition?: {
    from: string;
    to: string;
  };
};

export type LichtenbergFigure = {
  vertices: LichtenbergVertex[];
  connections: LichtenbergConnection[];
};

export type LichtenbergConfig = {
  startX: number;
  startY: number;
  width: number;
  height: number;
  branchingFactor: number;    // Probability of branching (0-1)
  branchingAngle: number;     // Max angle deviation in radians
  stepSize: number;           // Distance between vertices
  maxDepth: number;           // Maximum branching depth
  eastwardBias: number;       // Bias toward eastward propagation (0-1)
  verticalBias?: number;      // Bias toward vertical directions (0-1)
  seed?: number;              // Random seed for deterministic generation
  startingVertexId?: number;  // Starting vertex ID counter (default: 0)

  // Vertex constraints (soft limits)
  minVertices?: number;       // Target minimum vertices (soft guidance)
  maxVertices?: number;       // Maximum vertices (hard safety cutoff)

  // Recursive sparking controls
  sparking?: {
    enabled: boolean;         // Whether to enable recursive sparking
    probability: number;      // Probability of a vertex sparking (0-1)
    maxSparkDepth: number;    // Maximum recursion depth for sparking
    sparkingConditions: {
      boundaryPoints: number[];     // X-coordinates where sparking is triggered (0-1 normalized)
      randomSparking: boolean;      // Allow random sparking
    };
    fishSpineBias: number;    // Bias toward fish-skeleton structure (0-1)
  };
};

// Dependency injection interface for random generation
export interface RandomGenerator {
  random(): number;
}

// Cell represents a position in the electrical field
interface Cell {
  x: number;
  y: number;
}

// Node represents a point in the growing electrical discharge
interface DischargeNode {
  cell: Cell;
  parent: string | null;
  jitter: [number, number];
  depth: number;
  terminal: boolean;
}

// FrontierCell represents a potential growth point with electrical field value
interface FrontierCell {
  value: number;
  cell: Cell;
  parent: Cell;
}

// ElectricalField manages the physics-based discharge simulation
class ElectricalField {
  private width: number;
  private height: number;
  private source: Map<string, DischargeNode> = new Map();
  private sourceFrontier: Map<string, FrontierCell> = new Map();
  private sink: Map<string, DischargeNode> = new Map();
  private finished: boolean = false;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  private hashCell(cell: Cell): string {
    return `${Math.floor(cell.x)}_${Math.floor(cell.y)}`;
  }

  private checkBounds(cell: Cell): boolean {
    return cell.x >= 0 && cell.x < this.width && cell.y >= 0 && cell.y < this.height;
  }

  private distance(c1: Cell, c2: Cell): number {
    const dx = c1.x - c2.x;
    const dy = c1.y - c2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private jitter(width: number, rng: RandomGenerator): [number, number] {
    return [
      (rng.random() - 0.5) * width,
      (rng.random() - 0.5) * width
    ];
  }

  private createNode(cell: Cell, rng: RandomGenerator): DischargeNode {
    return {
      cell: cell,
      parent: null,
      jitter: this.jitter(1.0, rng),
      depth: 0,
      terminal: true
    };
  }

  addSink(cell: Cell, rng: RandomGenerator): void {
    const hash = this.hashCell(cell);
    const node = this.createNode(cell, rng);
    this.sink.set(hash, node);
  }

  addSource(cell: Cell, parent: Cell | null, rng: RandomGenerator): void {
    if (!this.checkBounds(cell) || (parent && !this.checkBounds(parent))) {
      console.error("Out-of-bounds cell passed to addSource");
      return;
    }

    const hash = this.hashCell(cell);
    const node = this.createNode(cell, rng);

    if (parent) {
      const parentHash = this.hashCell(parent);
      const parentNode = this.source.get(parentHash);
      if (!parentNode) {
        console.error("Parent supplied to addSource but is not present");
        return;
      }
      node.parent = parentHash;
      node.depth = parentNode.depth + 1;
      parentNode.terminal = false;
    }

    this.source.set(hash, node);

    // Remove from frontier
    this.sourceFrontier.delete(hash);

    // Update existing frontier values based on new source
    for (const [h, frontier] of this.sourceFrontier) {
      frontier.value += 1.0 - (0.5 / this.distance(cell, frontier.cell));
    }

    // Add adjacent cells to frontier (8-connected)
    const adjacentOffsets = [
      { x: 0, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 0 }, { x: -1, y: 0 },
      { x: -1, y: -1 }, { x: 1, y: 1 }, { x: -1, y: 1 }, { x: 1, y: -1 }
    ];

    for (const offset of adjacentOffsets) {
      const newCell = { x: cell.x + offset.x, y: cell.y + offset.y };
      this.addSourceFrontier(newCell, cell, rng);
    }
  }

  private addSourceFrontier(cell: Cell, parent: Cell, rng: RandomGenerator): void {
    if (!this.checkBounds(cell)) return;

    const hash = this.hashCell(cell);

    // Check if we've reached a sink
    if (this.sink.has(hash)) {
      this.finished = true;
      return;
    }

    // Don't add if already in source or frontier
    if (this.source.has(hash) || this.sourceFrontier.has(hash)) {
      return;
    }

    // Calculate electrical field value at this position
    let fieldValue = 0;

    // Attraction to existing sources (creates branching)
    for (const [, sourceNode] of this.source) {
      const dist = this.distance(cell, sourceNode.cell);
      fieldValue += 1.0 - (0.5 / Math.max(dist, 0.1));
    }

    // Strong attraction to sinks (creates directional flow)
    for (const [, sinkNode] of this.sink) {
      const dist = this.distance(cell, sinkNode.cell);
      fieldValue += 100.0 / Math.max(dist, 0.1);
    }

    this.sourceFrontier.set(hash, {
      value: fieldValue,
      cell: cell,
      parent: parent
    });
  }

  sampleSourceFrontier(power: number, rng: RandomGenerator): { cell: Cell; parent: Cell } | null {
    if (this.sourceFrontier.size === 0) return null;

    const frontierArray = Array.from(this.sourceFrontier.values());

    // Find min/max values for normalization
    let minValue = Infinity;
    let maxValue = -Infinity;

    for (const frontier of frontierArray) {
      minValue = Math.min(frontier.value, minValue);
      maxValue = Math.max(frontier.value, maxValue);
    }

    const range = maxValue - minValue;

    // If all values are the same, pick randomly
    if (range <= 0.001) {
      const randomIndex = Math.floor(rng.random() * frontierArray.length);
      const selected = frontierArray[randomIndex];
      return { cell: selected.cell, parent: selected.parent };
    }

    // Weighted sampling based on field strength
    let totalWeight = 0;
    const weights: number[] = [];

    for (const frontier of frontierArray) {
      const normalizedValue = (frontier.value - minValue) / range;
      const weight = Math.pow(normalizedValue, power);
      weights.push(weight);
      totalWeight += weight;
    }

    // Sample based on weights
    let randomValue = rng.random() * totalWeight;

    for (let i = 0; i < frontierArray.length; i++) {
      randomValue -= weights[i];
      if (randomValue <= 0) {
        const selected = frontierArray[i];
        return { cell: selected.cell, parent: selected.parent };
      }
    }

    // Fallback to last element
    const selected = frontierArray[frontierArray.length - 1];
    return { cell: selected.cell, parent: selected.parent };
  }

  getChannels(): Array<Array<{ x: number; y: number }>> {
    // Find all terminal nodes
    const terminals = Array.from(this.source.entries())
      .filter(([, node]) => node.terminal)
      .map(([hash]) => hash);

    // Sort by depth (deepest first)
    terminals.sort((a, b) => {
      const nodeA = this.source.get(a)!;
      const nodeB = this.source.get(b)!;
      return nodeB.depth - nodeA.depth;
    });

    const visited = new Set<string>();
    const channels: Array<Array<{ x: number; y: number }>> = [];

    // Create channels from terminals back to root
    for (const terminalHash of terminals) {
      const channel: Array<{ x: number; y: number }> = [];
      let currentHash: string | null = terminalHash;

      // Check if this terminal can reach the root
      let canReachRoot = false;
      let testHash: string | null = terminalHash;
      const pathToRoot = new Set<string>();

      while (testHash) {
        const node = this.source.get(testHash);
        if (!node) break;

        if (pathToRoot.has(testHash)) {
          // Circular reference - this should not happen but handle it
          break;
        }
        pathToRoot.add(testHash);

        if (node.parent === null) {
          // Found root
          canReachRoot = true;
          break;
        }

        testHash = node.parent;
      }

      // Only include terminals that can reach the root
      if (!canReachRoot) {
        continue;
      }

      // Build the channel
      while (currentHash && !visited.has(currentHash)) {
        const node = this.source.get(currentHash);
        if (!node) break;

        channel.push({
          x: node.cell.x + node.jitter[0],
          y: node.cell.y + node.jitter[1]
        });

        visited.add(currentHash);
        currentHash = node.parent;
      }

      if (channel.length > 0) {
        channel.reverse(); // Reverse to go from root to terminal
        channels.push(channel);
      }
    }

    return channels;
  }

  isFinished(): boolean {
    return this.finished;
  }

  hasFrontier(): boolean {
    return this.sourceFrontier.size > 0;
  }

  getSourceCells(): Cell[] {
    return Array.from(this.source.values()).map(node => node.cell);
  }
}

// Main realistic generation function with identical signature
export function generateLichtenbergFigure(
  config: LichtenbergConfig,
  seed?: number
): LichtenbergFigure {
  const actualSeed = seed ?? config.seed ?? Date.now();
  return generateRealisticLichtenbergFigure(config, actualSeed);
}

// Core realistic generation algorithm using electrical field physics
function generateRealisticLichtenbergFigure(
  config: LichtenbergConfig,
  seed: number
): LichtenbergFigure {
  const rng = createSeededRNG(seed);
  const field = new ElectricalField(config.width, config.height);

  // Add sink points to create directional flow
  const sinkX = config.width * 0.9; // Near eastern edge
  const sinkY = config.height * 0.5; // Center vertically
  field.addSink({ x: sinkX, y: sinkY }, rng);

  // Add optional additional sinks for more complex patterns
  if (config.width > 100) {
    field.addSink({ x: config.width * 0.95, y: config.height * 0.3 }, rng);
    field.addSink({ x: config.width * 0.95, y: config.height * 0.7 }, rng);
  }

  // Start with initial source
  const startCell = { x: config.startX, y: config.startY };
  field.addSource(startCell, null, rng);

  // Parameters for electrical discharge simulation
  const maxVertices = config.maxVertices || (config.minVertices || 100) * 3;
  const samplingPower = 3.0; // Higher power = more concentrated growth
  const maxIterations = maxVertices * 2; // Prevent infinite loops

  // Main growth simulation
  let iterations = 0;
  while (field.hasFrontier() && !field.isFinished() &&
         field.getSourceCells().length < maxVertices &&
         iterations < maxIterations) {

    const sample = field.sampleSourceFrontier(samplingPower, rng);
    if (!sample) break;

    field.addSource(sample.cell, sample.parent, rng);
    iterations++;
  }

  // Convert channels to vertices and connections
  const channels = field.getChannels();
  const vertices: LichtenbergVertex[] = [];
  const connections: LichtenbergConnection[] = [];
  const vertexMap = new Map<string, string>(); // position -> vertex ID

  let vertexCounter = config.startingVertexId || 0;

  function getOrCreateVertex(x: number, y: number): string {
    const key = `${Math.floor(x * 100) / 100}_${Math.floor(y * 100) / 100}`;

    if (vertexMap.has(key)) {
      return vertexMap.get(key)!;
    }

    const vertexId = `vertex_${vertexCounter++}`;
    vertices.push({
      x: x,
      y: y,
      id: vertexId
    });
    vertexMap.set(key, vertexId);
    return vertexId;
  }

  // Convert channels to vertex/connection structure
  for (const channel of channels) {
    if (channel.length < 2) continue;

    for (let i = 0; i < channel.length - 1; i++) {
      const fromVertex = getOrCreateVertex(channel[i].x, channel[i].y);
      const toVertex = getOrCreateVertex(channel[i + 1].x, channel[i + 1].y);

      // Add parent relationship
      const toVertexObj = vertices.find(v => v.id === toVertex);
      if (toVertexObj && !toVertexObj.parentId) {
        toVertexObj.parentId = fromVertex;
      }

      // Add connection
      const dx = channel[i + 1].x - channel[i].x;
      const dy = channel[i + 1].y - channel[i].y;
      const length = Math.sqrt(dx * dx + dy * dy);

      connections.push({
        from: fromVertex,
        to: toVertex,
        length: length
      });
    }
  }

  // CRITICAL FIX: Ensure all vertices are in the same connected component
  // If we have disconnected vertices, only keep the largest connected component
  if (vertices.length > 1 && connections.length > 0) {
    // Find connected components
    const adjacencyMap = new Map<string, Set<string>>();

    // Initialize all vertices
    for (const vertex of vertices) {
      adjacencyMap.set(vertex.id, new Set());
    }

    // Add connections (bidirectional)
    for (const connection of connections) {
      const fromSet = adjacencyMap.get(connection.from);
      const toSet = adjacencyMap.get(connection.to);

      if (fromSet && toSet) {
        fromSet.add(connection.to);
        toSet.add(connection.from);
      }
    }

    // Find the largest connected component starting from vertex_0
    const rootVertex = vertices.find(v => v.id === 'vertex_0');
    if (rootVertex) {
      const visited = new Set<string>();
      const queue = [rootVertex.id];
      visited.add(rootVertex.id);

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const neighbors = adjacencyMap.get(currentId);

        if (neighbors) {
          for (const neighborId of neighbors) {
            if (!visited.has(neighborId)) {
              visited.add(neighborId);
              queue.push(neighborId);
            }
          }
        }
      }

      // Filter vertices and connections to only include reachable ones
      const reachableVertices = vertices.filter(v => visited.has(v.id));
      const reachableConnections = connections.filter(c =>
        visited.has(c.from) && visited.has(c.to)
      );

      return {
        vertices: reachableVertices,
        connections: reachableConnections
      };
    }
  }

  return {
    vertices: vertices,
    connections: connections
  };
}

// Simple seeded RNG for consistent results
function createSeededRNG(seed: number): RandomGenerator {
  let currentSeed = seed;
  return {
    random(): number {
      const x = Math.sin(currentSeed++) * 10000;
      return x - Math.floor(x);
    }
  };
}

// Legacy compatibility functions (if needed)
export function generateOptimizedLichtenbergFigure(
  config: LichtenbergConfig,
  optimizations?: any,
  sparkDepth: number = 0
): LichtenbergFigure {
  // Use our physics-based algorithm instead of the old optimized one
  return generateLichtenbergFigure(config);
}
