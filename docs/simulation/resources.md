# Resource Generation System

## Overview

The resource generation system provides flora and elemental resources across the Flux simulation environment. Resources emerge naturally from place ecosystems based on climate and biome characteristics, creating realistic resource distribution patterns that drive player exploration, trade, and settlement decisions.

## Design Philosophy

### Flora and Elemental Focus

The resource system focuses exclusively on **flora** (plant-based) and **elemental** (geological/mineral) resources found in places. Animal-derived materials (leather, meat, bone, etc.) are deliberately excluded from place-based resource generation - these come from Monster interactions instead.

This separation creates clear gameplay loops:
- **Places** provide predictable, renewable flora and mineral resources
- **Monsters** provide unpredictable, finite animal-derived materials
- **Crafting** combines both types to create useful items

### Two-Dimensional Resource Distribution

Resources are distributed along two orthogonal dimensions:

1. **Climate-Based Resources** - determined by atmospheric conditions (temperate vs arid)
2. **Biome-Based Resources** - determined by geographical features (grassland, forest, mountain)

Each ecosystem gets resources from both dimensions, creating realistic resource combinations while maintaining clear design logic.

## Climate-Based Resources

Climate resources are determined by fundamental atmospheric patterns that affect plant growth and geological processes. Each climate provides 3 distinct resource types.

### Temperate Climate Resources

Temperate climates support diverse flora with moderate water requirements and enable specific geological processes.

#### `flux:ingredient:fruit:berries`
- **Type**: Ingredient (flora)
- **Description**: Wild berries from temperate climate bushes and shrubs
- **Characteristics**: Sweet, nutritious, seasonal availability
- **Processing**: Can be eaten raw, preserved, or used in recipes

#### `flux:material:fiber:cotton`
- **Type**: Material (flora)
- **Description**: Natural plant fibers from temperate climate cotton plants
- **Characteristics**: Soft, absorbent, easily dyed
- **Processing**: Spun into thread, woven into cloth, crafted into garments

#### `flux:ingredient:bark:willow`
- **Type**: Ingredient (flora)
- **Description**: Willow bark from moisture-loving temperate trees
- **Characteristics**: Natural pain relief, anti-inflammatory properties
- **Processing**: Dried, ground, brewed into teas or applied as poultices

### Arid Climate Resources

Arid climates support specialized flora adapted to low water conditions and create unique mineral formations.

#### `flux:ingredient:fruit:cactus`
- **Type**: Ingredient (flora)
- **Description**: Fruits from desert cacti adapted to arid conditions
- **Characteristics**: High water content, unique flavors, natural preservatives
- **Processing**: Fresh consumption, dried for preservation, fermented

#### `flux:material:fiber:yucca`
- **Type**: Material (flora)
- **Description**: Tough fibers from yucca plants in arid environments
- **Characteristics**: Strong, durable, naturally water-resistant
- **Processing**: Woven into rope, baskets, or weather-resistant textiles

#### `flux:ingredient:gel:aloe`
- **Type**: Ingredient (flora)
- **Description**: Healing gel from desert aloe succulents
- **Characteristics**: Cooling, healing, natural antiseptic
- **Processing**: Fresh gel application, dried for storage, mixed into salves

## Biome-Based Resources

Biome resources are determined by specific geographical and ecological features. Each biome provides 3 distinct resource types reflecting its unique characteristics.

### Grassland Biome Resources

Open grasslands support grain production and create specific geological conditions.

#### `flux:ingredient:grain:wheat`
- **Type**: Ingredient (flora)
- **Description**: Seeds from wild wheat growing in open grasslands
- **Characteristics**: Nutritious, storable, can be cultivated
- **Processing**: Ground into flour, cooked as porridge, brewed into beverages

#### `flux:material:fiber:grass`
- **Type**: Material (flora)
- **Description**: Long, strong grass fibers from prairie grasses
- **Characteristics**: Flexible, lightweight, naturally golden
- **Processing**: Woven into baskets, thatched for roofing, braided into rope

#### `flux:mineral:salt`
- **Type**: Mineral (elemental)
- **Description**: Salt deposits from dried seasonal lakes and salt flats
- **Characteristics**: Essential for food preservation, trade commodity
- **Processing**: Harvested, purified, used for food preservation and seasoning

### Forest Biome Resources

Dense forests provide tree-based resources and support specialized flora.

#### `flux:ingredient:seed:acorn`
- **Type**: Ingredient (flora)
- **Description**: Nutritious nuts from forest oak trees
- **Characteristics**: High protein and fat, requires processing to remove tannins
- **Processing**: Leached, ground into flour, roasted for direct consumption

#### `flux:material:wood:(oak|maple|birch)`
- **Type**: Material (flora)
- **Description**: Dense wood from mature forest trees (oak, maple, birch)
- **Characteristics**: Strong, durable, beautiful grain patterns
- **Processing**: Cut into planks, carved into tools, crafted into furniture

#### `flux:ingredient:root:sansam`
- **Type**: Ingredient (flora)
- **Description**: Rare variety of ginseng root found in deep forest environments
- **Characteristics**: Adaptogenic properties, energy enhancement, rare and valuable
- **Processing**: Dried, powdered, brewed into tonic teas

### Mountain Biome Resources

Mountains provide geological resources and support hardy alpine flora.

#### `flux:ingredient:seed:pine`
- **Type**: Ingredient (flora)
- **Description**: Nutritious seeds from hardy mountain pine trees
- **Characteristics**: High fat content, cold-hardy, long storage life
- **Processing**: Roasted, pressed for oil, ground into meal

#### `flux:material:stone:granite`
- **Type**: Material (elemental)
- **Description**: Hard stone formations from mountain bedrock
- **Characteristics**: Extremely durable, weather-resistant, workable
- **Processing**: Quarried, cut into blocks, carved into tools or monuments

#### `flux:mineral:copper`
- **Type**: Mineral (elemental)
- **Description**: Copper ore deposits in mountain rock formations
- **Characteristics**: Malleable metal, corrosion-resistant, conductive
- **Processing**: Smelted, alloyed, forged into tools and decorative items

## Battery Metal Resources

Advanced energy storage technologies require specific rare metal resources that occur naturally in particular geological conditions. These metals enable the creation of powerful energy storage devices and arcane batteries.

### Lithium Resources

#### `flux:mineral:lithium`
- **Type**: Mineral (elemental)
- **Description**: Lithium-bearing minerals (spodumene, lepidolite) in granite pegmatites
- **Characteristics**: Hard rock deposit, requires intensive mining and processing
- **Processing**: Crushing, roasting, chemical extraction
- **Occurrence**: Granite formations in mountainous regions, ancient volcanic areas
- **Notes**: More stable than brine deposits but requires more complex extraction

### Nickel Resources

#### `flux:mineral:nickel`
- **Type**: Mineral (elemental)
- **Description**: Nickel sulfide ore deposits in ancient volcanic formations
- **Characteristics**: High-temperature metal, corrosion-resistant, magnetic properties
- **Processing**: Smelting, refining, alloying with other metals
- **Occurrence**: Ancient volcanic intrusions, mountain ranges, geological fault zones
- **Notes**: Often found associated with copper deposits, requires high-temperature processing

### Cobalt Resources

#### `flux:mineral:cobalt`
- **Type**: Mineral (elemental)
- **Description**: Cobalt arsenide ores in hydrothermal mineral veins
- **Characteristics**: Hard, lustrous metal with magnetic properties
- **Processing**: Roasting, leaching, electrowinning
- **Occurrence**: Hydrothermal veins near geothermal areas, mountain regions
- **Notes**: Toxic extraction process requires careful handling, often co-occurs with nickel

### Manganese Resources

#### `flux:mineral:manganese`
- **Type**: Mineral (elemental)
- **Description**: Manganese oxide deposits in sedimentary formations
- **Characteristics**: Essential for steel production and battery cathodes
- **Processing**: Reduction smelting, purification, alloying
- **Occurrence**: Ancient ocean floor sediments, bog deposits, weathered rock formations
- **Notes**: Important for both metallurgy and energy storage applications

### Cadmium Resources

#### `flux:mineral:cadmium`
- **Type**: Mineral (elemental)
- **Description**: Cadmium sulfide ore, typically found with zinc deposits
- **Characteristics**: Soft, toxic metal with excellent battery properties
- **Processing**: Byproduct of zinc refining, requires specialized handling
- **Occurrence**: Zinc-bearing ore bodies, sedimentary deposits, mountain regions
- **Notes**: Highly toxic, requires environmental protection measures during extraction

### Rare Earth Elements

#### `flux:mineral:monazite`
- **Type**: Mineral (elemental)
- **Description**: Monazite sands containing rare earth elements
- **Characteristics**: Contains neodymium, dysprosium, and other battery metals
- **Processing**: Acid dissolution, separation, purification
- **Occurrence**: Beach sands, weathered granite, placer deposits
- **Notes**: Critical for advanced battery technologies and magical energy storage

### Battery Metal Distribution by Ecosystem

**Mountain:Arid Ecosystems** (Primary Battery Metal Region):
- `flux:mineral:lithium`
- `flux:mineral:cobalt`
- `flux:mineral:nickel`

**Mountain:Temperate Ecosystems** (Secondary Battery Metal Region):
- `flux:mineral:nickel`
- `flux:mineral:monazite` - weathered granite
- `flux:mineral:cadmium` - zinc-bearing deposits

**Grassland:Temperate Ecosystems** (Sedimentary Battery Metals):
- `flux:mineral:manganese` - sedimentary formations
- `flux:mineral:monazite` - placer deposits

### Processing and Safety Considerations

**Environmental Hazards:**
- Lithium extraction requires massive water usage
- Cobalt and cadmium processing produces toxic byproducts
- Rare earth extraction involves radioactive materials

**Processing Requirements:**
- High-temperature smelting facilities
- Chemical processing plants
- Specialized waste management
- Skilled metallurgical knowledge

**Economic Implications:**
- Battery metals are high-value, low-volume resources
- Extraction requires significant infrastructure investment
- Transportation and security concerns due to strategic value
- Enables advanced technological development

## Ecosystem Resource Distribution

Each launch ecosystem receives exactly 6 resources: 3 from its climate type and 3 from its biome type.

### `flux:ecosystem:grassland:temperate`

**Climate Resources (Temperate):**
- `flux:ingredient:fruit:berries` - wild temperate berries
- `flux:material:fiber:cotton` - temperate cotton fibers
- `flux:ingredient:bark:willow` - temperate willow bark

**Biome Resources (Grassland):**
- `flux:ingredient:grain:wheat` - grassland grain seeds
- `flux:material:fiber:grass` - grassland plant fibers
- `flux:mineral:salt` - grassland salt deposits

**Total**: 6 resources (3 ingredients, 2 materials, 1 mineral)

### `flux:ecosystem:forest:temperate`

**Climate Resources (Temperate):**
- `flux:ingredient:fruit:berries` - wild temperate berries
- `flux:material:fiber:cotton` - temperate cotton fibers
- `flux:ingredient:bark:willow` - temperate willow bark

**Biome Resources (Forest):**
- `flux:ingredient:seed:acorn` - forest tree nuts
- `flux:material:wood:(oak|maple|birch)` - forest hardwood
- `flux:ingredient:root:sansam` - forest medicinal root

**Total**: 6 resources (4 ingredients, 2 materials)

### `flux:ecosystem:mountain:arid`

**Climate Resources (Arid):**
- `flux:ingredient:fruit:cactus` - arid climate cacti
- `flux:material:fiber:yucca` - arid plant fibers
- `flux:ingredient:gel:aloe` - arid succulent ingredient

**Biome Resources (Mountain):**
- `flux:ingredient:seed:pine` - mountain pine seeds
- `flux:material:stone:granite` - mountain stone
- `flux:mineral:copper` - mountain ore deposits

**Total**: 6 resources (3 ingredients, 2 materials, 1 mineral)

## Resource Generation Mechanics

### Weather-Driven Generation

Resource generation rates are influenced by weather conditions through the weather simulation system. Each resource type responds differently to atmospheric conditions:

**Temperature Effects:**
- **Flora resources** have optimal temperature ranges for growth/production
- **Elemental resources** are generally unaffected by temperature

**Precipitation Effects:**
- **Water-loving flora** (berries, cotton, willow) increase with precipitation
- **Drought-adapted flora** (cacti, yucca, aloe) may decrease with excess water
- **Mineral extraction** may be affected by water table levels

**PPFD (Light) Effects:**
- **Photosynthetic resources** (all flora) directly correlate with available light
- **Elemental resources** are unaffected by light levels

### Ecological Constraints

Resource generation respects ecological boundaries defined in place profiles:

- Resources only generate within their appropriate climate and biome combinations
- Generation rates are constrained by ecological limits (temperature, pressure, humidity ranges)
- Seasonal variations affect availability and quality

### Regeneration Patterns

**Flora Resources:**
- **Seasonal regeneration** - berries, grains, nuts follow natural seasons
- **Continuous regeneration** - cotton, fibers grow continuously under good conditions
- **Slow regeneration** - medicinal ingredients like ginseng regenerate slowly

**Elemental Resources:**
- **Geological regeneration** - stone and ore deposits regenerate very slowly
- **Hydrological regeneration** - salt deposits refresh with seasonal water cycles

## Integration with Other Systems

### Weather System Integration

The resource system integrates directly with the weather simulation:
- Weather conditions drive resource generation rates
- Seasonal patterns affect resource availability
- Extreme weather events can impact resource regeneration

### Place Graph Integration

Resources respect spatial relationships:
- Similar ecosystems in connected places have correlated resource generation
- Resource scarcity in one area can drive exploration to neighboring places
- Trade routes emerge naturally from resource distribution patterns

### Future Monster Integration

The system is designed to complement future monster systems:
- Places provide predictable plant and mineral resources
- Monsters will provide unpredictable animal-derived materials
- Crafting systems will combine both resource types

## Gameplay Implications

### Exploration Incentives

The resource distribution creates natural exploration incentives:
- **Climate diversity** - players must visit both temperate and arid regions
- **Biome specialization** - each biome offers unique, non-replaceable resources
- **Seasonal availability** - encourages long-term planning and storage

### Trade and Economy

Resource scarcity drives economic activity:
- No ecosystem is completely self-sufficient
- Each ecosystem has valuable exports and necessary imports
- Natural trade routes emerge from resource complementarity

### Settlement Strategy

Resource availability influences settlement decisions:
- **Resource richness** - some places have more abundant generation
- **Resource diversity** - proximity to multiple ecosystems provides advantages
- **Strategic positioning** - locations that control trade routes gain importance

## Future Extensions

### Additional Climates

The system can easily accommodate new climate types:
- **Tropical** climate (hot + wet)
- **Polar** climate (cold + dry)
- **Mediterranean** climate (warm + seasonal)

### Additional Biomes

New biome types can be added:
- **Wetland** biomes (swamps, marshes)
- **Coastal** biomes (beaches, cliffs)
- **Underground** biomes (caves, caverns)

### Resource Quality Variations

Future enhancements could include:
- **Quality grades** based on generation conditions
- **Rare variants** with special properties
- **Seasonal quality changes** reflecting natural cycles

This resource system provides a solid foundation for emergent gameplay while maintaining realistic ecological relationships and clear design principles.

---

# Appendix: Product Catalog

This appendix catalogs the potential products that can be created from our resource foundation, organized by category and complexity. Each product shows its resource requirements and the ecosystems needed to create it.

## Product Categories

### Food Products

Food products transform our ingredient resources into consumable items with enhanced nutritional value, preservation, or flavor properties.

#### Basic Foods (Single Ecosystem)

**`flux:food:porridge:wheat`**
- **Resources**: `flux:ingredient:grain:wheat` + `flux:mineral:salt`
- **Ecosystem**: Grassland:Temperate
- **Description**: Hearty grain porridge seasoned with salt
- **Benefits**: Nutritious, filling, long-lasting energy

**`flux:ingredient:flour:acorn`**
- **Resources**: `flux:ingredient:seed:acorn` + processing
- **Ecosystem**: Forest:Temperate
- **Description**: Ground acorn meal with tannins removed
- **Benefits**: High protein, gluten-free, storable

**`flux:food:oil:pine`**
- **Resources**: `flux:ingredient:seed:pine` + pressing
- **Ecosystem**: Mountain:Arid
- **Description**: Cold-pressed oil from pine nuts
- **Benefits**: High-fat content, cooking oil, lamp fuel

**`flux:food:jam:berries`**
- **Resources**: `flux:ingredient:fruit:berries` + `flux:mineral:salt`
- **Ecosystem**: Grassland:Temperate
- **Description**: Berries preserved with salt for long-term storage
- **Benefits**: Seasonal availability extension, trade commodity

**`flux:food:extract:cactus`**
- **Resources**: `flux:ingredient:fruit:cactus` + extraction
- **Ecosystem**: Mountain:Arid
- **Description**: Purified water extracted from cactus fruits
- **Benefits**: Hydration, desert survival, electrolyte balance

#### Advanced Foods (Multi-Ecosystem)

**`flux:food:trail-mix`
- **Resources**: `flux:ingredient:fruit:berries` + `flux:ingredient:seed:pine` + `flux:ingredient:seed:acorn`
- **Ecosystems**: Forest:Temperate + Mountain:Arid
- **Description**: High-energy mixture of nuts, seeds, and dried fruits
- **Benefits**: Portable, long-lasting, balanced nutrition

**`flux:food:desert-jerky`
- **Resources**: `flux:ingredient:fruit:cactus` + `flux:mineral:salt` + drying
- **Ecosystem**: Mountain:Arid
- **Description**: Dried cactus fruit preserved with salt
- **Benefits**: Lightweight, preserved, unique desert flavors

**`flux:food:foraged-bread`**
- **Resources**: `flux:ingredient:seed:acorn` + `flux:ingredient:grain:wheat` + `flux:mineral:salt`
- **Ecosystems**: Forest:Temperate + Grassland:Temperate
- **Description**: Mixed grain bread using both wheat and acorn flour
- **Benefits**: Complex flavors, nutritional variety, cultural fusion

### Medicinal Products

Medicinal products process our ingredient resources with healing properties into useful remedies and treatments.

#### Basic Remedies (Single Ecosystem)

**`flux:product:medicine:willow_tea`**
- **Resources**: `flux:ingredient:bark:willow` + hot water
- **Ecosystem**: Forest:Temperate or Grassland:Temperate
- **Description**: Brewed tea from willow bark
- **Benefits**: Pain relief, anti-inflammatory, fever reduction

**`flux:product:medicine:aloe_salve`**
- **Resources**: `flux:ingredient:gel:aloe` + basic processing
- **Ecosystem**: Mountain:Arid
- **Description**: Cooling gel preparation for topical application
- **Benefits**: Burn treatment, wound healing, skin soothing

**`flux:product:medicine:sansam_tonic`**
- **Resources**: `flux:ingredient:root:sansam` + alcohol/water extraction
- **Ecosystem**: Forest:Temperate
- **Description**: Concentrated extract of rare ginseng root
- **Benefits**: Energy enhancement, adaptogenic properties, stamina boost

#### Advanced Medicine (Multi-Ecosystem)

**`flux:product:medicine:healing_compound`**
- **Resources**: `flux:ingredient:bark:willow` + `flux:ingredient:gel:aloe` + `flux:ingredient:root:sansam`
- **Ecosystems**: All three ecosystems
- **Description**: Complete healing preparation combining multiple medicinal ingredients
- **Benefits**: Comprehensive treatment, pain relief with healing acceleration

**`flux:product:medicine:desert_survival_kit`**
- **Resources**: `flux:ingredient:gel:aloe` + `flux:product:food:cactus_water` + container
- **Ecosystem**: Mountain:Arid + crafting
- **Description**: Emergency medical kit for desert conditions
- **Benefits**: Heat exhaustion treatment, dehydration prevention, burn care

### Textile Products

Textile products transform our fiber materials into useful clothing, containers, and structural elements.

#### Basic Textiles (Single Ecosystem)

**`flux:product:textile:cotton_thread`**
- **Resources**: `flux:material:fiber:cotton` + spinning
- **Ecosystem**: Forest:Temperate or Grassland:Temperate
- **Description**: Spun cotton fibers formed into usable thread
- **Benefits**: Soft, absorbent, easily dyed, versatile

**`flux:product:textile:yucca_rope`**
- **Resources**: `flux:material:fiber:yucca` + braiding
- **Ecosystem**: Mountain:Arid
- **Description**: Strong rope braided from yucca plant fibers
- **Benefits**: Weather-resistant, durable, naturally water-repellent

**`flux:product:textile:grass_cordage`**
- **Resources**: `flux:material:fiber:grass` + twisting
- **Ecosystem**: Grassland:Temperate
- **Description**: Lightweight cord twisted from prairie grass fibers
- **Benefits**: Flexible, golden color, biodegradable

#### Clothing (Single Ecosystem)

**`flux:product:clothing:cotton_shirt`**
- **Resources**: `flux:product:textile:cotton_thread` + weaving + sewing
- **Ecosystem**: Temperate regions
- **Description**: Comfortable shirt woven from cotton thread
- **Benefits**: Breathable, comfortable, easily maintained

**`flux:product:clothing:desert_cloak`**
- **Resources**: `flux:material:fiber:yucca` + weaving
- **Ecosystem**: Mountain:Arid
- **Description**: Protective cloak woven from yucca fibers
- **Benefits**: Sun protection, sand resistance, temperature regulation

**`flux:product:clothing:grass_hat`**
- **Resources**: `flux:material:fiber:grass` + weaving
- **Ecosystem**: Grassland:Temperate
- **Description**: Lightweight hat woven from grass fibers
- **Benefits**: Sun protection, ventilation, natural camouflage

#### Advanced Textiles (Multi-Ecosystem)

**`flux:product:textile:mixed_fabric`**
- **Resources**: `flux:material:fiber:cotton` + `flux:material:fiber:yucca`
- **Ecosystems**: Temperate + Arid
- **Description**: Blended fabric combining cotton softness with yucca durability
- **Benefits**: Optimal balance of comfort and strength

**`flux:product:textile:weatherproof_canvas`**
- **Resources**: `flux:material:fiber:yucca` + `flux:product:food:pine_nut_oil` + treatment
- **Ecosystems**: Mountain:Arid
- **Description**: Treated yucca fabric with oil-based weatherproofing
- **Benefits**: Water resistance, wind protection, tent material

### Tools and Implements

Tools combine our materials and minerals into functional implements for crafting, construction, and survival.

#### Basic Tools (Single Ecosystem)

**`flux:product:tool:copper_knife`**
- **Resources**: `flux:mineral:copper` + smelting + forging
- **Ecosystem**: Mountain:Arid
- **Description**: Sharp knife forged from copper ore
- **Benefits**: Cutting, food preparation, crafting tool

**`flux:product:tool:wooden_bowl`**
- **Resources**: `flux:material:wood:(oak|maple|birch)` + carving
- **Ecosystem**: Forest:Temperate
- **Description**: Carved wooden bowl for food and liquid storage
- **Benefits**: Lightweight, natural, food-safe

**`flux:product:tool:stone_hammer`**
- **Resources**: `flux:material:stone:granite` + shaping
- **Ecosystem**: Mountain:Arid
- **Description**: Heavy hammer carved from granite stone
- **Benefits**: Durable, heavy impact, stone shaping

#### Advanced Tools (Multi-Ecosystem)

**`flux:product:tool:copper_axe`**
- **Resources**: `flux:mineral:copper` + `flux:material:wood:(oak|maple|birch)` + `flux:product:textile:grass_cordage`
- **Ecosystems**: Mountain:Arid + Forest:Temperate + Grassland:Temperate
- **Description**: Copper axe head with wooden handle secured by grass cordage
- **Benefits**: Tree felling, wood splitting, construction tool

**`flux:product:tool:mason_chisel`**
- **Resources**: `flux:mineral:copper` + `flux:material:wood:(oak|maple|birch)` + precision forging
- **Ecosystems**: Mountain:Arid + Forest:Temperate
- **Description**: Precision copper chisel with hardwood handle
- **Benefits**: Stone carving, detailed work, monument construction

**`flux:product:tool:foraging_basket`**
- **Resources**: `flux:material:fiber:grass` + `flux:ingredient:seed:pine` (needles) + weaving
- **Ecosystems**: Grassland:Temperate + Mountain:Arid
- **Description**: Tightly woven basket using grass fiber and pine needles
- **Benefits**: Resource collection, food storage, lightweight carrying

### Containers and Storage

Containers provide storage solutions for resources, products, and personal items.

#### Basic Containers (Single Ecosystem)

**`flux:product:container:grass_basket`**
- **Resources**: `flux:material:fiber:grass` + weaving
- **Ecosystem**: Grassland:Temperate
- **Description**: Simple basket woven from grass fibers
- **Benefits**: Lightweight, flexible, air circulation

**`flux:product:container:stone_jar`**
- **Resources**: `flux:material:stone:granite` + hollowing + sealing
- **Ecosystem**: Mountain:Arid
- **Description**: Carved stone jar with fitted lid
- **Benefits**: Durable, temperature stable, moisture protection

#### Advanced Containers (Multi-Ecosystem)

**`flux:product:container:wooden_chest`**
- **Resources**: `flux:material:wood:(oak|maple|birch)` + `flux:mineral:copper` (fittings) + joinery
- **Ecosystems**: Forest:Temperate + Mountain:Arid
- **Description**: Wooden chest with copper hinges and lock mechanism
- **Benefits**: Secure storage, large capacity, portable

**`flux:product:container:yucca_water_bag`**
- **Resources**: `flux:material:fiber:yucca` + `flux:product:food:pine_nut_oil` + waterproofing
- **Ecosystems**: Mountain:Arid
- **Description**: Yucca fiber bag treated with pine oil for water storage
- **Benefits**: Flexible, portable, desert survival

### Building Materials

Building materials enable construction of structures, settlements, and infrastructure.

#### Structural Materials (Single Ecosystem)

**`flux:product:building:wooden_planks`**
- **Resources**: `flux:material:wood:(oak|maple|birch)` + sawing
- **Ecosystem**: Forest:Temperate
- **Description**: Cut and shaped wooden planks for construction
- **Benefits**: Versatile, strong, workable

**`flux:product:building:stone_blocks`**
- **Resources**: `flux:material:stone:granite` + cutting + shaping
- **Ecosystem**: Mountain:Arid
- **Description**: Precisely cut granite blocks for masonry
- **Benefits**: Extremely durable, weather-resistant, permanent

**`flux:product:building:thatching_bundles`**
- **Resources**: `flux:material:fiber:grass` + bundling
- **Ecosystem**: Grassland:Temperate
- **Description**: Bundled grass fibers prepared for roof thatching
- **Benefits**: Insulation, water shedding, renewable

#### Advanced Building Materials (Multi-Ecosystem)

**`flux:product:building:reinforced_beam`**
- **Resources**: `flux:material:wood:(oak|maple|birch)` + `flux:mineral:copper` (brackets) + engineering
- **Ecosystems**: Forest:Temperate + Mountain:Arid
- **Description**: Wooden beam reinforced with copper brackets and fittings
- **Benefits**: High load capacity, earthquake resistance, longevity

**`flux:product:building:mortar`**
- **Resources**: `flux:material:stone:granite` (crushed) + organic binders + mixing
- **Ecosystem**: Mountain:Arid + processing
- **Description**: Bonding mortar made from granite dust and organic compounds
- **Benefits**: Strong adhesion, weather resistance, gap filling

## Product Complexity Tiers

### Tier 1: Basic Processing (Single Resource)
- Direct processing of individual resources
- Examples: Pine nut oil, grass cordage, copper ingots
- **Skills Required**: Basic resource knowledge, simple tools
- **Time Investment**: Hours to days

### Tier 2: Local Combinations (Single Ecosystem)
- Combining 2-3 resources from the same ecosystem
- Examples: Wheat porridge, cotton cloth, stone tools
- **Skills Required**: Local ecosystem expertise, basic crafting
- **Time Investment**: Days to weeks

### Tier 3: Regional Specialization (Multi-Ecosystem)
- Combining resources from different ecosystems
- Examples: Copper axe, mixed fabric, complete medicine kits
- **Skills Required**: Trade knowledge, advanced crafting, material science
- **Time Investment**: Weeks to months

### Tier 4: Master Craftsmanship (All Ecosystems)
- Complex recipes requiring resources from all three ecosystems
- Examples: Luxury furniture, ceremonial items, advanced tools
- **Skills Required**: Master-level expertise, extensive trade networks
- **Time Investment**: Months to years

## Economic Implications

### Regional Specialization
- **Grassland:Temperate**: Food production, basic textiles, agricultural tools
- **Forest:Temperate**: Woodworking, medicine, furniture, containers
- **Mountain:Arid**: Metallurgy, stone working, desert survival gear, mining tools

### Trade Dependencies
- **Essential Trades**: Copper tools require mountain resources but forest handles
- **Luxury Trades**: Advanced medicines require ingredients from all ecosystems
- **Seasonal Trades**: Preserved foods become valuable during resource scarcity

### Settlement Strategies
- **Resource Abundance**: Settlements near ecosystem boundaries access more resources
- **Trade Routes**: Strategic locations controlling resource flow gain economic advantages
- **Specialization**: Communities focusing on high-tier products command premium prices

This product catalog demonstrates how our simple resource foundation creates complex economic opportunities through realistic crafting relationships and regional specialization patterns.
