/**
 * Global Narrative Utilities
 *
 * Higher-order functions for common narrative patterns that apply across
 * all event types, not just combat-specific events.
 */

import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';
import { Actor } from '~/types/entity/actor';
import { TransformerContext } from '~/types/handler';
import { WorldEvent } from '~/types/event';
import { WellKnownActor } from '~/types/actor';

// ============================================================================
// COMPOSABLE NARRATIVE UTILITIES
// ============================================================================

/**
 * Filters out system events - returns empty string for system-generated events
 */
export function withSystemEventFilter<T extends WorldEvent>(
  baseTemplate: TemplateFunction<T, ActorURN>
): TemplateFunction<T, ActorURN> {
  return (context, event, actorId) => {
    if (event.actor === WellKnownActor.SYSTEM) return '';
    return baseTemplate(context, event, actorId);
  };
}

/**
 * Validates that the event's actor exists in the world
 */
export function withActorValidation<T extends WorldEvent>(
  baseTemplate: TemplateFunction<T, ActorURN>
): TemplateFunction<T, ActorURN> {
  return (context, event, actorId) => {
    const actor = context.world.actors[event.actor];
    if (!actor) return '';
    return baseTemplate(context, event, actorId);
  };
}

/**
 * Validates that both actor and target exist for interaction events
 */
export function withActorAndTargetValidation<T extends WorldEvent & { payload: { target: ActorURN } }>(
  baseTemplate: TemplateFunction<T, ActorURN>
): TemplateFunction<T, ActorURN> {
  return (context, event, actorId) => {
    const actor = context.world.actors[event.actor];
    const target = context.world.actors[event.payload.target];
    if (!actor || !target) return '';
    return baseTemplate(context, event, actorId);
  };
}

// Builder-style HOFs removed - use composable utilities instead

/**
 * Ensures only system events are processed - filters out non-system events
 */
export function withSystemEventOnly<T extends WorldEvent & { actor: WellKnownActor.SYSTEM }>(
  baseTemplate: TemplateFunction<T, ActorURN>
): TemplateFunction<T, ActorURN> {
  return (context, event, actorId) => {
    if (event.actor !== WellKnownActor.SYSTEM) return '';
    return baseTemplate(context, event, actorId);
  };
}

// ============================================================================
// CONVENIENCE COMBINATIONS
// ============================================================================

/**
 * Common combination: filters system events + validates actor exists
 */
export function withUserEventValidation<T extends WorldEvent & { actor: ActorURN }>(
  baseTemplate: TemplateFunction<T, ActorURN>
): TemplateFunction<T, ActorURN> {
  return withSystemEventFilter(withActorValidation(baseTemplate));
}

/**
 * Common combination: filters system events + validates actor and target exist
 */
export function withInteractionValidation<T extends WorldEvent & { actor: ActorURN; payload: { target: ActorURN } }>(
  baseTemplate: TemplateFunction<T, ActorURN>
): TemplateFunction<T, ActorURN> {
  return withSystemEventFilter(withActorAndTargetValidation(baseTemplate));
}

// ============================================================================
// PERSPECTIVE UTILITIES
// ============================================================================

/**
 * Creates a simple perspective-aware template from self/other text
 */
export function createPerspectiveTemplate<T extends WorldEvent & { actor: ActorURN }>(
  selfText: string,
  otherText: (actorName: string) => string
): TemplateFunction<T, ActorURN> {
  return (context, event, actorId) => {
    const actor = context.world.actors[event.actor];
    if (!actor) return '';

    return actorId === event.actor
      ? selfText
      : otherText(actor.name);
  };
}

/**
 * Creates a system event template with simple narrative builder
 */
export function createSystemTemplate<T extends WorldEvent & { actor: WellKnownActor.SYSTEM }>(
  narrativeBuilder: (context: TransformerContext, event: T) => string
): TemplateFunction<T, ActorURN> {
  return withSystemEventOnly((context, event, actorId) => {
    return narrativeBuilder(context, event);
  });
}

/**
 * Creates a system event template with perspective based on payload actor
 */
export function createSystemPerspectiveTemplate<T extends WorldEvent & { actor: WellKnownActor.SYSTEM }>(
  getSubjectActor: (event: T) => ActorURN,
  selfText: string,
  otherText: (actorName: string) => string
): TemplateFunction<T, ActorURN> {
  return withSystemEventOnly((context, event, actorId) => {
    const subjectActorId = getSubjectActor(event);
    const actor = context.world.actors[subjectActorId];
    if (!actor) return '';

    return actorId === subjectActorId ? selfText : otherText(actor.name);
  });
}

/**
 * Creates a system event template with perspective based on payload actor (with dynamic text)
 */
export function createDynamicSystemPerspectiveTemplate<T extends WorldEvent & { actor: WellKnownActor.SYSTEM }>(
  getSubjectActor: (event: T) => ActorURN,
  selfText: (context: TransformerContext, event: T) => string,
  otherText: (context: TransformerContext, event: T, actorName: string) => string
): TemplateFunction<T, ActorURN> {
  return withSystemEventOnly((context, event, actorId) => {
    const subjectActorId = getSubjectActor(event);
    const actor = context.world.actors[subjectActorId];
    if (!actor) return '';

    return actorId === subjectActorId
      ? selfText(context, event)
      : otherText(context, event, actor.name);
  });
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely gets weapon information for an actor
 * Returns both the display name and the full weapon schema
 * @deprecated - Schemas don't have `name` field anymore
 */
export function getWeaponInfo(context: TransformerContext, actor: Actor): { name: string; schema: any } {
  const weapon = context.equipmentApi.getEquippedWeaponSchema(actor);
  return {
    name: weapon?.name || 'weapon',
    schema: weapon
  };
}

/**
 * Formats a distance with appropriate units
 */
export function formatDistance(distance: number): string {
  return `${distance}m`;
}

/**
 * Formats an AP cost with appropriate precision
 */
export function formatApCost(ap: number): string {
  return ap % 1 === 0 ? `${ap}` : `${ap.toFixed(1)}`;
}
