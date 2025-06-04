import { CharacterInput } from '~/types/entity/character';
import { WellKnownCharacterStat } from '~/types/entity/character';
import { EntityType } from '~/types/entity/entity';
import { createCharacterInput } from '~/lib/entity/util';

const factory = (): CharacterInput[] => {
  return [
    createCharacterInput({
      name: 'Rogue Amendiares',
      description: 'The iron-fisted owner of the Afterlife bar. A legendary fixer with chrome-silver hair and eyes that have seen too much. She commands respect through reputation alone - every merc in Night City knows her name, and most owe her favors. Her mechanical arm gleams under the neon lights as she pours drinks named after dead legends.',
      location: {
        type: EntityType.PLACE,
        key: 'world:nightcity:afterlife'
      },
      vitals: {
        hp: { natural: { current: 180, max: 180 } },
        stats: {
          [WellKnownCharacterStat.STR]: { natural: 14 },
          [WellKnownCharacterStat.DEX]: { natural: 16 },
          [WellKnownCharacterStat.AGI]: { natural: 12 },
          [WellKnownCharacterStat.CON]: { natural: 18 },
          [WellKnownCharacterStat.INT]: { natural: 20 },
          [WellKnownCharacterStat.WIS]: { natural: 22 },
          [WellKnownCharacterStat.PRS]: { natural: 25 },
          [WellKnownCharacterStat.LCK]: { natural: 16 }
        }
      }
    }),
    createCharacterInput({
      name: 'Viktor Vektor',
      description: 'A skilled ripperdoc operating out of a cramped clinic in Watson. His weathered hands move with surgical precision, installing chrome and patching up mercs who can\'t afford the corpo clinics. Behind wire-rimmed glasses, his eyes hold the wisdom of someone who\'s seen the city\'s underbelly for decades.',
      location: {
        type: EntityType.PLACE,
        key: 'world:nightcity:watson:clinic'
      },
      vitals: {
        hp: { natural: { current: 140, max: 140 } },
        stats: {
          [WellKnownCharacterStat.STR]: { natural: 10 },
          [WellKnownCharacterStat.DEX]: { natural: 20 },
          [WellKnownCharacterStat.AGI]: { natural: 8 },
          [WellKnownCharacterStat.CON]: { natural: 14 },
          [WellKnownCharacterStat.INT]: { natural: 22 },
          [WellKnownCharacterStat.WIS]: { natural: 18 },
          [WellKnownCharacterStat.PRS]: { natural: 16 },
          [WellKnownCharacterStat.LCK]: { natural: 12 }
        }
      }
    }),
    createCharacterInput({
      name: 'MaxTac Officer Chen',
      description: 'A cybernetically enhanced MaxTac officer with more chrome than flesh. Her neural implants glow softly through translucent skin, and her movements carry the precise, inhuman efficiency of military-grade augmentations. She speaks in clipped, professional tones while her targeting systems constantly scan for threats.',
      location: {
        type: EntityType.PLACE,
        key: 'world:nightcity:corpo-plaza'
      },
      vitals: {
        hp: { natural: { current: 220, max: 220 } },
        stats: {
          [WellKnownCharacterStat.STR]: { natural: 18 },
          [WellKnownCharacterStat.DEX]: { natural: 16 },
          [WellKnownCharacterStat.AGI]: { natural: 20 },
          [WellKnownCharacterStat.CON]: { natural: 22 },
          [WellKnownCharacterStat.INT]: { natural: 16 },
          [WellKnownCharacterStat.WIS]: { natural: 18 },
          [WellKnownCharacterStat.PRS]: { natural: 8 },
          [WellKnownCharacterStat.LCK]: { natural: 10 }
        }
      }
    }),
    createCharacterInput({
      name: 'Voodoo Boy Netrunner',
      description: 'A enigmatic figure shrouded in digital mysticism and traditional Haitian symbolism. Intricate circuit tattoos cover their dark skin, pulsing with data flows. They move through both meatspace and cyberspace with equal fluidity, their consciousness split between the physical world and the Net.',
      location: {
        type: EntityType.PLACE,
        key: 'world:nightcity:pacifica'
      },
      vitals: {
        hp: { natural: { current: 120, max: 120 } },
        stats: {
          [WellKnownCharacterStat.STR]: { natural: 8 },
          [WellKnownCharacterStat.DEX]: { natural: 14 },
          [WellKnownCharacterStat.AGI]: { natural: 12 },
          [WellKnownCharacterStat.CON]: { natural: 10 },
          [WellKnownCharacterStat.INT]: { natural: 24 },
          [WellKnownCharacterStat.WIS]: { natural: 20 },
          [WellKnownCharacterStat.PRS]: { natural: 14 },
          [WellKnownCharacterStat.LCK]: { natural: 18 }
        }
      }
    })
  ];
};

export default factory;
