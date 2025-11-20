---
title: Party System
description: Team up with friends to explore and fight together!
---

# Party System

## What's a Party?

A **party** is your squad of up to **3 players** who adventure together!

**Rules**
- Parties are limited to 3 players.
- You can only be in one party at a time.
- The person who starts the party becomes the party leader.
- Everyone fights together as a team in combat.

## How Parties Work

When you create a party, you automatically become the leader. As the leader, you can:

- Invite new people to join
- Kick people out if needed
- Disband the whole party

## Creating and Joining Parties

### Basic Commands

```text
> party invite <player>    # Invite someone (leaders only)
> party accept <leader>    # Accept an invitation
> party reject <leader>    # Decline an invitation
> party leave              # Leave your current party
> party status             # View party info
```

### Example: Starting Your First Party

**Alice wants to adventure with Bob and Charlie:**

```
> party invite bob
You invited Bob to join your party!

> party invite charlie
You invited Charlie to join your party!
```

**Bob receives the invitation:**
```
Alice has invited you to join her party.
To accept: `party accept alice`
To reject: `party reject alice`
```

**Bob decides to join:**
```
> party accept alice
You have joined Alice's party.
```

**Charlie decides to pass:**
```
> party reject alice
You have declined Alice's invitation.
```

Now Alice and Bob are partied up and ready to go!

### Invitation Rules (The Fine Print)

- Invitations expire in 1 minute
- You can only be in one party
- Only party leaders can invite

## Managing Your Party

### Leader Commands

As a party leader, you have some extra powers:

```text
> party kick <player>      # Remove someone from the party
> party disband            # Dissolve the entire party
```

### What Leaders Can Do

**Kick Members:** Sometimes you need to remove someone from the party. They'll get notified when this happens.

**Disband the Party:** This completely destroys the party and kicks everyone out. Use this when you're done adventuring together.

**Check Status:** Use `party status` to see who's in your party. As the leader, you'll also see any pending invitations that regular members can't see.

### What Happens to Leadership?

**If the leader leaves:** Leadership automatically goes to whoever's been in the party longest. No voting required!

**If the leader gets kicked by an admin:** The whole party gets disbanded. No party can exist without a leader.

**Can you give leadership to someone else?** Nope! Leadership only transfers when the current leader leaves.

## Checking Your Party Status

Everyone in the party can use `party status` to see who's currently in the group:

```
> party status
★ Alice (Party Leader)
  Bob
  Charlie
```

**If you're the party leader,** you'll also see any pending invitations:

```
> party status
★ Alice (Party Leader)
  Bob
  Charlie

Invitations:
David            30 seconds ago
Emma             1 minute ago
```

**If you're a regular member,** you only see the member list. Leaders keep invitation details private until people join.

## Behind the Scenes

### Automatic Housekeeping

The game automatically keeps things tidy:

- **Old invitations disappear** after 1 minute (no clutter!)
- **Empty parties get cleaned up** if they've been sitting around with no activity
- **Solo parties** that are old and have no pending invites get automatically disbanded

### What Happens When Things Go Wrong?

The system is pretty smart about handling mistakes:

- **Invite someone already in your party?** Nothing happens (no spam)
- **Try to invite someone who's already in another party?** You'll get an error message
- **Try to accept an expired invitation?** Won't work - you'll need a fresh invite
- **Try to do something with a player who doesn't exist?** Clear error message

## How Parties Work with Other Systems

### Combat

When you're in a party, you fight as a team! If any party member starts a fight or gets attacked, the whole party enters combat together.

### Exploration

Party members can spread out and explore different areas while staying in the same party. You don't have to stick together like glue, but you still get all the party benefits.

### Notifications

The game keeps track of everything that happens with your party:

- When someone joins or leaves
- When invitations are sent or expire
- When an invitation fails because the player is already in a party
- When the party gets disbanded

---

[Learn about Combat →](../combat/encounters/)
