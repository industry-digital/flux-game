import { SchemaTranslations } from '~/types/i18n';

export const en_US_schemaTranslations: SchemaTranslations = {
  // Weapons - Melee
  'flux:schema:weapon:bare-hands': {
    name: {
      singular: 'bare hands',
      plural: 'bare hands',
    },
    description: 'Your natural weapons - fists and feet',
  },
  'flux:schema:weapon:dagger': {
    name: {
      singular: 'dagger',
      plural: 'daggers',
    },
    description: 'A short, sharp blade for close combat',
  },
  'flux:schema:weapon:sword': {
    name: {
      singular: 'sword',
      plural: 'swords',
    },
    description: 'A balanced blade for versatile combat',
  },
  'flux:schema:weapon:longsword': {
    name: {
      singular: 'longsword',
      plural: 'longswords',
    },
    description: 'A longer, more powerful sword',
  },
  'flux:schema:weapon:bastard-sword': {
    name: {
      singular: 'bastard sword',
      plural: 'bastard swords',
    },
    description: 'A heavy sword that can be wielded one or two-handed',
  },
  'flux:schema:weapon:warhammer': {
    name: {
      singular: 'warhammer',
      plural: 'warhammers',
    },
    description: 'A massive two-handed crushing weapon',
  },

  // Weapons - Ranged
  'flux:schema:weapon:shortbow': {
    name: {
      singular: 'shortbow',
      plural: 'shortbows',
    },
    description: 'A compact bow for quick, accurate shots',
  },
  'flux:schema:weapon:longbow': {
    name: {
      singular: 'longbow',
      plural: 'longbows',
    },
    description: 'A powerful bow with extended range',
  },

  // Weapons - Firearms
  'flux:schema:weapon:gun:pistol': {
    name: {
      singular: 'pistol',
      plural: 'pistols',
    },
    description: 'A compact firearm for close-range combat',
  },
  'flux:schema:weapon:gun:rifle': {
    name: {
      singular: 'rifle',
      plural: 'rifles',
    },
    description: 'A long-range firearm with high accuracy',
  },
  'flux:schema:weapon:gun:shotgun': {
    name: {
      singular: 'shotgun',
      plural: 'shotguns',
    },
    description: 'A powerful close-range firearm',
  },

  // Ammunition
  'flux:schema:ammo:arrow': {
    name: {
      singular: 'arrow',
      plural: 'arrows',
    },
    description: 'A projectile for bows',
  },
  'flux:schema:ammo:pistol': {
    name: {
      singular: 'pistol round',
      plural: 'pistol rounds',
    },
    description: 'Ammunition for pistols',
  },
  'flux:schema:ammo:rifle': {
    name: {
      singular: 'rifle round',
      plural: 'rifle rounds',
    },
    description: 'High-velocity ammunition for rifles',
  },
  'flux:schema:ammo:shotgun': {
    name: {
      singular: 'shotgun shell',
      plural: 'shotgun shells',
    },
    description: 'Spread ammunition for shotguns',
  },

  // Resources - Minerals (Base Metals)
  'flux:schema:resource:mineral:iron': {
    name: {
      singular: 'iron ore',
      plural: 'iron ore', // Mass noun
    },
    description: 'Raw iron extracted from the earth',
  },
  'flux:schema:resource:mineral:coal': {
    name: {
      singular: 'coal',
      plural: 'coal', // Mass noun
    },
    description: 'Carbon-rich fuel and steel hardening agent',
  },
  'flux:schema:resource:mineral:chromium': {
    name: {
      singular: 'chromium ore',
      plural: 'chromium ore', // Mass noun
    },
    description: 'Metallic ore for stainless steel production',
  },
  'flux:schema:resource:mineral:nickel': {
    name: {
      singular: 'nickel ore',
      plural: 'nickel ore', // Mass noun
    },
    description: 'Corrosion-resistant metallic ore',
  },

  // Resources - Minerals (Tool Metals)
  'flux:schema:resource:mineral:tungsten': {
    name: {
      singular: 'tungsten ore',
      plural: 'tungsten ore', // Mass noun
    },
    description: 'Extremely hard metal for cutting tools',
  },
  'flux:schema:resource:mineral:molybdenum': {
    name: {
      singular: 'molybdenum ore',
      plural: 'molybdenum ore', // Mass noun
    },
    description: 'High-strength steel alloy component',
  },
  'flux:schema:resource:mineral:vanadium': {
    name: {
      singular: 'vanadium ore',
      plural: 'vanadium ore', // Mass noun
    },
    description: 'Steel strengthening alloy metal',
  },
  'flux:schema:resource:mineral:manganese': {
    name: {
      singular: 'manganese ore',
      plural: 'manganese ore', // Mass noun
    },
    description: 'Essential steel production component',
  },
  'flux:schema:resource:mineral:silicon': {
    name: {
      singular: 'silicon ore',
      plural: 'silicon ore', // Mass noun
    },
    description: 'Steel deoxidizer and strengthening agent',
  },

  // Resources - Minerals (Specialty Metals)
  'flux:schema:resource:mineral:titanium': {
    name: {
      singular: 'titanium ore',
      plural: 'titanium ore', // Mass noun
    },
    description: 'Lightweight, high-strength metal',
  },
  'flux:schema:resource:mineral:cobalt': {
    name: {
      singular: 'cobalt ore',
      plural: 'cobalt ore', // Mass noun
    },
    description: 'High-speed cutting tool component',
  },
  'flux:schema:resource:mineral:lithium': {
    name: {
      singular: 'lithium ore',
      plural: 'lithium ore', // Mass noun
    },
    description: 'Essential for energy storage technology',
  },

  // Resources - Minerals (Gems/Piezoelectric)
  'flux:schema:resource:mineral:quartz': {
    name: {
      singular: 'quartz crystal',
      plural: 'quartz crystals',
    },
    description: 'Common piezoelectric mineral',
  },
  'flux:schema:resource:mineral:tourmaline': {
    name: {
      singular: 'tourmaline',
      plural: 'tourmalines',
    },
    description: 'Complex piezoelectric gemstone',
  },
  'flux:schema:resource:mineral:topaz': {
    name: {
      singular: 'topaz',
      plural: 'topaz gems',
    },
    description: 'High-quality piezoelectric gem',
  },
  'flux:schema:resource:mineral:beryl': {
    name: {
      singular: 'beryl',
      plural: 'beryl crystals',
    },
    description: 'Advanced piezoelectric crystal',
  },

  // Resources - Trees (Desert/Arid)
  'flux:schema:resource:tree:mesquite': {
    name: {
      singular: 'mesquite wood',
      plural: 'mesquite wood', // Mass noun
    },
    description: 'Hardy desert wood with sweet nectar',
  },
  'flux:schema:resource:tree:juniper': {
    name: {
      singular: 'juniper wood',
      plural: 'juniper wood', // Mass noun
    },
    description: 'Aromatic wood with medicinal berries',
  },

  // Resources - Trees (Grassland)
  'flux:schema:resource:tree:cottonwood': {
    name: {
      singular: 'cottonwood',
      plural: 'cottonwood', // Mass noun
    },
    description: 'Fast-growing prairie tree',
  },
  'flux:schema:resource:tree:bur-oak': {
    name: {
      singular: 'bur oak',
      plural: 'bur oak', // Mass noun
    },
    description: 'Hardy oak with edible acorns',
  },

  // Resources - Trees (Forest)
  'flux:schema:resource:tree:maple': {
    name: {
      singular: 'maple wood',
      plural: 'maple wood', // Mass noun
    },
    description: 'Fine hardwood with sweet sap',
  },
  'flux:schema:resource:tree:white-birch': {
    name: {
      singular: 'white birch',
      plural: 'white birch', // Mass noun
    },
    description: 'Light wood with papery bark',
  },
  'flux:schema:resource:tree:white-pine': {
    name: {
      singular: 'white pine',
      plural: 'white pine', // Mass noun
    },
    description: 'Softwood with resin and nuts',
  },

  // Resources - Trees (Mountain)
  'flux:schema:resource:tree:mountain-pine': {
    name: {
      singular: 'mountain pine',
      plural: 'mountain pine', // Mass noun
    },
    description: 'Cold-hardy pine from high altitudes',
  },
  'flux:schema:resource:tree:aspen-tree': {
    name: {
      singular: 'aspen wood',
      plural: 'aspen wood', // Mass noun
    },
    description: 'Light, flexible mountain wood',
  },

  // Resources - Trees (Tropical)
  'flux:schema:resource:tree:mahogany': {
    name: {
      singular: 'mahogany',
      plural: 'mahogany', // Mass noun
    },
    description: 'Premium tropical hardwood',
  },
  'flux:schema:resource:tree:rubber': {
    name: {
      singular: 'rubber tree',
      plural: 'rubber tree', // Mass noun
    },
    description: 'Source of natural latex',
  },
  'flux:schema:resource:tree:breadfruit': {
    name: {
      singular: 'breadfruit tree',
      plural: 'breadfruit tree', // Mass noun
    },
    description: 'Tropical tree with nutritious fruit',
  },

  // Resources - Trees (Wetland)
  'flux:schema:resource:tree:bald-cypress': {
    name: {
      singular: 'bald cypress',
      plural: 'bald cypress', // Mass noun
    },
    description: 'Water-resistant swamp wood',
  },
  'flux:schema:resource:tree:mangrove': {
    name: {
      singular: 'mangrove wood',
      plural: 'mangrove wood', // Mass noun
    },
    description: 'Salt-resistant coastal wood',
  },
};
