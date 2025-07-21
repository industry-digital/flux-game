import { UnitOfMeasure, TimeUnit } from '~/types';
import { SpecimenResourceSchema } from '~/types/schema/resource';
import { Easing } from '~/lib/easing';
import { UnitOfMass } from '~/types/world/measures';

/**
 * Factory function for creating mineral resource schemas using a transformer approach
 */
function createMineralSchema(
  transform: (defaults: SpecimenResourceSchema) => SpecimenResourceSchema
): SpecimenResourceSchema {
  const defaults: SpecimenResourceSchema = {
    name: 'mineral deposit',

    provides: ['ore'],

    // Minerals require no specific conditions for growth
    requirements: {},

    growth: {
      curve: Easing.LINEAR,
      duration: [1, TimeUnit.HOUR],
    },

    quantity: {
      measure: UnitOfMeasure.EACH,
      min: 1,
      capacity: 1,
    },

    // Every mineral deposit is between one and ten kilograms
    quality: {
      measure: UnitOfMass.KILOGRAMS,
      min: 1,
      capacity: 10,
    },

    description: ({ fullness }, now, { name }) => {
      if (fullness >= 1) {
        return `a rich deposit of ${name} stretching deep into the earth`;
      }
      if (fullness > 0.7) {
        return `a substantial ${name} deposit with visible seams`;
      }
      if (fullness > 0.3) {
        return `scattered ${name} deposits requiring careful extraction`;
      }
      return `trace amounts of ${name} ore in the surrounding rock`;
    },
  };

  return transform(defaults);
}

// BASE METALS FOR STEEL PRODUCTION

// Iron - Primary base metal for all steel
export const IronSchema: SpecimenResourceSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'iron',
  provides: [...defaults.provides, 'iron'],
}));

// Carbon - Essential for steel hardening (coal/graphite deposits)
export const CoalSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'coal',
  provides: [...defaults.provides, 'coal', 'carbon'],
  requirements: {
    ...defaults.requirements,
    biomes: ['marsh', 'steppe'],
  },
}));

// STAINLESS STEEL ALLOYS

export const ChromiumSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'chromium',
  provides: [...defaults.provides, 'chromium'],
  requirements: {
    ...defaults.requirements,
    biomes: ['steppe'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'chromium ore with metallic luster and greenish tint';
    }
    return 'brilliant chromium deposits perfect for stainless steel alloys';
  }
}));

export const NickelSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'nickel',
  provides: [...defaults.provides, 'nickel'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain', 'grassland', 'steppe'],
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'nickel ore with characteristic silvery-green coloration';
    }
    return 'dense nickel formations ideal for steel alloying';
  }
}));

// TOOL AND WEAPON STEEL ALLOYS

// Tungsten - High-temperature strength, cutting edges
export const TungstenSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'tungsten',
  provides: [...defaults.provides, 'tungsten'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'tungsten ore, incredibly dense and resistant to heat';
    }
    return 'massive tungsten deposits perfect for hardened tool steel';
  }
}));

export const MolybdenumSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'molybdenum',
  provides: [...defaults.provides, 'molybdenum'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain', 'steppe'],
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'molybdenum ore with distinctive silvery-gray appearance';
    }
    return 'rich molybdenum formations for high-strength steel alloys';
  }
}));

export const VanadiumSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'vanadium',
  provides: [...defaults.provides, 'vanadium'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain', 'grassland'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'vanadium ore with colorful oxidation patterns';
    }
    return 'dense vanadium deposits for tool steel enhancement';
  }
}));

// STRUCTURAL STEEL COMPONENTS

export const ManganeseSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'manganese',
  provides: [...defaults.provides, 'manganese'],
  requirements: {
    ...defaults.requirements,
    biomes: ['grassland', 'marsh'],
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'manganese ore with characteristic black and brown nodules';
    }
    return 'extensive manganese formations for structural steel production';
  }
}));

// Silicon - Deoxidizer and steel strength
export const SiliconSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'silicon',
  provides: [...defaults.provides, 'silicon'],
  requirements: {
    ...defaults.requirements,
    biomes: ['steppe', 'grassland'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'silicon ore in crystalline quartz and sand formations';
    }
    return 'pure silicon deposits perfect for steel production and electronics';
  }
}));

// SPECIALTY METALS

// Titanium - Lightweight, high-strength applications
export const TitaniumSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'titanium',
  provides: [...defaults.provides, 'titanium'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain'],
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'titanium ore with remarkable strength-to-weight properties';
    }
    return 'extensive titanium formations for advanced engineering applications';
  }
}));

// Cobalt - High-speed cutting tools
export const CobaltSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'cobalt',
  provides: [...defaults.provides, 'cobalt'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain', 'grassland'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'cobalt ore with distinctive blue-gray metallic luster';
    }
    return 'rich cobalt deposits for high-performance tool steel';
  }
}));

// ENERGY STORAGE

// Lithium - Battery technology
export const LithiumSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'lithium',
  provides: [...defaults.provides, 'lithium'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain', 'steppe', 'grassland'],
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'lithium deposits gleaming with metallic luster';
    }
    return 'massive lithium formations perfect for advanced battery construction';
  }
}));

// PIEZOELECTRIC MINERALS

// Quartz - Most common piezoelectric material
export const QuartzSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'quartz',
  provides: [...defaults.provides, 'quartz'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain', 'steppe', 'grassland', 'forest'], // Extremely widespread
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'quartz crystals glinting with perfect geometric faces';
    }
    if (state.fullness > 0.8) {
      return 'massive quartz formations ideal for precision electronics';
    }
    return 'substantial quartz deposits perfect for piezoelectric applications';
  }
}));

// Tourmaline - Complex piezoelectric properties
export const TourmalineSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'tourmaline',
  provides: [...defaults.provides, 'tourmaline'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain', 'forest'],
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'tourmaline crystals displaying remarkable color variations';
    }
    return 'dense tourmaline formations perfect for sensitive detection systems';
  }
}));

// Topaz - High-quality piezoelectric properties
export const TopazSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'topaz',
  provides: [...defaults.provides, 'topaz'],
  requirements: {
    biomes: ['mountain'],
  },
  description: (state) => {
    if (state.fullness < 0.3) {
      return 'topaz crystals with exceptional clarity and hardness';
    }
    return 'brilliant topaz formations ideal for acoustic and communication systems';
  }
}));

// Beryl - Advanced piezoelectric applications
export const BerylSchema = createMineralSchema((defaults) => ({
  ...defaults,
  name: 'beryl',
  provides: [...defaults.provides, 'beryl'],
  requirements: {
    ...defaults.requirements,
    biomes: ['mountain', 'forest'],
  },
  description: (state) => {
    if (state.fullness < 0.4) {
      return 'beryl crystals with hexagonal structure and piezoelectric properties';
    }
    return 'extensive beryl formations for advanced sensor applications';
  }
}));
