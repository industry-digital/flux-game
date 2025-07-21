# Flux Combat System Brief

## Core Philosophy
Combat in Flux is **time-based, skill-expressive, and tactically deep**. Every action has a time cost, and mastery means doing more within the same constraints. Combat feels grounded in reality while rewarding genuine skill development.

## Foundation: Time-Based Action Economy
- **6-second combat rounds** where all combatants act in initiative order
- **Every action has a time cost** (fractional seconds allowed: 1.2s, 2.7s, etc.)
- **Skill mastery reduces time costs** - masters get more actions per round
- **Multi-round abilities** for powerful actions requiring 6+ seconds to complete

## Combat Grammar
Simple but expressive command vocabulary:
- `AIM <target>` - Variable time based on weapon skill, improves accuracy
- `ATTACK <target>` - Immediate attack without aiming
- `STANCE ADOPT <name>` - Switch to pre-configured defensive posture
- **Any non-combat action works too** - `HIDE`, `CLIMB`, `SEARCH`, etc.

## Stance System
- `STANCE CREATE <name> <block> <parry> <evade>` - Players design custom defensive allocations
- `STANCE ADOPT <name>` - Switch stances with skill-based time costs
- Creates personalized tactical signatures and specialized builds

## Combat Initiation: KOS Marking
- **PvP requires opt-in** - Players toggle PvP flag for 7-day commitment periods
- **KOS Marking** - Players can mark others as "kill on sight"
- **Auto-engagement** - When marked players meet and are mutually aware, combat begins
- **Stealth interactions** - Hidden players can avoid auto-engagement or gain surprise bonuses

## Stealth & Surprise Attacks
### Three Stealth Skills
- **Hiding** (AGI) - Remaining concealed in position
- **Sneaking** (AGI) - Silent movement without detection
- **Trickery** (INT/WIS) - Misdirection, disguise, and deception

### Stealth Detection
- When both players are hidden, mutual **Perception vs. Stealth** skill checks determine who spots whom first
- Detection failure allows continued stealth positioning and tactical advantage

### Surprise Attack Mechanics
- **Stealth approach** - Attacker can close to melee range undetected
- **Initiative bonus** - Surprise attacks grant massive initiative advantage
- **Combat sequence** - Surprised victim may face both the initial attack AND a full combat round before they can respond
- **Risk/reward** - Stealth investment pays off with potentially decisive opening advantage

## Group Dynamics & Escalation
- **Group involvement** - Marking someone pulls their entire group into combat
- **Natural escalation** - Solo conflicts pressure players to recruit allies
- **Political warfare** - Personal disputes evolve into factional conflicts
- **24-hour cooldowns** on re-marking prevent harassment

## Combat Roles & Range Dynamics

### Spellcasters
- **Distant range specialists** - powerful but vulnerable artillery role
- **Multi-round casting** - most powerful abilities require channeling across multiple rounds
- **Team coordination required** - allies must protect vulnerable casters during long casts

### Ranged Fighters
- **Range optimization** - different weapons excel at different distances (reach vs. distant)
- **Falloff accuracy** - weapons become less accurate outside their optimal range
- **Reach skirmishers** - high damage potential but operate in dangerous middle distance
- **Evasion dependency** - mobility skills crucial for maintaining optimal positioning

### Range Categories
- **Melee** - Close combat, immediate threat
- **Reach** - Middle distance, mobile skirmisher zone
- **Distant** - Long range, sniper territory

## Skill Integration
- **Action economy scales with skill** - Better fighters do more per round
- **Weapon specialization** - Different weapons have different time cost curves
- **Cross-system synergy** - All character skills (stealth, social, etc.) remain available in combat
- **Evasion for range control** - Mobility skills help maintain optimal positioning and distance

## Key Design Principles
1. **Skill expression through time efficiency** - Mastery is visible and impactful
2. **Meaningful commitment** - PvP decisions have lasting consequences
3. **Emergent complexity** - Simple rules create deep tactical possibilities
4. **Grounded realism** - Time costs make combat feel physically plausible
5. **Social integration** - Combat connects to broader world politics and relationships

The result: Combat that rewards both mechanical skill and strategic thinking, where conflicts feel meaningful and victories are genuinely earned.

## Combat System

Combat in our world is a dance of tactical decisions where time itself becomes a resource. Two fundamental philosophies emerge: the way of temporal power distribution through Agility, and the path of temporal power concentration through Strength. Both approaches offer equally potent routes to martial dominance, yet they create vastly different combat experiences.

## Action Economy

### Time Budget System
Every combatant begins their turn with a base time budget of 6 seconds—the length of a single combat round. This represents the temporal window for executing actions during their initiative. However, characters who invest in Agility transcend normal temporal limitations:

Base Time Budget: 6 seconds
AGI Scaling: Each point of AGI above 10 grants +10% time budget

AGI 11: 6.6 seconds (+10%)
AGI 13: 7.8 seconds (+30%)
AGI 15: 9.0 seconds (+50%)
AGI 20: 12.0 seconds (+100%)



This extended time allows high-AGI characters to execute complex action sequences, reposition multiple times, and react to emerging threats with supernatural speed. They distribute their power across multiple precise strikes, creating a whirlwind of activity that can overwhelm slower opponents.
Wind-Up Action System
While Agility masters slice time into smaller pieces, Strength devotees take the opposite approach—they concentrate their entire turn's potential into singular, devastating moments. The wind-up system transforms patient preparation into explosive power:
Core Mechanic: A character may spend their entire turn "winding up" for a release attack on their next turn. During wind-up:

The character cannot move, defend, or take other actions
They gain damage reduction equal to 10% × STR modifier
Interruption cancels the wind-up with no refund

Power Calculation:
Wind-up Multiplier = 1.5x + (STR - 10) × 0.1 + Time Investment Bonus
Where Time Investment Bonus rewards longer wind-ups:

1 turn wind-up: +0.0x multiplier
2 turn wind-up: +0.5x multiplier
3 turn wind-up: +1.0x multiplier

Example: A STR 16 character winding up for 2 turns:

Base: 1.5x
STR bonus: (16 - 10) × 0.1 = 0.6x
Time bonus: 0.5x
Total: 2.6x damage multiplier

Wind-Up Actions
Devastating Strike

Single target melee attack
Applies full wind-up multiplier to damage
Chance to shatter armor based on total damage dealt

Earthquake Slam

Area attack affecting all adjacent squares
75% of wind-up multiplier applied
Creates difficult terrain for 2 turns

Execution Attempt

Requires 3-turn wind-up minimum
If damage exceeds 50% of target's max HP, instant death
Otherwise, applies severe wound debuffs

Combat Feel and Progression
Low AGI vs High AGI
AGI 8 Warrior (4.8 seconds)

Feels constrained by time pressure
Must choose between movement OR attack
Relies on positioning and prediction
Single decisive action per turn

AGI 18 Duelist (10.8 seconds)

Flowing combat with multiple options
Can attack, reposition, and defend in one turn
Adapts tactics mid-turn based on results
Creates openings through action volume

Low STR vs High STR
STR 8 Fighter

Wind-ups barely worth the investment (1.3x multiplier)
Better served by consistent attacks
Lacks the presence to deter rushes during wind-up

STR 20 Juggernaut

Wind-ups become fight-defining moments (2.5x+ multipliers)
Single release attacks can eliminate threats
Wind-up threat zones control battlefield positioning
Teams must coordinate to create wind-up opportunities

Tactical Depth
The duality between AGI and STR creates rich tactical decisions:

AGI builds excel at adaptation, harassment, and exploiting openings
STR builds dominate through threat projection and burst potential
Mixed builds sacrifice peak performance for versatility
Team compositions must balance immediate pressure (AGI) with spike damage (STR)

Neither path is superior—they represent fundamentally different approaches to wielding power in combat. The greatest warriors understand both philosophies, even as they master one.


### Verbs

```
dodge - Dodge attacks
block - Block attacks
parry - Parry attacks
feint - Feint attacks
disarm - Disarm attacks
trip - Trip attacks
overpower - Overpower attacks
riposte - Riposte attacks
```
