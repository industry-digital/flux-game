# Flux Combat System: Physics-Based Tactical Combat
>>>>>>> 31f060a (Actor combat physics)

The Combat System is a physics-based, tactical combat system designed for a Multi-User Dungeon (MUD) that emphasizes skill and understanding of real-world physical principles. Combat follows a **turn-based structure** similar to Divinity: Original Sin 2, where each actor takes sequential turns with a full Action Point pool to spend during their activation.

## Turn-Based Combat Structure

Combat proceeds in a strict turn-based sequence with the following phases:

1. **Initiative Phase**: Determine turn order based on character Finesse (FIN) and other modifiers
2. **Actor Turn**: The active actor receives their full 6.0 AP pool to spend on actions
3. **Action Resolution**: Actions execute immediately upon selection, though complex actions may have duration effects
4. **Turn Transition**: Energy recovery, status effects, and environmental changes apply between turns
5. **Round Completion**: Initiative advances to the next actor in sequence

**Key Mechanic**: While individual actions (such as strike charging) may take real-world time to build up power, no other actors can act until the current actor's turn is complete. This creates real-time physics tension within the strategic framework of turn-based combat.

### Turn Boundaries

A turn ends when the actor either:
- Spends all available AP on actions
- Chooses to end turn early (converting remaining AP to defensive bonuses via `DEFEND`)
- Executes an action that consumes their remaining AP

**Energy Recovery**: The golden ratio energy recovery curve operates between turns, allowing actors to regain capacitor energy during other players' turns.

## Core Mechanics and Character Attributes

All combat is driven by three core character stats that govern the physical capabilities of a character: Power (POW), Finesse (FIN), and Resilience (RES).

**Power (POW)**: A character's ability to generate kinetic energy through muscular force. High POW enables faster acceleration and more efficient energy transfer into strikes. A character's natural power output ($P_{natural}$) is calculated as $(POW \times 25W) + 125W$.

**Finesse (FIN)**: Governs a character's relationship with movement and inertia. High FIN increases top speed and reduces effective mass, leading to faster acceleration and better body control while moving. FIN also influences initiative order in turn-based combat.

**Resilience (RES)**: Defines a character's energy reserves and recovery capabilities. Like a biological capacitor, RES determines how much energy an actor can store and how quickly they can replenish it between turns.

These stats form a Tactical Triangle, creating distinct character builds:

- **Speed Builds (High FIN, Moderate POW)**: Fast and agile, they generate massive momentum damage by using velocity squared ($\frac{1}{2}mv^2$). They are specialists in hit-and-run tactics and typically act early in initiative order.

- **Strength Builds (High POW, Moderate FIN)**: Strong but slower, they rely on superior energy transfer and weapon efficiency to deal devastating single strikes.

- **Endurance Builds (High RES)**: They can sustain performance over long engagements, becoming relatively stronger as their opponents fatigue. Their superior energy recovery between turns provides increasing advantage in extended combats.

## The Battlefield and Action Point System

Combat occurs on a 300-meter linear battlefield. When two opposing actors enter combat, they are placed at opposite ends of the battlefield, 100 meters apart. On both sides of this 100m gap is a margin of 100 meters, yielding a total of 300 meters of battlefield.

**Power Output Scaling:**
```
Linear Battlefield Layout (300m total):

[Margin]    [Combat Zone]    [Margin]
  100m         100m           100m
    |            |             |
    v            v             v

0m -------- 100m -------- 200m -------- 300m
|            |             |            |
|            A             B            |
|         Actor 1       Actor 2         |
|                                       |
West                                   East
Boundary                           Boundary

Initial Positions:
• Actor 1: 100m ("west" edge of combat zone)
• Actor 2: 200m ("east" edge of combat zone)
• Distance apart: 100m
• Available movement: 0m-300m total battlefield
```

We use "east" and "west" figuratively here, and not in the literal sense.

### Collision Mechanics

First, let's agree on what "collision" means.

Collision is defined as a situation where one actor's body intersects at the same point in space as another actor's body.

Actor bodies on the linear battlefield -- by default -- do not collide with anything. Collision happens only under these specific circumstances:

1. Actor `TARGET`s another actor, issues a `APPROACH 0` command. This is a "ramming" maneuver.
2. Actor `APPROACH`es another actor, and the target actor `APPROACH`es the actor.

In both cases, the actor that is being approached is considered the "target" and the actor that is approaching is considered the "attacker".

It is assumed that a melee attack has a range of 1 meter.
A *reach* attack, using a reach weapon like a spear, has a range of 2 meters.

### Action Point System

The combat economy is managed by an Action Point (AP) system, where time becomes a strategic resource within each turn.

- **AP Pool**: Actors have a default pool of 6.0 AP per turn, representing 6 seconds of focused action time. This is their "action economy" for a single turn.

- **Action Costs**: All actions, from strikes to movement and even actions like taking things out of a container, have a temporal cost in AP. The minimum increment is 0.1 AP, allowing for precise tactical sequencing within a turn.

- **Skill-Based Efficiency**: Higher skill proficiency in a specific action reduces its AP cost, providing a clear path for character progression and specialization. This creates a combat tempo advantage for skilled players, who can perform more actions within the same turn.

- **Turn-Based Refresh**: Unlike real-time systems, AP pools refresh to full at the beginning of each actor's turn, regardless of how much was spent previously.

- **Improving Economy**: Players can increase their action economy by either increasing their AP pool size through gear and advancements or by reducing AP costs through skill development.

## Damage and Weapon Mechanics

Damage is a product of both muscular force and momentum transfer. The final damage is a combination of these two sources, scaled by a weapon's efficiency and reduced by armor.

$$D_{final} = \max\left(0, \frac{(D_{muscular} + D_{momentum}) \times \eta_{weapon}}{5J} - A_{value}\right)$$

- **Muscular Damage ($D_{muscular}$)**: This is the damage generated from the character's muscular effort, calculated as $P_{effective} \times t_{strike} / 5J$.

- **Momentum Damage ($D_{momentum}$)**: This is the damage from a character's kinetic energy in motion, calculated as $(\frac{1}{2}mv^2) \times (POW/100) / 5J$. The Power (POW) stat determines how effectively this momentum is transferred.

- **Weapon Efficiency ($\eta_{weapon}$)**: Weapons follow a golden ratio progression ($\phi$) in efficiency, which determines how effectively kinetic energy is transferred into damage.

  - **Unarmed**: $0.382 \times \eta$ ($\phi^{-2}$)
  - **Light Weapons**: $0.618 \times \eta$ ($\phi^{-1}$)
  - **Medium Weapons**: $1.000 \times \eta$ (Baseline)
  - **Heavy Weapons**: $1.618 \times \eta$ ($\phi$)

It stands to reason that it's easier to kill someone with a heavy weapon than with fists, even though the power expenditure of the actor is the same. Thus we introduce this artificial "efficiency" coefficient.

Dual-wielding light weapons provides a total efficiency of $1.236 \times \eta$, placing it between medium and heavy weapons in power.

## Resilience and Energy Management

Whenever we refer to an actor's energy reserves, we use the term "capacitor".

The Resilience (RES) stat directly affects an actor's capacitor in two key ways:

1. Larger energy pool (Joules)
2. Faster recovery rate as a secondary consequence of having a larger energy pool

**Between-Turn Recovery**: Energy recovery occurs during other actors' turns, not during the active actor's turn. This creates strategic timing where actors with high RES become relatively stronger in longer combats.

- **Golden Ratio Recovery Curve**: The energy recovery rate is not constant; it follows a curve that peaks at 38.2% of a character's maximum energy capacity. This "golden zone" encourages players to maintain a state of moderate energy depletion, as recovery is agonizingly slow from complete exhaustion and inefficient when an energy pool is nearly full.

- **Fatigue-Limited Power**: A character's effective power output diminishes as their energy reserves deplete. This means sustained, high-power actions are not possible without adequate recovery, creating a natural trade-off between burst damage and endurance within and across turns.

## Defensive Maneuvers

Defensive maneuvers are of three categories:

- **Dodging**: The actor moves out of the way of the attack. Dodging is affected by the actor's Finesse (FIN) stat.
- **Blocking**: The actor blocks the attack with a shield or other object. Blocking is affected by the actor's Resilience (RES) stat.
- **Parrying**: The actor parries the attack with a weapon. Parrying is affected by the actor's Finesse (FIN) stat.

Actors may at any time during their turn issue a `DEFEND` command. This causes the actor to *spend all remaining AP* for the current turn towards defensive bonuses. These bonuses take effect immediately and persist until the beginning of the actor's next turn. While these bonuses are in effect, the effectiveness of attacks directed toward the actor is reduced by the amount proportional to the square of the AP invested.

Whenever an actor successfully defends against an attack, a small amount of energy is deducted from the actor's capacitor, but never below a threshold of 38.2% of the actor's maximum capacitor.

## Tactical and Strategic Implications

The Flux Combat System creates a tactical "rock-paper-scissors" dynamic driven by physics, not arbitrary rules, within the strategic framework of turn-based combat.

- **Flat Armor Reduction**: Armor provides a fixed damage reduction per strike. This favors single, devastating haymakers over rapid, light combinations, making heavy armor builds a direct counter to speed builds.

- **Motion-Based Hit Difficulty**: Moving targets are harder to hit with momentum-based attacks. This creates an advantage for mobile, high-finesse characters against slow, heavy-hitting opponents.

- **Turn-Based Tactical Planning**: The turn structure allows players to carefully plan complex sequences of actions, such as building momentum over multiple movement actions before executing a devastating charge attack.

- **Execution Uncertainty**: While damage calculations are deterministic, success is not guaranteed. A dice roll determines if a calculated hit connects, introducing a layer of uncertainty and skill-based execution. There are no "damage dice" or critical hits; instead, the player's understanding of physics and their ability to create the right conditions for a powerful strike is what leads to a "critical" outcome.

The result is a system where players with a deep understanding of the underlying physics—from calculating power-to-mass ratios to managing their energy in the golden recovery zone—gain a genuine, quantifiable competitive advantage within the strategic framework of turn-based planning.

---

## Appendices

### A. Numeric Integration Algorithm for Strike Power

The combat system uses **32-step Simpson's rule integration** to calculate total kinetic energy generated during variable-duration strikes. As an actor's energy capacitor depletes during extended attacks, their effective power output decreases, creating natural diminishing returns for long wind-ups.

**Integration Method:**
- **Algorithm**: Simpson's 1/3 rule for cubic accuracy
- **Steps**: 32 subdivisions for optimal performance/precision balance
- **Resolution**: ~0.094s per step (well below 0.1s AP threshold)
- **Purpose**: Calculate area under power curve = total kinetic energy

**Implementation:**
```javascript
function integrateStrikePower(duration, initialEnergy, naturalPower, naturalRES) {
  const n = 32; // Number of integration steps
  const h = duration / n; // Step size (~0.094s for 3-second strikes)
  const maxRecovery = naturalRES * 10; // Watts per RES point

  let currentEnergy = initialEnergy;
  let integral = 0;

  // Simpson's 1/3 rule: (h/3) * [f(x₀) + 4f(x₁) + 2f(x₂) + 4f(x₃) + ... + f(xₙ)]
  for (let i = 0; i <= n; i++) {
    const t = i * h;
    const remainingDuration = duration - t;

    // Energy-limited power output
    const energyLimitedPower = remainingDuration > 0 ?
      currentEnergy / remainingDuration : naturalPower;
    const effectivePower = Math.min(naturalPower, energyLimitedPower);

    // Simpson's coefficients: 1, 4, 2, 4, 2, ..., 4, 1
    const coefficient = (i === 0 || i === n) ? 1 : (i % 2 === 1) ? 4 : 2;
    integral += coefficient * effectivePower;

    // Update energy state for next step
    if (i < n) {
      // Energy depletion
      currentEnergy -= effectivePower * h;

      // Golden ratio recovery (peaks at 38.2% capacity)
      const energyRatio = currentEnergy / (naturalRES * 100);
      const recoveryRate = maxRecovery * goldenRecoveryCurve(energyRatio);
      currentEnergy += recoveryRate * h;

      // Clamp to valid range
      currentEnergy = Math.max(0, Math.min(currentEnergy, naturalRES * 100));
    }
  }

  return (h / 3) * integral; // Total kinetic energy generated
}

function goldenRecoveryCurve(t) {
  // Recovery rate is the first derivative of a phase-shifted sigmoid
  // Peaks at t = 0.382 (golden ratio conjugate)
  const shifted = t - 0.382; // Phase shift to peak at golden ratio
  return Math.exp(-50 * shifted * shifted); // Gaussian-like curve peaked at 0.382
}
```

#### The Engagement Evolution
**Early Engagement**: Fresh power cores provide maximum tactical options - heavy builds can still reposition effectively
**Mid-Engagement**: Power degradation begins favoring lighter configurations as heavy builds lose mobility advantage
**Late Engagement**: Depleted power cores create dramatic capability gaps - heavy builds become increasingly static

### B. Strike Duration Efficiency Analysis: Power Spool-Up System

Players who grasp these power-mobility relationships gain genuine competitive advantage, making energy economics and physics literacy core combat skills rather than memorizing arbitrary movement rules.

### The Counter-Triangle: Shell Type Tactical Relationships

Where `t` is the cumulative time spent building power within a single strike during an actor's turn.

**Single 3-Second Haymaker (6.0 AP turn):**
```
High POW Fighter (POW 80, RES 80):
- Starting Energy: 8,000J
- Natural Power: 2,125W
- Turn Action: 3-second haymaker (costs 3.0 AP)
- Power ramp over 3 seconds:
  * t = 0-1s: 0% → 33% power (average 354W)
  * t = 1-2s: 33% → 67% power (average 1,063W)
  * t = 2-3s: 67% → 100% power (average 1,771W)
- Average Power: ~1,063W over 3 seconds
- Total Energy Generated: 3,188J
- Energy Cost: 3,188J depleted
- Remaining Energy: 4,812J (60.2% capacity)
- Remaining AP: 3.0 (available for movement, defense, etc.)
```

**Three 1-Second Jabs in Single Turn:**
```
Same Fighter, 3 separate 1-second strikes (1.0 AP each) within one turn:

Starting Energy: 8,000J
Starting AP: 6.0

Jab 1 (1.0 AP, 0→1s spool-up):
- Power ramp: 0% → 33% (average 354W)
- Energy Generated: 354J
- Energy Cost: 354J depleted
- Remaining Energy: 7,646J (95.6% capacity)
- Remaining AP: 5.0

Jab 2 (1.0 AP, 0→1s spool-up):
- Power ramp: 0% → 33% (average 354W)
- Energy Generated: 354J
- Energy Cost: 354J depleted
- Remaining Energy: 7,292J (91.2% capacity)
- Remaining AP: 4.0

Jab 3 (1.0 AP, 0→1s spool-up):
- Power ramp: 0% → 33% (average 354W)
- Energy Generated: 354J
- Energy Cost: 354J depleted
- Final Energy: 6,938J (86.7% capacity)
- Remaining AP: 3.0

Total Energy Generated: 1,062J
Net Energy Expenditure: 1,062J (no recovery during turn)
```

**Energy Efficiency Comparison (Medium Weapon, 1.0× Efficiency):**
- **1 × 3-second haymaker**: 3,188J energy → 638 damage points (3,188J ÷ 5J per damage × 1.0 efficiency)
- **3 × 1-second jabs**: 1,062J total energy → 212 damage points total (354J per jab → 71 damage each)
- **Haymaker advantage**: Generates **200% more energy** but costs **200% more capacitor**
- **Critical insight**: Energy cost scales proportionally with energy generation

**Turn-Based Tactical Consequences:**
- **Risk vs reward balance**: Haymakers generate more damage but cost proportionally more energy
- **Strategic resource management**: Players must balance devastating potential vs energy conservation within their turn
- **Action economy trade-offs**: Haymakers consume more AP, leaving less for movement and positioning
- **Between-turn recovery**: Energy depleted during a turn recovers during opponents' turns

### C. Armor and Momentum Counterplay Systems

The combat system incorporates **flat armor reduction per strike** and **motion-based hit difficulty** to create tactical rock-paper-scissors relationships between different combat approaches.

**Flat Armor Reduction Mechanics:**
$$D_{final} = \max\left(0, \frac{E_{kinetic} \times \eta_{weapon}}{5J} - A_{value}\right)$$

**Armor vs Attack Type Analysis:**
```
Example: 20-point armor reduction per blow

Against 3 × 71-damage jabs (executed in single turn):
- Jab 1: 71 - 20 = 51 damage
- Jab 2: 71 - 20 = 51 damage
- Jab 3: 71 - 20 = 51 damage
- Total: 153 damage

Against 1 × 638-damage haymaker (executed in single turn):
- Haymaker: 638 - 20 = 618 damage
- Total: 618 damage

Result: Haymaker deals 4× more effective damage despite same energy cost
```

**Motion-Based Hit Difficulty:**
Moving targets become increasingly difficult to hit with momentum-based attacks, creating natural counterplay dynamics:

- **Stationary targets**: Standard hit probability for all attack types
- **Moving targets**: Reduced hit probability for momentum-dependent attacks
- **High-speed targets**: Significant penalty to momentum attacks, minimal penalty to standard strikes

**Tactical Triangle Emerges:**

**Heavy Armor + Low Mobility:**
- **Strengths**: Immune to rapid combinations, devastating single strikes
- **Weaknesses**: Vulnerable to momentum attacks from mobile opponents
- **Role**: Breakthrough specialist, area denial
- **Turn Strategy**: Focus AP on powerful single attacks rather than combinations

**High Finesse + Light Armor:**
- **Strengths**: Generates massive momentum damage, difficult to hit while moving, early initiative
- **Weaknesses**: Vulnerable to sustained rapid combinations, poor armor penetration
- **Role**: Anti-armor specialist, hit-and-run tactics
- **Turn Strategy**: Build momentum with movement, execute devastating charge attacks

**Balanced Builds + Medium Equipment:**
- **Strengths**: Tactical flexibility, can adapt to opponent weaknesses
- **Weaknesses**: No overwhelming advantage in any matchup
- **Role**: Versatile combatant, strategic adaptation
- **Turn Strategy**: Adapt action economy based on opponent's demonstrated weaknesses

### D. Mathematical Foundation Summary

**Core Energy Equations:**
$$E_{muscular} = \int_0^t P_{effective}(t') dt'$$
$$P_{effective}(t) = \min\left(P_{natural} \times \min\left(1.0, \frac{t}{3.0}\right), \frac{E_{current}}{t_{remaining}}\right)$$
$$P_{natural} = (POW \times 25W) + 125W$$

**Momentum Components:**
$$E_{momentum} = E_{kinetic} \times \eta_{POW} \times P_{hit}(v_{target})$$
$$E_{kinetic} = \frac{1}{2}mv^2$$
$$\eta_{POW} = \frac{POW}{100}$$

**Energy Management:**
$$E_{capacity} = RES \times 100J$$
$$R_{max} = RES \times 10W$$
$$R_{current} = R_{max} \times f_{golden}\left(\frac{E_{current}}{E_{capacity}}\right)$$

Where $f_{golden}'(t)$ peaks at $t = 0.382 = \varphi^{-1}$ (golden ratio conjugate)

**Golden Ratio Weapon Progression:**
$$\begin{align}
\text{Unarmed:} \quad &\eta = \varphi^{-2} = 0.382 \\
\text{Light:} \quad &\eta = \varphi^{-1} = 0.618 \\
\text{Medium:} \quad &\eta = 1.000 \\
\text{Heavy:} \quad &\eta = \varphi = 1.618
\end{align}$$

**Action Economy:**
$$C_{action} = C_{base} \times (1 - \eta_{skill})$$

Where $\eta_{skill}$ represents skill-based efficiency improvements that reduce AP costs within turns.

**Turn-Based Initiative:**
$$I_{order} = FIN + modifiers + random_{component}$$

Where initiative determines the sequence of actor turns in each combat round.
