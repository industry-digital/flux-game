---
title: Party Mechanics
description: Formation, management, and coordination of tactical groups in FSP.
---

# Party Mechanics

## Core Concepts

A **party** consists of up to three actors who travel together through the world and fight as a unified force in combat encounters. The system enforces a strict invariant: **an actor may not be in more than one party at any given time**.

The **party owner** is automatically assigned to the first actor who joins the party. The owner has administrative privileges including the ability to invite new members, remove existing members, and disband the party.

**Party formation** follows a structured invitation workflow where actors must be invited and explicitly accept before joining. Invitations expire after one minute if not responded to, maintaining system cleanliness and preventing stale invitation accumulation.

## Party Formation

Party formation follows a structured invitation workflow that ensures all members explicitly consent to joining. Only party owners may extend invitations to new members.

### Invitation Workflow

The party system operates through a formal invitation process:

```text
> party invite <actor>    # Send invitation (owner only)
> party accept <leader>   # Accept pending invitation
> party reject <leader>   # Decline pending invitation
> party leave             # Leave current party
```

### Example: Creating a Party

*Alice starts a party and invites Bob and Charlie*
```
> party invite bob
You have invited Bob to join your party.

> party invite charlie
You have invited Charlie to join your party.
```

*Bob accepts Alice's invitation*
```
> party accept alice
You have accepted Alice's invitation to join her party.
Bob has joined the party.
```

*Charlie rejects the invitation*
```
> party reject alice
You have declined Alice's invitation.
Charlie has declined to join the party.
```

### Invitation Rules

- **Timeout**: Invitations automatically expire after one minute
- **Exclusivity**: Actors cannot be invited to multiple parties simultaneously
- **Owner Privilege**: Only the party owner may invite new members
- **Explicit Consent**: All membership changes require explicit acceptance
- **Size Limits**: Parties are limited to three members.

## Party Management

The party owner maintains administrative control over party membership and structure. Owners have several management capabilities that do not require consent from other members.

### Administrative Commands

```text
> party kick <actor>     # Remove member from party (owner only)
> party disband          # Dissolve entire party (owner only)
> party list             # View party roster (all members)
> party invitations      # View pending invitations (owner only)
```

### Member Management

**Removing Members**: Party owners may remove any member without consent. The removed actor's party affiliation is immediately cleared, and they receive notification of their removal.

**Disbanding Parties**: Owners may dissolve the entire party structure, immediately removing all members and canceling any pending invitations. This action cannot be undone.

**Viewing Status**: All party members may view the current roster, showing member names and their current status. Party owners additionally see pending invitations and their timestamps.

### Ownership Transfer

Party ownership automatically transfers under specific conditions:
- If the owner leaves voluntarily, ownership passes to the longest-standing member
- If the owner is removed by administrative action, the party is automatically disbanded
- Ownership cannot be manually transferred between members

## System Behavior

### Automatic Cleanup

The party system maintains data integrity through automatic cleanup mechanisms:

- **Expired Invitations**: Invitations older than one minute are automatically removed when the party is accessed
- **Stale References**: Actor party affiliations are validated and corrected during party operations
- **Consistency Checks**: The system ensures bidirectional consistency between actor records and party membership

### Error Handling

The party system provides clear feedback for invalid operations:

- Attempting to invite existing members results in no-op behavior
- Inviting actors already in other parties generates appropriate error messages
- Operations on non-existent parties or actors fail with descriptive errors
- Expired invitations cannot be accepted or rejected

### Performance Characteristics

- **Zero-Copy Operations**: Party data access uses direct references with readonly constraints
- **Lazy Cleanup**: Expired invitations are removed on-demand rather than via background processes
- **Idempotent Operations**: Repeated invitations or membership operations are safe and predictable

## Integration Points

### Combat System

Parties function as tactical units during combat encounters. All party members automatically participate when any member initiates or becomes targeted by combat actions. The combat system treats parties as unified combatant groups.

### Movement System

Party coordination during movement and exploration maintains group cohesion while allowing individual agency. Members may separate temporarily while retaining party membership benefits.

### Event System

Party operations generate appropriate events for logging, notifications, and integration with other game systems. All membership changes, invitations, and administrative actions produce trackable events.

[Combat Encounters](../combat/encounters/)
