import { ActorInput, createPlaceUrn, ActorType } from '@flux';

export const nightcityCharacters: ActorInput[] = [
  {
    subtype: ActorType.NPC,
    name: 'Rogue',
    description: 'The iron-fisted owner of the Afterlife bar. A legendary fixer with chrome-silver hair and eyes that have seen too much. She commands respect through reputation alone - every merc in Night City knows her name, and most owe her favors. Her mechanical arm gleams under the neon lights as she pours drinks named after dead legends.',
    location: createPlaceUrn('nightcity', 'afterlife-bar')
  },
  {
    name: 'Viktor Vector',
    description: 'A skilled ripperdoc operating out of a cramped clinic in Watson. His weathered hands move with surgical precision, installing chrome and patching up mercs who can\'t afford the corpo clinics. Behind wire-rimmed glasses, his eyes hold the wisdom of someone who\'s seen the city\'s underbelly for decades.',
    location: createPlaceUrn('nightcity', 'watson-market')
  },
  {
    name: 'Melissa Rory',
    description: 'A cybernetically enhanced MaxTac officer with more chrome than flesh. Her neural implants glow softly through translucent skin, and her movements carry the precise, inhuman efficiency of military-grade augmentations. She speaks in clipped, professional tones while her targeting systems constantly scan for threats.',
    location: createPlaceUrn('nightcity', 'corpo-plaza')
  },
  {
    name: 'Mambo',
    description: 'A enigmatic figure shrouded in digital mysticism and traditional Haitian symbolism. Intricate circuit tattoos cover their dark skin, pulsing with data flows. They move through both meatspace and cyberspace with equal fluidity, their consciousness split between the physical world and the Net.',
    location: createPlaceUrn('nightcity', 'pacifica-combat-zone')
  }
];

const factory = (): ActorInput[] => nightcityCharacters;

export default factory;
