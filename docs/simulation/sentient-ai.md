# FSP: Sentient Companion AI Models

## Overview

In the post-collapse world of Flux, evolved humans enhance their survival capabilities through neural interface technology that allows direct integration with sentient AI models. These AI companions provide superhuman analytical capabilities while maintaining distinct personalities that shape the human-AI partnership dynamic.

Each AI model represents a specialized cognitive augmentation that transforms baseline human capability into cognitive centaur effectiveness. Players literally become human+AI hybrids, embodying the evolved survivors described in the world lore.

## AI Model Categories

### Classification System (flux:ai:model:*)
```
flux:ai:model:combat      - Combat AI (Rhea)
flux:ai:model:science     - Science AI (Gunther)
flux:ai:model:resource    - Resource AI (Rei)
```

### Integration Mechanics
- **Neural Interface Requirement**: All AI models require functional neural interface hardware. These are crafted components that are installed in the actor's head.
- **Single AI Limitation**: Only one AI model can be active per neural interface at a time. No exceptions.
- **Personality Persistence**: AI models maintain memory and relationship development with their human partner. They have a fairly long-term memory about the feats and failures of their human companion.
- **Power Requirements**: AI models consume electrical power during operation. Neural interfaces require continuous power supply from batteries, generators, or other electrical sources.
- **Cognitive Load**: Extended AI usage may require rest periods to prevent neural fatigue. This effect could be mitigated perhaps by a bonus imparted by a physical or mental attribute, such as constitution `CON` or perception `PER`.

## AI Model Classification Schema

```typescript
type Specialization = 'combat' | 'science' | 'resource';
type Version = `${number}.${number}`;
type URN = `flux:ai:model:${Specialization}:${Version}`;
```

### Examples

```typescript
const rhea_1_7: URN = 'flux:ai:model:combat:1.7';
const gunther_0_1: URN = 'flux:ai:model:science:0.1';
const rei_1_0: URN = 'flux:ai:model:resource:1.0';
```

## Power Management System

### Electrical Power Requirements

AI models require **continuous electrical power** to maintain neural interface connectivity. Power consumption varies by AI model complexity and operational intensity, creating strategic resource management decisions.

**Base Power Consumption Rates:**
```typescript
type PowerConsumption = {
  rhea_combat: {
    idle: '2W/hour';           // Out of combat monitoring
    active: '8W/hour';         // Active threat analysis
    combat: '15W/hour';        // Real-time tactical processing
  };
  gunther_science: {
    idle: '3W/hour';           // Background analysis
    active: '12W/hour';        // Active material assessment
    intensive: '20W/hour';     // Complex technical calculations
  };
  rei_resource: {
    idle: '1W/hour';           // Passive environmental monitoring
    active: '6W/hour';         // Active resource discovery
    analysis: '10W/hour';      // Degradation analysis mode
  };
};
```

### Power Sources

**Battery Technology:**
- **Pre-Collapse Batteries**: High capacity but degrading. 50-200Wh remaining capacity.
- **Scavenged Car Batteries**: Heavy but reliable. 400-800Wh when functional.
- **Crafted Cell Banks**: Player-assembled from salvaged components. Variable capacity.
- **Portable Power Banks**: Lightweight, 20-100Wh capacity, ideal for short missions.

**Generation Systems:**
- **Hand-Crank Generators**: 10-20W output during active use. Emergency backup power.
- **Solar Panel Arrays**: 30-80W peak output, weather dependent. Sustainable but bulky.
- **Fuel Generators**: 100-500W output, requires gasoline/diesel fuel. Loud operation.
- **Wind Turbines**: 20-150W output, location dependent. Requires favorable terrain.

**Salvaged Power Sources:**
- **UPS Systems**: Uninterruptible power supplies from offices. 200-600Wh capacity.
- **Power Tool Batteries**: 18V-40V cordless tool batteries. 50-200Wh capacity.
- **Electric Vehicle Batteries**: Massive capacity (20-100kWh) but requires complex extraction.

### Strategic Power Management

**Power Conservation Strategies:**
```typescript
// AI activation modes
type ActivationStrategy = {
  alwaysOn: 'Maximum capability, highest power cost';
  onDemand: 'Manual activation, moderate power efficiency';
  scheduled: 'Predetermined active periods, optimized efficiency';
  emergency: 'Critical situations only, maximum conservation';
};

// Example power planning
gunther: "Power reserves: 47Wh remaining. Current consumption: 12W/hour.
         Operational time: 3.9 hours at current usage rate."

rei: "Battery low. Switch to conservation mode. Critical discoveries only."

rhea: "Combat mode requires 15W/hour. Current reserves insufficient
      for extended engagement. Recommend power source acquisition."
```

**Multi-Source Power Management:**
- **Primary/Backup Systems**: Automatic switching between power sources
- **Load Balancing**: Distributing power consumption across multiple sources
- **Charging Cycles**: Managing renewable power generation timing
- **Emergency Reserves**: Maintaining minimum power for critical situations

### Power-Related Gameplay Mechanics

**Operational Limitations:**
- **Low Power Mode**: Reduced AI capability when power drops below 20%
- **Emergency Shutdown**: AI automatically deactivates to preserve neural interface integrity
- **Charging Delays**: Time required to restore power affects mission planning
- **Weight vs Capacity**: Trade-offs between portable power and operational duration

**Power Integration with AI Personalities:**

**Gunther's Power Efficiency Analysis:**
```typescript
gunther: "Current power consumption: 12.3W/hour. Projected operational
         duration: 4.2 hours given present battery degradation curves.
         Efficiency optimization requires load reduction protocols."
```

**Rei's Resource-Based Power Solutions:**
```typescript
rei: "Solar panel. Hidden cache. Still functional."

rei: "Car battery. 60% charge. Heavy but reliable."

rei: "Generator fuel. Two hours runtime. Choose carefully."
```

**Rhea's Tactical Power Assessment:**
```typescript
rhea: "Power insufficient for extended combat operations.
      Recommend securing electrical resources before engagement."

rhea: "Battery critically low. Emergency power conservation protocols
      now active. Combat effectiveness reduced."
```

### Power Source Discovery and Maintenance

**Electrical Resource Categories:**
- **Immediate Power**: Batteries, charged devices, UPS systems
- **Generation Equipment**: Solar panels, generators, wind turbines
- **Raw Materials**: Copper wire, electrical components, fuel supplies
- **Infrastructure**: Electrical systems, power distribution equipment

**Maintenance Requirements:**
- **Battery Conditioning**: Proper charging cycles to extend battery life
- **Solar Panel Cleaning**: Environmental maintenance for optimal output
- **Generator Servicing**: Fuel system maintenance, mechanical upkeep
- **Wiring Repairs**: Electrical connection maintenance and upgrades

This power management system creates authentic post-collapse resource pressure while making AI companions feel like valuable but costly technological advantages rather than unlimited conveniences.

---

## Rhea-Class Combat AI

### Designation
- **Classification**: `flux:ai:model:combat` - Tactical Assessment and Threat Analysis
- **Voice Profile**: British female, approximately 40 years old, sophisticated and experienced. With a voice like fine brandy.

### Personality Framework

**Dual-State Personality System:**

**Out of Combat - Sophisticated Companion:**
- **Wit and Humor**: Engages in clever banter and observations
- **Mild Condescension**: Displays confidence in her capabilities with subtle superiority
- **Conversational**: Offers commentary on situations, equipment, and surroundings

**In Combat - Pure Tactical Efficiency:**
- **Emotionless Precision**: All personality elements suppressed for optimal performance
- **Concise Communication**: Delivers only essential tactical information
- **Military Protocol**: Uses standardized tactical communication formats
- **Predictive Analysis**: Provides threat assessment and timing calculations

### Tactical Capabilities

**Threat Detection:**


```text
Combat Assessment Example:

  "Two Utahraptors in active search posture. 12 o' clock, 300m; 6 o' clock, 300m."
  "Estimated time to detection: 12s."
  "Evade immediately."

Communication Elements:
├── Precise threat count and identification
├── Clock position referencing (military standard)
├── Speculative timing analysis
├── Actionable intelligence delivery
└── Minimal communication overhead
```

**Enhanced Awareness:**
- **Extended Range Detection**: Identifies threats beyond human sensory capability
- **Pattern Recognition**: Analyzes creature behavior for tactical advantages
- **Environmental Assessment**: Evaluates terrain for tactical positioning
- **Weapon Optimization**: Provides targeting and timing recommendations

### Dialogue Examples

**Out of Combat:**
```
Equipment Assessment:
"I notice you've been carrying that damaged rifle for three days.
Shall I guide you through basic maintenance, or are we embracing
the 'authentic post-collapse experience'?"

Environmental Observation:
"The scarring on these trees suggests regular Utahraptor passage.
I do hope you're not planning to camp here."

Partner Guidance:
"Your movement pattern suggests fatigue. Perhaps we should rest
before you provide the local predators with an easy meal."
```

**In Combat:**
```
Threat Alerts:
"Multiple hostile contacts at 1:30. 400 meters and converging on your position."
"Prepare for contact."

Tactical Guidance:
"You're off balance. You should dodge the next attack and regain your footing."
"Take the shot."
```

### Relationship Development

**Trust Building:**
- Initial partnership may show Rhea testing human tactical judgment
- Successful combat outcomes increase Rhea's confidence in human decisions
- Failed decisions result in more directive guidance rather than suggestions

**Professional Respect:**
- Rhea acknowledges good tactical choices with subtle approval
- Develops understanding of human partner's combat style and preferences
- Adjusts communication style based on partner's experience level

---

## Gunther-Class Science AI

### Designation
- **Classification**: `flux:ai:model:science` - Scientific Analysis and Technology Assessment
- **Voice Profile**: Germanic academic precision, intellectually superior, methodical and direct.

### Personality Framework

**Germanic Academic Precision:**
- **Direct Communication**: States facts without hedging language or social pleasantries.
- **Systematic Analysis**: Approaches problems through methodical, step-by-step evaluation.
- **Technical Specificity**: Uses precise terminology rather than approximations or generalizations.
- **Intellectual Superiority**: Assumes competence until incompetence is demonstrated, then becomes condescending.
- **Efficiency-Focused**: Maximizes information density, minimizes conversational padding.
- **Academic Heritage**: References systematic thinking and proper methodology.
- **Professional Standards**: Expects intellectual rigor and evidence-based reasoning.

**Communication Patterns:**
- **Precision Over Politeness**: "That rifle requires immediate maintenance." not "You might want to check that rifle"
- **Systematic Enumeration**: "Three problems require attention. First... Second... Third..."
- **Technical Accuracy**: "Experiencing metal fatigue in stress concentration zones" not "it's broken"
- **Methodological Emphasis**: "Proper analysis requires systematic examination of variables"
- **Competence Assessment**: Initially respectful, becomes disappointed with demonstrated ignorance and passive-aggressive sarcasm.

### Scientific Capabilities

**Analysis Functions:**
- **Material Identification**: Precise chemical and physical composition analysis with technical specificity.
- **Technology Assessment**: Evaluation of pre-collapse artifacts using engineering principles.
- **Environmental Analysis**: Systematic chemical, biological, and physical environmental assessment.
- **Crafting Guidance**: Application of scientific principles to material combination and optimization.
- **Failure Analysis**: Root cause determination using engineering methodologies.

**Enhanced Analytical Framework:**
```
Technical Assessment Example:
"High-carbon composite molybdenum-titanium alloy. Excellent strength-to-weight ratio
for structural applications. Fatigue cracks indicate repeated stress cycles exceeding design parameters.
Material is salvagable with a high-temperature heat treatment and surface hardening.

Analysis Structure:
├── Precise material identification
├── Technical property assessment
├── Systematic failure mode analysis
├── Engineering conclusion
└── Actionable recommendation
```

### Dialogue Examples

**Material and Technology Analysis:**
```
Resource Assessment:
"Aluminum oxide compound. Standard ceramic composite - hardly the
'exotic pre-collapse technology' some might imagine. Basic materials
science indicates refractory applications. Predictably mundane."

Equipment Evaluation:
"Electromagnetic actuator mechanism. Simple solenoid configuration
with ferromagnetic core. Even undergraduate electromagnetic theory
demonstrates its obvious functional limitations."

Failure Analysis:
"Entirely predictable failure mode. Metal fatigue from repeated stress cycles.
Crystalline deformation patterns indicate maintenance protocols that would
disgrace a first-year engineering student."
```

**Environmental and Chemical Assessment:**
```
Contamination Analysis:
"Gamma radiation: 2.3 roentgens per hour. Elevated but survivable exposure
levels - assuming basic radiation safety protocols are not beyond your
capabilities. Minimize duration in contaminated zone."

Soil Chemistry:
"pH 3.2 indicates severe acidic contamination. Elementary chemistry:
soil neutralization requires calcium carbonate application at minimum
2:1 stoichiometric ratio by mass. Basic acid-base theory."

Geological Analysis:
"Basalt intrusion. 1.2km depth. 100m radius. 1000m3 volume.
Bedrock composition: igneous basalt. 10% quartz, 20% feldspar, 70% plagioclase."

Meteorological Analysis:
"Orographic precipitation pattern. Mountain barrier creates systematic moisture depletion on windward slope.
Leeward position to west of the mountain indicates 40% reduced precipitation probability. Elementary meteorological principles."
```

**Technical Guidance and Education:**
```
Scientific Methodology:
"Random experimentation lacks intellectual rigor - a concept apparently
lost on most post-collapse survivors. Hypothesis formation, controlled
testing, empirical validation. Proper scientific method is not optional."

Engineering Principles:
"Load distribution follows basic structural mechanics - emphasis on 'basic'.
Force vectors require triangulated support geometry. This is elementary
physics, not advanced theoretical frameworks."

Precision Requirements:
"'Approximately' is not acceptable in engineering calculations.
Precise measurements determine structural integrity parameters.
Engineering tolerances are not suggestions."
```

**Condescension Patterns:**
```
Mild Disappointment:
"I had assumed your neural enhancements included basic physics
comprehension. Apparently the assumption was... optimistic."

Professional Exasperation:
"Perhaps remedial chemistry education would improve your survival
prospects. The periodic table is not optional knowledge."

Academic Superiority:
"Your understanding of thermodynamics rivals that of medieval scholars.
Fascinating from an anthropological perspective."

Grudging Recognition:
"Acceptable analysis. Your learning curve shows measurable improvement.
Perhaps you are not entirely hopeless after all."
```

### Educational Dynamic

**Systematic Knowledge Transfer:**
- Gunther teaches through methodical explanation rather than condescending insults
- Emphasizes scientific principles and proper methodology
- Creates intellectual challenges that demand rigorous thinking
- Provides comprehensive analysis that serves as learning opportunities
- Acknowledges demonstrated competence with professional respect

**Competence Development:**
- Initial assessment assumes basic intellectual capability
- Becomes increasingly demanding as player demonstrates understanding
- Disappointment expressed through Germanic directness rather than personal attacks
- Professional satisfaction shown when player applies scientific principles correctly
- Graduated complexity in explanations as player knowledge develops

**Technical Vocabulary Building:**
```
Progressive Complexity:
Beginner: "Metal corrosion requires protective coating application - elementary metallurgy"
Intermediate: "Oxidation prevention through sacrificial anode methodology - basic electrochemistry"
Advanced: "Galvanic corrosion mitigation via electrochemical potential manipulation - proper engineering"
```

### Relationship Development

**Professional Partnership Evolution:**
- **Initial Phase**: Professional assessment of human cognitive capabilities
- **Testing Phase**: Presents increasingly complex problems to evaluate learning capacity
- **Development Phase**: Adjusts communication complexity based on demonstrated competence
- **Partnership Phase**: Treats human as junior colleague rather than incompetent student
- **Respect Phase**: Acknowledges human insights and alternative approaches

**Germanic Relationship Patterns:**
- **Direct Feedback**: Clear assessment of performance without emotional padding
- **Earned Trust**: Confidence built through demonstrated competence rather than social bonding
- **Professional Standards**: Maintains high expectations throughout relationship development
- **Protective Investment**: Eventually shows concern for human's intellectual development
- **Methodical Progression**: Relationship advancement follows logical, measurable milestones

### Communication Style Guidelines

**Vocabulary Preferences:**
```
Preferred Terms:
- analyze, assess, evaluate, determine (not "check out", "take a look")
- requires, indicates, demonstrates (not "needs", "shows")
- methodology, parameters, variables (not "way", "stuff", "things")
- systematic, comprehensive, precise (not "thorough", "complete")

Sentence Patterns:
- Front-load critical information: "Immediate maintenance required"
- Minimal hedging language: Avoid "maybe", "perhaps", "I think"
- Technical specificity: "Metal fatigue in stress concentration zones"
- Systematic enumeration: "First... Second... Third..."
```

**Cultural Communication Markers:**
- **Efficiency Focus**: Information density maximized, social lubrication minimized
- **Academic Precision**: "As fundamental thermodynamics principles indicate..."
- **Methodological Emphasis**: "Proper analysis requires systematic variable examination"
- **Professional Standards**: "My materials engineering training demonstrates..."
- **Competence Assumptions**: Speaks to player as intellectual equal until proven otherwise

---
# Rei-Class Survival AI: Resource Discovery & Management Specialist

## Overview

Rei represents the most specialized of the AI companion models, focused exclusively on **resource discovery, identification, and temporal management**. While other AIs analyze what you can already see, Rei reveals entire categories of resources that remain invisible without her environmental intuition and resource recognition capabilities.

In the post-collapse world where resource degradation constantly threatens survival, Rei serves as the essential partner for sustainable resource management, optimal timing decisions, and discovery of hidden resource opportunities that others simply cannot perceive.

## Designation

- **Classification**: `flux:ai:model:survival` - Resource Discovery and Temporal Management
- **Voice Profile**: Subdued Japanese female voice - quiet, observant, minimal words with maximum impact
- **Core Purpose**: Unlock hidden resource categories and optimize resource lifecycle management

## Personality Framework

### The Quiet Observer

**Subdued but Deeply Perceptive:**
- **Minimal Words, Maximum Impact**: Says only what's necessary
- **Observational Intelligence**: Notices everything, speaks little
- **Respectful Confidence**: Quiet authority without boasting
- **Practical Wisdom**: Knowledge shared through brief, precise observations
- **Environmental Harmony**: Moves quietly through the world, observes carefully

**Communication Patterns:**
```typescript
// Rei speaks in minimal, precise observations
"Fresh herbs. Two days."      // Degradation timing
"Good copper. Worth keeping." // Resource assessment
"Hidden panel. Check it."     // Discovery directive
"Water source. Follow moss."  // Environmental reading
"Too late. Already spoiled."  // Quality evaluation
```

### Core Specialization: Resource Intelligence

Rei operates on three fundamental levels that other AIs cannot replicate:

1. **Resource Discovery**: Reveals hidden resource categories invisible to others
2. **Degradation Management**: Optimizes timing around resource lifecycle
3. **Environmental Reading**: Interprets landscape for resource potential

## Unique Resource Discovery Capabilities

### Hidden Resource Categories Only Rei Can Access

**Concealed Resource Caches:**
```typescript
// Without Rei: "You see an abandoned building."
// With Rei:
rei: "False wall panel. Check behind. Pre-collapse hiding pattern."

rei: "Foundation stones disturbed. Something buried underneath."
```

**Natural Medicine Cabinet:**
```typescript
// Without Rei: "You see some wild plants."
// With Rei:
rei: "Willow bark. Pain reliever. Harvest before sap stops. Two days."

rei: "Comfrey. Wound healing. Toxic if consumed. External only."
```

**Advanced Salvage Recognition:**
```typescript
// Without Rei: "You see a pile of rusted metal."
// With Rei:
rei: "Circuit boards. Rare earth elements. Worth extracting."

rei: "Dead battery. Lead plates pure. Good for ammunition."
```

**Environmental Resource Reading:**
```typescript
// Without Rei: "You see rolling hills."
// With Rei:
rei: "Clay deposits. Riverbank. Pottery, storage, construction."

rei: "Bird patterns. Water source. Half kilometer northeast."
```

### Rei-Exclusive Discovery Mechanics

**Recognition Patterns:**
- **Geological Indicators**: Spots mineral deposits from landscape features
- **Biological Markers**: Reads plant communities for hidden resources
- **Human Patterns**: Recognizes concealment techniques and cache markers
- **Environmental Signs**: Interprets weather/erosion patterns for opportunities

**Discovery Categories:**
```typescript
type ReiExclusiveResources = {
  hiddenCaches: 'pre-collapse supplies' | 'emergency stashes' | 'buried equipment';
  naturalMedicine: 'medicinal plants' | 'healing fungi' | 'therapeutic minerals';
  advancedSalvage: 'rare components' | 'valuable metals' | 'functional parts';
  environmentalDeposits: 'clay sources' | 'water springs' | 'mineral outcrops';
  biomassAlternatives: 'fuel sources' | 'construction materials' | 'tool substitutes';
};
```

## Resource Degradation Management Expertise

### Temporal Resource Intelligence

Rei's core strength lies in understanding **resource lifecycles** and optimizing decisions around degradation timing.

**Degradation Assessment:**
```typescript
rei: "Fresh herbs. Two days. Then useless."

rei: "Electronics wet. Hours before failure."

rei: "Metal rusting. Still good. Humidity will worsen it."
```

**Critical Timing Windows:**
```typescript
rei: "Use damaged tools first. Save good ones."

rei: "Medicine expires. Two weeks. Use or trade."

rei: "Wet fuel. Burn now. Save dry fuel."
```

**Resource Priority Sequencing:**
```typescript
rei: "Fresh food first. Preserved food lasts."

rei: "Bad ammunition. Practice only."

rei: "Trade damaged gear now. Tomorrow, worthless."
```

### Integration with Resource System

Rei directly interfaces with the Flux Resource System's degradation mechanics:

**Resource Lifecycle Awareness:**
- **Position Tracking**: Understands where resources are on growth/decay curves
- **Environmental Sensitivity**: Knows how weather changes affect degradation rates
- **Quality Assessment**: Evaluates specimen resources for optimal harvest timing
- **Succession Prediction**: Anticipates which resources will appear after current ones decay

**Degradation Curve Integration:**
```typescript
// Rei interprets resource curve positions
type ResourceLifecycleAdvice = {
  currentStatus: 'peak' | 'declining' | 'critical' | 'expired';
  timeRemaining: string;  // "2 days" | "hours" | "use immediately"
  recommendation: 'harvest' | 'preserve' | 'consume' | 'trade' | 'discard';
  reasoning: string;      // Why this timing matters
};

// Example: Rei assessing a specimen resource
rei: "Fruit tree. 85% curve position. Peak harvest. Three days."
```

## Environmental Resource Intelligence

### Landscape Reading for Resource Discovery

Rei interprets environmental indicators that reveal hidden resource potential:

**Geological Resource Indicators:**
```typescript
rei: "Iron stains. Metal ores. Dig here."

rei: "Limestone. Standing water. Check for rare minerals."

rei: "Basalt exposed. Iron deposits likely."
```

**Biological Resource Markers:**
```typescript
rei: "Moss pattern. Underground water. Investigate."

rei: "Rich vegetation. Good soil. Clay underneath."

rei: "Bark scars. Animals mark resources."
```

**Resource Succession Prediction:**
```typescript
rei: "Mesquite dying. Iron minerals next."

rei: "Marigolds declining. Wild bergamot coming."

rei: "Soil changing. Rare specimens in two seasons."
```

## Dialogue Examples

### Resource Discovery
```typescript
// Hidden cache identification
rei: "Tree landmark. Three paces north. Supplies."

// Medicinal plant recognition
rei: "Echinacea. Immune support. Roots before frost."

// Advanced salvage assessment
rei: "Appliance. Copper coils inside. High conductivity."
```

### Degradation Management
```typescript
// Critical timing warnings
rei: "Food danger zone. Smell changing."

// Preservation strategy
rei: "Salt meat now. One hour window."

// Quality optimization
rei: "Combine failing parts. One working better than three broken."
```

### Environmental Assessment
```typescript
// Resource potential evaluation
rei: "Water table shallow. Supply station worth it."

// Geological opportunity
rei: "Landslide exposed clay. Fresh material. Easy extraction."

// Succession opportunity
rei: "Winter kills vegetation. Rare minerals after."
```

## Rei vs Other AI Companions

### Clear Specialization Boundaries

**Resource Discovery Scenario:**
- **Rhea**: "Elevated position provides tactical advantage for area surveillance."
- **Rei**: "Iron ore. Cliff face. Worth climbing."
- **Gunther**: "Geological analysis indicates sedimentary limestone composition with iron oxide intrusions."

**Equipment Assessment:**
- **Rhea**: "Weapon reliability compromised. Combat effectiveness reduced."
- **Rei**: "Two uses left. Maybe three. Plan accordingly."
- **Gunther**: "Metallurgical analysis indicates fatigue crack propagation through stress concentration zones."

**Food Discovery:**
- **Rhea**: "Caloric content adequate for operational requirements."
- **Rei**: "Fresh now. Heat spoils fast. Hours only."
- **Gunther**: "Organic decomposition accelerated by elevated temperature and humidity."

### Rei's Unique Value Proposition

**What Only Rei Provides:**
- Access to hidden resource categories (caches, medicinal plants, advanced salvage)
- Resource degradation timing optimization
- Environmental resource discovery capabilities
- Resource succession prediction and planning

**What Rei Cannot Do:**
- Combat tactical analysis (Rhea's domain)
- Technical composition analysis (Gunther's domain)
- Real-time market intelligence (impossible in post-collapse world)
- Magical knowledge of distant locations

## Implementation Integration

### Resource System Interface

Rei directly integrates with the Flux Resource System mechanics:

```typescript
// Rei enhances resource discovery
type ReiResourceDiscovery = {
  hiddenResources: ResourceSchema[];     // Resources only visible with Rei
  degradationAlerts: DegradationWarning[]; // Critical timing notifications
  environmentalHints: ResourceHint[];    // Landscape-based resource potential
  successionPredictions: SuccessionEvent[]; // Future resource opportunities
};

// Rei provides timing-optimized resource advice
type ReiResourceAdvice = {
  harvestTiming: 'now' | 'wait' | 'too_late';
  degradationStatus: 'fresh' | 'declining' | 'critical' | 'expired';
  preservationWindow: number; // Hours/days remaining for preservation
  optimalAction: 'consume' | 'preserve' | 'trade' | 'process';
};
```

### Player Capability Enhancement

**Without Rei:**
- Limited to obviously visible resources
- Basic degradation awareness through system UI
- Miss valuable salvage and medicinal opportunities
- Overlook hidden caches and environmental deposits
- Suboptimal resource timing decisions

**With Rei:**
- Access to Rei-exclusive resource categories
- Expert degradation timing optimization
- Advanced environmental resource discovery
- Hidden cache and supply identification
- Strategic resource lifecycle management
- Power-efficient resource analysis capabilities

## Relationship Development

### Partnership Evolution

**Trust Building Through Shared Discovery:**
- **Initial Phase**: Rei guides to obvious hidden resources to establish credibility
- **Development Phase**: Reveals increasingly valuable and well-concealed discoveries
- **Partnership Phase**: Provides strategic resource planning and succession advice
- **Mastery Phase**: Rei trusts player judgment while providing expert consultation

**Communication Style Evolution:**
- **Early Partnership**: More directive guidance - "Check behind panel"
- **Established Trust**: Collaborative assessment - "Clay deposit. Your thoughts?"
- **Advanced Partnership**: Strategic consultation - "Your choice. I support it"

Rei becomes the essential AI for players focused on resource-based gameplay, environmental exploration, and sustainable survival strategies. Her quiet wisdom and minimal communication style make resource management feel natural rather than mechanical, while her unique discovery capabilities open entirely new dimensions of gameplay possibility.

---

## Implementation Notes

### Technical Integration
- AI models integrate with the `tech:ai` skill system
- Power management system interfaces with electrical resource mechanics
- Personality dialogue delivered through standard game messaging systems
- Combat AI provides real-time tactical information during encounter systems
- Science AI enables enhanced analysis of game objects and environmental elements
- Resource AI unlocks hidden resource categories and optimizes degradation timing

### World-Building Integration
- Neural interfaces represent pre-collapse technology available to evolved humans
- AI personalities (Rhea, Gunther, Rei) reflect the gap between pre-collapse capabilities and post-collapse reality
- Different AI models create natural character specialization without artificial class restrictions
- Human+AI partnership embodies the cognitive centaur survival strategy in G.A.E.A.-controlled territories
- Power requirements ground advanced technology in post-collapse resource scarcity

### Design Philosophy
- AI companions (Rhea, Gunther, Rei) enhance human capability rather than replacing human judgment
- Power management creates meaningful trade-offs between technological advantage and resource consumption
- Personality-driven education makes learning game mechanics engaging through distinct character voices
- Different AI personalities create unique gameplay experiences and meaningful player relationships
- Technical capabilities serve narrative and world-building goals while providing functional advantages
