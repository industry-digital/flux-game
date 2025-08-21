# Combat Sequence

## Normative Case
- No stealth
- Both actors are in the same Place and can see each other

```mermaid
sequenceDiagram
    actor Bob as Bob (Client)
    actor Alice as Alice (Client)
    participant XMPP as XMPP Server
    participant WS as World Server
    participant DB as Database

    Note over Bob: Bob generates UUID locally
    Bob->>XMPP: ATTACK Alice
    XMPP->>WS: ATTACK Alice (from Bob)

    Note over WS: Contextualization Stage
    WS->>DB: Load fragments: Bob, Alice, Room
    DB->>WS: Return entity fragments

    Note over WS: Projection Stage
    WS->>WS: Assemble Bob & Alice entities
    WS->>WS: Check: same room, line of sight, etc.

    Note over WS: Transformation Stage
    WS->>WS: Pure function: initiate_combat(Bob, Alice)
    WS->>WS: Generate combat session UUID
    WS->>WS: Roll initiative dice
    WS->>WS: Create combat session entity
    WS->>WS: Place actors on linear battlefield

    Note over WS: Planning Stage
    WS->>WS: Plan DB mutations: combat session fragments
    WS->>WS: Plan XMPP events: COMBAT_STARTED

    Note over WS: Actuation Stage
    WS->>DB: Atomic write: combat session fragments
    DB->>WS: Write confirmed

    WS->>XMPP: COMBAT_STARTED {session_id, participants, turn_order} (pubsub)
    XMPP->>Bob: COMBAT_STARTED event
    XMPP->>Alice: COMBAT_STARTED event
    XMPP->>WS: COMBAT_STARTED event (for observers)

    Note over Bob,Alice: Both clients now know they're in combat
    Note over Bob,Alice: Turn-based phase begins

    alt Bob's turn (initiative winner)
        Bob->>XMPP: STRIKE Alice
        XMPP->>WS: STRIKE Alice (from Bob)

        Note over WS: Context: Load combat session + participants
        WS->>DB: Load combat fragments by session_id
        DB->>WS: Return combat state + actor states

        Note over WS: Transform: Physics calculations
        WS->>WS: Validate: Bob's turn, has AP, in range
        WS->>WS: Calculate: energy expenditure, damage
        WS->>WS: Roll: hit/miss dice
        WS->>WS: Apply: damage, AP consumption, turn end

        Note over WS: Plan & Actuate
        WS->>DB: Update: combat state, actor health/energy
        WS->>XMPP: STRIKE_RESULT {damage, new_states} (pubsub)

        XMPP->>Bob: STRIKE_RESULT event
        XMPP->>Alice: STRIKE_RESULT event
    end

    Note over WS: Turn advances to Alice automatically
    WS->>XMPP: TURN_STARTED {actor: Alice} (pubsub)

    Alice->>XMPP: DEFEND
    Note over WS: Alice spends remaining AP on defense...
```

## Key Architectural Benefits

**Unified Command Flow**: All commands flow through the same OLTP pipeline regardless of whether they're combat or non-combat actions.

**Automatic Session Management**: World Server detects when actors are in combat and routes commands appropriately - no client session tracking needed.

**Natural Spatial Integration**: Combat happens within existing XMPP room structure with no separate spatial authority.

**Consistent Performance**: Combat benefits from O(1) batch processing and your proven fragment-based storage system.

**Pure Functional Core**: Combat physics calculations happen in the Transformation stage as pure functions, maintaining your architectural principles.

## Client Simplification

Clients send domain-appropriate commands without session management:
- `ATTACK Alice` (World Server creates session if needed)
- `STRIKE Alice` (World Server knows Bob is in combat with Alice)
- `DEFEND` (World Server applies to current combat session)
- `DODGE` (World Server handles timing and mechanics)

The World Server maintains all combat state as entity fragments and coordinates turn-based flow through the existing event system.
