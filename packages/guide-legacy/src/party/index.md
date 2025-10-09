# Party Mechanics

## Core Concepts

A **party** consists of up to three actors who travel together through the world and fight as a unified force in combat encounters. Party formation requires explicit invitation and acceptance between actors.

The **party leader** initiates party formation by inviting other actors. Only the leader may extend invitations; party membership requires the leader's direct approval through the invitation system.

**Party members** maintain one of two states:

- `PENDING` indicates a pending invitation
- `MEMBER` confirms active party membership

## Party Formation

Actors form parties through a structured invitation process. The initiating actor becomes the party leader and may invite up to two additional members.

```text
> party invite <actor>
```

Invited actors must explicitly accept or reject the invitation before joining the party.

```text
> party accept <actor>
> party reject <actor>
```

Party members may voluntarily leave at any time using the departure command.

```text
> party leave
```

## Party Management

The party leader maintains administrative control over party membership and structure. Leaders may remove members from the party without requiring consent from the departing member.

```text
> party kick <actor>
```

Party leaders may dissolve the entire party, immediately removing all members and ending the party structure.

```text
> party disband
```

All party members may view current party composition and member status using the party roster command.

```text
> party list
```

## Movement Coordination

Party members automatically follow the leader's movement by default. When the leader moves to an adjacent room, all party members in the same location move together.

```text
> north
You move north. Bob and Charlie follow.
```

Members may temporarily separate from the party leader by moving independently to different rooms. This maintains party membership while suspending automatic following behavior.

Party members who separate from the leader may resume automatic following by using the `FOLLOW` command while in the same room as the party leader.

```
> follow
You are now following the party leader.
```

## Combat Integration

Parties function as tactical units during combat encounters. All party members automatically participate when any member initiates or becomes targeted by combat actions. Combat mechanics treat the entire party as a single combatant group opposing enemy parties.

[Combat Encounters](../combat/encounters.md)
