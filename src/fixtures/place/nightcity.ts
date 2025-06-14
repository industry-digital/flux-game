import { PlaceDefinition } from '~/worldkit/entity/util';

const factory = (): PlaceDefinition[] => {
  return [
    {
      id: 'afterlife-bar',
      name: 'The Afterlife',
      description: 'The legendary mercenary bar housed in a repurposed morgue. Neon-bathed and smoky, it\'s where the best fixers meet the best mercs in Night City. Rogue Amendiares runs the place with an iron fist, and every drink is named after a merc who became legend... by dying spectacularly. The air is thick with encrypted comms, hushed deals, and the occasional deadly glare.',
      edges: [
        {
          direction: 'north',
          to: 'watson-market',
          label: 'Take the NCART to Watson Market'
        },
        {
          direction: 'east',
          to: 'corpo-plaza',
          label: 'Drive downtown to Corpo Plaza'
        },
        {
          direction: 'south',
          to: 'pacifica-combat-zone',
          label: 'Grab a Combat Cab to Pacifica'
        }
      ]
    },
    {
      id: 'watson-market',
      name: 'Watson Marketplace',
      description: 'A maze of vibrant market stalls beneath an improvised canopy of corrugated metal and stolen corporate billboards. Crowds push through narrow aisles where vendors hawk everything from black-market cyberware to synthetic street food. The smell of frying noodles mingles with soldering flux and incense, while hundreds of languages blend into a steady hum punctuated by bartering and occasional bursts of laughter or threats.',
      edges: [
        {
          direction: 'south',
          to: 'afterlife-bar',
          label: 'Take the NCART to Afterlife'
        },
        {
          direction: 'west',
          to: 'corpo-plaza',
          label: 'Catch an AVX to Corpo Plaza'
        },
        {
          direction: 'east',
          to: 'pacifica-combat-zone',
          label: 'Take the underground tunnel to Pacifica'
        }
      ]
    },
    {
      id: 'corpo-plaza',
      name: 'Corpo Plaza',
      description: 'The gleaming heart of corporate Night City, where impossibly tall megabuildings scrape the clouds, their facades alive with holographic advertisements that cast kaleidoscopic light onto the polished streets below. Corporate soldiers in sleek armor stand watch at every entrance, scanning passersby with cold efficiency. The air here is filtered and sanitized, a stark contrast to the rest of the city\'s acrid atmosphere. Pristine walkways connect climate-controlled arcologies where the elite conduct business that shapes the fate of millions.',
      edges: [
        {
          direction: 'west',
          to: 'afterlife-bar',
          label: 'Take a corporate shuttle to Afterlife'
        },
        {
          direction: 'east',
          to: 'watson-market',
          label: 'Ride the monorail to Watson Market'
        },
        {
          direction: 'south',
          to: 'pacifica-combat-zone',
          label: 'Hire a MaxTac escort to Pacifica'
        }
      ]
    },
    {
      id: 'pacifica-combat-zone',
      name: 'Pacifica Combat Zone',
      description: 'Once meant to be a luxury resort district, Pacifica now stands abandoned by corporations and city alike. The Grand Imperial Mall looms like a decaying carcass, its skeleton claimed by the Voodoo Boys and Animals gangs. Crumbling high-rises with empty window sockets watch over streets ruled by heavily armed gangers. Makeshift barricades and security checkpoints control movement through the district, while tech scavengers strip anything valuable from the ruins. The constant sound of distant gunfire serves as Pacifica\'s heartbeat.',
      edges: [
        {
          direction: 'north',
          to: 'afterlife-bar',
          label: 'Ride with a nomad convoy to Afterlife'
        },
        {
          direction: 'west',
          to: 'watson-market',
          label: 'Sneak through maintenance tunnels to Watson Market'
        },
        {
          direction: 'north',
          to: 'corpo-plaza',
          label: 'Pay for NetWatch protection to Corpo Plaza'
        }
      ]
    }
  ];
};

export default factory;
