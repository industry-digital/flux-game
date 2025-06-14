import { PlaceInput } from '~/types/entity/place';
import { createExit } from '~/worldkit/entity/place';
import { createPlaceUrn } from '~/lib/taxonomy';
import { createExitTranslationUrn } from '~/i18n';
import { Direction } from '~/types/world/space';

const factory = (): PlaceInput[] => {
  return [
    {
      name: 'The Afterlife',
      description: 'The legendary mercenary bar housed in a repurposed morgue. Neon-bathed and smoky, it\'s where the best fixers meet the best mercs in Night City. Rogue Amendiares runs the place with an iron fist, and every drink is named after a merc who became legend... by dying spectacularly. The air is thick with encrypted comms, hushed deals, and the occasional deadly glare.',
      exits: {
        [Direction.NORTH]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'afterlife-bar'), Direction.NORTH),
          to: createPlaceUrn('nightcity', 'watson-market')
        })),
        [Direction.EAST]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'afterlife-bar'), Direction.EAST),
          to: createPlaceUrn('nightcity', 'corpo-plaza')
        })),
        [Direction.SOUTH]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'afterlife-bar'), Direction.SOUTH),
          to: createPlaceUrn('nightcity', 'pacifica-combat-zone')
        }))
      },
      entities: {}
    },
    {
      name: 'Watson Marketplace',
      description: 'A maze of vibrant market stalls beneath an improvised canopy of corrugated metal and stolen corporate billboards. Crowds push through narrow aisles where vendors hawk everything from black-market cyberware to synthetic street food. The smell of frying noodles mingles with soldering flux and incense, while hundreds of languages blend into a steady hum punctuated by bartering and occasional bursts of laughter or threats.',
      exits: {
        [Direction.SOUTH]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'watson-market'), Direction.SOUTH),
          to: createPlaceUrn('nightcity', 'afterlife-bar')
        })),
        [Direction.WEST]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'watson-market'), Direction.WEST),
          to: createPlaceUrn('nightcity', 'corpo-plaza')
        })),
        [Direction.EAST]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'watson-market'), Direction.EAST),
          to: createPlaceUrn('nightcity', 'pacifica-combat-zone')
        }))
      },
      entities: {}
    },
    {
      name: 'Corpo Plaza',
      description: 'The gleaming heart of corporate Night City, where impossibly tall megabuildings scrape the clouds, their facades alive with holographic advertisements that cast kaleidoscopic light onto the polished streets below. Corporate soldiers in sleek armor stand watch at every entrance, scanning passersby with cold efficiency. The air here is filtered and sanitized, a stark contrast to the rest of the city\'s acrid atmosphere. Pristine walkways connect climate-controlled arcologies where the elite conduct business that shapes the fate of millions.',
      exits: {
        [Direction.WEST]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'corpo-plaza'), Direction.WEST),
          to: createPlaceUrn('nightcity', 'afterlife-bar')
        })),
        [Direction.EAST]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'corpo-plaza'), Direction.EAST),
          to: createPlaceUrn('nightcity', 'watson-market')
        })),
        [Direction.SOUTH]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'corpo-plaza'), Direction.SOUTH),
          to: createPlaceUrn('nightcity', 'pacifica-combat-zone')
        }))
      },
      entities: {}
    },
    {
      name: 'Pacifica Combat Zone',
      description: 'Once meant to be a luxury resort district, Pacifica now stands abandoned by corporations and city alike. The Grand Imperial Mall looms like a decaying carcus, its skeleton claimed by the Voodoo Boys and Animals gangs. Crumbling high-rises with empty window sockets watch over streets ruled by heavily armed gangers. Makeshift barricades and security checkpoints control movement through the district, while tech scavengers strip anything valuable from the ruins. The constant sound of distant gunfire serves as Pacifica\'s heartbeat.',
      exits: {
        [Direction.NORTH]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'pacifica-combat-zone'), Direction.NORTH),
          to: createPlaceUrn('nightcity', 'afterlife-bar')
        })),
        [Direction.WEST]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'pacifica-combat-zone'), Direction.WEST),
          to: createPlaceUrn('nightcity', 'watson-market')
        })),
        [Direction.NORTHWEST]: createExit(exit => ({
          ...exit,
          label: createExitTranslationUrn(createPlaceUrn('nightcity', 'pacifica-combat-zone'), Direction.NORTHWEST),
          to: createPlaceUrn('nightcity', 'corpo-plaza')
        }))
      },
      entities: {}
    }
  ];
};

export default factory;
