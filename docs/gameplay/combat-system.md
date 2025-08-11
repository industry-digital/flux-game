# Flux Combat System: Time-Based Tactical Positioning

## Core Philosophy

Combat in Flux is **time-based, skill-expressive, and tactically deep**. Every action has a time cost, and mastery means doing more within the same constraints. Combat feels grounded in reality while rewarding genuine skill development.

The system draws inspiration from 2D fighting games like Street Fighter, where positioning, timing, and resource management create tactical depth through elegant mechanical constraints.

## Foundation: Action Budget Economy

### The 6-Second Round Structure

- **6-second combat rounds** where all combatants act in initiative order
- **Every action has a precise time cost** (fractional seconds: 1.2s, 2.7s, etc.)
- **Skill mastery reduces time costs and increases effectiveness** - masters execute actions faster AND hit harder
- **Visual action budget** counts down in real-time as player selects actions
- **Multi-round abilities** for devastating attacks requiring 6+ seconds to complete

### Real-Time Budget Pressure

```
> target <enemy>
[AP: 6.0 remaining]
> tumble behind
[AP: 3.2 remaining]
[You are flanking <enemy>.]
> attack
[AP: 1.1 remaining]
> stance defensive
[You enter a defensive posture using the rest of your AP.]
[AP: 0.0 remaining]
```

Players **watch their time die** with each decision, creating genuine tactical pressure. The countdown becomes a character in the combat - always present, always threatening.

## The 2D Positioning System

### Street Fighter-Style Linear Battlefield

All combat takes place on a **linear battlefield** where participants line up across a horizontal axis, like in the classic arcade game, *Street Fighter*. This abstraction creates tactical depth while maintaining computational simplicity.

**Positioning Actions with Time Costs:**
- `FEINT` Feign movement to create an opening, potentially catching the opponent off balance or flat-footed.
- `APPROACH` / `AVOID` Move closer or further away from the opponent.
- `STANCE <stance>` Change to a different combat stance (e.g., `defensive`, `offensive`, `balanced`).
- `TUMBLE` Roll around the opponent to create an opening. Opponent gains `flanked` status.
- `SPRINT` Rapid multi-position movement for gap closing
- `BLINK` Instant optimal positioning using the [Blink Drive](./blink.md).

## AI Companion Integration: Real-Time Tactical Partnership

### Rhea's Combat Modes

**Out of Combat - Sophisticated Analysis:**
```
rhea: "Utahraptor positioning pattern indicates pounce preparation.
      Recommend defensive stance, prepare counter-tumble sequence."
```

**In Combat - Direct Commands:**
```
[Action Budget: 4.2 seconds]
Rhea: "Tumble behind it."

[Action Budget: 1.4 seconds]
```

### Example Combat Log

```text
> target antinatalist_alpha
[AP: 6.0 remaining]
> fire burst
[3-round burst: 12.7mm AP]
[Target hit: center mass x3]
[AP: 4.1 remaining]
> stance defensive
[AP: 3.3 remaining]

rhea: "Target down. Five more converging from northwest. Ammunition: 17 rounds."

Alpha crumples, black ichor pooling beneath twisted fungal growths. Three more emerge from the collapsed subway entrance, their movements synchronized like clockwork. Rain sheets down on the abandoned square, mixing cordite with decay.

> target antinatalist_bravo
[AP: 3.3 remaining]
> fire single
[Headshot]
[AP: 2.1 remaining]
> target antinatalist_charlie
[AP: 2.1 remaining]
> fire single
[Headshot]
[AP: 0.9 remaining]

rhea: "Headshot, good kill. Headshot, good kill. Ammunition: 15 rounds."

Two perfect shots. Bravo and Charlie drop simultaneously, skulls split like overripe fruit. The others don't flinch, stepping over their fallen with mechanical precision. You count eight now - pale eyes gleaming through the downpour.

> reload
[AP: 6.0 remaining]
> magazine insert
[AP: 4.2 remaining]
> chamber round
[AP: 2.1 remaining]
> target antinatalist_delta
[AP: 2.1 remaining]
> fire burst
[Center mass x3]
[AP: 0.0 remaining]

rhea: "Excellent grouping. Target neutralized. Twelve hostiles advancing."

Delta staggers, fungal tendrils writhing as it collapses. Four more emerge from skeletal storefronts, their blade-arms glinting in the rain. They move like wolves - patient, coordinated, inevitable.

> target antinatalist_echo
[AP: 6.0 remaining]
> fire single
[Headshot]
[AP: 4.8 remaining]
> target antinatalist_foxtrot
[AP: 4.8 remaining]
> fire single
[Headshot]
[AP: 3.6 remaining]
> target antinatalist_golf
[AP: 3.6 remaining]
> fire burst
[Center mass x3]
[AP: 1.5 remaining]

rhea: "Headshot, good kill. Headshot, good kill. Golf is down. Outstanding marksmanship."

Three more bodies hit the concrete. Your breathing is steady, controlled. Rain streams from your scope. Fifteen confirmed kills, but they keep coming - emerging from manholes, storm drains, the skeletal remains of civilization.

> reload
[AP: 6.0 remaining]
> magazine insert
[AP: 4.2 remaining]
> chamber round
[AP: 2.1 remaining]
> target antinatalist_hotel
[AP: 2.1 remaining]
> fire single
[Headshot]
[AP: 1.3 remaining]

rhea: "Headshot, good kill. Ammunition: 6 rounds. Hostiles: twenty-three active."

Hotel drops like a marionette with severed strings. The circle tightens. They're close enough now that you smell the ozone-rot of their fungal symbionts. Your back meets cold concrete. No retreat.

> target antinatalist_india
[AP: 6.0 remaining]
> fire single
[Headshot]
[AP: 4.8 remaining]
> target antinatalist_juliet
[AP: 4.8 remaining]
> fire single
[Headshot]
[AP: 3.6 remaining]
> target antinatalist_kilo
[AP: 3.6 remaining]
> fire single
[Center mass]
[AP: 2.4 remaining]
> target antinatalist_lima
[AP: 2.4 remaining]
> fire single
[Headshot]
[AP: 1.2 remaining]

rhea: "Headshot, good kill. Headshot, good kill. Kilo wounded but mobile. Headshot, good kill."

Three more perfect shots. Kilo staggers but keeps advancing, black fluid streaming from its chest. Eighteen confirmed kills. Your hands are rock-steady despite the rain, despite the impossible odds.

> target antinatalist_kilo
[AP: 6.0 remaining]
> fire single
[Headshot]
[AP: 4.8 remaining]

rhea: "Headshot, good kill. Final round chambered."

Kilo's head snaps back, fungal crown exploding in a spray of spores. Nineteen kills. The rifle's bolt locks open - magazine empty. The metallic click echoes louder than thunder.

[No commands accepted for 4 seconds]

Twenty-eight pale faces turn toward you in perfect unison. Rain streams down their featureless eyes. Fungal crowns pulse with synchronized light. They advance as one organism.

Her voice shifts - pride replacing analysis.

rhea: "Nineteen confirmed kills. They will remember this."

The circle closes. Blades rise like a steel forest. Rain drums on your helmet as you drop the empty rifle. Somewhere in the ruins, metal groans against metal - the death song of a dead world.

rhea: "You fought well, my dear. It has been my honor."

Twenty-eight blades descend as one.

>
```


## Distance, Range, and Gap-Closing

### The Fundamental Constraint

**Everything in this world has mass.** This single constraint drives all movement, positioning, and tactical decisions through pure physics rather than arbitrary game mechanics.

### Integration-Based Movement

Movement in Flux operates on the principle that **distance = ∫ velocity(t) dt** - the area under the velocity-time curve. The system uses numerical integration to calculate position from velocity curves, making every meter traveled the result of solving calculus problems in real-time.

```typescript
// Distance calculated through integration, not direct kinematic equations
for (let t = 0; t < time; t += integrationStep) {
  const currentVelocity = calculateVelocity(acceleration, t, terminalVelocity);
  const nextVelocity = calculateVelocity(acceleration, t + integrationStep, terminalVelocity);

  // Trapezoidal rule: area = (v1 + v2) * dt / 2
  const deltaDistance = (currentVelocity + nextVelocity) * integrationStep / 2;
  totalDistance += deltaDistance;
}
```

### Actor Configuration Examples

Combat engagements typically begin at 100m range. Consider two actors competing for a contested objective:

**Scout Configuration**:
- **Mass**: 60kg (minimal gear)
- **Power Output**: 6,400W
- **Terminal Velocity**: 80 m/s
- **Time to 100m**: ~5.3 seconds

**Heavy Configuration**:
- **Mass**: 200kg (heavy armor + weapons)
- **Power Output**: 6,400W
- **Terminal Velocity**: 80 m/s
- **Time to 100m**: ~9.7 seconds

### The Physics Revelation

When we plot velocity curves and integrate them:

**Scout advantage**: Reaches peak velocity faster due to superior power-to-mass ratio, covers distance through high-velocity sustained phase.

**Heavy limitation**: Same power output but significantly higher mass creates much lower acceleration, requiring longer time to cover distance.

**Mathematical inevitability**: The integration reveals that the Scout reaches the objective **4.4 seconds earlier** - a decisive tactical advantage determined purely by physics, not game balance decisions.

### Tactical Implications

This system creates **authentic tactical trade-offs**:
- **Light configurations** excel at gap-closing and repositioning
- **Heavy configurations** require positional discipline and range management
- **Victory often determined** before the first shot through superior understanding of velocity integrals

Players who grasp the integration relationship gain genuine competitive advantage, making physics literacy a core combat skill rather than memorizing arbitrary movement rules.

## Damage Types

`kinetic`

- Any kind of physical contact, including melee attacks.
- Any kind of ranged kinetic energy penetrator, including bullets, arrows, and weapons like gauss rifles.

`thermal`

- Any kind of flame-based or heat-based weapon, including flamethrowers, plasma weapons, and lasers. These weapons deal damage through *heat* effects.

`explosive`

- Any kind of explosive weapon, including grenades, bombs, and mines. These weapons deal damage through *pressure* effects.


## Momentum-Based Damage: Physics as Weapon

### The Kinetic Energy Transfer Principle

When a shell strikes with a melee weapon while in motion, the total damage delivered combines the weapon's base striking power with the kinetic energy of the moving shell. This creates authentic physics-based combat where velocity becomes a tactical resource.

**Momentum Damage Formula:**
```
Total Damage = Base Weapon Damage + (Shell Velocity × Shell Mass × Momentum Coefficient)
```

### Tactical Applications

**Scout Kinetic Strikes**: A 60kg scout moving at 80 m/s delivers devastating momentum damage - transforming the entire shell into a precision projectile that strikes with the force of its accumulated velocity.

**Heavy Charging**: Even slower heavies gain significant momentum bonus - a 200kg shell moving at 30 m/s transfers crushing kinetic energy through sheer mass multiplication.

**Inertial Drive Mastery**: Scouts with inertial drives can maintain full approach velocity until the moment of impact, then instantly reduce effective mass for stopping - maximizing kinetic energy transfer while minimizing deceleration vulnerability.

### Velocity Awareness System

**Real-Time Velocity Display**: Players see their current velocity at all times, enabling accurate mental modeling of momentum damage potential. Understanding that approach speed directly translates to strike force creates tactical decision-making around movement and timing.

**Physics Transparency**: The system shows players exactly how their movement choices affect combat effectiveness, making velocity management a core skill rather than a hidden mechanic.

This transforms melee combat from simple weapon swinging into **kinetic energy management** where movement, mass, and timing combine through authentic physics to determine strike effectiveness.
