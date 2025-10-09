# Workbench Operations

## Core Concepts

The **Workbench** serves as the primary interface between consciousness and shell architecture. This pre-Collapse fabrication system enables direct neural connection for shell modification, component integration, and arsenal management across your shell portfolio.

**Neural interface** establishes direct connection between Core consciousness and the Workbench's fabrication systems. This diegetic interface transforms shell customization from abstract menu navigation into visceral technological communion where consciousness chooses how to inhabit artificial form.

**Shell arsenal** management allows ownership of up to three shells simultaneously with free switching between configurations, *at the Workbench*. Each shell represents a specialized tactical approach optimized for different mission requirements and resource allocation strategies.

## Workbench Access

Consciousness must be co-located with the Workbench object in the game world to establish neural connection. The fabrication chamber provides holographic interface systems and robotic fabrication arms for real-time shell modification.

```text
> use workbench
```

The neural interface throne establishes connection through ports that align with shell interface hardware. Consciousness connects directly to fabrication systems, enabling manipulation of shell architecture through thought and gesture within the holographic projection environment.

## Arsenal Management

The Workbench exposes an interface for you to manage your shell arsenal. You can issue commands like:

### Commands

### Shell Management

```text
> shell list  # A list of all your shells
> shell status  # Detailed information about your current shell
> shell swap <name_of_shell>  # Transfer consciousness to a different shell
> shell swap <name_of_shell> --force  # Force transfer, discarding pending changes
> shell rename <shell_name> <new_shell_name>  # Renames the shell
```

**Note**: Shell switching normally requires a clean working state. Any pending modifications must be committed or reverted before consciousness can transfer to a different shell configuration. Use the `--force` flag to override this safety check and discard pending changes during transfer.

### Shell Stats

These commands work only on your currently equipped shell.

```text
> shell stats add POW|FIN|RES <increment>
> shell stats remove POW|FIN|RES <increment>
> shell diff        # Preview pending changes
> shell commit      # Commit all pending shell changes
> shell undo        # Revert all pending changes
```

*Example*
```text
> shell stats
[FIN 10, POW 10, RES 10]

> shell stats add fin 2
[FIN 10 -> 12, -20 scrap]

> shell stats remove fin 1
[FIN 12 -> 11, +10 scrap]

> shell stats add pow 1
[POW 10 -> 11, -10 scrap]

> shell diff
[FIN 10 -> 11]
[POW 10 -> 11]

> shell commit
[FIN 10 -> 11]
[POW 10 -> 11]
[Scrap: -20]
[Shell modifications applied]

> shell stats
[FIN 11, POW 11, RES 10]
```

*Failure cases*
```text
> shell stats add fin 100
[ERROR: Insufficient scrap]

> shell stats add pow 5
> shell commit
[ERROR: Insufficient scrap]

> shell stats add fin 2
> shell swap combat_shell
[ERR: Uncommitted changes - Use 'shell commit' or 'shell undo' first]

> shell swap combat_shell --force
[WARNING: Neural interface severed during consciousness transfer. Pending shell modifications discarded.]
[Consciousness successfully transferred to shell combat_shell.]

> transfer rare_component to shell
> exit
[ERR: Uncommitted changes - Use 'shell commit' or 'shell undo' first]
```

**Shell switching** transfers consciousness between different configurations through the neural interface. The system performs comprehensive diagnostics on target shells, identifying maintenance requirements or performance degradation before executing consciousness transfer protocols.

**Portfolio optimization** requires strategic resource allocation across your arsenal. Rare components and materials must be distributed to maximize overall tactical capability while managing risk exposure during dangerous missions.

## Shell Modification

Direct stat manipulation occurs through neural interface connection with the Workbench's optimization systems. Consciousness allocates enhancement points and redistributes capabilities across the three primary shell attributes.

**Power (POW)** represents raw physical capability and the capacity to perform work over time. **Finesse (FIN)** encompasses agility, precision, and speed characteristics.
**Resilience (RES)** determines energy capacity, recovery rates, and resistance to damage.

Stat modifications remain pending until committed through the interface. The `shell commit` command applies all pending changes atomically - both stat modifications and component installations. The `shell undo` function allows consciousness to revert all changes before finalizing shell configuration, enabling experimentation with different optimization approaches.

## Component Integration

Physical shell modification occurs through the component mounting system, which manages specialized hardware installation and removal across chassis upgrade slots.

```text
> shell component list
> shell component examine <component_name>
> shell component mount <component_name>
[Mounted component_name]
[Power Draw increased by 10W]
> shell component unmount <component_name>
[Unmounted component_name]
[Power Draw decreased by 10W]

```

**Component examination** provides detailed analysis of hardware specifications, compatibility matrices, and performance characteristics. The interface displays condition ratings, efficiency percentages, and integration requirements for informed installation decisions.

**Mounting procedures** involve robotic fabrication arms performing actual physical modifications under neural interface guidance. Component installation affects shell capabilities, power consumption, and structural integrity based on chassis architecture and available upgrade slots.

## The Vault

The Vault is a secure storage facility that you can access from the Workbench.

## Vault Operations

The Workbench provides access to your consciousness vault - secure storage that survives shell destruction and enables strategic loadout management across your shell arsenal.

```text
> transfer <item> to shell     # Deploy vault resources to current shell
> transfer <item> to vault     # Secure shell items in consciousness storage
> inventory vault              # View vault contents
> inventory shell              # View current shell inventory
```

**Vault storage** contains persistent resources that belong to your consciousness: raw materials, rare components, consumables, and valuable equipment kept secure from mission risks.

**Shell storage** contains tactical loadouts deployed with specific shells: weapons, tools, mission equipment, and expendable resources that provide operational capability but face destruction risk.

**Transfer operations** enable strategic resource deployment by moving items between vault security and shell accessibility. Vault resources become at-risk when transferred to shells but provide immediate operational capability.

## Resource Management

The Workbench maintains comprehensive inventory systems for components, materials, and fabrication resources required for shell construction and modification.

```text
> inventory components
> inventory materials
> workbench status
```

**Component inventory** displays available hardware with condition assessments and compatibility information. Salvaged parts, refined materials, and fabricated components appear in organized arrays with detailed specifications for tactical planning.

**Material resources** include common salvage, refined alloys, and rare pre-Collapse technology required for different shell tiers. Resource allocation decisions determine upgrade potential and specialization depth across your three-shell arsenal.

## Specialization Strategies

Shell portfolio management requires strategic approaches to resource distribution and tactical role assignment based on mission requirements and material availability.

**Balanced portfolio** maintains three medium-capability shells covering different tactical roles through even resource distribution. This approach provides tactical flexibility while limiting individual shell performance potential.

**Elite specialization** concentrates rare materials and components into one superior shell while maintaining basic backup configurations. This strategy maximizes single-shell capability at the cost of portfolio redundancy.

**Adaptive deployment** optimizes shell configurations based on upcoming expedition requirements and threat assessments. This approach requires frequent reconfiguration but enables mission-specific optimization.

## Performance Tiers

Shell capabilities scale with component quality and material investment, creating distinct performance categories based on resource allocation and fabrication complexity.

**Basic shells** utilize common salvage and standard components for functional but limited performance. These configurations provide reliable operation with minimal resource investment, suitable for low-risk operations and backup roles.

**Advanced shells** incorporate refined materials and improved systems for enhanced specialized performance. These configurations require deeper territory exploration and community workshop access for component acquisition.

**Elite shells** demand rare piezoelectric crystals and exotic pre-Collapse technology for maximum capability. These configurations represent significant resource investment with correspondingly high performance potential and risk exposure.

[Shell Architecture](../shell/index.md)
