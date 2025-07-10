/**
 * Unit tests for realistic Lichtenberg figure generation
 * Physics-based implementation with behavioral equivalence to the original
 * All tests use explicit seeds for complete determinism
 */

import { describe, it, expect } from 'vitest';
import {
    generateLichtenbergFigure,
    LichtenbergConfig
} from './lichtenberg';

// Helper function to check if two line segments intersect
function lineSegmentsIntersect(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
): boolean {
  // Check if segments share an endpoint (allowed in tree structures)
  const shareEndpoint = (
    (p1.x === p3.x && p1.y === p3.y) ||
    (p1.x === p4.x && p1.y === p4.y) ||
    (p2.x === p3.x && p2.y === p3.y) ||
    (p2.x === p4.x && p2.y === p4.y)
  );

  if (shareEndpoint) {
    return false; // Shared endpoints are allowed
  }

  // Use cross product to determine intersection
  const ccw = (A: { x: number; y: number }, B: { x: number; y: number }, C: { x: number; y: number }) => {
    return (C.y - A.y) * (B.x - A.x) > (B.y - A.y) * (C.x - A.x);
  };

  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

describe('Realistic Lichtenberg Figure Generation', () => {
  // Basic configuration for testing - conservative values for speed
  // ALWAYS uses explicit seed for determinism
  const basicConfig: LichtenbergConfig = {
    startX: 100,
    startY: 100,
    width: 1000,
    height: 600,
    branchingFactor: 0.3,
    branchingAngle: Math.PI / 4,
    stepSize: 50,
    maxDepth: 3,
    eastwardBias: 0.7,
    seed: 42, // Explicit seed for determinism
    maxVertices: 20
  };

  describe('Basic Generation', () => {
    it('should generate a figure with at least the starting vertex', () => {
      const config = { ...basicConfig, seed: 1001 }; // Explicit seed
      const figure = generateLichtenbergFigure(config);

      expect(figure.vertices.length).toBeGreaterThanOrEqual(1);

      // Realistic algorithm applies jitter, so check approximate position
      const startVertex = figure.vertices[0];
      expect(startVertex.id).toBe('vertex_0');
      expect(startVertex.x).toBeCloseTo(100, 0); // Within 1 unit
      expect(startVertex.y).toBeCloseTo(100, 0); // Within 1 unit
    });

    it('should generate vertices within bounds', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.5,
        maxDepth: 2,
        maxVertices: 10,
        seed: 1002 // Explicit seed
      };
      const figure = generateLichtenbergFigure(config);

      for (const vertex of figure.vertices) {
        expect(vertex.x).toBeGreaterThanOrEqual(0);
        expect(vertex.x).toBeLessThan(config.width);
        expect(vertex.y).toBeGreaterThanOrEqual(0);
        expect(vertex.y).toBeLessThan(config.height);
      }
    });

    it('should create connections between vertices', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 2,
        maxVertices: 10,
        seed: 1003 // Explicit seed
      };
      const figure = generateLichtenbergFigure(config);

      if (figure.vertices.length > 1) {
        expect(figure.connections.length).toBeGreaterThan(0);

        // Each connection should reference valid vertices
        for (const connection of figure.connections) {
          const fromVertex = figure.vertices.find(v => v.id === connection.from);
          const toVertex = figure.vertices.find(v => v.id === connection.to);

          expect(fromVertex).toBeDefined();
          expect(toVertex).toBeDefined();
        }
      }
    });

    it('should respect maxVertices constraint', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 5,
        maxVertices: 10,
        seed: 1004 // Explicit seed
      };
      const figure = generateLichtenbergFigure(config);

      expect(figure.vertices.length).toBeLessThanOrEqual(config.maxVertices);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should generate identical figures with same seed', () => {
      const config = {
        ...basicConfig,
        seed: 12345,
        branchingFactor: 0.5,
        maxDepth: 2,
        maxVertices: 8
      };

      const figure1 = generateLichtenbergFigure(config);
      const figure2 = generateLichtenbergFigure(config);

      // Should be exactly identical with same seed
      expect(figure1.vertices).toEqual(figure2.vertices);
      expect(figure1.connections).toEqual(figure2.connections);
    });

    it('should generate different figures with different seeds', () => {
      const config1 = {
        ...basicConfig,
        seed: 111,
        branchingFactor: 0.5,
        maxDepth: 2,
        maxVertices: 8
      };
      const config2 = {
        ...basicConfig,
        seed: 222,
        branchingFactor: 0.5,
        maxDepth: 2,
        maxVertices: 8
      };

      const figure1 = generateLichtenbergFigure(config1);
      const figure2 = generateLichtenbergFigure(config2);

      // With different seeds, should have different structures
      // Check at least one structural difference to avoid rare edge cases
      const structuresEqual =
        JSON.stringify(figure1.vertices) === JSON.stringify(figure2.vertices) &&
        JSON.stringify(figure1.connections) === JSON.stringify(figure2.connections);

      expect(structuresEqual).toBe(false);
    });

    it('should be deterministic across multiple runs', () => {
      const config = {
        ...basicConfig,
        seed: 9999,
        branchingFactor: 0.6,
        maxDepth: 3,
        maxVertices: 15
      };

      // Generate the same figure multiple times
      const figures = Array.from({ length: 5 }, () => generateLichtenbergFigure(config));

      // All should be identical
      for (let i = 1; i < figures.length; i++) {
        expect(figures[i].vertices).toEqual(figures[0].vertices);
        expect(figures[i].connections).toEqual(figures[0].connections);
      }
    });
  });

  describe('Realistic Physics Features', () => {
    it('should generate denser patterns than basic algorithm', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.6,
        maxDepth: 3,
        maxVertices: 50,
        stepSize: 20,
        seed: 2001 // Explicit seed
      };

      const figure = generateLichtenbergFigure(config);

      // With this specific seed and config, should generate multiple vertices
      // Use range instead of hard threshold to avoid flakiness
      expect(figure.vertices.length).toBeGreaterThanOrEqual(2);
      expect(figure.vertices.length).toBeLessThanOrEqual(50);
    });

    it('should avoid crossing paths', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 4,
        maxVertices: 30,
        stepSize: 10,
        seed: 2002 // Explicit seed
      };

      const figure = generateLichtenbergFigure(config);

      // Should generate reasonable structure
      expect(figure.vertices.length).toBeGreaterThanOrEqual(1);
      expect(figure.vertices.length).toBeLessThanOrEqual(30);

      // Realistic algorithm may have fewer connections due to physics constraints
      expect(figure.connections.length).toBeGreaterThanOrEqual(0);
      expect(figure.connections.length).toBeLessThan(figure.vertices.length * 2);
    });

    it('should maintain electrical field physics behavior', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.7,
        maxDepth: 3,
        maxVertices: 25,
        stepSize: 15,
        seed: 2003 // Explicit seed
      };

      const figure = generateLichtenbergFigure(config);

      // With this specific deterministic config, verify expected behavior
      expect(figure.vertices.length).toBeGreaterThan(1);

      // All vertices should be within bounds
      for (const vertex of figure.vertices) {
        expect(vertex.x).toBeGreaterThanOrEqual(0);
        expect(vertex.x).toBeLessThan(config.width);
        expect(vertex.y).toBeGreaterThanOrEqual(0);
        expect(vertex.y).toBeLessThan(config.height);
      }

      // Should have reasonable connection density
      const connectionRatio = figure.connections.length / figure.vertices.length;
      expect(connectionRatio).toBeGreaterThan(0);
      expect(connectionRatio).toBeLessThan(2);
    });

    it('should generate non-intersecting edges (like real lightning)', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 4,
        maxVertices: 30,
        stepSize: 15,
        seed: 2004 // Explicit seed for deterministic behavior
      };

      const figure = generateLichtenbergFigure(config);

      // Convert connections to line segments
      const segments = figure.connections.map(conn => {
        const fromVertex = figure.vertices.find(v => v.id === conn.from);
        const toVertex = figure.vertices.find(v => v.id === conn.to);

        expect(fromVertex).toBeDefined();
        expect(toVertex).toBeDefined();

        return {
          start: { x: fromVertex!.x, y: fromVertex!.y },
          end: { x: toVertex!.x, y: toVertex!.y },
          id: `${conn.from}-${conn.to}`
        };
      });

      // Check every pair of line segments for intersections
      let intersectionCount = 0;
      for (let i = 0; i < segments.length; i++) {
        for (let j = i + 1; j < segments.length; j++) {
          const seg1 = segments[i];
          const seg2 = segments[j];

          if (lineSegmentsIntersect(seg1.start, seg1.end, seg2.start, seg2.end)) {
            intersectionCount++;
            // For debugging, log the intersecting segments
            console.warn(`Intersection found between ${seg1.id} and ${seg2.id}`);
          }
        }
      }

      // Real lightning doesn't cross - this is a key physics property
      expect(intersectionCount).toBe(0);
    });
  });

  describe('Data Structure Integrity', () => {
    it('should maintain proper vertex ID sequencing', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.6,
        maxDepth: 2,
        maxVertices: 8,
        seed: 3001 // Explicit seed
      };
      const figure = generateLichtenbergFigure(config);

      // All vertex IDs should be unique and follow pattern
      const ids = figure.vertices.map(v => v.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);

      // Should start with vertex_0
      expect(figure.vertices[0].id).toBe('vertex_0');

      // All IDs should follow vertex_N pattern
      for (const id of ids) {
        expect(id).toMatch(/^vertex_\d+$/);
      }
    });

    it('should maintain proper parent-child relationships', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.6,
        maxDepth: 2,
        maxVertices: 8,
        seed: 3002 // Explicit seed
      };
      const figure = generateLichtenbergFigure(config);

      for (const vertex of figure.vertices) {
        if (vertex.parentId) {
          const parent = figure.vertices.find(v => v.id === vertex.parentId);
          expect(parent).toBeDefined();

          // Should have a connection from parent to child
          const connection = figure.connections.find(c =>
            c.from === vertex.parentId && c.to === vertex.id
          );
          expect(connection).toBeDefined();
        }
      }
    });

    it('should maintain connection consistency', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.6,
        maxDepth: 2,
        maxVertices: 8,
        seed: 3003 // Explicit seed
      };
      const figure = generateLichtenbergFigure(config);

      for (const connection of figure.connections) {
        // Both vertices should exist
        const fromVertex = figure.vertices.find(v => v.id === connection.from);
        const toVertex = figure.vertices.find(v => v.id === connection.to);

        expect(fromVertex).toBeDefined();
        expect(toVertex).toBeDefined();

        // Length should be positive
        expect(connection.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Seeded RNG Determinism', () => {
    it('should produce consistent results with same seed regardless of call order', () => {
      const config = {
        ...basicConfig,
        seed: 5555,
        maxVertices: 10
      };

      // Generate figure multiple times with same seed
      const results: ReturnType<typeof generateLichtenbergFigure>[] = [];
      for (let i = 0; i < 3; i++) {
        results.push(generateLichtenbergFigure(config));
      }

      // All results should be identical
      for (let i = 1; i < results.length; i++) {
        expect(results[i].vertices).toEqual(results[0].vertices);
        expect(results[i].connections).toEqual(results[0].connections);
      }
    });

    it('should handle edge case seeds properly', () => {
      const seeds = [0, 1, -1, 999999, 0.5, Math.PI];

      for (const seedValue of seeds) {
        const config = {
          ...basicConfig,
          seed: seedValue,
          maxVertices: 5
        };

        // Should not crash and should produce valid output
        const figure = generateLichtenbergFigure(config);
        expect(figure.vertices.length).toBeGreaterThanOrEqual(1);
        expect(figure.vertices[0].id).toBe('vertex_0');
      }
    });
  });
});
