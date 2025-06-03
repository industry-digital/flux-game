import { CharacterInput } from '~/types/entity/character';
import { WellKnownCharacterCondition, WellKnownCharacterStat } from '~/types/entity/character';

const factory = (): CharacterInput[] => {
  return [
    {
      name: 'Rogue Amendiares',
      description: 'The iron-fisted owner of the Afterlife bar. A legendary fixer with chrome-silver hair and eyes that have seen too much. She commands respect through reputation alone - every merc in Night City knows her name, and most owe her favors. Her mechanical arm gleams under the neon lights as she pours drinks named after dead legends.',
      attributes: {
        level: 15,
        condition: WellKnownCharacterCondition.ALIVE,
        hp: { natural: { current: 180, max: 180 } },
        mass: { natural: 65000 }, // 65kg in grams
        stats: {
          [WellKnownCharacterStat.STR]: { natural: 14 },
          [WellKnownCharacterStat.DEX]: { natural: 16 },
          [WellKnownCharacterStat.AGI]: { natural: 12 },
          [WellKnownCharacterStat.CON]: { natural: 18 },
          [WellKnownCharacterStat.INT]: { natural: 20 },
          [WellKnownCharacterStat.WIS]: { natural: 22 },
          [WellKnownCharacterStat.PRS]: { natural: 25 },
          [WellKnownCharacterStat.LCK]: { natural: 16 }
        },
        mana: {},
        injuries: {},
        equipment: {},
        traits: {},
        skills: {},
        memberships: {},
        reputation: {},
        subscriptions: {},
        effects: {},
        inventory: {
          mass: 0,
          items: {},
          ts: Date.now()
        },
        abilities: {},
        preferences: {},
        origin: 'Once a street merc herself, Rogue climbed the ladder through cunning, connections, and an iron will. She survived the Fourth Corporate War and built her empire one favor at a time.'
      }
    },
    {
      name: 'Viktor Vektor',
      description: 'A skilled ripperdoc operating out of a cramped clinic in Watson. His weathered hands move with surgical precision, installing chrome and patching up mercs who can\'t afford the corpo clinics. Behind wire-rimmed glasses, his eyes hold the wisdom of someone who\'s seen the city\'s underbelly for decades.',
      attributes: {
        level: 12,
        condition: WellKnownCharacterCondition.ALIVE,
        hp: { natural: { current: 140, max: 140 } },
        mass: { natural: 78000 }, // 78kg in grams
        stats: {
          [WellKnownCharacterStat.STR]: { natural: 10 },
          [WellKnownCharacterStat.DEX]: { natural: 20 },
          [WellKnownCharacterStat.AGI]: { natural: 8 },
          [WellKnownCharacterStat.CON]: { natural: 14 },
          [WellKnownCharacterStat.INT]: { natural: 22 },
          [WellKnownCharacterStat.WIS]: { natural: 18 },
          [WellKnownCharacterStat.PRS]: { natural: 16 },
          [WellKnownCharacterStat.LCK]: { natural: 12 }
        },
        mana: {},
        injuries: {},
        equipment: {},
        traits: {},
        skills: {},
        memberships: {},
        reputation: {},
        subscriptions: {},
        effects: {},
        inventory: {
          mass: 0,
          items: {},
          ts: Date.now()
        },
        abilities: {},
        preferences: {},
        origin: 'A former trauma team medic who went independent after seeing too much corporate corruption. Now he serves the streets, one chrome installation at a time.'
      }
    },
    {
      name: 'MaxTac Officer Chen',
      description: 'A cybernetically enhanced MaxTac officer with more chrome than flesh. Her neural implants glow softly through translucent skin, and her movements carry the precise, inhuman efficiency of military-grade augmentations. She speaks in clipped, professional tones while her targeting systems constantly scan for threats.',
      attributes: {
        level: 18,
        condition: WellKnownCharacterCondition.ALIVE,
        hp: { natural: { current: 220, max: 220 } },
        mass: { natural: 85000 }, // 85kg in grams (heavy due to chrome)
        stats: {
          [WellKnownCharacterStat.STR]: { natural: 18 },
          [WellKnownCharacterStat.DEX]: { natural: 16 },
          [WellKnownCharacterStat.AGI]: { natural: 20 },
          [WellKnownCharacterStat.CON]: { natural: 22 },
          [WellKnownCharacterStat.INT]: { natural: 16 },
          [WellKnownCharacterStat.WIS]: { natural: 18 },
          [WellKnownCharacterStat.PRS]: { natural: 8 },
          [WellKnownCharacterStat.LCK]: { natural: 10 }
        },
        mana: {},
        injuries: {},
        equipment: {},
        traits: {},
        skills: {},
        memberships: {},
        reputation: {},
        subscriptions: {},
        effects: {},
        inventory: {
          mass: 0,
          items: {},
          ts: Date.now()
        },
        abilities: {},
        preferences: {},
        origin: 'Recruited from corpo security after demonstrating exceptional tactical prowess. Her humanity was gradually replaced with chrome until she became Night City\'s perfect urban predator.'
      }
    },
    {
      name: 'Voodoo Boy Netrunner',
      description: 'A enigmatic figure shrouded in digital mysticism and traditional Haitian symbolism. Intricate circuit tattoos cover their dark skin, pulsing with data flows. They move through both meatspace and cyberspace with equal fluidity, their consciousness split between the physical world and the Net.',
      attributes: {
        level: 14,
        condition: WellKnownCharacterCondition.ALIVE,
        hp: { natural: { current: 120, max: 120 } },
        mass: { natural: 62000 }, // 62kg in grams
        stats: {
          [WellKnownCharacterStat.STR]: { natural: 8 },
          [WellKnownCharacterStat.DEX]: { natural: 14 },
          [WellKnownCharacterStat.AGI]: { natural: 12 },
          [WellKnownCharacterStat.CON]: { natural: 10 },
          [WellKnownCharacterStat.INT]: { natural: 24 },
          [WellKnownCharacterStat.WIS]: { natural: 20 },
          [WellKnownCharacterStat.PRS]: { natural: 14 },
          [WellKnownCharacterStat.LCK]: { natural: 18 }
        },
        mana: {},
        injuries: {},
        equipment: {},
        traits: {},
        skills: {},
        memberships: {},
        reputation: {},
        subscriptions: {},
        effects: {},
        inventory: {
          mass: 0,
          items: {},
          ts: Date.now()
        },
        abilities: {},
        preferences: {},
        origin: 'Born in Pacifica among the descendants of Haitian refugees, they learned to blend ancient spiritual practices with cutting-edge netrunning techniques. The Net and the spirit world are one and the same to them.'
      }
    }
  ];
};

export default factory;
