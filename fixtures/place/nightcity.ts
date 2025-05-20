
import { createPlace, createEntityUrn, createExit } from '~/entity/util';
import { EntityType } from '~/entity/entity';
import { Taxonomy } from '~/taxonomy';

// Generate UUIDs for our places
const afterlifeId = 'afterlife-bar';
const watsonMarketId = 'watson-market';
const corpoPlazaId = 'corpo-plaza';
const pacificaZoneId = 'pacifica-combat-zone';

// Create Place URNs
const afterlifeUrn = createEntityUrn(EntityType.PLACE, afterlifeId) as Taxonomy.Places;
const watsonMarketUrn = createEntityUrn(EntityType.PLACE, watsonMarketId) as Taxonomy.Places;
const corpoPlazaUrn = createEntityUrn(EntityType.PLACE, corpoPlazaId) as Taxonomy.Places;
const pacificaZoneUrn = createEntityUrn(EntityType.PLACE, pacificaZoneId) as Taxonomy.Places;

// Create direction taxonomy URNs
const northUrn = 'flux:direction:north' as Taxonomy.Directions;
const eastUrn = 'flux:direction:east' as Taxonomy.Directions;
const southUrn = 'flux:direction:south' as Taxonomy.Directions;
const westUrn = 'flux:direction:west' as Taxonomy.Directions;

// Create the places using the factory functions
const afterlifeBar = createPlace(place => ({
  ...place,
  id: afterlifeUrn,
  name: "The Afterlife",
  description: {
    base: "The legendary mercenary bar housed in a repurposed morgue. Neon-bathed and smoky, it's where the best fixers meet the best mercs in Night City. Rogue Amendiares runs the place with an iron fist, and every drink is named after a merc who became legend... by dying spectacularly. The air is thick with encrypted comms, hushed deals, and the occasional deadly glare.",
    emergent: "",
  },
  attributes: {
    exits: {
      [northUrn]: createExit(exit => ({
        ...exit,
        label: "Take the NCART to Watson Market",
        to: watsonMarketUrn,
      })),
      [eastUrn]: createExit(exit => ({
        ...exit,
        label: "Drive downtown to Corpo Plaza",
        to: corpoPlazaUrn,
      })),
      [southUrn]: createExit(exit => ({
        ...exit,
        label: "Grab a Combat Cab to Pacifica",
        to: pacificaZoneUrn,
      }))
    },
    entities: {},
    history: []
  }
}));

const watsonMarket = createPlace(place => ({
  ...place,
  id: watsonMarketUrn,
  name: "Watson Marketplace",
  description: {
    base: "A maze of vibrant market stalls beneath an improvised canopy of corrugated metal and stolen corporate billboards. Crowds push through narrow aisles where vendors hawk everything from black-market cyberware to synthetic street food. The smell of frying noodles mingles with soldering flux and incense, while hundreds of languages blend into a steady hum punctuated by bartering and occasional bursts of laughter or threats.",
    emergent: "",
  },
  attributes: {
    exits: {
      [southUrn]: createExit(exit => ({
        ...exit,
        label: "Take the NCART to Afterlife",
        to: afterlifeUrn
      })),
      [eastUrn]: createExit(exit => ({
        ...exit,
        label: "Catch an AVX to Corpo Plaza",
        to: corpoPlazaUrn
      })),
      [westUrn]: createExit(exit => ({
        ...exit,
        label: "Take the underground tunnel to Pacifica",
        to: pacificaZoneUrn
      }))
    },
    entities: {},
    history: []
  }
}));

const corpoPlaza = createPlace(place => ({
  ...place,
  id: corpoPlazaUrn,
  name: "Corpo Plaza",
  description: {
    base: "The gleaming heart of corporate Night City, where impossibly tall megabuildings scrape the clouds, their facades alive with holographic advertisements that cast kaleidoscopic light onto the polished streets below. Corporate soldiers in sleek armor stand watch at every entrance, scanning passersby with cold efficiency. The air here is filtered and sanitized, a stark contrast to the rest of the city's acrid atmosphere. Pristine walkways connect climate-controlled arcologies where the elite conduct business that shapes the fate of millions.",
    emergent: "",
  },
  attributes: {
    exits: {
      [westUrn]: createExit(exit => ({
        ...exit,
        label: "Take a corporate shuttle to Afterlife",
        to: afterlifeUrn
      })),
      [northUrn]: createExit(exit => ({
        ...exit,
        label: "Ride the monorail to Watson Market",
        to: watsonMarketUrn
      })),
      [southUrn]: createExit(exit => ({
        ...exit,
        label: "Hire a MaxTac escort to Pacifica",
        to: pacificaZoneUrn
      }))
    },
    entities: {},
    history: []
  }
}));

const pacificaZone = createPlace(place => ({
  ...place,
  id: pacificaZoneUrn,
  name: "Pacifica Combat Zone",
  description: {
    base: "Once meant to be a luxury resort district, Pacifica now stands abandoned by corporations and city alike. The Grand Imperial Mall looms like a decaying carcass, its skeleton claimed by the Voodoo Boys and Animals gangs. Crumbling high-rises with empty window sockets watch over streets ruled by heavily armed gangers. Makeshift barricades and security checkpoints control movement through the district, while tech scavengers strip anything valuable from the ruins. The constant sound of distant gunfire serves as Pacifica's heartbeat.",
    emergent: "",
  },
  attributes: {
    exits: {
      [northUrn]: createExit(exit => ({
        ...exit,
        label: "Ride with a nomad convoy to Afterlife",
        to: afterlifeUrn
      })),
      [eastUrn]: createExit(exit => ({
        ...exit,
        label: "Sneak through maintenance tunnels to Watson Market",
        to: watsonMarketUrn
      })),
      [westUrn]: createExit(exit => ({
        ...exit,
        label: "Pay for NetWatch protection to Corpo Plaza",
        to: corpoPlazaUrn
      }))
    },
    entities: {},
    history: []
  }
}));

// Export as fixtures
export const nightCityFixtures = {
  places: {
    afterlifeBar,
    watsonMarket,
    corpoPlaza,
    pacificaZone
  },
  urns: {
    afterlife: afterlifeUrn,
    watsonMarket: watsonMarketUrn,
    corpoPlaza: corpoPlazaUrn,
    pacificaZone: pacificaZoneUrn
  }
};
