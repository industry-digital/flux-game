/**
 * Input/Output tests for worldgen library
 * Tests contracts: same inputs produce same outputs, different inputs produce different outputs
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { generateWorld, generateEcosystemSlice, EcosystemName, DEFAULT_WORLD_CONFIG, clearWorldGenCaches } from './index';

describe('World Generation Input/Output Tests', () => {
  describe('Deterministic Generation', () => {
    it('should produce identical worlds with same seed', () => {
      const seed = 12345;
      const config1 = { ...DEFAULT_WORLD_CONFIG, random_seed: seed };
      const config2 = { ...DEFAULT_WORLD_CONFIG, random_seed: seed };

      const world1 = generateWorld(config1);
      const world2 = generateWorld(config2);

      // Same input must produce same output
      expect(world1.places.length).toBe(world2.places.length);

      // Check first 5 places are identical (structure and properties)
      for (let i = 0; i < Math.min(5, world1.places.length); i++) {
        const p1 = world1.places[i];
        const p2 = world2.places[i];

        expect(p1.id).toBe(p2.id);
        expect(p1.ecology.ecosystem).toBe(p2.ecology.ecosystem);
      }
    });
  });

  describe('Seed Variation', () => {
    it('should produce different worlds with different seeds', () => {
      const config1 = { ...DEFAULT_WORLD_CONFIG, random_seed: 111 };
      const config2 = { ...DEFAULT_WORLD_CONFIG, random_seed: 222 };

      const world1 = generateWorld(config1);
      const world2 = generateWorld(config2);

      // Different seeds should produce different results
      const firstPlace1 = world1.places[0];
      const firstPlace2 = world2.places[0];

      // Check weather properties which are generated with randomness
      const weatherPropertiesMatch =
        firstPlace1.weather.temperature === firstPlace2.weather.temperature &&
        firstPlace1.weather.pressure === firstPlace2.weather.pressure &&
        firstPlace1.weather.humidity === firstPlace2.weather.humidity;

      // Also check if ecosystem selection is different
      const ecosystemMatch = firstPlace1.ecology.ecosystem === firstPlace2.ecology.ecosystem;

      // At least one of these should be different
      const allPropertiesMatch = weatherPropertiesMatch && ecosystemMatch;

      expect(allPropertiesMatch).toBe(false);
    });
  });

  describe('Performance & Caching', () => {
    beforeEach(() => {
      clearWorldGenCaches(); // Start with clean caches
    });

    it('should maintain O(N) performance scaling', () => {
      const densities = [0.01, 0.05, 0.1]; // Small, medium, large
      const times: number[] = [];
      const placeCounts: number[] = [];

      for (const density of densities) {
        const config = { ...DEFAULT_WORLD_CONFIG, place_density: density };

        const start = performance.now();
        const world = generateWorld(config);
        const end = performance.now();

        times.push(end - start);
        placeCounts.push(world.places.length);
      }

      // Calculate time per place for each size
      const timePerPlace = times.map((time, i) => time / placeCounts[i]);

      // Time per place should not grow significantly (allowing 3x variance for noise)
      const minTimePerPlace = Math.min(...timePerPlace);
      const maxTimePerPlace = Math.max(...timePerPlace);

      expect(maxTimePerPlace / minTimePerPlace).toBeLessThan(3);
    });

    it('should use caches for repeated configurations', () => {
      const config = { ...DEFAULT_WORLD_CONFIG, place_density: 0.05 };

      // First generation (populates caches)
      const start1 = performance.now();
      const world1 = generateWorld(config);
      const end1 = performance.now();
      const time1 = end1 - start1;

      // Second generation (should use caches)
      const start2 = performance.now();
      const world2 = generateWorld(config);
      const end2 = performance.now();
      const time2 = end2 - start2;

      // Results should be identical
      expect(world1.places.length).toBe(world2.places.length);
      expect(world1.places[0].ecology.ecosystem).toBe(world2.places[0].ecology.ecosystem);

      // Second run should be faster (or at least not significantly slower)
      expect(time2).toBeLessThanOrEqual(time1 * 1.5); // Allow 50% variance
    });

    it('should clear caches properly', () => {
      const config = { ...DEFAULT_WORLD_CONFIG, place_density: 0.05 };

      // Generate world (populates caches)
      const world1 = generateWorld(config);

      // Clear caches
      clearWorldGenCaches();

      // Generate again (should still work identically)
      const world2 = generateWorld(config);

      expect(world1.places.length).toBe(world2.places.length);
      expect(world1.places[0].ecology.ecosystem).toBe(world2.places[0].ecology.ecosystem);
    });
  });

  describe('Topology Distribution', () => {
    it('should generate proper hub-and-spoke structure', () => {
      const world = generateWorld();

      // Count places by topology zone
      const zoneCounts = world.places.reduce((counts, place) => {
        counts[place.topology_zone] = (counts[place.topology_zone] || 0) + 1;
        return counts;
      }, {} as Record<string, number>);

      // Should have all expected zones
      expect(zoneCounts.plateau).toBeGreaterThan(0);
      expect(zoneCounts.mountain_ring).toBeGreaterThan(0);
      expect(zoneCounts.ecosystem_slice).toBeGreaterThan(0);

      // Ecosystem slices should be the largest zone (outer ring)
      expect(zoneCounts.ecosystem_slice).toBeGreaterThan(zoneCounts.plateau);
      expect(zoneCounts.ecosystem_slice).toBeGreaterThan(zoneCounts.mountain_ring);
    });

    it('should maintain consistent distance calculations', () => {
      const world = generateWorld();

      for (const place of world.places) {
        // Distance should be between 0 and 1 (normalized)
        expect(place.distance_from_center).toBeGreaterThanOrEqual(0);
        expect(place.distance_from_center).toBeLessThanOrEqual(1);

        // Plateau places should have smallest distances
        if (place.topology_zone === 'plateau') {
          expect(place.distance_from_center).toBeLessThan(0.5);
        }

        // Ecosystem slice places should have ecosystem_slice_id
        if (place.topology_zone === 'ecosystem_slice') {
          expect(place.ecosystem_slice_id).toBeDefined();
          expect(place.ecosystem_slice_id).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });

  describe('Valid Structure', () => {
    it('should generate worlds with valid structure', () => {
      const world = generateWorld();

      // Must have places
      expect(world.places.length).toBeGreaterThan(0);

      // All places must have required properties
      for (const place of world.places) {
        expect(place.id).toBeDefined();
        expect(typeof place.id).toBe('string');
        expect(place.ecology?.ecosystem).toBeDefined();
        expect(place.gaea_management).toBeDefined();
        expect(place.cordyceps_habitat).toBeDefined();

        // Validate numeric ranges
        const mgmt = place.gaea_management;
        expect(mgmt.optimization_level).toBeGreaterThanOrEqual(0);
        expect(mgmt.optimization_level).toBeLessThanOrEqual(1);
        expect(mgmt.fungal_cultivation_intensity).toBeGreaterThanOrEqual(0);
        expect(mgmt.fungal_cultivation_intensity).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Ecosystem Slice Generation', () => {
    it('should generate valid ecosystem slices', () => {
      const validEcosystems: EcosystemName[] = [
        'flux:eco:mountain:forest' as EcosystemName,
        'flux:eco:forest:temperate' as EcosystemName,
        'flux:eco:grassland:temperate' as EcosystemName,
        'flux:eco:grassland:arid' as EcosystemName
      ];

      for (const ecosystem of validEcosystems) {
        const places = generateEcosystemSlice(ecosystem);

        expect(places.length).toBeGreaterThan(0);

        // All places should have the specified ecosystem
        for (const place of places) {
          expect(place.ecology.ecosystem).toBe(ecosystem);
        }
      }
    });

    it('should handle invalid ecosystem inputs', () => {
      const invalidInputs = [
        'invalid-ecosystem',
        '',
        'flux:eco:nonexistent:type'
      ];

      for (const invalidInput of invalidInputs) {
        expect(() => generateEcosystemSlice(invalidInput as any)).toThrow();
      }
    });
  });

  describe('Parameter Effects', () => {
    it('should produce different world sizes with different place densities', () => {
      const smallConfig = { ...DEFAULT_WORLD_CONFIG, place_density: 0.02 };
      const largeConfig = { ...DEFAULT_WORLD_CONFIG, place_density: 0.08 };

      const smallWorld = generateWorld(smallConfig);
      const largeWorld = generateWorld(largeConfig);

      // Different place densities should produce different sized worlds
      expect(Math.abs(smallWorld.places.length - largeWorld.places.length)).toBeGreaterThan(50);
      expect(smallWorld.places.length).toBeLessThan(largeWorld.places.length);
    });
  });
});
