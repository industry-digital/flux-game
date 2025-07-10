# Crafting System

## Overview

The crafting system in Flux transforms raw resources into useful items through a structured **3x3 crafting hierarchy**. This system reflects the post-collapse reality where creating functional items requires combining materials from multiple sources and ecosystems, encouraging exploration, trade, and community specialization.

## Design Philosophy

### The 3x3 Crafting Rule

**Universal Structure:**
- All **finished goods** require exactly **3 unique components**
- Each **component** requires exactly **3 unique sub-components**
- This creates a 9-resource foundation for every useful item

**Complexity Through Combination:**
The 3x3 rule ensures that creating useful items requires accessing multiple resource types and ecosystems, driving the core gameplay loops of exploration, trade, and community cooperation.

### Resource Type Integration

**Flora and Elemental Foundation:**
- **Sub-components** are primarily raw materials from places (flora and elemental resources)
- **Components** combine raw materials through basic processing and crafting skills
- **Finished goods** represent complex items requiring multi-ecosystem resource access

**Monster Material Integration:**
- Animal-derived materials (leather, bone, sinew) from monster interactions integrate as sub-components
- These materials cannot be obtained from places, requiring active engagement with dangerous fauna
- Creates dynamic tension between safe resource gathering and risky monster encounters

### Post-Collapse Crafting Reality

**Fragmented Knowledge:**
No single community possesses complete crafting knowledge. Creating complex items requires:
- **Preserved expertise** from different specialist communities
- **Observational learning** from skilled craftspeople
- **Experimental combination** of fragmented pre-collapse knowledge

**Resource Scarcity Economics:**
The 3x3 system creates natural economic pressures:
- **Regional specialization** based on ecosystem resource availability
- **Trade dependencies** for accessing all required sub-components
- **Cooperative crafting** where communities must work together for complex items

## Crafting Hierarchy Structure

### Finished Goods (Tier 3)
**Definition:** Complete, functional items ready for use
**Requirements:** 3 unique components + assembly knowledge
**Examples:** Weapons, tools, clothing, containers, medicines

### Components (Tier 2)
**Definition:** Processed assemblies that combine multiple raw materials
**Requirements:** 3 unique sub-components + crafting skills
**Examples:** Blade assemblies, fabric panels, ceramic vessels

### Sub-Components (Tier 1)
**Definition:** Raw materials and basic processed items
**Sources:**
- Flora resources from places (fibers, woods, seeds)
- Elemental resources from places (metals, stones, minerals)
- Animal materials from monsters (leather, bone, sinew)
- Basic processing (smelting, weaving, carving)

## Example Crafting Chains

### Weapon Crafting: Copper Axe

**Finished Good:** `flux:weapon:axe:copper`
**Components Required:**
1. **Blade Assembly** (sharp metal cutting edge)
2. **Handle Assembly** (grip and structural support)
3. **Binding Assembly** (secure attachment system)

**Component Breakdown:**

**Blade Assembly:**
- `flux:mineral:copper` (raw metal ore)
- `flux:material:charcoal` (smelting fuel)
- `flux:knowledge:metallurgy` (processing expertise)

**Handle Assembly:**
- `flux:material:wood:oak` (hardwood shaft)
- `flux:material:leather:hide` (grip wrapping)
- `flux:material:oil:pine` (wood preservation)

**Binding Assembly:**
- `flux:material:fiber:yucca` (strong cordage)
- `flux:material:resin:pine` (adhesive bonding)
- `flux:material:metal:copper_wire` (reinforcement)

**Total Requirements:** 9 unique sub-components from 3 ecosystems + monster materials

### Tool Crafting: Foraging Basket

**Finished Good:** `flux:tool:basket:foraging`
**Components Required:**
1. **Weave Assembly** (structural basket framework)
2. **Lining Assembly** (protective interior layer)
3. **Closure Assembly** (secure lid or cover system)

**Component Breakdown:**

**Weave Assembly:**
- `flux:material:fiber:grass` (flexible weaving material)
- `flux:material:fiber:yucca` (structural reinforcement)
- `flux:knowledge:basketry` (weaving techniques)

**Lining Assembly:**
- `flux:material:leather:soft` (interior protection)
- `flux:material:fiber:cotton` (cushioning layer)
- `flux:material:wax:beeswax` (waterproofing)

**Closure Assembly:**
- `flux:material:wood:birch` (rigid frame elements)
- `flux:material:bone:carved` (toggle fasteners)
- `flux:material:sinew:twisted` (flexible hinges)

**Total Requirements:** 9 unique sub-components from multiple ecosystems + monster materials

### Medicine Crafting: Healing Compound

**Finished Good:** `flux:medicine:healing_compound`
**Components Required:**
1. **Active Ingredient Base** (primary healing agents)
2. **Delivery System** (application method)
3. **Preservation System** (stability and shelf life)

**Component Breakdown:**

**Active Ingredient Base:**
- `flux:ingredient:bark:willow` (pain relief)
- `flux:ingredient:gel:aloe` (wound healing)
- `flux:ingredient:root:sansam` (system support)

**Delivery System:**
- `flux:material:fat:rendered` (salve base)
- `flux:material:alcohol:distilled` (tincture solvent)
- `flux:material:fiber:cotton` (application pads)

**Preservation System:**
- `flux:material:wax:beeswax` (protective coating)
- `flux:material:salt:purified` (antimicrobial)
- `flux:container:glass:vial` (sterile storage)

**Total Requirements:** 9 unique sub-components from multiple ecosystems + processing knowledge

## Crafting Skill Integration

### Knowledge Requirements

**Observational Learning:**
- Complex crafting requires witnessing skilled craftspeople
- Master-apprentice relationships for advanced techniques
- Community knowledge sharing for specialized processes

**Skill Categories:**
- **Material Processing:** Smelting, weaving, carving, distillation
- **Assembly Techniques:** Joining, binding, fitting, balancing
- **Quality Control:** Testing, finishing, preservation, repair

### Community Specialization

**Regional Expertise:**
- **Mountain communities:** Metallurgy, stone working, mining techniques
- **Forest communities:** Woodworking, medicine preparation, fiber processing
- **Grassland communities:** Agriculture, food preservation, textile production

**Trade Dependencies:**
- No single community can create all components independently
- Specialization creates natural trade relationships
- Complex items require multi-community cooperation

## Resource Ecosystem Integration

### Place-Based Resources

**Flora Resources:** (Renewable, seasonal)
- Provide fibers, woods, seeds, medicinal ingredients
- Availability affected by weather and seasonal cycles
- Sustainable harvesting practices required

**Elemental Resources:** (Finite, geological)
- Provide metals, stones, minerals, salts
- Slow regeneration rates require careful management
- Processing requires significant skill and equipment

### Monster-Based Resources

**Animal Materials:** (Dangerous, unpredictable)
- Provide leather, bone, sinew, fats, specialized organs
- Require successful monster encounters and processing
- Create dynamic tension between safety and resource needs

**Integration Strategy:**
- Animal materials fill specific niches that plant/mineral resources cannot
- Monster encounters become essential for advanced crafting
- Risk-reward balance for accessing high-quality animal materials

## Economic Implications

### Scarcity-Driven Trade

**Resource Distribution:**
- Different ecosystems provide different sub-components
- No single location can supply all 9 components for complex items
- Creates natural exploration incentives and trade relationships

**Value Chains:**
- **Tier 1 (Sub-components):** Basic materials, low processing
- **Tier 2 (Components):** Specialized knowledge, moderate risk
- **Tier 3 (Finished goods):** Master craftsmanship, high coordination

### Settlement Strategy

**Resource Access:**
- Settlements near ecosystem boundaries access more sub-components
- Strategic locations control trade routes for crafting materials
- Communities specialize in components they can efficiently produce

**Cooperation Incentives:**
- Complex crafting requires multi-community collaboration
- Shared knowledge and resources create mutual dependencies
- Collective crafting projects strengthen inter-community relationships

## Gameplay Mechanics

### Crafting Process

**Discovery Phase:**
- Learn crafting recipes through observation and experimentation
- Identify required components and their sub-component sources
- Plan resource gathering expeditions across multiple ecosystems

**Gathering Phase:**
- Collect 9 unique sub-components from various sources
- Navigate territorial dangers for place-based resources
- Engage monsters for animal-derived materials

**Assembly Phase:**
- Combine sub-components into components (requires processing skills)
- Combine components into finished goods (requires assembly knowledge)
- Test and refine the finished product

### Skill Development

**Crafting Progression:**
- **Novice:** Basic sub-component processing
- **Apprentice:** Component assembly techniques
- **Journeyman:** Finished good creation
- **Master:** Innovation and quality improvement

**Learning Methods:**
- **Observation:** Watch skilled craftspeople work
- **Practice:** Repeated attempts improve success rates
- **Experimentation:** Discover new recipes and techniques
- **Teaching:** Share knowledge with community members

## Integration with Other Systems

### Weather System

**Resource Availability:**
- Weather affects flora resource generation rates
- Seasonal patterns influence crafting planning
- Extreme weather can interrupt long-term crafting projects

### Combat System

**Equipment Durability:**
- Crafted items degrade through use and environmental exposure
- Repair requires sub-components and appropriate skills
- Quality of crafting affects item durability and performance

### Social System

**Community Crafting:**
- Large projects require coordinated community effort
- Crafting specialization creates social roles and status
- Knowledge sharing strengthens community bonds

## Future Extensions

### Advanced Crafting

**Quality Variations:**
- Master craftspeople can create superior versions of items
- Quality depends on sub-component quality and crafter skill
- Exceptional items provide enhanced performance benefits

**Innovation System:**
- Experimental crafting can discover new recipes
- Failed experiments provide learning opportunities
- Community knowledge accumulates over time

### Specialized Facilities

**Workshop Requirements:**
- Complex crafting may require specialized tools and facilities
- Communities invest in shared crafting infrastructure
- Facility quality affects crafting success rates and possibilities

This crafting system creates a rich web of interdependencies that drive exploration, trade, and community cooperation while maintaining the post-collapse survival atmosphere and realistic resource constraints of the Flux world.

---

# Comprehensive Resource Catalog

## Sub-Component Tier (Tier 1)

### Flora Resources (Place-Based, Weather-Dependent)

**Temperate Climate Flora:**
- `flux:ingredient:fruit:berries` - Sweet berries, affected by precipitation and temperature
- `flux:material:fiber:cotton` - Soft plant fibers, requires moderate temperatures and rainfall
- `flux:ingredient:bark:willow` - Medicinal bark, thrives in high humidity conditions

**Arid Climate Flora:**
- `flux:ingredient:fruit:cactus` - Water-rich fruits, enhanced by temperature extremes
- `flux:material:fiber:yucca` - Tough desert fibers, drought-resistant
- `flux:ingredient:gel:aloe` - Healing gel, concentrated during dry periods

**Grassland Biome Flora:**
- `flux:ingredient:grain:wheat` - Wild grains, seasonal availability based on weather
- `flux:material:fiber:grass` - Prairie grass fibers, affected by wind and rain
- `flux:ingredient:herb:sage` - Aromatic herbs, concentrated during dry spells

**Forest Biome Flora:**
- `flux:ingredient:seed:acorn` - Nutritious tree nuts, seasonal production
- `flux:material:wood:hardwood` - Dense timber, growth rate affected by weather
- `flux:ingredient:root:sansam` - Rare medicinal roots, slow-growing

**Mountain Biome Flora:**
- `flux:ingredient:seed:pine` - High-fat nuts, cold-adapted
- `flux:material:wood:softwood` - Coniferous timber, adapted to harsh conditions
- `flux:ingredient:moss:mountain` - Hardy mountain moss, thrives in extreme weather

### Elemental Resources (Place-Based, Geologically Determined)

**Basic Minerals:**
- `flux:mineral:salt` - Essential mineral from dried lake beds
- `flux:mineral:copper` - Malleable metal from mountain ore deposits
- `flux:material:stone:granite` - Durable stone from mountain bedrock
- `flux:mineral:iron` - Common metal from bog deposits and ore veins
- `flux:mineral:sulfur` - Volcanic mineral from geothermal areas

**Battery Metals (Advanced Technology):**
- `flux:mineral:lithium` - Lightweight reactive metal from salt brines and pegmatites
- `flux:mineral:nickel` - Corrosion-resistant metal from volcanic formations
- `flux:mineral:cobalt` - Magnetic metal from hydrothermal veins
- `flux:mineral:manganese` - Steel-hardening metal from sedimentary deposits
- `flux:mineral:cadmium` - Toxic but effective battery metal
- `flux:mineral:monazite` - Rare earth elements from weathered granite

**Processed Minerals:**
- `flux:material:charcoal` - Smelting fuel from controlled wood burning
- `flux:material:glass:raw` - Formed from high-temperature sand melting
- `flux:material:ceramic:clay` - Shaped and fired clay for containers
- `flux:material:lime` - Processed limestone for construction
- `flux:material:ash:wood` - Alkaline material from burned organic matter

### Animal Resources (Monster-Based, Dangerous to Obtain)

**Soft Animal Materials:**
- `flux:material:leather:hide` - Tanned animal skins for protection and binding
- `flux:ingredient:fat:rendered` - Processed animal fats for fuel and preservation
- `flux:material:sinew:twisted` - Strong animal tendons for cordage
- `flux:material:membrane:organ` - Waterproof membranes from internal organs
- `flux:material:fur:pelt` - Insulating animal fur for warmth

**Hard Animal Materials:**
- `flux:material:bone:*` - Shaped animal bones for tools and fasteners
- `flux:material:horn:*` - Curved animal horns for containers and tools
- `flux:material:antler:*` - Branched antlers for complex tool shapes
- `flux:material:tooth:*` - Predator teeth for cutting implements
- `flux:material:claw:*` - Hooked claws for gripping tools

**Specialized Animal Materials:**
- `flux:material:silk:*` - Strong protein fibers from animals like large arachnids
- `flux:material:chitin:*` - Armor-like material like the exoskeleton of arthropods
- `flux:material:scale:*` - Highly durable scales from apex predators
- `flux:material:venom:*` - Toxic secretions for weapons and medicine
- `flux:material:musk:*` - Scent materials for camouflage and signaling

### Pre-Collapse Salvage (Urban Ruins, Extremely Dangerous)

**Electronic Components:**
- `flux:salvage:circuit:processor` - Functional CPU chips from abandoned computers
- `flux:salvage:battery:cell` - Degraded battery cells from electronic devices
- `flux:salvage:wire:copper` - Insulated copper wire from buildings
- `flux:salvage:capacitor:ceramic` - Electronic components from circuit boards
- `flux:salvage:sensor:optical` - Light sensors from security systems

**Mechanical Components:**
- `flux:salvage:spring:steel` - Coiled steel springs from machinery
- `flux:salvage:bearing:ball` - Precision bearings from mechanical devices
- `flux:salvage:gear:metal` - Machined gears from abandoned equipment
- `flux:salvage:cable:steel` - High-strength steel cables from elevators
- `flux:salvage:magnet:rare_earth` - Powerful magnets from speakers and motors

**Chemical Materials:**
- `flux:salvage:plastic:polymer` - Durable plastics from containers and equipment
- `flux:salvage:rubber:synthetic` - Flexible rubber from tires and seals
- `flux:salvage:adhesive:industrial` - High-strength glues and epoxies
- `flux:salvage:solvent:chemical` - Cleaning and processing chemicals
- `flux:salvage:catalyst:metal` - Catalytic materials from industrial processes

## Component Tier (Tier 2)

### Structural Components

**Blade Assemblies:**
- `flux:component:blade:copper` - Requires: copper ore + charcoal + metallurgy knowledge
- `flux:component:blade:iron` - Requires: iron ore + charcoal + advanced metallurgy
- `flux:component:blade:composite` - Requires: metal core + bone edge + sinew binding

**Frame Assemblies:**
- `flux:component:frame:wooden` - Requires: hardwood + fiber binding + joinery skill
- `flux:component:frame:bone` - Requires: large bones + sinew + carving skill
- `flux:component:frame:metal` - Requires: metal sheets + rivets + metalworking

**Binding Assemblies:**
- `flux:component:binding:organic` - Requires: plant fibers + animal sinew + tree resin
- `flux:component:binding:synthetic` - Requires: salvaged polymers + adhesive + heat treatment
- `flux:component:binding:mechanical` - Requires: metal wire + springs + precision tools

### Functional Components

**Power Assemblies:**
- `flux:component:power:battery_basic` - Requires: lead + sulfuric acid + separator membrane
- `flux:component:power:battery_advanced` - Requires: lithium + electrolyte + polymer separator
- `flux:component:power:generator_manual` - Requires: copper wire + magnets + mechanical frame

**Control Assemblies:**
- `flux:component:control:mechanical` - Requires: gears + springs + precision bearings
- `flux:component:control:electronic` - Requires: circuits + sensors + power regulation
- `flux:component:control:organic` - Requires: neural tissue + preservation fluid + bio-interface

**Processing Assemblies:**
- `flux:component:processing:distillation` - Requires: copper tubing + heating element + cooling coils
- `flux:component:processing:filtration` - Requires: porous materials + membrane + pressure system
- `flux:component:processing:catalytic` - Requires: catalyst material + reaction chamber + temperature control

### Protective Components

**Armor Assemblies:**
- `flux:component:armor:leather` - Requires: tanned hide + padding + reinforcement
- `flux:component:armor:scale` - Requires: overlapping scales + flexible backing + attachment system
- `flux:component:armor:composite` - Requires: hard plates + shock absorption + joint flexibility

**Insulation Assemblies:**
- `flux:component:insulation:thermal` - Requires: fur/feathers + air pockets + vapor barrier
- `flux:component:insulation:electrical` - Requires: rubber + ceramic + protective coating
- `flux:component:insulation:chemical` - Requires: resistant materials + neutralizing agents + containment

**Sealing Assemblies:**
- `flux:component:sealing:waterproof` - Requires: wax + oils + membrane materials
- `flux:component:sealing:airtight` - Requires: gaskets + sealants + pressure fittings
- `flux:component:sealing:chemical` - Requires: resistant seals + neutralizing barriers + corrosion protection

## Finished Goods Tier (Tier 3)

### Survival Equipment

**Advanced Shelter:**
- `flux:item:shelter:weatherproof` - Requires: frame assembly + protective covering + sealing system
- Components: structural frame + waterproof membrane + anchoring system
- Ecosystems: Forest (hardwood) + Mountain (metal) + Monster (membrane materials)

**Portable Power:**
- `flux:item:power:field_generator` - Requires: power assembly + control system + distribution network
- Components: battery bank + voltage regulation + output terminals
- Ecosystems: Mountain (battery metals) + Salvage (electronics) + Monster (insulation)

**Water Purification:**
- `flux:item:water:purification_system` - Requires: processing assembly + filtration + sterilization
- Components: multi-stage filters + UV sterilization + chemical treatment
- Ecosystems: All ecosystems + Salvage (UV lamps) + Monster (filter membranes)

### Weapons and Tools

**Composite Weapons:**
- `flux:item:weapon:compound_bow` - Requires: frame assembly + tensioning system + projectile guides
- Components: flexible frame + high-tension strings + precision sights
- Ecosystems: Forest (wood) + Mountain (metal) + Monster (sinew/horn)

**Powered Tools:**
- `flux:item:tool:electric_drill` - Requires: power assembly + motor system + control interface
- Components: battery pack + rotary motor + torque control
- Ecosystems: Mountain (metals) + Salvage (motor components) + Monster (grip materials)

**Precision Instruments:**
- `flux:item:tool:optical_scope` - Requires: lens assembly + mechanical adjustment + protective housing
- Components: ground lenses + precision mechanics + weatherproof case
- Ecosystems: Salvage (optical components) + Mountain (metals) + Monster (protective materials)

### Medical Equipment

**Surgical Kit:**
- `flux:item:medical:surgical_kit` - Requires: cutting instruments + sterilization system + precision tools
- Components: sterile blades + antiseptic solutions + fine manipulation tools
- Ecosystems: Mountain (metals) + Forest (antiseptics) + Monster (suture materials)

**Diagnostic Equipment:**
- `flux:item:medical:diagnostic_scanner` - Requires: sensing system + data processing + display interface
- Components: sensor array + signal processing + visual display
- Ecosystems: Salvage (sensors) + Mountain (metals) + Monster (bio-compatible materials)

**Pharmaceutical Lab:**
- `flux:item:medical:synthesis_lab` - Requires: chemical processing + purification system + quality control
- Components: reaction vessels + distillation column + analytical instruments
- Ecosystems: All ecosystems + Salvage (lab equipment) + Monster (bio-compounds)

## Resource Flow Patterns

### Seasonal Variations (Weather-Driven)

**Spring Resource Surge:**
- Flora resources experience rapid growth due to increased precipitation and temperature
- Mountain snowmelt creates temporary water abundance affecting mineral extraction
- Animal activity increases, making monster materials more available but more dangerous

**Summer Resource Peak:**
- Maximum flora resource availability due to optimal growing conditions
- Mineral extraction efficiency highest due to stable weather patterns
- Peak monster activity requires careful expedition planning

**Autumn Resource Preparation:**
- Flora resources shift from growth to seed/fruit production
- Weather instability affects mineral extraction reliability
- Monster behavioral changes create both opportunities and dangers

**Winter Resource Scarcity:**
- Flora resources become dormant or preserved materials only
- Mineral extraction becomes weather-dependent and dangerous
- Monster materials become rare but potentially higher quality

### Anti-Equilibrium Economic Effects

**Weather-Driven Market Dynamics:**
- Unpredictable weather patterns create constantly shifting resource availability
- Communities cannot optimize for stable resource patterns
- Trade relationships must remain flexible and adaptive

**Cascade Effects:**
- Weather affects flora resources immediately
- Flora availability affects monster behavior patterns
- Monster behavior affects availability of animal materials
- Changed material availability affects component production
- Component scarcity affects finished goods markets

**Regional Specialization Pressure:**
- Communities develop expertise in weather-resilient resource extraction
- Trade networks form around complementary weather-resistant specializations
- No single community can maintain complete self-sufficiency
- Economic cooperation becomes survival necessity

## Crafting Complexity Tiers

### Tier 1: Individual Crafting (1-3 days)
- Basic processing of raw materials into sub-components
- Single-person operations with hand tools
- Examples: Tanning leather, smelting copper, weaving fiber

### Tier 2: Community Crafting (1-2 weeks)
- Assembly of sub-components into functional components
- Small team operations with specialized tools
- Examples: Assembling blade components, building frame assemblies

### Tier 3: Multi-Community Crafting (1-3 months)
- Assembly of components into finished goods
- Coordinated operations across multiple communities
- Examples: Building advanced medical equipment, constructing manufacturing systems

### Tier 4: Civilization-Level Crafting (3-12 months)
- Mega-projects requiring dozens of finished goods
- Regional cooperation and specialized infrastructure
- Examples: Establishing manufacturing bases, building communication networks

## Integration with Game Systems

### Weather System Integration
- Resource availability fluctuates based on weather patterns
- Crafting success rates affected by environmental conditions
- Seasonal planning becomes essential for complex projects

### Combat System Integration
- Equipment durability depends on crafting quality and materials used
- Weapon effectiveness depends on component integration
- Armor protection depends on material selection and assembly quality

### Social System Integration
- Complex crafting requires community cooperation and knowledge sharing
- Trade relationships form around complementary resource access
- Reputation systems develop around crafting expertise and reliability

### Economic System Integration
- Resource scarcity drives natural market dynamics
- Specialization creates interdependencies between communities
- Innovation happens through experimental crafting and knowledge exchange

This comprehensive system creates a living economy where weather patterns, resource availability, and crafting demands create constantly evolving challenges and opportunities, preventing any community from reaching a stable, optimized state.
