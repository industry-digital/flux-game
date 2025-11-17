# @flux/guide

Player documentation and help system for the Flux Simulation Project, built with Astro and Starlight.

## What It Does

Provides comprehensive documentation for players, including:

- Game mechanics and systems
- Command reference
- Interactive examples with live code
- Combat tutorials
- World lore and design notes

## Features

- **Astro + Starlight** - Fast, SEO-friendly static site generation
- **Interactive Examples** - Embedded components using `@flux/core`
- **Live Code Demos** - Run game commands directly in documentation
- **React Components** - UI elements from `@flux/ui`
- **Math Support** - LaTeX rendering with KaTeX for game formulas
- **Dark Mode** - Automatic theme switching

## Running the Guide

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The development server runs at `http://localhost:4321` by default.

## Project Structure

```
src/
├── content/           # Documentation content
│   ├── docs/         # Main documentation pages
│   └── config.ts     # Starlight configuration
└── components/        # Custom React components
```

## Writing Documentation

Documentation is written in MDX (Markdown + JSX), allowing you to embed interactive components:

```mdx
---
title: Combat Mechanics
description: Learn about the combat system
---

import { CombatDemo } from '@flux/ui';

## Basic Combat

The combat system uses a turn-based approach...

<CombatDemo scenario="basic" />
```

## Integration

The guide integrates with other packages:

- **@flux/core** - Run live game examples
- **@flux/ui** - Embed interactive components
- **Starlight** - Documentation framework

This allows documentation to include working code examples that execute real game logic, ensuring docs stay in sync with implementation.

## Building

The build process generates a static site that can be deployed anywhere:

```bash
npm run build
# Output in dist/
```

Deploy to:
- GitHub Pages
- Netlify
- Vercel
- Any static hosting service

## License

MIT License

This documentation is free software. You can use, modify, and distribute it however you want. Just include the copyright notice and license text.
