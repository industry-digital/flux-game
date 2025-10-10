# VitePress to Starlight Migration Plan

## Overview

This document outlines the comprehensive migration of the FSP Player Guide from VitePress (Vue 3) to Starlight (Astro + React 19), integrating React components from the `@flux/ui` monorepo package.

## Migration Scope

### Content Structure Analysis

**Legacy Structure (`guide-legacy/src/`):**
```
├── index.md (9 lines) - Main landing page
├── combat/ (9 files) - Core combat documentation
│   ├── index.md - Combat overview with Vue components
│   ├── action-points.md
│   ├── encounters.md
│   ├── hit-resolution.md
│   ├── movement.md
│   ├── notation.md
│   ├── planning.md
│   ├── session.md
│   └── actions/ (7 files)
│       ├── index.md
│       ├── advance.md
│       ├── attack.md
│       ├── defend.md
│       ├── retreat.md
│       ├── strike.md
│       └── turn-around.md
├── character/ (1 file)
│   └── index.md
├── concept/ (1 file)
│   └── character.md
├── party/ (1 file)
│   └── index.md
├── skills/ (4 files)
│   ├── index.md
│   ├── evasion.md
│   ├── shield.md
│   └── weapon.md
└── workbench/ (2 files)
    ├── index.md
    └── vault.md
```

**Total Content:** 25 markdown files across 6 major sections

### UI Components Integration

**Available React Components (`@flux/ui`):**
- **Terminal Components**: Interactive terminal interface
- **Theme System**: Dark/light mode with React 19 hooks
- **List Virtualization**: High-performance list rendering
- **Infrastructure Hooks**: Environment, logging, storage utilities

**Legacy Vue Dependencies to Replace:**
- `BattlefieldNotation` component (referenced in combat/index.md)
- `Legend` component (custom Vue component)
- Any VitePress-specific Vue components

## Migration Strategy

### Phase 1: Infrastructure Setup ✅

- [x] Scaffold Starlight project
- [x] Configure monorepo integration (`@flux/ui`, `@flux/core`)
- [x] Set up TypeScript path aliases
- [x] Resolve Astro configuration issues

### Phase 2: Content Structure Migration

#### 2.1 Directory Structure Mapping

**Target Starlight Structure (`guide/src/content/docs/`):**
```
├── index.mdx - Landing page (enhanced with React components)
├── combat/
│   ├── index.mdx - Combat overview with React components
│   ├── action-points.md
│   ├── encounters.md
│   ├── hit-resolution.md
│   ├── movement.md
│   ├── notation.md
│   ├── planning.md
│   ├── session.md
│   └── actions/
│       ├── index.md
│       ├── advance.md
│       ├── attack.md
│       ├── defend.md
│       ├── retreat.md
│       ├── strike.md
│       └── turn-around.md
├── character/
│   └── index.md
├── concepts/
│   └── character.md
├── party/
│   └── index.md
├── skills/
│   ├── index.md
│   ├── evasion.md
│   ├── shield.md
│   └── weapon.md
└── workbench/
    ├── index.md
    └── vault.md
```

#### 2.2 File Format Conversion

**Standard Markdown Files (.md):**
- Direct copy with minimal frontmatter updates
- Update internal links to match new structure
- Remove VitePress-specific syntax

**Enhanced Files (.mdx):**
- Convert Vue component usage to React components
- Add React component imports
- Preserve mathematical notation and formatting

### Phase 3: Component Migration

#### 3.1 Vue to React Component Mapping

**Immediate Replacements:**
```typescript
// Legacy Vue (VitePress)
<script setup>
import Legend from '~/components/Legend.vue'
import { BattlefieldNotation } from '@flux/ui'
</script>

// New React (Starlight + MDX)
import { BattlefieldNotation } from '@flux/ui';
import { Legend } from '../components/Legend';
```

**Custom Components to Create:**
1. **BattlefieldNotation** - Interactive battlefield visualization
2. **Legend** - Documentation legend/key component
3. **CombatDiagram** - Combat flow diagrams
4. **ActionReference** - Action quick reference cards

#### 3.2 React Component Development

**Component Architecture:**
```typescript
// src/components/combat/BattlefieldNotation.tsx
import { useTheme } from '@flux/ui';

export interface BattlefieldNotationProps {
  positions: Array<{ id: string; position: number; type: 'ally' | 'enemy' }>;
  scale?: number;
  interactive?: boolean;
}

export function BattlefieldNotation({ positions, scale = 1, interactive = false }: BattlefieldNotationProps) {
  const { theme } = useTheme();

  // Implementation using @flux/ui theme system
  return (
    <div className={`battlefield-notation ${theme}`}>
      {/* Battlefield visualization */}
    </div>
  );
}
```

### Phase 4: Content Enhancement

#### 4.1 Interactive Features

**Leverage React 19 + @flux/ui:**
- **Terminal Simulations**: Interactive combat command examples
- **Theme Integration**: Consistent dark/light mode across all components
- **Virtualized Lists**: Performance-optimized action/skill references
- **Storage Hooks**: Persistent user preferences for documentation

#### 4.2 Enhanced Documentation Features

**New Capabilities:**
1. **Interactive Combat Simulator**: Live battlefield state visualization
2. **Searchable Action Database**: Filterable/sortable action references
3. **Calculation Tools**: Damage/hit chance calculators
4. **Progress Tracking**: User reading progress with localStorage

### Phase 5: Starlight Configuration

#### 5.1 Navigation Structure

**Updated `astro.config.mjs` sidebar:**
```javascript
sidebar: [
  {
    label: 'Getting Started',
    items: [
      { label: 'Player Guide', slug: 'index' },
      { label: 'Core Concepts', slug: 'concepts/character' },
    ],
  },
  {
    label: 'Combat System',
    items: [
      { label: 'Combat Overview', slug: 'combat/index' },
      { label: 'Action Points', slug: 'combat/action-points' },
      { label: 'Movement', slug: 'combat/movement' },
      { label: 'Hit Resolution', slug: 'combat/hit-resolution' },
      { label: 'Planning', slug: 'combat/planning' },
      { label: 'Sessions', slug: 'combat/session' },
      { label: 'Encounters', slug: 'combat/encounters' },
      { label: 'Notation', slug: 'combat/notation' },
    ],
  },
  {
    label: 'Combat Actions',
    autogenerate: { directory: 'combat/actions' },
  },
  {
    label: 'Character System',
    items: [
      { label: 'Characters', slug: 'character/index' },
      { label: 'Party Management', slug: 'party/index' },
    ],
  },
  {
    label: 'Skills & Abilities',
    autogenerate: { directory: 'skills' },
  },
  {
    label: 'Workbench System',
    autogenerate: { directory: 'workbench' },
  },
],
```

#### 5.2 Site Configuration

**Enhanced Starlight Features:**
```javascript
starlight({
  title: 'FSP Player Guide',
  description: 'Comprehensive guide to the FSP tactical combat system',
  social: [
    { icon: 'github', label: 'GitHub', href: 'https://github.com/your-org/flux' }
  ],
  customCss: [
    './src/styles/custom.css', // @flux/ui theme integration
  ],
  components: {
    // Override default components with React versions
    Head: './src/components/Head.astro',
    PageFrame: './src/components/PageFrame.astro',
  },
  expressiveCode: {
    themes: ['github-dark', 'github-light'],
  },
})
```

## Implementation Checklist

### Content Migration Tasks

- [ ] **Phase 2.1**: Create target directory structure in `src/content/docs/`
- [ ] **Phase 2.2**: Copy and convert 25 markdown files
  - [ ] `index.md` → `index.mdx` (enhanced with React)
  - [ ] `combat/index.md` → `combat/index.mdx` (Vue → React conversion)
  - [ ] 23 standard `.md` files (direct migration)
- [ ] **Phase 2.3**: Update all internal links and references
- [ ] **Phase 2.4**: Remove VitePress-specific frontmatter and syntax

### Component Development Tasks

- [ ] **Phase 3.1**: Create `src/components/` directory structure
- [ ] **Phase 3.2**: Develop React replacements for Vue components
  - [ ] `BattlefieldNotation` component
  - [ ] `Legend` component
  - [ ] `CombatDiagram` component
  - [ ] `ActionReference` component
- [ ] **Phase 3.3**: Integrate `@flux/ui` components
  - [ ] Theme system integration
  - [ ] Terminal component usage
  - [ ] List virtualization for references
- [ ] **Phase 3.4**: Create component documentation and examples

### Configuration Tasks

- [ ] **Phase 5.1**: Update Starlight navigation configuration
- [ ] **Phase 5.2**: Configure custom CSS for `@flux/ui` integration
- [ ] **Phase 5.3**: Set up component overrides
- [ ] **Phase 5.4**: Configure build and deployment scripts

### Quality Assurance Tasks

- [ ] **Testing**: Verify all internal links work correctly
- [ ] **Performance**: Ensure React components render efficiently
- [ ] **Accessibility**: Maintain documentation accessibility standards
- [ ] **Mobile**: Verify responsive design across devices
- [ ] **SEO**: Ensure proper meta tags and structured data

## Technical Considerations

### React 19 Integration

**Key Benefits:**
- **Server Components**: Pre-render complex documentation components
- **Concurrent Features**: Smooth interactions in documentation tools
- **Improved Hydration**: Faster page loads for interactive content

**Implementation Notes:**
- Use `@flux/ui` hooks for consistent state management
- Leverage React 19's automatic batching for performance
- Implement proper error boundaries for component failures

### Monorepo Integration

**Path Resolution:**
- Ensure `@flux/ui` imports work in both development and production
- Configure proper TypeScript paths for component imports
- Set up build dependencies between packages

**Development Workflow:**
- Hot reload should work with `@flux/ui` changes
- Build process should handle cross-package dependencies
- Testing should work across monorepo boundaries

## Success Metrics

1. **Content Parity**: All 25 legacy files successfully migrated
2. **Component Functionality**: All Vue components replaced with React equivalents
3. **Performance**: Page load times ≤ legacy VitePress site
4. **Developer Experience**: Hot reload and build times remain fast
5. **User Experience**: Enhanced interactivity through React components

## Timeline Estimate

- **Phase 2 (Content)**: 2-3 days
- **Phase 3 (Components)**: 3-4 days
- **Phase 4 (Enhancement)**: 2-3 days
- **Phase 5 (Configuration)**: 1 day
- **QA & Polish**: 1-2 days

**Total Estimated Time**: 9-13 days

---

*This migration leverages the architectural strengths of both Starlight's documentation framework and the `@flux/ui` React 19 component library to create a superior documentation experience.*
