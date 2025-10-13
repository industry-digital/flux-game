import { lazy } from 'react';

// Lazy load tool components for better performance
const CombatTool = lazy(() => import('~/apps/combat/CombatTool').then(m => ({ default: m.CombatTool })));
const WorldGenTool = lazy(() => import('~/apps/worldgen/WorldGenTool').then(m => ({ default: m.WorldGenTool })));

export interface RouteDefinition {
  path: string;
  name: string;
  description: string;
  component: React.ComponentType;
}

export const routes: RouteDefinition[] = [
  {
    path: '/combat',
    name: 'Combat Simulator',
    description: 'Test and simulate combat scenarios',
    component: CombatTool
  },
  {
    path: '/worldgen',
    name: 'World Generator',
    description: 'Generate and edit game worlds',
    component: WorldGenTool
  }
];

export const defaultRoute = routes[0];
