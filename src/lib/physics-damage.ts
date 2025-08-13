/**
 * Physics-based damage calculation system for D&D-style stats
 * 
 * This system maintains D&D stat progression while grounding damage calculations
 * in real physics principles: kinetic energy, momentum transfer, material stress,
 * and biomechanical limits.
 */

import { calculateBurstPower } from './power';

/**
 * Physical constants and biomechanical parameters
 */
const PHYSICS_CONSTANTS = {
  // Strike mechanics
  typicalStrikeDuration: 0.1, // seconds (100ms for a fast punch)
  slowStrikeDuration: 0.3,    // seconds (300ms for a heavy weapon swing)
  
  // Energy transfer efficiency based on contact mechanics
  efficiency: {
    bareHand: 0.4,           // Soft tissue deforms, absorbs energy
    lightWeapon: 0.7,        // Rigid contact, better transfer
    heavyWeapon: 0.8,        // Mass amplifies energy transfer
    piercingWeapon: 0.9,     // Concentrated force, minimal energy loss
  },
  
  // Human tissue damage thresholds (based on real biomechanics)
  damageTresholds: {
    bruising: 10,      // joules - visible bruising
    pain: 25,          // joules - significant pain response
    minorInjury: 50,   // joules - minor cuts, sprains
    majorInjury: 150,  // joules - fractures, deep wounds
    severeTrauma: 400, // joules - life-threatening damage
    lethal: 1000,      // joules - potentially fatal
  },
  
  // Material properties for armor/weapons
  materials: {
    flesh: { resistance: 1.0, absorption: 0.3 },
    leather: { resistance: 1.2, absorption: 0.4 },
    chainMail: { resistance: 2.0, absorption: 0.2 },
    plateMail: { resistance: 4.0, absorption: 0.1 },
    steel: { resistance: 10.0, absorption: 0.05 },
  },
} as const;

/**
 * Calculate kinetic energy delivered in a strike
 * 
 * @param powerWatts - Burst power output from muscles
 * @param strikeDuration - Duration of energy application
 * @param efficiency - Energy transfer efficiency (0-1)
 * @returns Kinetic energy in joules
 */
export function calculateStrikeEnergy(
  powerWatts: number,
  strikeDuration: number = PHYSICS_CONSTANTS.typicalStrikeDuration,
  efficiency: number = PHYSICS_CONSTANTS.efficiency.bareHand
): number {
  // Physics: Power × Time = Energy (watts × seconds = joules)
  const totalEnergy = powerWatts * strikeDuration;
  return totalEnergy * efficiency;
}

/**
 * Convert kinetic energy to biological damage using real damage thresholds
 * 
 * @param energyJoules - Kinetic energy delivered
 * @param targetResistance - Material resistance factor
 * @returns Damage severity assessment
 */
export function assessPhysicalDamage(energyJoules: number, targetResistance: number = 1.0): {
  adjustedEnergy: number;
  damageLevel: string;
  gameplayDamage: number;
  realWorldContext: string;
} {
  const adjustedEnergy = energyJoules / targetResistance;
  const thresholds = PHYSICS_CONSTANTS.damageTresholds;
  
  let damageLevel: string;
  let gameplayDamage: number;
  let realWorldContext: string;
  
  if (adjustedEnergy < thresholds.bruising) {
    damageLevel = "Negligible";
    gameplayDamage = Math.max(0.1, adjustedEnergy * 0.1);
    realWorldContext = "Light tap, no visible damage";
  } else if (adjustedEnergy < thresholds.pain) {
    damageLevel = "Minor";
    gameplayDamage = 1 + (adjustedEnergy - thresholds.bruising) * 0.2;
    realWorldContext = "Visible bruising, temporary pain";
  } else if (adjustedEnergy < thresholds.minorInjury) {
    damageLevel = "Moderate";
    gameplayDamage = 4 + (adjustedEnergy - thresholds.pain) * 0.4;
    realWorldContext = "Significant bruising, possible sprains";
  } else if (adjustedEnergy < thresholds.majorInjury) {
    damageLevel = "Serious";
    gameplayDamage = 15 + (adjustedEnergy - thresholds.minorInjury) * 0.6;
    realWorldContext = "Deep wounds, potential fractures";
  } else if (adjustedEnergy < thresholds.severeTrauma) {
    damageLevel = "Severe";
    gameplayDamage = 75 + (adjustedEnergy - thresholds.majorInjury) * 0.8;
    realWorldContext = "Life-threatening injuries";
  } else {
    damageLevel = "Catastrophic";
    gameplayDamage = 200 + (adjustedEnergy - thresholds.severeTrauma) * 0.2;
    realWorldContext = "Potentially fatal trauma";
  }
  
  return {
    adjustedEnergy,
    damageLevel,
    gameplayDamage: Math.round(gameplayDamage * 10) / 10,
    realWorldContext,
  };
}

/**
 * Complete physics-based damage calculation
 * 
 * @param str - Actor's strength stat
 * @param weaponType - Type of weapon/attack
 * @param targetArmor - Target's armor material
 * @param strikeDuration - Optional override for strike timing
 * @returns Comprehensive damage analysis
 */
export function calculatePhysicsDamage(
  str: number,
  weaponType: keyof typeof PHYSICS_CONSTANTS.efficiency = 'bareHand',
  targetArmor: keyof typeof PHYSICS_CONSTANTS.materials = 'flesh',
  strikeDuration?: number
): {
  powerOutput: number;
  kineticEnergy: number;
  damageAssessment: ReturnType<typeof assessPhysicalDamage>;
  physicsBreakdown: string;
} {
  const powerOutput = calculateBurstPower(str);
  const efficiency = PHYSICS_CONSTANTS.efficiency[weaponType];
  const duration = strikeDuration || PHYSICS_CONSTANTS.typicalStrikeDuration;
  const armorProperties = PHYSICS_CONSTANTS.materials[targetArmor];
  
  const kineticEnergy = calculateStrikeEnergy(powerOutput, duration, efficiency);
  const damageAssessment = assessPhysicalDamage(kineticEnergy, armorProperties.resistance);
  
  const physicsBreakdown = 
    `STR ${str} → ${powerOutput}W power → ` +
    `${kineticEnergy.toFixed(1)}J kinetic energy (${duration}s × ${efficiency} efficiency) → ` +
    `${damageAssessment.adjustedEnergy.toFixed(1)}J vs ${targetArmor} → ` +
    `${damageAssessment.gameplayDamage} damage (${damageAssessment.damageLevel})`;
  
  return {
    powerOutput,
    kineticEnergy,
    damageAssessment,
    physicsBreakdown,
  };
}

/**
 * Weapon-specific physics modifications
 */
export function calculateWeaponPhysics(
  str: number,
  weaponType: 'punch' | 'sword' | 'mace' | 'dagger' | 'warhammer'
): ReturnType<typeof calculatePhysicsDamage> {
  const weaponParams = {
    punch: { 
      efficiency: 'bareHand' as const, 
      duration: 0.1, 
      armor: 'flesh' as const 
    },
    sword: { 
      efficiency: 'lightWeapon' as const, 
      duration: 0.2, 
      armor: 'flesh' as const 
    },
    mace: { 
      efficiency: 'heavyWeapon' as const, 
      duration: 0.3, 
      armor: 'flesh' as const 
    },
    dagger: { 
      efficiency: 'piercingWeapon' as const, 
      duration: 0.15, 
      armor: 'flesh' as const 
    },
    warhammer: { 
      efficiency: 'heavyWeapon' as const, 
      duration: 0.4, 
      armor: 'flesh' as const 
    },
  };
  
  const params = weaponParams[weaponType];
  return calculatePhysicsDamage(str, params.efficiency, params.armor, params.duration);
}

/**
 * Real-world comparison scenarios
 */
export const PHYSICS_SCENARIOS = {
  // Real-world baselines for comparison
  realWorld: {
    profesionalBoxer: calculateStrikeEnergy(400, 0.1, 0.4), // ~400W punch
    baseballBat: calculateStrikeEnergy(300, 0.3, 0.8),      // ~300W swing
    sledgehammer: calculateStrikeEnergy(500, 0.5, 0.9),     // ~500W impact
    carCrash20mph: 10000, // ~10kJ for reference
  },
  
  // Game STR scenarios with physics
  str10_punch: calculatePhysicsDamage(10, 'bareHand'),
  str30_sword: calculatePhysicsDamage(30, 'lightWeapon'),
  str50_mace: calculatePhysicsDamage(50, 'heavyWeapon'),
  str75_warhammer: calculatePhysicsDamage(75, 'heavyWeapon'),
  str100_punch: calculatePhysicsDamage(100, 'bareHand'),
  
  // Armor effectiveness
  str75_vs_chainmail: calculatePhysicsDamage(75, 'heavyWeapon', 'chainMail'),
  str75_vs_plate: calculatePhysicsDamage(75, 'heavyWeapon', 'plateMail'),
} as const;
