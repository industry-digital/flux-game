import { describe, it, expect } from 'vitest';
import { calculateMovementTime, calculateMovementEnergyCost, calculateDashEnergyCost } from './energy-costs';
import { calculateMaxEnergy } from '~/worldkit/combat/energy';

describe.skip('Physics-Based Energy Cost Analysis', () => {
  it('should calculate realistic energy costs using movement physics', () => {
    console.log('\n⚡ PHYSICS-BASED ENERGY COST ANALYSIS\n');

     // Test cases: Alice example and various builds
     const testCases = [
       { name: 'POW50/FIN50/RES50', power: 50, finesse: 50, mass: 70, distance: 23 },
       { name: 'POW10/FIN10/RES10', power: 10, finesse: 10, mass: 70, distance: 23 },
       { name: 'POW30/FIN100/RES60', power: 30, finesse: 100, mass: 70, distance: 50 },
       { name: 'POW100/FIN30/RES80', power: 100, finesse: 30, mass: 70, distance: 50 },
       { name: 'POW80/FIN40/RES80', power: 80, finesse: 40, mass: 70, distance: 30 },
       { name: 'POW100/FIN100/RES100', power: 100, finesse: 100, mass: 70, distance: 100 },
     ];

    console.log('Build               Distance   Time     Velocity   Energy Cost   J/kg');
    console.log('------------------  --------  ------   --------   -----------   --------');

    for (const testCase of testCases) {
      const time = calculateMovementTime(testCase.power, testCase.finesse, testCase.distance, testCase.mass);
      const velocity = testCase.distance / time;
      const energyCost = calculateMovementEnergyCost(testCase.power, testCase.finesse, testCase.distance, testCase.mass);

      // Calculate energy breakdown (simplified physics)
      const kineticEnergy = 0.5 * testCase.mass * velocity * velocity;
      const efficiency = Math.max(0.3, Math.min(1.0, testCase.finesse / 100));
      const energyPerMass = energyCost / testCase.mass;

      console.log(
        `${testCase.name.padEnd(18)}  ${testCase.distance.toString().padStart(4)}m     ` +
        `${time.toFixed(2)}s   ${velocity.toFixed(1).padStart(6)} m/s   ` +
        `${energyCost.toFixed(0).padStart(9)}J   ${energyPerMass.toFixed(1).padStart(9)}`
      );

      // Validate energy cost is reasonable
      expect(energyCost).toBeGreaterThan(0);
      expect(energyCost).toBeLessThan(50000); // Reasonable upper bound
    }

    console.log('\n💡 ENERGY COST INSIGHTS:');
    console.log('• K = Kinetic Energy (acceleration), F = Friction Work, A = Air Resistance');
    console.log('• Higher velocity → higher kinetic energy and air resistance');
    console.log('• Higher mass → higher kinetic energy and friction work');
    console.log('• Finesse improves efficiency (reduces total energy cost)');
  });

  it('should demonstrate energy scaling with velocity and mass', () => {
    console.log('\n📊 ENERGY SCALING ANALYSIS\n');

    const baseCase = { power: 50, finesse: 50, mass: 70, distance: 50 };

    // Test velocity scaling (different power levels)
    console.log('VELOCITY SCALING (Power variation, 70kg, 50m):');
    console.log('Power   Time    Velocity   Energy   Energy/Velocity²');
    console.log('-----   -----   --------   ------   ---------------');

    const powerLevels = [30, 50, 70, 100];
    for (const power of powerLevels) {
      const time = calculateMovementTime(power, baseCase.finesse, baseCase.distance, baseCase.mass);
      const velocity = baseCase.distance / time;
      const energy = calculateMovementEnergyCost(power, baseCase.finesse, baseCase.distance, baseCase.mass);
      const energyPerVelSquared = energy / (velocity * velocity);

      console.log(
        `${power.toString().padStart(3)}     ${time.toFixed(2)}s   ` +
        `${velocity.toFixed(1).padStart(6)} m/s   ${energy.toFixed(0).padStart(4)}J   ` +
        `${energyPerVelSquared.toFixed(1).padStart(13)}`
      );
    }

    // Test mass scaling
    console.log('\nMASS SCALING (50 POW/FIN, 50m):');
    console.log('Mass    Time    Velocity   Energy   Energy/Mass');
    console.log('----    -----   --------   ------   -----------');

    const massLevels = [50, 70, 90, 120];
    for (const mass of massLevels) {
      const time = calculateMovementTime(baseCase.power, baseCase.finesse, baseCase.distance, mass);
      const velocity = baseCase.distance / time;
      const energy = calculateMovementEnergyCost(baseCase.power, baseCase.finesse, baseCase.distance, mass);
      const energyPerMass = energy / mass;

      console.log(
        `${mass.toString().padStart(3)}kg   ${time.toFixed(2)}s   ` +
        `${velocity.toFixed(1).padStart(6)} m/s   ${energy.toFixed(0).padStart(4)}J   ` +
        `${energyPerMass.toFixed(1).padStart(9)}`
      );
    }

    console.log('\n💡 SCALING INSIGHTS:');
    console.log('• Energy scales roughly with velocity² (air resistance dominates at high speeds)');
    console.log('• Energy scales linearly with mass (kinetic energy and friction)');
    console.log('• Physics-based scaling creates realistic energy costs');
  });

  it('should compare Alice and Bob energy costs to real-world physics', () => {
    console.log('\n🔬 ALICE vs BOB ENERGY COST: GAME vs REALITY\n');

    const alice = { power: 50, finesse: 50, mass: 70, distance: 23 };
    const bob = { power: 10, finesse: 10, mass: 70, distance: 23 };

    // Calculate Alice's performance
    const aliceTime = calculateMovementTime(alice.power, alice.finesse, alice.distance, alice.mass);
    const aliceVelocity = alice.distance / aliceTime;
    const aliceEnergy = calculateMovementEnergyCost(alice.power, alice.finesse, alice.distance, alice.mass);
    const aliceEfficiency = Math.max(0.3, Math.min(1.0, alice.finesse / 100));

    // Calculate Bob's performance
    const bobTime = calculateMovementTime(bob.power, bob.finesse, bob.distance, bob.mass);
    const bobVelocity = bob.distance / bobTime;
    const bobEnergy = calculateMovementEnergyCost(bob.power, bob.finesse, bob.distance, bob.mass);
    const bobEfficiency = Math.max(0.3, Math.min(1.0, bob.finesse / 100));

    // Real-world comparison data
    const realMechanicalWork = 100; // Joules (actual physics for 23m walk)
    const realMetabolicCost = 1840; // Joules (biological inefficiency)

     console.log('Measurement                    POW50/FIN50      POW10/FIN10    Real World');
     console.log('---------------------------   -----------     -----------    ----------');
    console.log(`Distance                       ${alice.distance.toString().padStart(9)}m    ${bob.distance.toString().padStart(8)}m    ${alice.distance.toString().padStart(8)}m`);
    console.log(`Time                           ${aliceTime.toFixed(2).padStart(9)}s    ${bobTime.toFixed(2).padStart(8)}s    ~${(23/1.4).toFixed(1).padStart(7)}s`);
    console.log(`Average Velocity               ${aliceVelocity.toFixed(1).padStart(9)} m/s    ${bobVelocity.toFixed(1).padStart(8)} m/s    ~${(1.4).toString().padStart(7)} m/s`);
    console.log(`Energy Cost                    ${aliceEnergy.toFixed(0).padStart(9)}J    ${bobEnergy.toFixed(0).padStart(8)}J    ${realMechanicalWork.toString().padStart(8)}J (mech)`);
    console.log(`                                                        ${realMetabolicCost.toString().padStart(8)}J (metab)`);

    console.log('\n⚡ ENERGY BREAKDOWN COMPARISON:');
    const aliceKinetic = 0.5 * alice.mass * aliceVelocity * aliceVelocity;
    const bobKinetic = 0.5 * bob.mass * bobVelocity * bobVelocity;

     console.log('POW50/FIN50/RES50 (Alice):');
     console.log(`• Kinetic Energy:     ${aliceKinetic.toFixed(0).padStart(4)}J (acceleration to ${aliceVelocity.toFixed(1)} m/s)`);
     console.log(`• Efficiency Factor:  ${(aliceEfficiency * 100).toFixed(0).padStart(4)}% (finesse-based technique)`);
     console.log(`• Final Energy Cost:  ${(aliceKinetic / aliceEfficiency).toFixed(0).padStart(4)}J (kinetic ÷ efficiency)`);

     console.log('\nPOW10/FIN10/RES10 (Bob):');
     console.log(`• Kinetic Energy:     ${bobKinetic.toFixed(0).padStart(4)}J (acceleration to ${bobVelocity.toFixed(1)} m/s)`);
     console.log(`• Efficiency Factor:  ${(bobEfficiency * 100).toFixed(0).padStart(4)}% (finesse-based technique)`);
     console.log(`• Final Energy Cost:  ${(bobKinetic / bobEfficiency).toFixed(0).padStart(4)}J (kinetic ÷ efficiency)`);

    console.log('\n💡 STAT COMPARISON INSIGHTS:');
    console.log(`• Alice is ${(bobTime / aliceTime).toFixed(1)}x faster than Bob`);
    console.log(`• Bob uses ${(bobEnergy / aliceEnergy).toFixed(1)}x less total energy (slower = less kinetic energy)`);
    console.log(`• Bob's energy per meter: ${(bobEnergy / bob.distance).toFixed(0)}J/m vs Alice: ${(aliceEnergy / alice.distance).toFixed(0)}J/m`);
    console.log(`• Bob is more energy-efficient per meter despite poor technique!`);
    console.log(`• Physics insight: Velocity² dominates energy cost more than efficiency`);
    console.log(`• Trade-off: Speed vs Energy Efficiency (realistic physics behavior)`);

    // Validate both energy costs are reasonable
    expect(aliceEnergy).toBeGreaterThan(50);
    expect(aliceEnergy).toBeLessThan(20000);
    expect(bobEnergy).toBeLessThan(aliceEnergy); // Bob uses less total energy due to much slower speed
    expect(bobEnergy).toBeGreaterThan(500); // Reasonable cost for ordinary human walking
    expect(bobEnergy / bob.distance).toBeLessThan(aliceEnergy / alice.distance); // Bob is more efficient per meter due to low velocity
  });

  it('should demonstrate DASH energy cost scaling', () => {
    console.log('\n🏃 DASH ENERGY COST ANALYSIS\n');

    const testCase = { power: 60, finesse: 70, mass: 75, distance: 30 };

    // Calculate normal vs DASH energy costs
    const normalEnergy = calculateMovementEnergyCost(testCase.power, testCase.finesse, testCase.distance, testCase.mass);

    // DASH calculation (from energy-costs.ts logic)
    const normalTime = calculateMovementTime(testCase.power, testCase.finesse, testCase.distance, testCase.mass);
    const dashTime = normalTime * 0.67; // 33% time reduction
    const dashVelocity = testCase.distance / dashTime;
    const normalVelocity = testCase.distance / normalTime;

    const velocityRatio = dashVelocity / normalVelocity;
    const velocityMultiplier = velocityRatio * velocityRatio;
    const explosiveAccelerationCost = testCase.power * 3;
    const momentumBuildingCost = testCase.mass * dashVelocity * 0.05;
    const dashEnergy = (normalEnergy * velocityMultiplier) + explosiveAccelerationCost + momentumBuildingCost;

    console.log('Movement Type   Time    Velocity   Energy   Energy Ratio');
    console.log('------------   ------   --------   ------   ------------');
    console.log(`Normal         ${normalTime.toFixed(2)}s   ${normalVelocity.toFixed(1).padStart(6)} m/s   ${normalEnergy.toFixed(0).padStart(4)}J   1.0x`);
    console.log(`DASH           ${dashTime.toFixed(2)}s   ${dashVelocity.toFixed(1).padStart(6)} m/s   ${dashEnergy.toFixed(0).padStart(4)}J   ${(dashEnergy / normalEnergy).toFixed(1)}x`);

    console.log('\nDASH Energy Breakdown:');
    console.log(`• Base Energy × ${velocityMultiplier.toFixed(1)}:  ${(normalEnergy * velocityMultiplier).toFixed(0)}J`);
    console.log(`• Explosive Acceleration:     ${explosiveAccelerationCost.toFixed(0)}J`);
    console.log(`• Momentum Building:          ${momentumBuildingCost.toFixed(0)}J`);

    console.log('\n💡 DASH INSIGHTS:');
    console.log('• DASH is 50% faster but costs significantly more energy');
    console.log('• Energy scales with velocity² (realistic physics)');
    console.log('• Explosive acceleration and momentum building add fixed costs');
    console.log('• Creates tactical trade-off: speed vs energy efficiency');

    // Validate DASH costs more than normal movement
    expect(dashEnergy).toBeGreaterThan(normalEnergy);
     expect(dashEnergy / normalEnergy).toBeGreaterThan(1.5); // At least 50% more expensive
     expect(dashEnergy / normalEnergy).toBeLessThan(5.0); // But not excessively expensive
   });

   describe('Capacitor vs Energy Cost Analysis', () => {
     it('should analyze capacitor scaling across stat parameter space', () => {
       console.log('\n🔋 CAPACITOR SCALING ANALYSIS\n');

       const resLevels = [10, 25, 50, 75, 100];

       console.log('RES Stat   Capacitor   Energy/kg   Scaling');
       console.log('--------   ---------   ---------   -------');

       for (const res of resLevels) {
         const capacity = calculateMaxEnergy(res);
         const energyPerKg = capacity / 70; // Normalized to 70kg baseline
         const scalingFactor = capacity / calculateMaxEnergy(10); // Relative to RES 10

         console.log(
           `${res.toString().padStart(4)}       ${capacity.toFixed(0).padStart(7)}J   ` +
           `${energyPerKg.toFixed(0).padStart(7)}   ${scalingFactor.toFixed(1)}x`
         );

         // Validate capacitor scaling
         expect(capacity).toBeGreaterThan(0);
         if (res > 10) {
           expect(capacity).toBeGreaterThan(calculateMaxEnergy(10));
         }
       }

       console.log('\n💡 CAPACITOR SCALING INSIGHTS:');
       console.log('• RES 10: 10,000J baseline (ordinary human)');
       console.log('• RES 100: ~45,600J maximum (elite athlete)');
       console.log('• Diminishing returns curve prevents exponential scaling');
       console.log('• 4.6x capacity increase from min to max RES');
     });

     it('should identify movement costs that exceed capacitor capacity', () => {
       console.log('\n⚠️  MOVEMENT COSTS vs CAPACITOR CAPACITY\n');

       // Test across stat combinations to find problematic cases
       // Realistic builds: 50±20 stat distributions (no degenerate edge cases)
       const statCombinations = [
         { name: 'POW30/FIN30/RES30', power: 30, finesse: 30, res: 30, mass: 70 }, // Low-tier
         { name: 'POW50/FIN50/RES50', power: 50, finesse: 50, res: 50, mass: 70 }, // Balanced
         { name: 'POW70/FIN50/RES40', power: 70, finesse: 50, res: 40, mass: 70 }, // Power focus
         { name: 'POW40/FIN70/RES50', power: 40, finesse: 70, res: 50, mass: 70 }, // Speed focus
         { name: 'POW50/FIN40/RES70', power: 50, finesse: 40, res: 70, mass: 70 }, // Endurance focus
         { name: 'POW60/FIN60/RES60', power: 60, finesse: 60, res: 60, mass: 70 }, // High-tier balanced
       ];

       const distances = [50, 100, 200]; // Test distances
       const problematicCases: Array<{build: string, distance: number, energyCost: number, capacity: number, ratio: number}> = [];

       console.log('Build                    Dist   Energy   Capacity   Ratio   Status');
       console.log('----------------------  -----  -------  ---------  ------  ------');

       for (const build of statCombinations) {
         const capacity = calculateMaxEnergy(build.res);

         for (const distance of distances) {
           // Test normal movement
           const normalEnergy = calculateMovementEnergyCost(build.power, build.finesse, distance, build.mass);
           const normalRatio = normalEnergy / capacity;
           const normalStatus = normalRatio > 1.0 ? '❌ EXCEED' : normalRatio > 0.8 ? '⚠️  HIGH' : '✅ OK';

           console.log(
             `${build.name.padEnd(22)}  ${distance.toString().padStart(3)}m  ` +
             `${normalEnergy.toFixed(0).padStart(5)}J  ${capacity.toFixed(0).padStart(7)}J  ` +
             `${normalRatio.toFixed(2).padStart(4)}  ${normalStatus}`
           );

           if (normalRatio > 1.0) {
             problematicCases.push({
               build: build.name,
               distance,
               energyCost: normalEnergy,
               capacity,
               ratio: normalRatio
             });
           }

           // Test DASH movement
           const dashEnergy = calculateDashEnergyCost(build.power, build.finesse, distance, build.mass);
           const dashRatio = dashEnergy / capacity;
           const dashStatus = dashRatio > 1.0 ? '❌ EXCEED' : dashRatio > 0.8 ? '⚠️  HIGH' : '✅ OK';

           console.log(
             `${(build.name + ' (DASH)').padEnd(22)}  ${distance.toString().padStart(3)}m  ` +
             `${dashEnergy.toFixed(0).padStart(5)}J  ${capacity.toFixed(0).padStart(7)}J  ` +
             `${dashRatio.toFixed(2).padStart(4)}  ${dashStatus}`
           );

           if (dashRatio > 1.0) {
             problematicCases.push({
               build: build.name + ' (DASH)',
               distance,
               energyCost: dashEnergy,
               capacity,
               ratio: dashRatio
             });
           }
         }
       }

       console.log('\n🚨 PROBLEMATIC CASES (Energy > Capacity):');
       if (problematicCases.length === 0) {
         console.log('• No cases found where movement exceeds capacitor capacity');
       } else {
         for (const case_ of problematicCases) {
           console.log(`• ${case_.build} at ${case_.distance}m: ${case_.energyCost.toFixed(0)}J > ${case_.capacity.toFixed(0)}J (${case_.ratio.toFixed(1)}x)`);
         }
       }

       console.log('\n💡 SUSTAINABILITY INSIGHTS:');
       console.log('• High POW/FIN with low RES creates energy sustainability issues');
       console.log('• DASH movements are particularly expensive for low-RES builds');
       console.log('• Heavy actors (high mass) compound energy costs');
       console.log('• RES investment is crucial for sustained high-performance movement');

       // Validate that most reasonable builds don't exceed capacity
       const reasonableBuilds = statCombinations.filter(b => b.res >= 25);
       for (const build of reasonableBuilds) {
         const capacity = calculateMaxEnergy(build.res);
         const normalEnergy = calculateMovementEnergyCost(build.power, build.finesse, 50, build.mass);
         expect(normalEnergy).toBeLessThan(capacity); // Normal movement should be affordable
       }
     });

     it('should analyze movement sustainability across builds', () => {
       console.log('\n🏃 MOVEMENT SUSTAINABILITY ANALYSIS\n');

       // Realistic builds: 50±20 stat distributions
       const builds = [
         { name: 'POW70/FIN50/RES30', power: 70, finesse: 50, res: 30, mass: 70 }, // Glass cannon (realistic)
         { name: 'POW40/FIN70/RES40', power: 40, finesse: 70, res: 40, mass: 70 }, // Speed demon (realistic)
         { name: 'POW50/FIN40/RES70', power: 50, finesse: 40, res: 70, mass: 70 }, // Tank (realistic)
         { name: 'POW50/FIN50/RES50', power: 50, finesse: 50, res: 50, mass: 70 }, // Balanced
         { name: 'POW60/FIN60/RES60', power: 60, finesse: 60, res: 60, mass: 70 }, // High-tier balanced
       ];

       const testDistance = 50; // Standard tactical distance

       console.log('Build                 Capacity   Normal   DASH   Moves/Tank   DASH/Tank');
       console.log('-------------------  ---------  -------  -----  ----------   ---------');

       for (const build of builds) {
         const capacity = calculateMaxEnergy(build.res);
         const normalEnergy = calculateMovementEnergyCost(build.power, build.finesse, testDistance, build.mass);
         const dashEnergy = calculateDashEnergyCost(build.power, build.finesse, testDistance, build.mass);

         const normalMovesPerTank = Math.floor(capacity / normalEnergy);
         const dashMovesPerTank = Math.floor(capacity / dashEnergy);

         console.log(
           `${build.name.padEnd(19)} ${capacity.toFixed(0).padStart(7)}J  ` +
           `${normalEnergy.toFixed(0).padStart(5)}J  ${dashEnergy.toFixed(0).padStart(4)}J  ` +
           `${normalMovesPerTank.toString().padStart(8)}     ${dashMovesPerTank.toString().padStart(7)}`
         );

         // Validate sustainability
         expect(normalMovesPerTank).toBeGreaterThan(0); // Should afford at least one normal move
         expect(dashMovesPerTank).toBeGreaterThan(0); // Should afford at least one DASH
       }

       console.log('\n💡 SUSTAINABILITY INSIGHTS:');
       console.log('• POW70/FIN50/RES30: Glass cannon - high damage potential but limited sustainability');
       console.log('• POW40/FIN70/RES40: Speed demon - fast but energy-hungry, needs careful management');
       console.log('• POW50/FIN40/RES70: Tank - excellent sustainability with high RES investment');
       console.log('• POW50/FIN50/RES50: Balanced - good all-around sustainability');
       console.log('• POW60/FIN60/RES60: High-tier balanced - excellent performance and sustainability');
     });

     it('should identify optimal RES investment for different playstyles', () => {
       console.log('\n🎯 OPTIMAL RES INVESTMENT ANALYSIS\n');

       // Test realistic playstyles with varying RES investment (50±20 range)
       const playstyles = [
         { name: 'POW40/FIN70', power: 40, finesse: 70, mass: 70 }, // Speed-focused
         { name: 'POW70/FIN40', power: 70, finesse: 40, mass: 70 }, // Power-focused
         { name: 'POW60/FIN60', power: 60, finesse: 60, mass: 70 }, // Balanced
       ];

       const resLevels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
       const targetDistance = 50;

       for (const style of playstyles) {
         console.log(`\\n${style.name.toUpperCase()} PLAYSTYLE:`);
         console.log('RES   Capacity   Energy   Moves   Efficiency');
         console.log('---  ---------  -------  ------  ----------');

         let optimalRes = 10;
         let bestEfficiency = 0;

         for (const res of resLevels) {
           const capacity = calculateMaxEnergy(res);
           const energy = calculateMovementEnergyCost(style.power, style.finesse, targetDistance, style.mass);
           const movesPerTank = Math.floor(capacity / energy);
           const efficiency = movesPerTank / res; // Moves per RES point invested

           console.log(
             `${res.toString().padStart(3)}  ${capacity.toFixed(0).padStart(7)}J  ` +
             `${energy.toFixed(0).padStart(5)}J  ${movesPerTank.toString().padStart(4)}   ` +
             `${efficiency.toFixed(2).padStart(8)}`
           );

           if (efficiency > bestEfficiency) {
             bestEfficiency = efficiency;
             optimalRes = res;
           }
         }

         console.log(`Optimal RES for ${style.name}: ${optimalRes} (${bestEfficiency.toFixed(2)} moves/RES point)`);
       }

       console.log('\n💡 RES INVESTMENT INSIGHTS:');
       console.log('• Diminishing returns curve means there\'s an optimal RES investment');
       console.log('• High-energy playstyles benefit more from RES investment');
       console.log('• Balance RES with offensive stats based on intended playstyle');
     });
   });
 });
