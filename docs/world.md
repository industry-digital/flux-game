# World Model: A Foundation for AI-Driven Worldbuilding

## Purpose

This document defines the core principles, structures, and philosophy behind the world model used in our MUD. It exists to serve as a semantic interface between the systems we build and the language model (LLM) that collaborates with us to generate narrative, content, and context-aware outputs.

## Core Belief

An LLM can act as a creative partner—but only if it understands the world it’s working within. This understanding comes not from data volume, but from clarity of abstraction. The world model is our API for language-driven generation.

## Key Principles

### 1. **Every Perceivable Thing is an Entity**

All game-world elements that can be interacted with, referenced, or described are `Entity` objects. Entities have:

- a unique `id`
- a `type` from the `EntityType` taxonomy
- structured `attributes` defined by that type
- a list of `taxonomy` tags to express meaning
- temporal fields like `createdAt`, `updatedAt`
- a `parentId` or `placeId` to locate it in the world

#### 📦 Example: PlayerCharacter Entity

```json
{
  "id": "entity_char_dizrock",
  "type": "/type/character/pc",
  "name": "Dizrock",
  "description": "A vigilante nomad netrunner with a penchant for mischief. He wears a tattered trench coat and a pair of augmented goggles that flicker with data streams.",
  "placeId": "/place/the-dirge/pub",
  "parentId": null,
  "attributes": {
    "mass": 67000,
    "stats": {
      "STR": 8, "CON": 10, "END": 9, "AGI": 16, "DEX": 17,
      "INT": 12, "WIS": 14, "CHA": 11, "LCK": 10, "SPD": 13
    },
    "equipment": {
      "/slot/main-hand": "/item/equipment/weapon/titanium-emp-tanto",
      "/slot/off-hand": null,
      "/slot/head": "/item/equipment/eyewear/augmented-goggles"
    },
    "traits": [
      "/trait/keen-eyes",
      "/trait/the-pawn"
    ],
    "memberships": ["/well-known-group/faction/nomads", "/well-known-group/guild/assassins"],
    "subscriptions": ["/topic/bounty-board", "/topic/black-market"]
  },
  "effects": {
    "/effect/evasion-bonus": {
      "source": "/item/equipment/eyewear/augmented-goggles",
      "value": 2,
      "duration": 300,
      "expiry": 1714528600
    }
  },
  "createdAt": 1714520000,
  "updatedAt": 1714528600
}
```

#### 📦 Example: Soulbound Weapon with Provenance

```json
{
  "id": "item_oathblade_001",
  "type": "/type/item/item",
  "name": "Oathblade of Dun Sereth",
  "description": "A curved, ancient longsword bearing the etchings of forgotten oaths. It vibrates with unspoken memory.",
  "placeId": "/place/vaults/sereth-tomb",
  "parentId": null,
  "attributes": {
    "mass": 4200,
    "provenance": [
      {
        "timestamp": 1670000000,
        "actorId": "npc_sereth",
        "event": "created",
        "context": "forged in the fires beneath Mount Corun by the exiled king Sereth"
      },
      {
        "timestamp": 1675000000,
        "actorId": "entity_char_arlwyn",
        "event": "transferred",
        "context": "bestowed upon Arlwyn after the Trials of the Greenwood"
      },
      {
        "timestamp": 1678000000,
        "actorId": "npc_wightlord",
        "event": "destroyed",
        "context": "shattered during the Siege of Black Hollow"
      }
    ]
  },
  "taxonomy": [
    "/weapon/sword/longsword",
    "/effect/bleeding",
    "/rarity/legendary",
    "/item/soulbound"
  ],
  "effects": {
    "/effect/damage/bonus": 3,
    "/effect/bleeding": true
  },
  "createdAt": 1670000000,
  "updatedAt": 1714528600
}
```

### 2. **Taxonomy is a First Class Citizen**

We classify entities using a structured path-based taxonomy. Examples:

- `/weapon/sword/longsword`
- `/effect/damage/bonus`
- `/slot/main-hand`
- `/biome/swamp`

Taxonomy tags:

- Describe **what** something is
- Enable **rules** to be applied semantically
- Allow **LLMs** to reason using a compressed symbolic language

Each taxonomy path is an **atom of meaning**—a symbolic building block that encodes purpose, category, or behavior. The term is borrowed from Erlang, where an Atom is a literal with identity. In our world, a taxonomy path is the name of a concept, and thus carries with it both type and intent. that encodes purpose, category, or behavior. Their **hierarchical, path-based form** (e.g., `/weapon/sword/longsword`) conveys hierarchy and specificity, allowing systems and language models to make reasonable assumptions not only about the specific tag, but also about its meaning at different levels of the hierarchy. These atoms can be composed to form highly expressive representations of in-world logic, identity, or classification. To an LLM, they are both context and command.

Consider this JSON payload representing a character entity:

*Example*
```

```json
{
  "id": "mfCFy0BRKtb4oHSpolnHOHq6wLbaOKeF"
  "type": "/type/character/pc",
  "name": "Dizrock",
  "description": "A vigilante nomad netrunner with a penchant for mischief. He wears a tattered trench coat and a pair of augmented goggles that flicker with data streams.",
  "placeId": "/place/the-dirge/pub",
  "parentId": null,
  "attributes": {
    "mass": 67000,
    "stats": {
      "STR": 8, "CON": 10, "END": 9, "AGI": 16, "DEX": 17,
      "INT": 12, "WIS": 14, "CHA": 11, "LCK": 10, "SPD": 13
    },
    "equipment": {
      "/slot/main-hand": "/item/equipment/weapon/titanium-emp-tanto",
      "/slot/off-hand": null,
      "/slot/head": "/item/equipment/eyewear/augmented-goggles"
    },
    "traits": [
      "/trait/keen-eyes",
      "/trait/the-pawn"
    ],
    "memberships": ["/well-known-group/faction/nomads", "/well-known-group/guild/assassins"],
    "subscriptions": ["/topic/bounty-board", "/topic/black-market"],
    "effects": {
      "/effect/evasion-bonus": {
        "source": "/item/equipment/eyewear/augmented-goggles",
        "value": 2,
        "duration": 300,
        "expiry": 1714528600
      }
    },
  },
  "createdAt": 1714520000,
  "updatedAt": 1714528600
}
```


### 3. **Place is Universal**

Every entity exists in a `Place`. Places form a hierarchy rooted in `/place/world`. This constraint makes traversal, scope, containment, and world logic tractable for both systems and LLMs.

### 4. **Provenance is Story**

Items may have `provenance`: a historical ledger of events (created, transferred, destroyed). These form narrative anchors for LLM generation—enabling emergent legend, heritage, or mystery.

An item's **soulboundedness** is determined entirely by the presence of provenance. If an item has a provenance, it is considered soulbound. This means:

- It cannot be dropped, traded, or sold like ordinary items
- Its narrative history is meaningful and must be preserved
- It persists in the world even if degraded or broken

Provenance-based soulbounding allows us to create one-of-a-kind artifacts whose emotional and narrative weight are grounded in their lived history, not arbitrary flags.

All provenance records are **on-chain**, ensuring that a soulbound item’s story is tamper-resistant, verifiable, and persistent across time and systems. This creates not only gameplay continuity, but also long-term player investment and legacy.

### 5. **Skills are Learned Through Struggle**

Characters grow skills not just by accumulating XP, but by applying effort over time. `SkillState` includes:

- `xp`: experience earned
- `rate`: current learning speed
- `concentration`: a stamina-like resource for mental effort

This makes skill progression a process worth narrating.

### 6. **Effects are Applied Semantically**

Every entity can have `effects: Record<TaxonID, value>`. These effects:

- Are typed via taxonomy (e.g., `/effect/bleeding`)
- Can be read and interpreted by LLMs for generation

### 7. **LLM Tasks Should Mirror Human Tasks**

We do not overexplain. We provide the LLM with the same context we’d give a human contributor:

- What is this thing?
- Where is it?
- What is it related to?
- What’s happened recently?

## Prompting Strategy

We are frugal with tokens. We match prompt fidelity to task complexity:

- Low fidelity: room description updates, flavor text
- Medium fidelity: item generation, entity mutation
- High fidelity: rule-based simulation, JSON generation

We inject only relevant:

- Type fragments
- Taxonomy entries
- World state excerpts

## Summary

LLMs can generate content. But only we can teach them what the world means.

This world model is not just a schema -- it is a contract of meaning. It enables a language model to understand our simulation not through brute force, but through structure, truth, and intentional design. It provides the structural foundation needed for a small team -— or even a dedicated solo developer —- to construct a fully realized world, complete with persistent memory, semantic continuity, and creative expressiveness.
