/**
 * Combat narrative renderers for WorldEvents
 *
 * These functions generate embedded narratives for combat WorldEvents,
 * following the universal WorldEvent architecture pattern.
 */

export { renderAttackNarrative } from './attack-narrative';
export { renderMovementNarrative } from './movement-narrative';
export { renderDefendNarrative } from './defend-narrative';
export { renderTargetNarrative } from './target-narrative';
export { renderTurnEndNarrative } from './turn-narrative';

export type { NarrativeRenderer } from './types';
