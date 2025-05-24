# Flux Skill Learning System Summary

## Core Principles

The Flux skill learning system separates **skill usage** from **skill learning**. Skills always function regardless of character level, zone appropriateness, or available concentration. Learning, however, is governed by concentration resources, zone-based efficiency multipliers, and active focus states.

## Concentration System

### Independent Skill Pools
Each skill maintains its own separate concentration pool. Learning stealth does not compete with learning combat or lockpicking for concentration resources. This design encourages diverse skill development and allows players to advance multiple skill trees within the same play session.

**Key Properties:**
- **Independence**: Each skill has its own pool based on its stat affinities
- **Parallel Development**: Players can learn multiple skills simultaneously
- **Strategic Depth**: Stat allocation affects concentration capacity for entire skill families

### Concentration Pool Calculation
Each skill's concentration pool is sized by character attributes:

$\text{conc.natural.max} = \text{base\_value} + \text{stat\_bonus}$

Where:
- $\text{base\_value} = 100$ for all skills
- $\text{stat\_bonus}$ comes from the character's affinity stat for that skill

**Example**: Three different skills on the same character
- **Evasion** (AGI affinity): AGI 22 (+40 bonus) → $100 + 40 = 140$ concentration
- **Lockpicking** (DEX affinity): DEX 18 (+30 bonus) → $100 + 30 = 130$ concentration
- **Intimidation** (STR affinity): STR 14 (+10 bonus) → $100 + 10 = 110$ concentration

### Stat Allocation Impact
Character stat distribution directly affects learning capacity in corresponding skill families, with dump stats being twice as punishing as high stats are beneficial:

**Stat Bonus Formula:**
- **Positive stats** (above 10): +(stat - 10) × 2 concentration bonus
- **Negative stats** (below 10): +(stat - 10) × 4 concentration penalty (double punishment)

**Balanced Character** (all stats ~15):
- Most skills: 100 + (5 × 2) = **110 concentration**
- Moderate learning capacity across all skill families
- Jack-of-all-trades approach with no severe penalties

**Specialized Character** (STR 20, INT 8):
- **STR skills**: 100 + (10 × 2) = **120 concentration** → excellent learning capacity
- **INT skills**: 100 + (-2 × 4) = **92 concentration** → reduced but viable learning
- **Trade-off**: Excellence in preferred skills with manageable penalties elsewhere

**Heavy Dump Stat Example** (STR 22, INT 6):
- **STR skills**: 100 + (12 × 2) = **124 concentration** → exceptional learning capacity
- **INT skills**: 100 + (-4 × 4) = **84 concentration** → severely limited learning
- **Consequence**: Near-inability to develop intellectual skills due to extreme specialization

### Concentration Regeneration
- **Continuous Recovery**: All concentration pools regenerate linearly over 24 hours
- **On-Demand Calculation**: Concentration is updated when accessed based on time elapsed
- **Size Independent**: All pools take exactly 24 hours to fully regenerate regardless of maximum capacity
- **Timezone Neutral**: No global reset times - works equally well for all players worldwide

**Implementation**: Simple timestamp comparison calculates regeneration since last update:
```typescript
const timeSinceUpdate = now - skill.lastUpdated;
const regenRate = skill.conc.max / (24 * 60 * 60 * 1000); // per millisecond
const regenAmount = timeSinceUpdate * regenRate;
skill.conc.current = Math.min(skill.conc.max, skill.conc.current + regenAmount);
```

This creates natural daily engagement cycles where players can engage with learning at any time, with concentration gradually returning to enable continued skill development throughout their play sessions.

## Direct Skill Usage Learning

### Learning Through Action
The Flux skill system follows a simple principle: **you learn by doing**. Characters gain experience exclusively through their own skill usage, not by observing others.

**Core Mechanic:**
- Players learn skills by actively using them in appropriate contexts
- Each skill usage updates only the acting character's skill state
- No cascading updates or observational learning mechanics

### Active Learning Examples
- **Perception Training**: Use `SEARCH` to look for hidden objects, passages, or threats
- **Stealth Training**: Use `HIDE` to practice concealment in various environments
- **Combat Training**: Engage in sparring, combat, or weapon practice
- **Lockpicking Training**: Attempt to pick locks of varying difficulty
- **Social Training**: Engage in persuasion, intimidation, or diplomatic actions

### Technical Benefits: Zero Cascade Complexity

**Simple Performance Model:**
- 1 skill action = 1 database update to the acting character
- No observer filtering, no cascading writes, no race conditions
- O(1) skill updates regardless of room occupancy
- Eliminates entire categories of scaling concerns

**Implementation Simplicity:**
```typescript
// Single character skill update - no loops, no filters
const skillUpdate = {
  character_id: actor.id,
  skill: 'perception',
  pxp_gained: concentrationUsed * zoneEfficiency
};
```

### Social Learning Through Cooperation

While characters don't learn from passive observation, rich social learning emerges through cooperative skill usage:

**Collaborative Activities:**
- **Group searches**: Multiple players `SEARCH` the same area for different hidden elements
- **Joint stealth missions**: Coordinated `HIDE` attempts with shared objectives
- **Sparring partnerships**: Combat practice with willing partners
- **Skill demonstrations**: Teaching through direct participation rather than observation

**Mentorship Through Participation:**
- Experienced players guide others to appropriate learning zones
- Shared exploration of challenging areas within skill ranges
- Cooperative attempts at complex tasks requiring multiple skills
- Resource sharing to enable skill practice (tools, materials, access)

## Zone-Based Learning (Goldilocks System)

### Zone Types and Efficiency
Learning efficiency depends on the relationship between current skill level and zone difficulty:

| Zone Type | Efficiency ($\eta$) | Description |
|-----------|---------------------|-------------|
| Outside Bounds | 0.0 | No learning possible |
| Outer Bread | 0.38 | Significantly sub-optimal |
| Inner Bread | 0.618 | Moderately sub-optimal |
| Optimal | 1.0 | Perfect learning conditions |

Where efficiency values follow golden ratio relationships:
- Inner bread: $\phi - 1 \approx 0.618$
- Outer bread: $\phi^{-2} \approx 0.38$

## Learning Mechanics

### Primary Conversion: Concentration → PXP
When a focused skill is used within the Goldilocks zone:

$$\text{pxp\_gained} = \text{conc\_consumed} \times \eta \times \text{focus\_efficiency}$$

### Observational Learning Flow
1. **Actor performs skill** (e.g., stealth attempt)
2. **System identifies focused observers** within skill level range
3. **Each focused observer** makes concentration check for relevant skill
4. **PXP awarded** based on zone efficiency and focus efficiency
5. **Database updates** only for focused, eligible observers

### Concentration Consumption Rules

All zones within the Goldilocks sandwich follow uniform consumption mechanics:

**Outside Goldilocks Bounds:**
$\text{conc\_consumed} = 0, \quad \text{pxp\_gained} = 0$

**Within Goldilocks Zone (Optimal, Inner Bread, Outer Bread):**
$\text{conc\_consumed} = \text{skill\_check.conc\_cost}$
$\text{pxp\_gained} = \text{skill\_check.conc\_cost} \times \eta \times \text{focus\_efficiency}$

Where `skill_check.conc_cost` is dynamically determined by the specific action being attempted.

**Example**: Dynamic stealth skill check costs with focus
- **Observer focusing on perception only**: Full efficiency (1.0x)
- **Observer focusing on perception + stealth**: Full efficiency (1.0x)
- **Observer focusing on perception + stealth + magic**: Reduced efficiency (0.71x)

### Secondary Conversion: PXP → XP
Potential experience converts to permanent experience over time:

$$\frac{d(\text{xp})}{dt} = f(\text{pxp}, \text{INT})$$

Where the conversion rate is influenced by the character's Intelligence stat.

## Dynamic Skill Check Concentration Costs

Concentration costs are determined dynamically by each individual skill check based on:
- **Action complexity**: What specifically is being attempted
- **Environmental conditions**: Current circumstances affecting difficulty
- **Target difficulty**: The inherent challenge of the specific target
- **Contextual factors**: Situational modifiers that affect the attempt

**Examples of Dynamic Costs:**
- **Stealth past sleeping guard**: 10 concentration
- **Stealth past alert patrol in daylight**: 45 concentration
- **Pick simple door lock**: 15 concentration
- **Pick master's vault lock**: 80 concentration
- **Sword training against dummy**: 5 concentration
- **Parry expert duelist's attack**: 60 concentration

This creates tactical depth where players must consider both the likelihood of success and the concentration investment required for each action.

## Key Behavioral Properties

### Session Limiting & Anti-Grinding
- **All zones** within the Goldilocks sandwich follow uniform consumption mechanics
- **Optimal zones** provide maximum learning efficiency (1.0x) encouraging players to seek appropriate challenges
- **Bread zones** allow extended practice at reduced efficiency (0.618x or 0.38x)
- **Outside bounds** permit unlimited skill usage without learning progression
- **Concentration limits** naturally pace learning sessions across all zones
- **Focus requirements** prevent passive skill accumulation and require active learning choices

### Strategic Depth
Players must choose between:
- **Efficient learning**: Seeking optimal zones for maximum PXP per concentration spent
- **Extended practice**: Using bread zones for longer sessions at reduced efficiency
- **Smart resource management**: Choosing easier targets to conserve concentration for more challenging attempts
- **Practical application**: Using skills outside learning zones when needed for gameplay
- **Learning focus**: Selecting 1-2 skills for optimal learning vs. broader focus with penalties

### Natural Progression
The system encourages players to:
1. Seek appropriately challenging content for their current skill level
2. Progress through the world as their skills advance and require new zones
3. Balance learning efficiency against practical needs
4. Move on from mastered content rather than grinding it repeatedly
5. Actively choose learning opportunities rather than accumulating skills passively
6. Form social learning groups around shared skill interests

## Implementation Notes

- Skills **always function** regardless of concentration, focus, or zone appropriateness
- Learning is a **secondary effect** that occurs when conditions are favorable
- Focus creates **active learning choice** while preventing database write storms
- Concentration acts as a **pacing mechanism**, not a usage restriction
- Zone efficiency creates **meaningful choices** about where and how to develop skills
- Dynamic concentration costs reward **tactical thinking** and **smart target selection**
- Focus states are stored in **high-volatility storage** for real-time social interactions

This design creates organic character development that emerges from gameplay rather than artificial restrictions, while maintaining clear resource management and progression incentives. The focus system specifically solves the technical challenge of scaling observational learning in multiplayer environments while enhancing the social and strategic depth of skill development.
