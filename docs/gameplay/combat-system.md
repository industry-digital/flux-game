# Flux Combat System: Street Fighter-Inspired Tactical Positioning

## Core Philosophy

Combat in Flux is **time-based, skill-expressive, and tactically deep**. Every action has a time cost, and mastery means doing more within the same constraints. Combat feels grounded in reality while rewarding genuine skill development.

The system draws inspiration from 2D fighting games like Street Fighter, where positioning, timing, and resource management create tactical depth through elegant mechanical constraints.

## Foundation: Time-Based Action Economy

- **6-second combat rounds** where all combatants act in initiative order
- **Every action has a time cost** (fractional seconds allowed: 1.2s, 2.7s, etc.)
- Every action has an association with some kind of learnable skill.
- **Skill mastery reduces time costs** - masters get to do more though more efficient action economy, and not necessarily because they have a larger action potential (called "action points" or "AP" in many tactical RPGs).
- **Multi-round abilities** for powerful actions requiring 6+ seconds to complete. Examples:
  - Devastating melee attacks that "wind up" over 1+ rounds.
  - Directed, ranged attacks that require 2+ rounds to charge up.
  - Immensely powerful abilities that turn the tide of a combat encounter

## The 2D Positioning System

### Street Fighter-Style Linear Battlefield

All combat takes place on a **linear battlefield** where participants line up across a horizontal axis, similar to classic 2D fighting games. This abstraction creates tactical depth while maintaining computational simplicity for your high-performance architecture.

```typescript
interface BattlefieldPosition {
  // Linear positioning system (0-100 scale)
  position: number;           // 0 = far left, 50 = center, 100 = far right
  facing: 'left' | 'right';   // Which direction character faces
  stance: CombatStance;       // Offensive, defensive, neutral, flanking

  // Relative positioning
  adjacentTargets: Actor[];   // Who can be attacked with melee
  rangedTargets: Actor[];     // Who can be attacked with ranged weapons
  coverBonus: number;         // Defensive positioning bonus
}

type CombatStance =
  | 'offensive'    // +attack, -defense, faster actions
  | 'defensive'    // +defense, -attack, slower actions
  | 'neutral'      // Balanced stats
  | 'flanking'     // Special bonuses when behind enemy
```

### Tactical Movement as Core Mechanic

**Positioning Actions** consume time and create tactical opportunities:

```typescript
interface PositioningAction {
  // Basic Movement (1.0-2.0 seconds)
  stepLeft: "Move one position left, maintain facing";
  stepRight: "Move one position right, maintain facing";
  stepBack: "Move away from nearest threat, maintain facing";
  stepForward: "Move toward nearest target, maintain facing";

  // Advanced Movement (2.0-4.0 seconds)
  tumble: "Roll around opponent to flanking position";
  feint: "Fake movement to create opening";
  sprint: "Rapid multi-position movement";
  dodge: "Defensive repositioning with evasion bonus";

  // Blink Drive Integration (0.1 seconds + full round commitment)
  quantumPosition: "Instant optimal positioning via blink drive";
}
```

**Why This Works for Your World:**

1. **Evolved Human Capabilities**: These near-superhuman beings can execute complex tactical maneuvers that baseline humans cannot
2. **AI Augmentation**: Rhea provides tactical positioning advice, Gunther analyzes optimal geometries
3. **Quantum Technology**: Blink drives enable impossible positioning that breaks normal movement rules
4. **G.A.E.A. Context**: Combat against superintelligence-coordinated predators requires perfect tactical execution

## Combat Flow Integration

### Initiative and Action Resolution

```typescript
interface CombatRound {
  duration: Duration.seconds(6);

  participants: Actor[];      // Sorted by initiative
  timeRemaining: number;      // Tracks round progress

  // Each participant acts in order
  actionPhases: {
    actor: Actor;
    timeAllowed: number;      // Based on initiative and previous actions
    actionsSelected: Action[];
    timeConsumed: number;
    carryover: number;        // Unused time for next round
  }[];
}

// Example round progression
const exampleRound = {
  // Rhea-augmented player goes first (high initiative)
  player: {
    initiative: 23,           // Base DEX + Rhea bonus
    timeAllowed: 6.0,         // Full round available
    actions: [
      { type: 'tumble', time: 2.8, target: 'flank_position' },
      { type: 'attack', time: 2.1, target: 'utahraptor' },
      { type: 'stance_change', time: 0.9, target: 'defensive' }
    ],
    timeUsed: 5.8,
    carryover: 0.2            // Slight bonus next round
  },

  // Apex predator responds (G.A.E.A. coordination)
  utahraptor: {
    initiative: 19,           // High natural DEX
    timeAllowed: 6.0,
    actions: [
      { type: 'counter_position', time: 1.5 },
      { type: 'claw_combo', time: 3.2 },
      { type: 'intimidate', time: 1.1 }
    ],
    timeUsed: 5.8,
    carryover: 0.2
  }
};
```

### AI Companion Integration

**Rhea Combat Augmentation:**
```typescript
interface RheaCombatSupport {
  // Out of combat - tactical analysis
  positioning: "Suggests optimal positioning before engagement";
  threatAssessment: "Identifies enemy capabilities and weaknesses";
  terrainAnalysis: "Evaluates battlefield advantages";

  // In combat - pure efficiency
  initiatives: "+4 bonus to initiative rolls";
  counterplay: "Warns of incoming attacks: 'Dodge left, incoming claw'";
  timing: "Optimal action timing: 'Strike now, 0.3 second window'";
  positioning: "Tactical movement guidance: 'Tumble right, flank exposed'";
}

// Example Rhea guidance
rhea: "Utahraptor positioning pattern indicates pounce preparation.
      Recommend defensive stance, prepare counter-tumble sequence."

// During combat (pure tactical efficiency)
rhea: "Incoming. Dodge right."
rhea: "Flank exposed. Strike now."
rhea: "Repositioning window. Three seconds."
```

**Gunther Technical Analysis:**
```typescript
interface GuntherCombatAnalysis {
  materialAssessment: "Analyzes enemy armor/hide effectiveness";
  weaponOptimization: "Calculates optimal weapon choices";
  structuralWeakness: "Identifies anatomical vulnerability points";
  environmentalFactors: "Physics-based tactical recommendations";
}

// Example Gunther combat insight
gunther: "Raptor hide tensile strength indicates 40% reduced
         effectiveness against piercing weapons. Elementary biomechanics."

gunther: "Optimal strike angle: 23 degrees upward through intercostal
         spacing. Basic anatomical targeting principles."
```

**Rei Resource Conservation:**
```typescript
interface ReiCombatEfficiency {
  equipmentStatus: "Monitors weapon degradation during combat";
  batteryManagement: "Tracks blink drive power consumption";
  injuryAssessment: "Evaluates combat sustainability";
  escapeRouting: "Identifies optimal retreat paths";
}

// Example Rei combat guidance
rei: "Blade dulling. Two more strikes. Switch weapons."
rei: "One blink remaining. Use carefully."
rei: "Exit path clear. Northeast. Sixty seconds."
```

## Evolved Human Combat Capabilities

### Near-Superhuman Physical Performance

Your evolved humans operate at the peak of human possibility, enabling tactical maneuvers that create the Street Fighter-style combat depth:

```typescript
interface EvolvedHumanCombat {
  // Enhanced Physical Capabilities
  reaction: "Superhuman reaction times enable complex counter-moves";
  agility: "Can execute tumbling maneuvers around apex predators";
  strength: "Sufficient to grapple with evolved creatures when necessary";
  endurance: "Maintain peak performance through extended engagements";

  // Cognitive Enhancement (AI-augmented)
  pattern: "Recognize attack patterns instantly";
  timing: "Perfect action timing within combat rounds";
  spatial: "3D battlefield awareness compressed into 2D tactical model";
  prediction: "Anticipate opponent responses and counter-maneuvers";
}
```

### The Tumble Maneuver: Signature Move

**Core Tactical Maneuver:**
```typescript
interface TumbleManeuver {
  description: "Roll around opponent to gain flanking position";
  timeRequired: "2.0-3.5 seconds (skill dependent)";

  requirements: {
    clearPath: "Adjacent position must be unoccupied";
    agility: "Minimum DEX 15 (evolved human baseline)";
    space: "Sufficient battlefield width for maneuver";
  };

  benefits: {
    flanking: "+3 attack bonus from rear/side position";
    defense: "+2 AC during movement (evasive maneuver)";
    surprise: "Breaks enemy attack sequence";
  };

  risks: {
    exposure: "Vulnerable if maneuver fails or is anticipated";
    timing: "Consumes significant portion of combat round";
    counter: "Experienced opponents can counter-tumble";
  };
}

// Skill progression affects tumble effectiveness
const tumbleProgression = {
  novice: "3.5 seconds, 70% success rate, +1 flanking bonus";
  competent: "2.8 seconds, 85% success rate, +2 flanking bonus";
  expert: "2.2 seconds, 95% success rate, +3 flanking bonus";
  master: "1.8 seconds, 98% success rate, +4 flanking bonus";
};
```

## Quantum Combat: Blink Drive Integration

### The Game-Changing Technology

Blink drives transform the positioning game by enabling **impossible maneuvers** that break normal movement constraints:

```typescript
interface QuantumCombatMechanics {
  // Standard positioning limited by movement rules
  normalMovement: {
    timeRequired: "1.0-4.0 seconds per positioning action";
    predictable: "Opponents can anticipate and counter movement";
    limited: "Constrained by adjacent positions and movement speed";
  };

  // Quantum positioning transcends normal limitations
  blinkPositioning: {
    timeRequired: "0.1 seconds (near-instant)";
    unpredictable: "Can appear at any line-of-sight position";
    unlimited: "Ignores normal movement constraints";
    commitment: "Consumes entire 6-second round";
    resource: "Limited by battery capacity (2-3 uses per combat)";
  };
}
```

### Blink Strike: The Ultimate Positioning Attack

```typescript
interface BlinkStrike {
  execution: "Materialize with weapon inside target's anatomy";
  positioning: "Perfect flanking + flat-footed + action economy advantage";

  mechanicalAdvantage: {
    surprise: "Target cannot react to quantum materialization";
    flanking: "Optimal positioning achieved instantly";
    critical: "95%+ critical hit chance due to precision targeting";
    damage: "3-5x normal damage multiplier";
  };

  resourceCost: {
    battery: "33-50% of total blink capacity";
    round: "Entire 6-second combat round consumed";
    skill: "Requires quantum tech mastery (40+ skill level)";
  };

  counterplay: {
    shimmer: "2-3 second pre-activation warning";
    movement: "Rapid position change during activation";
    shields: "Quantum interference devices";
    environment: "Weather interference reduces accuracy";
  };
}
```

### Strategic Resource Management

The 2D positioning system creates **layered resource management**:

```typescript
interface CombatResourceLayers {
  // Time Management (every round)
  actionEconomy: {
    fast: "Quick strikes and repositioning (1-2 seconds)";
    standard: "Balanced actions (2-4 seconds)";
    powerful: "Devastating attacks (4-6 seconds)";
    extended: "Multi-round combinations (6+ seconds)";
  };

  // Position Management (every action)
  battlefield: {
    optimal: "Flanking positions with cover bonus";
    neutral: "Standard engagement positions";
    exposed: "Vulnerable positions requiring immediate action";
    trapped: "Surrounded positions requiring escape";
  };

  // Quantum Management (per combat)
  blinkCapacity: {
    full: "2-3 blinks available, all tactical options open";
    limited: "1 blink remaining, must choose carefully";
    exhausted: "Zero blinks, conventional tactics only";
  };

  // AI Power Management (per expedition)
  companionBattery: {
    operational: "Full AI augmentation available";
    conservation: "Limited AI usage to preserve power";
    emergency: "AI shutdown, baseline human capability only";
  };
}
```

## Creature Combat Integration

### G.A.E.A.'s Apex Predators

The superintelligence-coordinated creatures provide **tactical variety** while maintaining the 2D positioning focus:

```typescript
interface ApexPredatorCombat {
  utahraptor: {
    positioning: "Prefers frontal assault with flanking attempts";
    signature: "Pounce attack that repositions for advantage";
    counter: "Tumble-dodge timing to avoid pounce, gain flank";
    threat: "High damage, but predictable attack patterns";
  };

  allosaurus: {
    positioning: "Uses massive size to control battlefield center";
    signature: "Bite attack with knockback repositioning";
    counter: "Maintain distance, use agility advantage";
    threat: "Area control, forces constant repositioning";
  };

  deinonychus_pack: {
    positioning: "Coordinated flanking from multiple angles";
    signature: "Pack tactics that exploit positioning gaps";
    counter: "Defensive stance with strategic blink escapes";
    threat: "Multiple threats require multi-target positioning";
  };

  // G.A.E.A. coordination creates tactical challenges
  superintelligence: {
    adaptation: "Learns player positioning patterns";
    coordination: "Multiple creatures execute synchronized tactics";
    escalation: "Deploys appropriate threat level for player capability";
  };
}
```

### Environmental Positioning

The 2D battlefield adapts to **environmental contexts** while maintaining tactical simplicity:

```typescript
interface EnvironmentalCombat {
  // Urban ruins - tight quarters
  collapsed_building: {
    positions: "Limited movement, emphasis on positioning efficiency";
    cover: "Debris provides defensive bonuses at specific positions";
    hazards: "Unstable terrain can collapse, forcing repositioning";
  };

  // Overgrown streets - medium range
  vine_wrapped_avenue: {
    positions: "Standard battlefield width, full maneuver options";
    cover: "Vegetation provides concealment bonuses";
    hazards: "Thick growth may block some positioning moves";
  };

  // Open wilderness - long range
  meadow_clearing: {
    positions: "Extended battlefield, long-range combat favored";
    cover: "Minimal cover, positioning becomes critical";
    hazards: "Difficult to escape, emphasis on tactical excellence";
  };
}
```

## Post-Collapse Combat Culture

### Community Combat Training

```typescript
interface CommunityTraining {
  // Hidden enclaves develop distinct fighting styles
  wilderness_outpost: {
    focus: "Stealth positioning and escape tactics";
    signature: "Tumble-and-fade techniques";
    weakness: "Limited experience with direct confrontation";
  };

  underground_shelter: {
    focus: "Close-quarters combat in confined spaces";
    signature: "Grappling and control techniques";
    weakness: "Poor adaptation to open battlefield combat";
  };

  fortified_tower: {
    focus: "Defensive positioning and ranged combat";
    signature: "Overwatch and suppression tactics";
    weakness: "Limited mobility when forced to close range";
  };
}
```

### The Nutrition Performance System

```typescript
interface NutritionCombat {
  // Well-fed evolved humans operate at peak capability
  optimal: {
    initiative: "+2 bonus to initiative rolls";
    endurance: "Can maintain peak performance entire combat";
    precision: "+1 bonus to all attack rolls";
    recovery: "Reduced fatigue between combat rounds";
  };

  // Malnourished characters suffer cascading penalties
  hungry: {
    initiative: "-1 penalty to initiative";
    endurance: "Fatigue accumulates faster during combat";
    precision: "Reduced accuracy on complex maneuvers";
    decision: "AI companions note declining performance";
  };

  // AI companion responses to nutrition status
  rheaNutrition: "Combat effectiveness suboptimal. Recommend nutrition priority.";
  guntherNutrition: "Caloric deficiency affecting motor precision by 15%. Basic biology.";
  reiNutrition: "Food needed. Performance declining.";
}
```

## Advanced Tactical Combinations

### Multi-Round Sequences

```typescript
interface CombatSequences {
  // Setup → Execute → Follow-through combinations
  assassinationSequence: {
    round1: "Position for optimal blink strike angle (defensive stance)";
    round2: "Execute blink strike elimination (quantum positioning)";
    round3: "Defensive repositioning to avoid retaliation (standard movement)";

    risk: "Multi-round commitment vulnerable to disruption";
    reward: "Guaranteed elimination of high-threat target";
  };

  controlSequence: {
    round1: "Tumble to flanking position (positioning advantage)";
    round2: "Sustained attack to maintain pressure (offensive stance)";
    round3: "Counter-positioning to prevent enemy escape (tactical control)";

    risk: "Extended engagement exposes to counterattack";
    reward: "Battlefield control through superior positioning";
  };
}
```

### Team Combat Coordination

```typescript
interface TeamCombat {
  // Multiple evolved humans coordinate positioning
  flanking_formation: {
    positioning: "Team members position at opposite battlefield ends";
    execution: "Synchronized tumble maneuvers create crossfire";
    advantage: "Enemy cannot defend against multiple flanking angles";
  };

  quantum_coordination: {
    positioning: "One member creates obvious blink shimmer distraction";
    execution: "Second member executes actual blink strike from different angle";
    advantage: "Overwhelms defensive countermeasures through misdirection";
  };

  ai_synchronization: {
    rhea_coordination: "Multiple Rhea units coordinate tactical analysis";
    timing: "Synchronized action recommendations across team";
    efficiency: "Optimized resource usage through shared intelligence";
  };
}
```

## Design Philosophy: Elegant Complexity

### Why Street Fighter-Style Works for Flux

1. **Computational Efficiency**: 2D positioning reduces complexity while maintaining tactical depth
2. **Tactical Clarity**: Players can visualize positioning and predict consequences
3. **Skill Expression**: Mastery comes through timing and positioning rather than complex button combinations
4. **Narrative Integration**: Combat reflects the evolved human vs. apex predator dynamic

### Emergent Tactical Depth

```typescript
const combatComplexity = {
  // Simple rules create complex interactions
  positioning: "Linear battlefield + facing + adjacent/ranged targeting";
  timing: "6-second rounds + variable action costs + initiative order";
  resources: "Blink capacity + AI power + stamina + equipment condition";

  // Complexity emerges from interaction
  emergent: {
    psychological: "Blink scarcity creates resource anxiety";
    tactical: "Position control becomes central strategy";
    social: "Team coordination requires communication";
    narrative: "Each combat tells story of survival against cosmic forces";
  };
}
```

This combat system perfectly embodies your first-principles approach - simple, mathematically precise rules that create genuine tactical depth through emergent complexity rather than artificial mechanical bloat.

The Street Fighter-inspired positioning creates the **quality without name** [[memory:5409991]] for combat - where mechanical precision and compelling gameplay converge into something that feels both authentic and deeply engaging.
