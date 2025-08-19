#!/usr/bin/env node

/**
 * Benchmark script for strike power integration using Simpson's rule
 * Tests the 3-second power spool-up system with energy depletion
 * Based on the FSP Combat System's physics calculations
 */

// Power spool-up formula: P_effective(t) = P_natural * min(1.0, t/3.0)
function powerSpoolUp(t, naturalPower) {
  return naturalPower * Math.min(1.0, t / 3.0);
}

// Golden ratio recovery curve (for energy recovery during brief pauses)
function goldenRecoveryCurve(t) {
  const shifted = t - 0.382;
  return Math.exp(-50 * shifted * shifted);
}

// Simpson's rule integration for strike power with energy depletion
function integrateStrikePower(duration, initialEnergy, naturalPower, naturalRES, steps = 32) {
  const n = steps;
  const h = duration / n;
  const maxRecovery = naturalRES * 10; // Watts per RES point

  let currentEnergy = initialEnergy;
  let integral = 0;

  for (let i = 0; i <= n; i++) {
    const t = i * h;
    const remainingDuration = duration - t;

    // Power spool-up over 3 seconds
    const spooledPower = powerSpoolUp(t, naturalPower);

    // Energy-limited power output
    const energyLimitedPower = remainingDuration > 0 ?
      currentEnergy / remainingDuration : naturalPower;
    const effectivePower = Math.min(spooledPower, energyLimitedPower);

    // Simpson's coefficients: 1, 4, 2, 4, 2, ..., 4, 1
    const coefficient = (i === 0 || i === n) ? 1 : (i % 2 === 1) ? 4 : 2;
    integral += coefficient * effectivePower;

    // Update energy state for next step
    if (i < n) {
      // Energy depletion
      currentEnergy -= effectivePower * h;

      // Golden ratio recovery (minimal during active strike)
      const energyRatio = Math.max(0, Math.min(1, currentEnergy / (naturalRES * 100)));
      const recoveryRate = maxRecovery * goldenRecoveryCurve(energyRatio);
      currentEnergy += recoveryRate * h * 0.1; // Minimal recovery during exertion

      // Clamp to valid range
      currentEnergy = Math.max(0, Math.min(currentEnergy, naturalRES * 100));
    }
  }

  return (h / 3) * integral; // Total kinetic energy generated
}

// Simplified strike calculation (no energy depletion)
function simpleStrikePower(duration, naturalPower) {
  if (duration <= 3.0) {
    // Average power over spool-up period
    const avgMultiplier = duration / (2 * 3.0); // Linear ramp average
    return naturalPower * avgMultiplier * duration;
  } else {
    // Full power after 3 seconds
    const spoolUpEnergy = naturalPower * 0.5 * 3.0; // First 3 seconds
    const fullPowerEnergy = naturalPower * (duration - 3.0); // Remaining time
    return spoolUpEnergy + fullPowerEnergy;
  }
}

// Test scenarios
const BENCHMARK_ITERATIONS = 50000;
const TEST_FIGHTERS = [
  { name: "Weak Fighter", POW: 20, RES: 30, power: 625 },
  { name: "Balanced Fighter", POW: 50, RES: 50, power: 1375 },
  { name: "Strong Fighter", POW: 80, RES: 40, power: 2125 },
  { name: "Superhuman", POW: 100, RES: 80, power: 2625 }
];

const STRIKE_DURATIONS = [1.0, 2.0, 3.0]; // seconds
const INTEGRATION_STEPS = [8, 16, 32, 64]; // test different step counts

console.log("=".repeat(65));
console.log("FSP Combat System - Strike Power Integration Benchmark");
console.log("=".repeat(65));
console.log(`Iterations per test: ${BENCHMARK_ITERATIONS.toLocaleString()}`);
console.log("");

// Benchmark different integration step counts
console.log("🧮 Integration Step Count Performance");
console.log("-".repeat(50));

for (const steps of INTEGRATION_STEPS) {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
    const fighter = TEST_FIGHTERS[1]; // Balanced fighter
    const initialEnergy = fighter.RES * 100 * 0.8; // 80% energy
    integrateStrikePower(2.0, initialEnergy, fighter.power, fighter.RES, steps);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const avgTimeNs = Number(endTime - startTime) / BENCHMARK_ITERATIONS;

  console.log(`${steps} steps     | ${totalTimeMs.toFixed(2)}ms total | ${avgTimeNs.toFixed(0)}ns per calc`);
}

console.log("");

// Benchmark strike durations with 32-step integration
console.log("⚔️  Strike Duration Performance (32 steps)");
console.log("-".repeat(50));

for (const duration of STRIKE_DURATIONS) {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
    const fighter = TEST_FIGHTERS[2]; // Strong fighter
    const initialEnergy = fighter.RES * 100 * 0.6; // 60% energy
    integrateStrikePower(duration, initialEnergy, fighter.power, fighter.RES, 32);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const avgTimeNs = Number(endTime - startTime) / BENCHMARK_ITERATIONS;

  console.log(`${duration}s strike  | ${totalTimeMs.toFixed(2)}ms total | ${avgTimeNs.toFixed(0)}ns per calc`);
}

console.log("");

// Compare integration vs simplified calculation
console.log("🏃 Integration vs Simplified Calculation");
console.log("-".repeat(50));

// Integration benchmark
const integrationStart = process.hrtime.bigint();
for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
  const fighter = TEST_FIGHTERS[1];
  const initialEnergy = fighter.RES * 100 * 0.7;
  integrateStrikePower(2.0, initialEnergy, fighter.power, fighter.RES, 32);
}
const integrationEnd = process.hrtime.bigint();
const integrationTimeMs = Number(integrationEnd - integrationStart) / 1_000_000;
const integrationAvgNs = Number(integrationEnd - integrationStart) / BENCHMARK_ITERATIONS;

// Simplified calculation benchmark
const simpleStart = process.hrtime.bigint();
for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
  const fighter = TEST_FIGHTERS[1];
  simpleStrikePower(2.0, fighter.power);
}
const simpleEnd = process.hrtime.bigint();
const simpleTimeMs = Number(simpleEnd - simpleStart) / 1_000_000;
const simpleAvgNs = Number(simpleEnd - simpleStart) / BENCHMARK_ITERATIONS;

console.log(`Integration     | ${integrationTimeMs.toFixed(2)}ms total | ${integrationAvgNs.toFixed(0)}ns per calc`);
console.log(`Simplified      | ${simpleTimeMs.toFixed(2)}ms total | ${simpleAvgNs.toFixed(0)}ns per calc`);
console.log(`Overhead        | ${(integrationAvgNs / simpleAvgNs).toFixed(1)}x slower`);

console.log("");

// Test accuracy vs performance tradeoff
console.log("🎯 Accuracy vs Performance Analysis");
console.log("-".repeat(50));

const testFighter = TEST_FIGHTERS[2];
const testEnergy = testFighter.RES * 100 * 0.5; // 50% energy
const reference = integrateStrikePower(2.5, testEnergy, testFighter.power, testFighter.RES, 64);

for (const steps of [8, 16, 32]) {
  const result = integrateStrikePower(2.5, testEnergy, testFighter.power, testFighter.RES, steps);
  const accuracy = ((1 - Math.abs(result - reference) / reference) * 100);

  console.log(`${steps} steps: ${accuracy.toFixed(2)}% accuracy vs 64-step reference`);
}

console.log("");

// Performance analysis
console.log("📈 Performance Analysis");
console.log("-".repeat(50));

const calcsPerSecond = (1_000_000_000 / integrationAvgNs).toFixed(0);
const frameBudget = (integrationAvgNs / 16_666_667 * 100).toFixed(3);

console.log(`Strike calculations per second: ${Number(calcsPerSecond).toLocaleString()}`);
console.log(`Frame budget usage (60fps): ${frameBudget}% per calculation`);
console.log(`Simultaneous strikes per frame: ${Math.floor(16_666_667 / integrationAvgNs)}`);

console.log("");

// Strike power examples
console.log("⚡ Strike Power Examples (2s strike, 70% energy)");
console.log("-".repeat(50));

for (const fighter of TEST_FIGHTERS) {
  const initialEnergy = fighter.RES * 100 * 0.7;
  const energy = integrateStrikePower(2.0, initialEnergy, fighter.power, fighter.RES, 32);
  const damage = Math.floor(energy / 5); // 5J per damage point

  console.log(`${fighter.name.padEnd(16)} | ${energy.toFixed(0).padStart(5)}J | ${damage.padStart(4)} damage`);
}

console.log("");
console.log("✅ Strike integration benchmark complete!");
console.log("");
console.log("📋 Summary:");
console.log(`• 32-step integration: ~${integrationAvgNs.toFixed(0)}ns per calculation`);
console.log(`• Suitable for real-time combat: ${frameBudget}% frame budget`);
console.log(`• Can handle ${Math.floor(16_666_667 / integrationAvgNs)} simultaneous strikes per frame`);
console.log(`• 16 steps provide ${((1 - Math.abs(integrateStrikePower(2.5, testEnergy, testFighter.power, testFighter.RES, 16) - reference) / reference) * 100).toFixed(1)}% accuracy with better performance`);
