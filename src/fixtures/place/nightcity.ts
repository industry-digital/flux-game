import { PlaceInput, Direction, createPlaceUrn } from '@flux';

const factory = (): PlaceInput[] => {
  return [
    {
      id: createPlaceUrn('nightcity', 'afterlife-bar'),
      name: 'The Afterlife',
      description: 'The legendary mercenary bar housed in a repurposed morgue. Neon-bathed and smoky, it\'s where the best fixers meet the best mercs in Night City. Rogue Amendiares runs the place with an iron fist, and every drink is named after a merc who became legend... by dying spectacularly. The air is thick with encrypted comms, hushed deals, and the occasional deadly glare.',
      exits: [
        {
          to: createPlaceUrn('nightcity', 'watson-market'),
          direction: Direction.NORTH,
          label: 'Take the NCART to Watson Market',
        },
        {
          to: createPlaceUrn('nightcity', 'corpo-plaza'),
          direction: Direction.EAST,
          label: 'Drive downtown to Corpo Plaza',
        },
        {
          to: createPlaceUrn('nightcity', 'pacifica-combat-zone'),
          direction: Direction.SOUTH,
          label: 'Head south to the Combat Zone',
        },
      ],
    },
    {
      id: createPlaceUrn('nightcity', 'watson-market'),
      name: 'Watson Marketplace',
      description: 'A maze of vibrant market stalls beneath an improvised canopy of corrugated metal and stolen corporate billboards. Crowds push through narrow aisles where vendors hawk everything from black-market cyberware to synthetic street food. The smell of frying noodles mingles with soldering flux and incense, while hundreds of languages blend into a steady hum punctuated by bartering and occasional bursts of laughter or threats.',
      exits: [
        {
          to: createPlaceUrn('nightcity', 'afterlife-bar'),
          direction: Direction.SOUTH,
          label: 'Return to the Afterlife Bar',
        },
        {
          to: createPlaceUrn('nightcity', 'corpo-plaza'),
          direction: Direction.WEST,
          label: 'Walk to Corpo Plaza',
        },
        {
          to: createPlaceUrn('nightcity', 'pacifica-combat-zone'),
          direction: Direction.EAST,
          label: 'Venture into Pacifica',
        }
      ]
    },
    {
      id: createPlaceUrn('nightcity', 'corpo-plaza'),
      name: 'Corpo Plaza',
      description: 'The gleaming heart of corporate Night City, where impossibly tall megabuildings scrape the clouds, their facades alive with holographic advertisements that cast kaleidoscopic light onto the polished streets below. Corporate soldiers in sleek armor stand watch at every entrance, scanning passersby with cold efficiency. The air here is filtered and sanitized, a stark contrast to the rest of the city\'s acrid atmosphere. Pristine walkways connect climate-controlled arcologies where the elite conduct business that shapes the fate of millions.',
      exits: [
        {
          to: createPlaceUrn('nightcity', 'afterlife-bar'),
          direction: Direction.WEST,
          label: 'Head back to the Afterlife',
        },
        {
          to: createPlaceUrn('nightcity', 'watson-market'),
          direction: Direction.EAST,
          label: 'Visit Watson Market',
        },
        {
          to: createPlaceUrn('nightcity', 'pacifica-combat-zone'),
          direction: Direction.SOUTH,
          label: 'Descend to Pacifica',
        }
      ]
    },
    {
      id: createPlaceUrn('nightcity', 'pacifica-combat-zone'),
      name: 'Pacifica Combat Zone',
      description: 'Once meant to be a luxury resort district, Pacifica now stands abandoned by corporations and city alike. The Grand Imperial Mall looms like a decaying carcus, its skeleton claimed by the Voodoo Boys and Animals gangs. Crumbling high-rises with empty window sockets watch over streets ruled by heavily armed gangers. Makeshift barricades and security checkpoints control movement through the district, while tech scavengers strip anything valuable from the ruins. The constant sound of distant gunfire serves as Pacifica\'s heartbeat.',
      exits: [
        {
          to: createPlaceUrn('nightcity', 'afterlife-bar'),
          direction: Direction.NORTH,
          label: 'Escape north to the Afterlife',
        },
        {
          to: createPlaceUrn('nightcity', 'watson-market'),
          direction: Direction.WEST,
          label: 'Fight your way to Watson',
        },
        {
          to: createPlaceUrn('nightcity', 'corpo-plaza'),
          direction: Direction.NORTHWEST,
          label: 'Climb up to Corpo Plaza',
        }
      ]
    }
  ];
};

export default factory;
