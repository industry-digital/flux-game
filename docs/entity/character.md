# Character

```typescript
const sarah: Character = {
  // Core identity
  type: EntityType.CHARACTER,
  urn: "flux:char:sarah_connor",
  path: ["sarah_connor"],
  born: 1710831600000,

  // Basic info
  name: "Sarah Connor",
  desc: {
    base: "A determined warrior-mother, forged in the crucible of an apocalyptic future.",
    emergent: "Her hardened demeanor masks a fierce protective instinct."
  },

  // Location
  loc: {
    type: EntityType.PLACE,
    urn: "flux:place:hideout:tech_noir",
    path: ["hideout", "tech_noir"]
  },

  // Core attributes
  hp: {
    nat: { cur: 75, max: 85 },
    eff: { cur: 70, max: 90 },
    mods: {
      "training": {
        type: "flux:modifier:hp:max",
        origin: {
          type: "flux:skill:survival:athletics",
          actor: "flux:char:sarah_connor"
        },
        val: 5,
        span: SpecialDuration.PERMANENT
      }
    }
  },

  // Stats
  stats: {
    [WellKnownCharacterStat.STR]: {
      nat: 13,
      eff: 15,
      mods: {
        "training": {
          type: "flux:modifier:stat:str",
          origin: { type: "intrinsic" },
          val: 2,
          span: SpecialDuration.PERMANENT
        }
      }
    }
  },

  // Skills
  skills: {
    [SKILLS.WEAPON_GUN_PISTOL]: {
      xp: 8500,
      pxp: 150,
      used: 1710831600000,
      conc: {
        nat: { cur: 85, max: 100 },
        eff: { cur: 90, max: 100 },
        mods: {
          "focus": {
            type: "flux:modifier:skill:concentration",
            origin: { type: "intrinsic" },
            val: 5,
            span: {
              start: 1710831600000,
              end: 1710835200000
            }
          }
        }
      }
    }
  },

  // Inventory
  inv: {
    mass: 2000,
    items: {
      "mag": {
        type: ItemSubtype.AMMO,
        state: 0.9,
        stack: { cur: 12, max: 15 }
      }
    }
  },

  // Effects
  effects: {
    "fatigue": {
      type: "flux:modifier:effect:exhaustion",
      origin: { type: "intrinsic" },
      val: -0.2,
      span: {
        start: 1710831600000,
        end: 1710835200000
      }
    }
  },

  // Social
  groups: {
    [Taxonomy.Factions.RESISTANCE]: {
      role: "founder",
      join: 1710831600000,
      term: 0
    }
  },

  rep: {
    [Taxonomy.Factions.RESISTANCE]: 0.9
  },

  traits: {
    [Taxonomy.Traits.SURVIVOR]: 1
  }
};
```
