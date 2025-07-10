/**
 * Input/Output tests for worldgen library
 * Tests contracts: same inputs produce same outputs, different inputs produce different outputs
 */

import { generateWorld, generateEcosystemSlice, EcosystemName, DEFAULT_WORLD_CONFIG } from './index';

/**
 * Test that same seed produces identical worlds (determinism)
 */
function testDeterministicGeneration(): void {
  const seed = 12345;
  const config1 = { ...DEFAULT_WORLD_CONFIG, random_seed: seed };
  const config2 = { ...DEFAULT_WORLD_CONFIG, random_seed: seed };

  const world1 = generateWorld(config1);
  const world2 = generateWorld(config2);

  // Same input must produce same output
  if (world1.places.length !== world2.places.length) {
    throw new Error(`Place count mismatch: ${world1.places.length} vs ${world2.places.length}`);
  }

  // Check first 5 places are identical (structure and properties)
  for (let i = 0; i < Math.min(5, world1.places.length); i++) {
    const p1 = world1.places[i];
    const p2 = world2.places[i];

    if (p1.id !== p2.id) {
      throw new Error(`Place ID mismatch at index ${i}: ${p1.id} vs ${p2.id}`);
    }

    if (p1.ecology.ecosystem !== p2.ecology.ecosystem) {
      throw new Error(`Ecosystem mismatch at index ${i}: ${p1.ecology.ecosystem} vs ${p2.ecology.ecosystem}`);
    }
  }
}

/**
 * Test that different seeds produce different worlds (variation)
 */
function testSeedVariation(): void {
  const config1 = { ...DEFAULT_WORLD_CONFIG, random_seed: 111 };
  const config2 = { ...DEFAULT_WORLD_CONFIG, random_seed: 222 };

  const world1 = generateWorld(config1);
  const world2 = generateWorld(config2);

  // Different seeds should produce different results
  const firstPlace1 = world1.places[0];
  const firstPlace2 = world2.places[0];

  // At minimum, some property should differ
  const propertiesMatch = firstPlace1.ecology.ecosystem === firstPlace2.ecology.ecosystem;

  if (propertiesMatch) {
    throw new Error('Different seeds produced identical first places - insufficient variation');
  }
}

/**
 * Test that generated worlds have valid structure
 */
function testValidStructure(): void {
  const world = generateWorld();

  // Must have places
  if (world.places.length === 0) {
    throw new Error('Generated world has no places');
  }

  // All places must have required properties
  for (const place of world.places) {
    if (!place.id || typeof place.id !== 'string') {
      throw new Error(`Invalid place ID: ${place.id}`);
    }

    if (!place.ecology || !place.ecology.ecosystem) {
      throw new Error(`Place ${place.id} missing ecology.ecosystem`);
    }
  }
}

/**
 * Test ecosystem slice generation with valid inputs
 */
function testEcosystemSliceValidInputs(): void {
  const validEcosystems: EcosystemName[] = [
    'flux:eco:mountain:forest' as EcosystemName,
    'flux:eco:forest:temperate' as EcosystemName,
    'flux:eco:grassland:temperate' as EcosystemName,
    'flux:eco:grassland:arid' as EcosystemName
  ];

  for (const ecosystem of validEcosystems) {
    const places = generateEcosystemSlice(ecosystem);

    if (places.length === 0) {
      throw new Error(`No places generated for ecosystem: ${ecosystem}`);
    }

    // All places should have the specified ecosystem
    for (const place of places) {
      if (place.ecology.ecosystem !== ecosystem) {
        throw new Error(`Expected ecosystem ${ecosystem}, got ${place.ecology.ecosystem}`);
      }
    }
  }
}

/**
 * Test ecosystem slice generation with invalid inputs
 */
function testEcosystemSliceInvalidInputs(): void {
  const invalidInputs = [
    'invalid-ecosystem',
    '',
    'flux:eco:nonexistent:type'
  ];

  for (const invalidInput of invalidInputs) {
    try {
      generateEcosystemSlice(invalidInput as any);
      throw new Error(`Should have thrown error for invalid input: ${invalidInput}`);
    } catch (error) {
      // Expected to throw - this is correct behavior
      if (error instanceof Error && error.message.includes('Should have thrown error')) {
        throw error; // Re-throw our test failure
      }
      // Otherwise, the function correctly threw an error
    }
  }
}

/**
 * Test that generation parameters affect output
 */
function testParameterEffects(): void {
  const smallConfig = { ...DEFAULT_WORLD_CONFIG, place_density: 0.02 };
  const largeConfig = { ...DEFAULT_WORLD_CONFIG, place_density: 0.08 };

  const smallWorld = generateWorld(smallConfig);
  const largeWorld = generateWorld(largeConfig);

  // Different place densities should produce different sized worlds
  if (Math.abs(smallWorld.places.length - largeWorld.places.length) < 50) {
    throw new Error('Place density parameter appears to have no effect');
  }

  if (smallWorld.places.length >= largeWorld.places.length) {
    throw new Error('Larger place density produced smaller or equal world');
  }
}

/**
 * Run all input/output tests
 */
function runAllTests(): void {
  const tests = [
    { name: 'Deterministic Generation', fn: testDeterministicGeneration },
    { name: 'Seed Variation', fn: testSeedVariation },
    { name: 'Valid Structure', fn: testValidStructure },
    { name: 'Ecosystem Slice Valid Inputs', fn: testEcosystemSliceValidInputs },
    { name: 'Ecosystem Slice Invalid Inputs', fn: testEcosystemSliceInvalidInputs },
    { name: 'Parameter Effects', fn: testParameterEffects }
  ];

  console.log('🧪 World Generation Input/Output Tests');
  console.log('====================================');

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      test.fn();
      console.log(`✅ ${test.name}`);
      passed++;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log(`❌ ${test.name}: ${errorMessage}`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);

  if (failed > 0) {
    throw new Error(`${failed} tests failed`);
  }
}

export {
  runAllTests,
  testDeterministicGeneration,
  testSeedVariation,
  testValidStructure,
  testEcosystemSliceValidInputs,
  testEcosystemSliceInvalidInputs,
  testParameterEffects
};
