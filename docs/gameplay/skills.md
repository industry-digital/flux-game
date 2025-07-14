# Flux Skill Learning System Summary

## Post-Collapse Mesozoic Skill Categories

The skill system reflects the unique challenges of survival in a world where apex predators control territories, AI systems require maintenance, and human communities depend on tactical resource extraction and fragmented knowledge preservation.

### 1. Predator Interaction Skills

**Core Philosophy**: Understanding and navigating apex predator territories is essential for survival. These skills focus on coexistence rather than domination.

- **Predator Behavior Analysis**: Understanding territorial patterns, feeding cycles, and threat assessment
- **Apex Predator Tracking**: Reading signs, scat analysis, and movement prediction
- **Predator Avoidance**: Stealth movement, scent masking, and route planning through territories
- **Threat Assessment**: Rapid evaluation of predator proximity and danger levels
- **Emergency Evasion**: Escape techniques and survival responses to predator encounters
- **Territorial Mapping**: Understanding and documenting predator territory boundaries

### 2. Cognitive Augmentation Skills

**Core Philosophy**: AI systems are scarce pre-collapse technology requiring specialized knowledge to maintain and operate effectively.

- **AI System Maintenance**: Hardware repair, software optimization, and troubleshooting
- **Human-AI Collaboration**: Maximizing effectiveness of AI-augmented problem solving
- **Knowledge Synthesis**: Combining AI outputs with human intuition and experience
- **AI Verification**: Distinguishing between reliable and unreliable AI suggestions
- **System Integration**: Connecting AI capabilities with practical survival applications
- **Data Recovery**: Extracting useful information from corrupted or fragmentary AI systems

### 3. Expedition Skills

**Core Philosophy**: Resource extraction requires tactical planning and coordinated execution in dangerous territories.

- **Expedition Planning**: Route optimization, timing coordination, and risk assessment
- **Resource Reconnaissance**: Identifying valuable materials and extraction opportunities
- **Team Coordination**: Leading groups through dangerous operations
- **Quick Extraction**: Rapid resource gathering techniques under time pressure
- **Emergency Evacuation**: Coordinating retreat when apex predators return
- **Intelligence Gathering**: Collecting information about predator patterns and resource availability

### 4. Technical Reconstruction Skills

**Core Philosophy**: Rebuilding pre-collapse technology from fragmentary knowledge and salvaged materials.

- **Electronics Salvage**: Identifying and recovering useful components from ruins
- **Power Generation**: Creating and maintaining energy systems for AI and equipment
- **Material Engineering**: Understanding properties and applications of available materials
- **Tool Creation**: Manufacturing specialized equipment for survival and extraction
- **System Integration**: Combining salvaged components into functional technology
- **Innovation**: Developing new solutions from available resources and knowledge

### 5. Combat Skills

**Core Philosophy**: Combat is primarily about survival and protection rather than conquest.

- **Melee Combat**: Hand-to-hand fighting and weapon-based combat techniques
- **Ranged Combat**: Projectile weapons and thrown weapon accuracy
- **Group Combat**: Coordinated fighting and tactical formations
- **Defensive Combat**: Protection techniques and damage mitigation
- **Survival Combat**: Emergency fighting when cornered or trapped
- **Non-Lethal Subdual**: Restraining and incapacitating without killing

### 6. Stealth and Reconnaissance Skills

**Core Philosophy**: Moving unseen through dangerous territories is often more valuable than direct confrontation.

- **Silent Movement**: Moving without alerting predators or other threats
- **Camouflage**: Blending with environment and avoiding detection
- **Observation**: Gathering information while remaining hidden
- **Infiltration**: Entering restricted or dangerous areas undetected
- **Escape and Evasion**: Disappearing when discovered or pursued
- **Counter-Surveillance**: Detecting and avoiding being tracked by others

### 7. Resource Processing Skills

**Core Philosophy**: Converting raw materials into useful items requires specialized knowledge and techniques.

- **Food Processing**: Preserving, preparing, and optimizing nutrition from available sources
- **Material Crafting**: Creating tools, weapons, and equipment from raw materials
- **Medicine Production**: Extracting and preparing healing substances from natural sources
- **Textile Production**: Creating clothing and gear from plant and animal materials
- **Chemical Processing**: Extracting useful compounds and creating specialized substances
- **Quality Enhancement**: Improving the effectiveness of crafted items through advanced techniques

### 8. Social Coordination Skills

**Core Philosophy**: Community survival depends on effective leadership, knowledge sharing, and conflict resolution.

- **Leadership**: Coordinating group activities and decision-making
- **Negotiation**: Resolving conflicts and establishing agreements
- **Knowledge Transfer**: Teaching skills and information to others
- **Community Organization**: Structuring groups for optimal survival effectiveness
- **Diplomacy**: Managing relationships between communities and factions
- **Conflict Resolution**: Mediating disputes and preventing community breakdown

### 9. Survival Skills

**Core Philosophy**: Core capabilities for staying alive in the post-collapse world.

- **Shelter Construction**: Building protective structures from available materials
- **Water Location**: Finding and purifying water sources
- **Fire Management**: Creating and maintaining fire for warmth, cooking, and signaling
- **Weather Prediction**: Understanding and preparing for weather patterns
- **Navigation**: Finding direction and routes through dangerous territories
- **Endurance**: Maintaining physical capability during extended hardship

### 10. Knowledge Preservation Skills

**Core Philosophy**: Maintaining and sharing fragmented pre-collapse knowledge is essential for community advancement.

- **Information Archival**: Preserving knowledge in durable formats
- **Knowledge Synthesis**: Combining fragmentary information into useful understanding
- **Teaching**: Effectively transferring knowledge to others
- **Research**: Investigating problems and developing solutions
- **Documentation**: Recording discoveries and techniques for future use
- **Critical Analysis**: Evaluating information reliability and applicability

## Skill Affinities and Character Archetypes

### Cognitive Centaur Skill Affinities

**Primary Strengths** (Enhanced by AI augmentation):
- Cognitive Augmentation skills (all)
- Knowledge Preservation skills (all)
- Technical Reconstruction skills (all)
- Resource Processing skills (advanced techniques)
- Expedition Skills (planning and analysis)

**Secondary Capabilities** (Human baseline):
- Social Coordination skills (leadership and teaching)
- Survival skills (intellectual approaches)
- Predator Interaction skills (analytical understanding)

**Limitations** (Reduced effectiveness):
- Combat skills (physical limitations)
- Stealth skills (less physical capability)
- Endurance-based survival activities

### Athletic Specialist Skill Affinities

**Primary Strengths** (Enhanced physical capabilities):
- Combat skills (all)
- Stealth and Reconnaissance skills (all)
- Survival skills (physical endurance)
- Expedition Skills (execution and leadership)
- Predator Interaction skills (evasion and tracking)

**Secondary Capabilities** (Human baseline):
- Resource Processing skills (manual techniques)
- Social Coordination skills (leadership through example)
- Technical Reconstruction skills (hands-on work)

**Limitations** (Reduced effectiveness):
- Cognitive Augmentation skills (no AI access)
- Knowledge Preservation skills (limited by memory)
- Complex analytical problem-solving

### Dual-Domain Master Capabilities

**Exceptional Across All Domains**:
- Can excel in both AI-augmented cognitive skills and physical specialization
- Unique ability to bridge technical knowledge with practical execution
- Natural leaders who can coordinate both specialists and understand all aspects of survival
- Extremely rare individuals who represent the pinnacle of human evolution

## Focus System

### The Focus State

The heart of the Flux skill learning system is the **Focus State** - a modal state of heightened concentration that dramatically accelerates skill development. Characters can enter and exit this state using the `FOCUS` command.

**Key Properties:**
- **Binary State**: Characters are either focused or not focused
- **Universal Enhancement**: Focus benefits all skills equally
- **Finite Resource**: Focus is consumed while in the focused state
- **Active Choice**: Players must decide when to use their limited focus

### Focus Pool Mechanics

**Pool Size Calculation:**
Each character has a focus pool sized by their Wisdom stat:

$\text{focus\_pool.max} = \text{base\_value} + \text{WIS\_bonus}$

Where:
- $\text{base\_value} = 100$ for all characters
- $\text{WIS\_bonus} = (\text{WIS} - 10) \times 5$ for characters with WIS > 10
- $\text{WIS\_bonus} = (\text{WIS} - 10) \times 10$ for characters with WIS < 10 (double penalty)

**Example Focus Pool Sizes:**
- **High Wisdom Character** (WIS 20): $100 + (20-10) \times 5 = 150$ focus
- **Average Character** (WIS 12): $100 + (12-10) \times 5 = 110$ focus
- **Low Wisdom Character** (WIS 8): $100 + (8-10) \times 10 = 80$ focus

### Focus Regeneration

**Continuous Recovery:**
- **All focus pools** regenerate continuously over 24 hours
- **Size Independent**: Every pool takes exactly 24 hours to fully regenerate
- **Timezone Neutral**: No global reset times - works equally well for all players worldwide

**Regeneration Rate:**
$\text{focus\_regen\_rate} = \frac{\text{focus\_pool.max}}{24 \text{ hours}}$

**Implementation:**
```typescript
const timeSinceUpdate = now - character.focus.lastUpdated;
const regenRate = character.focus.max / (24 * 60 * 60 * 1000); // per millisecond
const regenAmount = timeSinceUpdate * regenRate;
character.focus.current = Math.min(character.focus.max, character.focus.current + regenAmount);
```

### Focus Consumption

**Active Focus Drain:**
While in the focused state, characters consume focus at a steady rate:
- **Consumption Rate**: 1 focus per minute while focused
- **No Skill Dependency**: Rate is constant regardless of which skills are being used
- **Automatic Deactivation**: Focus state automatically ends when pool reaches 0

**Strategic Timing:**
- **High WIS Character** (150 focus): Can maintain focus for 2.5 hours
- **Average Character** (110 focus): Can maintain focus for ~1.8 hours
- **Low WIS Character** (80 focus): Can maintain focus for ~1.3 hours

## Learning Mechanics

### Dual-Rate Learning System

**Focused Learning (High Rate):**
When in focus state, all skill usage generates enhanced PXP:

$$\text{pxp\_gained\_focused} = \text{base\_pxp} \times \text{focus\_multiplier}$$

Where:
- $\text{base\_pxp}$ is determined by the difficulty/complexity of the action
- $\text{focus\_multiplier} = 5.0$ (5x faster learning while focused)

**Baseline Learning (Standard Rate):**
When not in focus state, skills still advance at baseline rate:

$$\text{pxp\_gained\_baseline} = \text{base\_pxp} \times 1.0$$

### PXP Generation Examples

**Focused State Examples:**
- **Simple predator tracking**: 10 base PXP × 5 = **50 PXP** (focused)
- **Complex AI system repair**: 50 base PXP × 5 = **250 PXP** (focused)
- **Advanced combat maneuver**: 30 base PXP × 5 = **150 PXP** (focused)

**Baseline State Examples:**
- **Simple predator tracking**: 10 base PXP × 1 = **10 PXP** (baseline)
- **Complex AI system repair**: 50 base PXP × 1 = **50 PXP** (baseline)
- **Advanced combat maneuver**: 30 base PXP × 1 = **30 PXP** (baseline)

### Base PXP Calculation

Base PXP is determined dynamically by each skill action based on:
- **Action Complexity**: How difficult is the specific task being attempted
- **Environmental Conditions**: Current circumstances affecting difficulty
- **Character Capability**: How challenging this action is for this character's current skill level
- **Situational Factors**: External modifiers that affect the learning opportunity

**Examples of Base PXP Values:**
- **Routine skill usage**: 5-15 base PXP
- **Moderate challenges**: 20-40 base PXP
- **Difficult tasks**: 50-80 base PXP
- **Extreme challenges**: 100+ base PXP

## Secondary Conversion: PXP → XP

Potential experience converts to permanent experience over time:

$$\frac{d(\text{xp})}{dt} = f(\text{pxp}, \text{INT})$$

Where the conversion rate is influenced by the character's Intelligence stat. This creates a natural learning curve where:
- **Higher INT**: Faster conversion of potential to permanent experience
- **Lower INT**: Slower but still steady conversion process
- **Time-based**: Conversion happens continuously, not just during play sessions

## Key Behavioral Properties

### Strategic Focus Management

**Session Planning:**
- **Focused Sessions**: Players plan dedicated learning periods using focus
- **Baseline Progression**: Continuous slow advancement during regular gameplay
- **Strategic Timing**: Saving focus for important skill development opportunities

**Daily Engagement Cycles:**
- **Focus Recovery**: Natural 24-hour regeneration creates daily play rhythms
- **Flexible Scheduling**: Players can use focus whenever convenient
- **No Pressure**: Baseline learning ensures progress even without focus usage

### Anti-Grinding Properties

**Natural Session Limits:**
- **Finite Focus**: Limited high-speed learning prevents excessive grinding
- **Regeneration Gates**: 24-hour recovery creates natural break points
- **Diminishing Returns**: Focus consumption encourages varied gameplay

**Baseline Progression:**
- **Always Learning**: Skills advance during normal gameplay
- **Engagement Flexibility**: Players aren't penalized for shorter sessions
- **Long-term Progress**: Consistent advancement over time

### Social Learning Dynamics

**Cooperative Learning:**
- **Shared Experiences**: Group activities provide learning opportunities for all participants
- **Mentorship**: Experienced players can guide others to good learning opportunities
- **Knowledge Sharing**: Communities benefit from individual focus investments

**Focus Coordination:**
- **Expedition Planning**: Teams coordinate focus usage for maximum group benefit
- **Specialized Training**: Groups can develop complementary expertise
- **Community Investment**: Strategic focus usage benefits entire communities

## Character Development Paths

### Cognitive Centaur Focus Strategies

**AI System Mastery:**
- **Maintenance Focus**: Concentrated learning on AI system repair and optimization
- **Collaboration Enhancement**: Focused practice on human-AI teamwork
- **Knowledge Integration**: Using focus to synthesize complex information

**Community Leadership:**
- **Teaching Focus**: Concentrated development of knowledge transfer skills
- **Research Intensive**: Focused investigation of complex survival problems
- **Innovation Sessions**: Using focus for breakthrough technical solutions

### Athletic Specialist Focus Strategies

**Physical Excellence:**
- **Combat Training**: Focused practice on fighting and defensive techniques
- **Stealth Mastery**: Concentrated development of reconnaissance skills
- **Survival Expertise**: Focused learning on physical endurance and navigation

**Expedition Leadership:**
- **Team Coordination**: Focused practice leading dangerous operations
- **Emergency Response**: Concentrated training on crisis management
- **Territory Mastery**: Focused learning on predator territory navigation

### Dual-Domain Master Focus Strategies

**Integrated Development:**
- **Balanced Focus**: Alternating between cognitive and physical skill development
- **Synergy Training**: Focused practice on skills that combine both domains
- **Leadership Excellence**: Concentrated development of supreme leadership capabilities

**Crisis Specialization:**
- **Emergency Management**: Focused training on handling extreme situations
- **Community Integration**: Concentrated practice on coordinating specialists
- **Innovation Leadership**: Focused development of breakthrough solutions

## Implementation Notes

### Technical Simplicity

**Single Resource Pool:**
- **One Focus Pool**: Eliminates complex concentration calculations
- **Universal Application**: Same mechanics apply to all skills
- **Clear State Management**: Binary focused/unfocused state is easy to track

**Streamlined Learning:**
- **Two Learning Rates**: Focused (5x) and baseline (1x) - simple to understand
- **Dynamic Base PXP**: Complexity comes from action difficulty, not system mechanics
- **Automatic Conversion**: PXP → XP happens continuously in background

### Player Experience

**Clear Feedback:**
- **Focus State Indicator**: Players always know if they're in focused state
- **Pool Visibility**: Current focus level is always visible to players
- **Learning Acceleration**: Obvious benefit from focus usage

**Strategic Depth:**
- **Resource Management**: When to use limited focus becomes strategic choice
- **Skill Prioritization**: Players must decide which skills deserve focus investment
- **Session Planning**: Natural integration with daily play rhythms

### Community Integration

**Shared Learning:**
- **Group Focus**: Multiple players can use focus during same activities
- **Knowledge Networks**: Communities benefit from individual focus investments
- **Mentorship Systems**: Experienced players guide others to optimal learning opportunities

**Expedition Coordination:**
- **Team Focus**: Strategic coordination of focus usage during dangerous operations
- **Specialized Development**: Groups can develop complementary expertise
- **Emergency Training**: Communities can prepare for crises through focused practice

This focus-based system creates a natural, intuitive learning experience that encourages strategic thinking while maintaining the elegant simplicity that makes skills easy to understand and use. The system supports both individual development and community cooperation while staying true to the post-collapse survival theme of the game world.
