# FSP: Skills

## Introduction

This document describes the various skills that actors can learn in our simulation.

## Skills

### Martial Weapons `flux:skill:weapon:martial`

Martial weapons are traditional weapons found in the Old World, like swords, hammers, spears, and bows.

- `melee:1h` - Any melee weapon can be used effectively with one hand
- `melee:2h` - Any melee weapon that must be used with two hands
- `ranged:1h` - Any ranged weapon that can be fired with one hand
- `ranged:2h` - Any ranged weapon that must be fired with two hands

### Tech Weapons `flux:skill:weapon:tech`

Tech weapons are modern weapons found in the New World, like ballistic weapons, kinetic weapons, and thermal weapons.

- `ballistic:1h` - Ballistic weapons that can be fired with one hand, such as pistols, submachine guns
- `ballistic:2h` - Ballistic weapons that must be fired with two hands, such as rifles, machine guns
- `explosive:1h` - Any explosive weapon that can be "fired" with one hand, such as grenades
- `explosive:2h` - Any explosive weapon that must be "fired" with two hands, such as rocket launchers, missile launchers, etc.
- `thermal:2h` - Thermal weapons, such as flamethrowers, etc.
- `kinetic:2h` - Railguns, Gauss cannons, etc.

## Combat `flux:skill:combat`

- `tactics:offense` - Offensive tactics, strategy, etc.
- `tactics:defense` - Defensive tactics, strategy, etc.

### Specialized Offense `flux:skill:offense:*`

- `martial` - Offensive training against martial weapons
- `tech` - Offensive training against tech weapons

### Specialized Defense `flux:skill:defense:*`

- `martial` - Defensive training against martial weapons
- `tech` - Defensive tranining against tech weapons

### Specialized Defense `flux:skill:defense:*`

### Animal Husbandry `flux:skill:animal`

- `dinosaur`
- `mammal`
- `insect`

### Science `flux:skill:science`

- `plant` - Plant biology
- `fungus` - Mycology
- `mineral` - Geology, mineralogy, etc.
- `animal` - Animal biology, zoology, medicine, etc.
- `tech` - Technology, engineering, etc.

### Crafting `flux:skill:crafting`

- `wood` - Things made from wood, such as furniture, structures
- `mineral` - Things made from minerals, ores, such as tools, weapons, armor, etc.
- `plant` - Things made from plants, such as medicine, etc.
- `animal` - Things made from animals, such as leather, fur, etc.
- `tech` - Things made from tech, such as circuits, etc. All tech resources URNs must contain this atom.

### Resource Collection `flux:skill:gather`

- `mineral` - Minerals, ores, etc. All mineral resources URNs must contain this atom
- `wood` - Wood, logs, etc. All wood resources URNs must contain this atom
- `plant` - Plants, herbs, etc. All plant resources URNs must contain this atom
- `fungus` - Fungus, mushrooms, etc. All fungus resources URNs must contain this atom
- `tech` - Schematics, blueprints, etc. All tech resources URNs must contain this atom

### Social `flux:skill:social`

- `trading` - Trade goods, barter, etc.
- `organization` - Organize groups, manage resources, etc.

### Survival `flux:skill:survival`

- `climbing`
- `swimming`
- `foraging`
- `hunting`
- `stealth`
- `trickery`
- `escape`
