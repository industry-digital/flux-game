# Flux Simulation Project: Geography

## Introduction

This document describes the geography of the world, and how the graph of Places is created.

The world is a rectangular plane divided up roughly into 5 distinct vertical bands, by ecosystem:

- flux:eco:steppe:arid (western band)
- flux:eco:grassland:temperate
- flux:eco:forest:temperate
- flux:eco:mountain:arid
- flux:eco:jungle:tropical (eastern band)

The easternmost band takes up about 1/3 of the world, and is interspersed with flux:eco:marsh:tropical.

Every MUD room, known as a "Place", is a 100x100 meter square.

To create all the Places of the world, we start with a single Place in the western band, then draw a Lichtenberg figure that propagates eastward. Each vertex of the Lichtenberg figure is a Place, and the edges are the connections between the Places.

As we create this Lichtenberg projection, we compute each vertex's ecosystem based on its horizontal position. In the eastermost band, we can simply intersperse the swamps using simple dithering.

As the Lichtenberg figure propagates through the `flux:eco:mountain:arid` ecosystem, a high frequency of the Exits that connect Places are vertical and not of the cardinal directions.

After the figure passes through the mountainous band, we start *another* Lichtenberg projection, this time with *dramatically increased branching parameters* so as to create a "river-delta-like" graph as it propagates east through the `jungle:tropical` ecosystem.
