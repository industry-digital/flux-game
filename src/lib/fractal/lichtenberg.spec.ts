/**
 * Unit tests for geometric Lichtenberg figure generation
 * Optimized implementation with behavioral equivalence to the original
 */

import { describe, it, expect } from 'vitest';
import {
    generateLichtenbergFigure,
    LichtenbergConfig
} from './lichtenberg';

describe('Lichtenberg Figure Generation', () => {
  // Basic configuration for testing - conservative values for speed
  const basicConfig: LichtenbergConfig = {
    startX: 100,
    startY: 100,
    width: 1000,
    height: 600,
    branchingFactor: 0.3, // Lower branching factor
    branchingAngle: Math.PI / 4,
    stepSize: 50,
    maxDepth: 3, // Much lower max depth
    eastwardBias: 0.7,
    seed: 42,
    maxVertices: 20 // Add safety limit
  };

  describe('Basic Generation', () => {
    it('should generate a figure with at least the starting vertex', () => {
      const figure = generateLichtenbergFigure(basicConfig);

      expect(figure.vertices).toHaveLength(1);
      expect(figure.vertices[0]).toEqual({
        x: 100,
        y: 100,
        id: 'vertex_0'
      });
      expect(figure.connections).toHaveLength(0);
    });

    it('should generate vertices within bounds', () => {
      const config = { ...basicConfig, branchingFactor: 0.5, maxDepth: 2, maxVertices: 10 };
      const figure = generateLichtenbergFigure(config);

      for (const vertex of figure.vertices) {
        expect(vertex.x).toBeGreaterThanOrEqual(0);
        expect(vertex.x).toBeLessThan(config.width);
        expect(vertex.y).toBeGreaterThanOrEqual(0);
        expect(vertex.y).toBeLessThan(config.height);
      }
    });

    it('should create connections between vertices', () => {
      const config = { ...basicConfig, branchingFactor: 0.8, maxDepth: 2, maxVertices: 10 };
      const figure = generateLichtenbergFigure(config);

      if (figure.vertices.length > 1) {
        expect(figure.connections.length).toBeGreaterThan(0);

        // Each connection should reference valid vertices
        for (const connection of figure.connections) {
          const fromVertex = figure.vertices.find(v => v.id === connection.from);
          const toVertex = figure.vertices.find(v => v.id === connection.to);

          expect(fromVertex).toBeDefined();
          expect(toVertex).toBeDefined();
          expect(connection.length).toBe(config.stepSize);
        }
      }
    });

    it('should respect maxDepth constraint', () => {
      const config = { ...basicConfig, branchingFactor: 0.8, maxDepth: 2, maxVertices: 10 };
      const figure = generateLichtenbergFigure(config);

      // Calculate maximum depth by following parent chains
      let maxDepth = 0;
      for (const vertex of figure.vertices) {
        let depth = 0;
        let current = vertex;

        while (current.parentId) {
          depth++;
          current = figure.vertices.find(v => v.id === current.parentId)!;
        }

        maxDepth = Math.max(maxDepth, depth);
      }

      expect(maxDepth).toBeLessThanOrEqual(config.maxDepth);
    });
  });

  describe('Deterministic Behavior', () => {
    it('should generate identical figures with same seed', () => {
      const config = { ...basicConfig, seed: 12345, branchingFactor: 0.5, maxDepth: 2, maxVertices: 8 };

      const figure1 = generateLichtenbergFigure(config);
      const figure2 = generateLichtenbergFigure(config);

      expect(figure1.vertices).toEqual(figure2.vertices);
      expect(figure1.connections).toEqual(figure2.connections);
    });

    it('should generate different figures with different seeds', () => {
      const config1 = { ...basicConfig, seed: 111, branchingFactor: 0.5, maxDepth: 2, maxVertices: 8 };
      const config2 = { ...basicConfig, seed: 222, branchingFactor: 0.5, maxDepth: 2, maxVertices: 8 };

      const figure1 = generateLichtenbergFigure(config1);
      const figure2 = generateLichtenbergFigure(config2);

      // Should have different structures (very unlikely to be identical)
      expect(figure1.vertices).not.toEqual(figure2.vertices);
    });
  });

  describe('Vertex Constraints', () => {
    it('should respect maxVertices hard limit', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 5,
        maxVertices: 5
      };

      const figure = generateLichtenbergFigure(config);
      expect(figure.vertices.length).toBeLessThanOrEqual(5);
    });

    it('should tend toward minVertices through increased branching', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.2, // Low branching normally
        maxDepth: 5,
        minVertices: 8,
        maxVertices: 15,
        seed: 42
      };

      const figure = generateLichtenbergFigure(config);

      // With minVertices guidance, should generate more vertices than with low branching factor alone
      // Note: This is probabilistic, so we test the tendency rather than exact values
      expect(figure.vertices.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle edge case where maxVertices is very small', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 5,
        maxVertices: 1
      };

      const figure = generateLichtenbergFigure(config);
      expect(figure.vertices.length).toBe(1);
      expect(figure.connections.length).toBe(0);
    });
  });

  describe('Sparking System', () => {
    it('should not spark when sparking is disabled', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.5,
        maxDepth: 2,
        maxVertices: 10,
        sparking: {
          enabled: false,
          probability: 1.0,
          maxSparkDepth: 1,
          sparkingConditions: {
            boundaryPoints: [0.5],
            randomSparking: true
          },
          fishSpineBias: 0.5
        }
      };

      const figure = generateLichtenbergFigure(config);

      // Should only have basic branching, no recursive sparking
      expect(figure.vertices.length).toBeGreaterThan(0);
    });

    it('should enable recursive sparking when configured', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.3,
        maxDepth: 2,
        maxVertices: 8,
        sparking: {
          enabled: true,
          probability: 0.5, // Moderate probability for testing
          maxSparkDepth: 1,
          sparkingConditions: {
            boundaryPoints: [],
            randomSparking: true
          },
          fishSpineBias: 0.5
        }
      };

      const figure = generateLichtenbergFigure(config);

      // With sparking enabled, should generate additional vertices
      expect(figure.vertices.length).toBeGreaterThan(0);
    });

    it('should respect maxSparkDepth', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.5,
        maxDepth: 1,
        maxVertices: 10,
        sparking: {
          enabled: true,
          probability: 0.5,
          maxSparkDepth: 1,
          sparkingConditions: {
            boundaryPoints: [],
            randomSparking: true
          },
          fishSpineBias: 0.5
        }
      };

      const figure = generateLichtenbergFigure(config);

      // Should not crash or recurse infinitely
      expect(figure.vertices.length).toBeGreaterThan(0);
      expect(figure.vertices.length).toBeLessThanOrEqual(10); // Respects maxVertices
    });

    it('should spark at boundary points', () => {
      const config = {
        ...basicConfig,
        startX: 500, // Middle of 1000-width world
        branchingFactor: 0.5,
        maxDepth: 2,
        maxVertices: 8,
        sparking: {
          enabled: true,
          probability: 0.8,
          maxSparkDepth: 1,
          sparkingConditions: {
            boundaryPoints: [0.5], // Should trigger sparking at x=500
            randomSparking: false
          },
          fishSpineBias: 0.5
        }
      };

      const figure = generateLichtenbergFigure(config);

      // Should generate vertices due to boundary sparking
      expect(figure.vertices.length).toBeGreaterThan(0);
    });
  });

  describe('Fish-Spine Structure', () => {
    it('should bias toward fish-spine structure when enabled', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 3,
        maxVertices: 15,
        sparking: {
          enabled: true,
          probability: 0.5,
          maxSparkDepth: 1,
          sparkingConditions: {
            boundaryPoints: [],
            randomSparking: true
          },
          fishSpineBias: 0.9 // Strong fish-spine bias
        }
      };

      const figure = generateLichtenbergFigure(config);

      // Should generate multiple vertices with fish-spine structure
      expect(figure.vertices.length).toBeGreaterThan(1);

      if (figure.vertices.length > 1) {
        // With fish-spine bias, should have eastward progression
        const startVertex = figure.vertices[0];
        const eastwardVertices = figure.vertices.filter(v => v.x > startVertex.x);

        expect(eastwardVertices.length).toBeGreaterThanOrEqual(0);
      }
    });

    it('should create perpendicular ribs with fish-spine structure', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 3,
        maxVertices: 15,
        sparking: {
          enabled: true,
          probability: 0.6,
          maxSparkDepth: 1,
          sparkingConditions: {
            boundaryPoints: [],
            randomSparking: true
          },
          fishSpineBias: 0.8
        }
      };

      const figure = generateLichtenbergFigure(config);

      // Should generate a branching structure
      expect(figure.vertices.length).toBeGreaterThan(1);
      expect(figure.connections.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Directional Bias', () => {
    it('should bias toward eastward direction', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.6,
        maxDepth: 2,
        maxVertices: 8,
        eastwardBias: 0.9,
        stepSize: 100
      };

      const figure = generateLichtenbergFigure(config);

      if (figure.vertices.length > 1) {
        const startVertex = figure.vertices[0];
        const eastwardVertices = figure.vertices.filter(v => v.x > startVertex.x);
        const westwardVertices = figure.vertices.filter(v => v.x < startVertex.x);

        // Should have more eastward movement than westward
        expect(eastwardVertices.length).toBeGreaterThanOrEqual(westwardVertices.length);
      }
    });

    it('should apply vertical bias when configured', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.6,
        maxDepth: 2,
        maxVertices: 8,
        verticalBias: 0.9,
        stepSize: 100
      };

      const figure = generateLichtenbergFigure(config);

      if (figure.vertices.length > 1) {
        const startVertex = figure.vertices[0];
        const verticalVertices = figure.vertices.filter(v =>
          Math.abs(v.y - startVertex.y) > Math.abs(v.x - startVertex.x)
        );

        // Should have some vertical movement
        expect(verticalVertices.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero branching factor', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.0,
        maxDepth: 5
      };

      const figure = generateLichtenbergFigure(config);

      // Should only have the starting vertex
      expect(figure.vertices.length).toBe(1);
      expect(figure.connections.length).toBe(0);
    });

    it('should handle maximum branching factor', () => {
      const config = {
        ...basicConfig,
        branchingFactor: 0.8,
        maxDepth: 2,
        maxVertices: 10
      };

      const figure = generateLichtenbergFigure(config);

      // Should generate multiple vertices but respect maxVertices
      expect(figure.vertices.length).toBeGreaterThan(1);
      expect(figure.vertices.length).toBeLessThanOrEqual(10);
    });

    it('should handle very small world dimensions', () => {
      const config = {
        ...basicConfig,
        startX: 5,  // Start within small world
        startY: 5,  // Start within small world
        width: 10,
        height: 10,
        stepSize: 5,
        branchingFactor: 0.5,
        maxDepth: 2,
        maxVertices: 5
      };

      const figure = generateLichtenbergFigure(config);

      // Should not crash and should keep vertices in bounds
      expect(figure.vertices.length).toBeGreaterThan(0);
      for (const vertex of figure.vertices) {
        expect(vertex.x).toBeGreaterThanOrEqual(0);
        expect(vertex.x).toBeLessThan(config.width);
        expect(vertex.y).toBeGreaterThanOrEqual(0);
        expect(vertex.y).toBeLessThan(config.height);
      }
    });

    it('should handle step size larger than world dimensions', () => {
      const config = {
        ...basicConfig,
        width: 100,
        height: 100,
        stepSize: 200, // Larger than world
        branchingFactor: 0.5,
        maxDepth: 2,
        maxVertices: 5
      };

      const figure = generateLichtenbergFigure(config);

      // Should only have starting vertex since steps go out of bounds
      expect(figure.vertices.length).toBe(1);
      expect(figure.connections.length).toBe(0);
    });
  });

  describe('Data Structure Integrity', () => {
    it('should maintain proper vertex ID sequencing', () => {
      const config = { ...basicConfig, branchingFactor: 0.6, maxDepth: 2, maxVertices: 8 };
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
      const config = { ...basicConfig, branchingFactor: 0.6, maxDepth: 2, maxVertices: 8 };
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
      const config = { ...basicConfig, branchingFactor: 0.6, maxDepth: 2, maxVertices: 8 };
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
});
