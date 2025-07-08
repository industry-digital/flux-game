#!/usr/bin/env node

/**
 * Simple Node.js demo script for the worldgen library
 * Run with: npx ts-node src/worldgen/demo.ts
 */

import { generateWorld } from './index';
import { runAllTests, analyzeAntiEquilibrium } from './test';
import { WorldGenUtils } from './react-integration';

console.log('🌍 FLUX World Generation Library Demo');
console.log('=====================================\n');

// Run the full test suite
runAllTests();

console.log('\n📊 Detailed World Analysis');
console.log('===========================\n');

// Generate a world and analyze it
const world = generateWorld();
const analysis = analyzeAntiEquilibrium(world.places);
const summary = WorldGenUtils.formatWorldSummary(world);
const formattedAnalysis = WorldGenUtils.formatAntiEquilibriumAnalysis(analysis);

console.log('World Summary:');
console.log(`  Total Places: ${summary.totalPlaces}`);
console.log(`  Infection Zones: ${summary.infectionZones}`);
console.log(`  Worshipper Territories: ${summary.worshipperTerritories}`);
console.log(`  World Radius: ${summary.worldRadius}km`);

console.log('\nEcosystem Distribution:');
Object.entries(summary.ecosystemCounts).forEach(([ecosystem, count]) => {
  console.log(`  ${ecosystem}: ${count} places`);
});

console.log('\nAnti-Equilibrium Analysis:');
console.log(`  G.A.E.A. Gradient: ${formattedAnalysis.gaeaGradient}`);
console.log(`  Fungal Variance: ${formattedAnalysis.fungalVariance}`);
console.log(`  Territorial Chaos: ${formattedAnalysis.territorialChaos}`);
console.log(`  Ecosystem Diversity: ${formattedAnalysis.ecosystemDiversity}`);
console.log(`  Infection Distribution: ${formattedAnalysis.infectionDistribution}`);
console.log(`  Anti-Equilibrium Score: ${formattedAnalysis.antiEquilibriumScore}/5`);

console.log('\n🎯 Sample Places:');
console.log('=================\n');

// Show sample places from different zones
const plateauPlaces = world.places.filter(p => p.topology_zone === 'plateau').slice(0, 2);
const mountainPlaces = world.places.filter(p => p.topology_zone === 'mountain_ring').slice(0, 2);
const slicePlaces = world.places.filter(p => p.topology_zone === 'ecosystem_slice').slice(0, 3);

console.log('Plateau (G.A.E.A. Sanctuary):');
plateauPlaces.forEach(place => {
  console.log(`  ${place.name}: ${place.ecology.ecosystem}`);
  console.log(`    G.A.E.A. Optimization: ${place.gaea_management.optimization_level.toFixed(2)}`);
  console.log(`    Infection Risk: ${place.cordyceps_habitat.infection_risk.toFixed(2)}`);
});

console.log('\nMountain Ring (Apex Predator Control):');
mountainPlaces.forEach(place => {
  console.log(`  ${place.name}: ${place.ecology.ecosystem}`);
  console.log(`    Predator Density: ${place.gaea_management.apex_predator_density.toFixed(2)}`);
  console.log(`    Fungal Cultivation: ${place.cordyceps_habitat.gaea_cultivation}`);
});

console.log('\nEcosystem Slices (Strategic Management):');
slicePlaces.forEach(place => {
  console.log(`  ${place.name}: ${place.ecology.ecosystem}`);
  console.log(`    Worshipper Presence: ${place.gaea_management.worshipper_presence.toFixed(2)}`);
  console.log(`    Distance from Center: ${place.distance_from_center.toFixed(2)}`);
});

console.log('\n✅ Demo Complete!');
console.log('\nThe worldgen library successfully creates:');
console.log('• Deterministic, reproducible worlds');
console.log('• Hub-and-spoke topology with G.A.E.A. control');
console.log('• Anti-equilibrium dynamics preventing stability');
console.log('• Cordyceps cultivation and infection zones');
console.log('• Worshipper territorial behavior');
console.log('• Permanent environmental pressure on players');
