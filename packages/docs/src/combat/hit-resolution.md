# Hit Resolution

When you strike an opponent, success depends on a contested resolution between your attack capability and their evasion ability. The system balances character statistics, skill development, and tactical positioning to create meaningful combat outcomes.

## Core Mechanics

### Attack vs Evasion

Every strike attempt resolves through a rating comparison:

- Your attack rating determines offensive capability
- Their evasion rating determines defensive capability
- The difference between your attack and their evasion determines the probability of a successful hit

### Base Resolution

When attack and evasion ratings are perfectly equal, defenders succeed in avoiding strikes 33% of the time.

$$\text{Equal Ratings} = 33\% \text{ evasion chance}$$

### What Happens When Ratings Are Different

**If your evasion is higher**: Your dodge chance goes up in a straight line. For every 10 points higher your evasion is, you get about 13% better at dodging. At 50 points higher, you dodge almost everything.

**If your evasion is lower**: Your dodge chance drops fast. Being behind by even 10-15 points makes you much easier to hit. At 50 points lower, you will dodge almost nothing.

## How Your Evasion Rating Works

Your evasion rating comes from two things: your training (33%) and your shell's physical stats (67%).

### Training Part (33% of your rating)

**How it works**: You have 100 skill levels you can train. Each level gives you the same incremental boost to evasion.

**Why it matters**: No matter what kind of shell you have, training always helps the same amount. Even if you have a heavy, slow shell, you can still get decent evasion just by training hard.

### Shell Stats Part (67% of your rating)

**Power-to-Mass Ratio**

The game calculates how much power you have compared to your mass. More power + less mass = better evasion.

Finesse doesn't just make you accelerate faster, it also reduces your shell's effective mass for inertial calculations. So even a heavy character can dodge well if the shell has high Finesse.

**High Mass Penalty**

Heavy shells are much harder to make evasive. If you carry tons of equipment, you'll need very high Power and Finesse to dodge well.
