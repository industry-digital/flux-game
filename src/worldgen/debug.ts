/**
 * Debug script to analyze world generation with different seeds and performance
 */
import { generateWorld, WorldGenOptions, clearWorldGenCaches } from './index';

// Performance benchmark
console.log('=== Performance Benchmark ===');

// Test different world sizes
const densities = [0.01, 0.05, 0.1, 0.2, 0.5]; // places per km²
const results: Array<{density: number, places: number, time: number}> = [];

for (const density of densities) {
  clearWorldGenCaches(); // Clear caches for fair comparison

  const config = {
    topology: {
      central_plateau: { center: [0, 0] as [number, number], radius: 6.4, elevation: 2000 },
      mountain_ring: { inner_radius: 6.4, outer_radius: 10.2, elevation_range: [2500, 4000] as [number, number] },
      ecosystem_slices: { slice_count: 3, outer_radius: 25.6, elevation_range: [500, 1500] as [number, number] }
    },
    ecosystem_distribution: {
      'flux:eco:forest:temperate': 0.40,
      'flux:eco:grassland:temperate': 0.30,
      'flux:eco:grassland:arid': 0.05,
      'flux:eco:mountain:alpine': 0.15,
      'flux:eco:mountain:forest': 0.10
    },
    gaea_intensity: 0.8,
    fungal_spread_factor: 0.6,
    worshipper_density: 0.3,
    place_density: density,
    random_seed: 42
  };

  const start = performance.now();
  const world = generateWorld(config);
  const end = performance.now();

  results.push({
    density,
    places: world.places.length,
    time: end - start
  });

  console.log(`Density ${density}: ${world.places.length} places in ${(end - start).toFixed(2)}ms`);
}

// Calculate time per place to verify O(N) performance
console.log('\n=== Time Complexity Analysis ===');
results.forEach(result => {
  const timePerPlace = result.time / result.places;
  console.log(`${result.places} places: ${timePerPlace.toFixed(4)}ms per place`);
});

// The time per place should be roughly constant, proving O(N) performance
const avgTimePerPlace = results.reduce((sum, r) => sum + r.time / r.places, 0) / results.length;
console.log(`Average time per place: ${avgTimePerPlace.toFixed(4)}ms`);

console.log('\n=== Testing WorldGenOptions injection ===');

// Test with different seeds and custom options
const seed1 = 123;
const seed2 = 456;

// Create custom options for seed1
const options1: WorldGenOptions = {
  random: (() => {
    let seed = seed1;
    return () => {
      seed = Math.imul(seed, 1664525) + 1013904223;
      return (seed >>> 0) / 4294967296;
    };
  })(),
  timestamp: () => Date.now()
};

// Create custom options for seed2
const options2: WorldGenOptions = {
  random: (() => {
    let seed = seed2;
    return () => {
      seed = Math.imul(seed, 1664525) + 1013904223;
      return (seed >>> 0) / 4294967296;
    };
  })(),
  timestamp: () => Date.now()
};

// Generate worlds with both options
const world1 = generateWorld(undefined, options1);
const world2 = generateWorld(undefined, options2);

console.log(`\nWorld 1 (seed ${seed1}):`);
console.log(`- Places: ${world1.places.length}`);
console.log(`- First place name: ${world1.places[0]?.name}`);
console.log(`- First place ecosystem: ${world1.places[0]?.ecology.ecosystem}`);
console.log(`- First place temperature: ${world1.places[0]?.weather.temperature}`);
console.log(`- First place infection_risk: ${world1.places[0]?.cordyceps_habitat.infection_risk}`);

console.log(`\nWorld 2 (seed ${seed2}):`);
console.log(`- Places: ${world2.places.length}`);
console.log(`- First place name: ${world2.places[0]?.name}`);
console.log(`- First place ecosystem: ${world2.places[0]?.ecology.ecosystem}`);
console.log(`- First place temperature: ${world2.places[0]?.weather.temperature}`);
console.log(`- First place infection_risk: ${world2.places[0]?.cordyceps_habitat.infection_risk}`);

console.log('\n=== Cache Performance ===');
console.log('Ecosystem cache size:', 'ecosystemCache' in globalThis ? 'available' : 'internal');
console.log('Habitat cache size:', 'habitatKeyCache' in globalThis ? 'available' : 'internal');
console.log('Caches provide O(1) lookups for repeated ecosystem configurations');

console.log('\n=== Testing random function calls ===');

// Test the random functions directly
const testRandom1 = options1.random!;
const testRandom2 = options2.random!;

console.log('Random values from seed1:', [testRandom1(), testRandom1(), testRandom1()]);
console.log('Random values from seed2:', [testRandom2(), testRandom2(), testRandom2()]);

console.log('\n=== Testing ecosystem selection ===');

// Test ecosystem selection with both seeds
import { DEFAULT_WORLD_CONFIG } from './index';

// Simulate the ecosystem selection logic
function testEcosystemSelection(options: WorldGenOptions, label: string) {
  console.log(`\n${label}:`);

  // Simulate slice-based ecosystem selection
  const ecosystems = Object.keys(DEFAULT_WORLD_CONFIG.ecosystem_distribution);
  const sliceId = 0; // First slice
  const baseRand = options.random!();
  const sliceOffset = (sliceId / ecosystems.length + baseRand) % 1.0;

  console.log(`- Base random: ${baseRand}`);
  console.log(`- Slice offset: ${sliceOffset}`);

  // Test weighted selection
  const weights = Object.values(DEFAULT_WORLD_CONFIG.ecosystem_distribution);
  let totalWeight = 0;
  for (let i = 0; i < ecosystems.length; i++) {
    totalWeight += weights[i];
    console.log(`- Ecosystem ${i}: ${ecosystems[i]}, weight: ${weights[i]}, total: ${totalWeight}`);
    if (sliceOffset <= totalWeight) {
      console.log(`- Selected: ${ecosystems[i]}`);
      break;
    }
  }
}

testEcosystemSelection(options1, 'Seed 123');
testEcosystemSelection(options2, 'Seed 456');
