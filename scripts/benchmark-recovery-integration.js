#!/usr/bin/env node

/**
 * Benchmark script for 32-step Simpson integration of capacitor recovery curve
 * Based on the FSP Combat System's golden ratio recovery mechanics
 */

// Golden ratio recovery curve - first derivative of phase-shifted sigmoid
// Peaks at t = 0.382 (golden ratio conjugate)
function goldenRecoveryCurve(t) {
  const shifted = t - 0.382; // Phase shift to peak at golden ratio
  return Math.exp(-50 * shifted * shifted); // Gaussian-like curve peaked at 0.382
}

// 32-step Simpson's rule integration for recovery rate calculation
function integrateRecoveryRate(energyRatio, timeSpan = 1.0) {
  const n = 32; // Number of integration steps
  const h = timeSpan / n; // Step size
  let integral = 0;

  // Simpson's 1/3 rule: (h/3) * [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ... + f(xₙ)]
  for (let i = 0; i <= n; i++) {
    const t = energyRatio + (i * h / 10); // Sample around the energy ratio
    const recoveryRate = goldenRecoveryCurve(Math.max(0, Math.min(1, t)));

    // Simpson's coefficients: 1, 4, 2, 4, 2, ..., 4, 1
    const coefficient = (i === 0 || i === n) ? 1 : (i % 2 === 1) ? 4 : 2;
    integral += coefficient * recoveryRate;
  }

  return (h / 3) * integral;
}

// Simulate realistic combat recovery calculation
function simulateRecoveryCalculation(currentEnergy, maxEnergy, maxRecoveryRate, deltaTime) {
  const energyRatio = currentEnergy / maxEnergy;
  const recoveryEfficiency = goldenRecoveryCurve(energyRatio);
  const actualRecoveryRate = maxRecoveryRate * recoveryEfficiency;
  const energyRecovered = actualRecoveryRate * deltaTime;

  return Math.min(maxEnergy, currentEnergy + energyRecovered);
}

// Benchmark configuration
const BENCHMARK_ITERATIONS = 100000;
const TEST_SCENARIOS = [
  { name: "Empty Capacitor", energyRatio: 0.0 },
  { name: "Low Energy", energyRatio: 0.2 },
  { name: "Golden Zone", energyRatio: 0.382 },
  { name: "High Energy", energyRatio: 0.6 },
  { name: "Nearly Full", energyRatio: 0.9 },
  { name: "Full Capacitor", energyRatio: 1.0 }
];

console.log("=".repeat(60));
console.log("FSP Combat System - Recovery Integration Benchmark");
console.log("=".repeat(60));
console.log(`Iterations per test: ${BENCHMARK_ITERATIONS.toLocaleString()}`);
console.log(`Integration steps: 32 (Simpson's rule)`);
console.log("");

// Benchmark the recovery curve evaluation
console.log("📊 Recovery Curve Evaluation Benchmark");
console.log("-".repeat(40));

for (const scenario of TEST_SCENARIOS) {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
    goldenRecoveryCurve(scenario.energyRatio);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const avgTimeNs = Number(endTime - startTime) / BENCHMARK_ITERATIONS;

  console.log(`${scenario.name.padEnd(15)} | ${totalTimeMs.toFixed(2)}ms total | ${avgTimeNs.toFixed(0)}ns per call`);
}

console.log("");

// Benchmark the Simpson integration
console.log("🧮 Simpson Integration Benchmark");
console.log("-".repeat(40));

for (const scenario of TEST_SCENARIOS) {
  const startTime = process.hrtime.bigint();

  for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
    integrateRecoveryRate(scenario.energyRatio);
  }

  const endTime = process.hrtime.bigint();
  const totalTimeMs = Number(endTime - startTime) / 1_000_000;
  const avgTimeNs = Number(endTime - startTime) / BENCHMARK_ITERATIONS;

  console.log(`${scenario.name.padEnd(15)} | ${totalTimeMs.toFixed(2)}ms total | ${avgTimeNs.toFixed(0)}ns per call`);
}

console.log("");

// Benchmark realistic combat scenario
console.log("⚔️  Combat Recovery Simulation Benchmark");
console.log("-".repeat(40));

const COMBAT_PARAMS = {
  maxEnergy: 5000, // RES 50 fighter
  maxRecoveryRate: 500, // 500W max recovery
  deltaTime: 0.1 // 100ms time step
};

let totalRecoveryTime = 0;
const recoveryStartTime = process.hrtime.bigint();

for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
  // Simulate random energy states during combat
  const currentEnergy = Math.random() * COMBAT_PARAMS.maxEnergy;
  simulateRecoveryCalculation(
    currentEnergy,
    COMBAT_PARAMS.maxEnergy,
    COMBAT_PARAMS.maxRecoveryRate,
    COMBAT_PARAMS.deltaTime
  );
}

const recoveryEndTime = process.hrtime.bigint();
totalRecoveryTime = Number(recoveryEndTime - recoveryStartTime) / 1_000_000;
const avgRecoveryTimeNs = Number(recoveryEndTime - recoveryStartTime) / BENCHMARK_ITERATIONS;

console.log(`Combat Recovery   | ${totalRecoveryTime.toFixed(2)}ms total | ${avgRecoveryTimeNs.toFixed(0)}ns per call`);

console.log("");

// Performance analysis
console.log("📈 Performance Analysis");
console.log("-".repeat(40));

const callsPerSecond = (1_000_000_000 / avgRecoveryTimeNs).toFixed(0);
const callsPer60fps = (avgRecoveryTimeNs / 16_666_667 * 100).toFixed(2); // % of 16.67ms frame budget

console.log(`Recovery calculations per second: ${Number(callsPerSecond).toLocaleString()}`);
console.log(`Frame budget usage (60fps): ${callsPer60fps}% per calculation`);

// Golden zone efficiency demonstration
console.log("");
console.log("🏆 Golden Zone Recovery Efficiency");
console.log("-".repeat(40));

for (const scenario of TEST_SCENARIOS) {
  const efficiency = goldenRecoveryCurve(scenario.energyRatio);
  const percentage = (efficiency * 100).toFixed(1);
  const bar = "█".repeat(Math.round(efficiency * 20));

  console.log(`${scenario.name.padEnd(15)} | ${percentage.padStart(5)}% | ${bar}`);
}

console.log("");
console.log("✅ Benchmark complete!");
console.log("");
console.log("📋 Summary:");
console.log(`• Recovery curve evaluation: ~${avgRecoveryTimeNs.toFixed(0)}ns per call`);
console.log(`• Can handle ${Number(callsPerSecond).toLocaleString()} recovery calculations per second`);
console.log(`• Golden zone (38.2% energy) provides maximum recovery efficiency`);
console.log(`• Suitable for real-time combat with ${callsPer60fps}% frame budget per calculation`);
