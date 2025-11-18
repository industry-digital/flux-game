import { EventType, WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';

/**
 * Two-perspective narrative structure
 *
 * Events are narrated from two perspectives:
 * - self: First-person perspective for the event actor ("You strike Bob")
 * - observer: Third-person perspective for everyone else ("Alice strikes Bob")
 *
 * This model works because important perspective switches (e.g., damage received)
 * happen via separate events where the affected party IS the event actor.
 *
 * Example flow:
 * 1. ACTOR_DID_ATTACK (actor: Alice) → Bob sees observer perspective
 * 2. ACTOR_WAS_ATTACKED (actor: Bob) → Bob sees self perspective with damage
 */
export type Narrative = {
  self: string;
  observer: string;
};

/**
 * Narrative sequence item for dramatic multi-step events
 */
export type NarrativeSequenceItem = Narrative & { delay: number };

/**
 * Narrative sequence for events that unfold over time
 */
export type NarrativeSequence = NarrativeSequenceItem[];

/**
 * Template function signature
 *
 * Pure function that transforms a WorldEvent into a multi-perspective Narrative.
 * Returns either a single Narrative or a NarrativeSequence for dramatic events.
 *
 * @template TEvent - The specific WorldEvent type this template handles
 * @template TNarrative - The return type (Narrative or NarrativeSequence), defaults to Narrative
 */
export type TemplateFunction<
  TEvent extends WorldEvent = WorldEvent,
  TNarrative extends (Narrative | NarrativeSequence) = Narrative,
> = (
  context: TransformerContext,
  event: TEvent,
  ...args: any[]
) => TNarrative;

/**
 * Complete language template interface
 *
 * Every language module must implement this exact interface to ensure
 * complete narrative coverage across all supported game events.
 *
 * Templates can return either Narrative or NarrativeSequence depending on the event type.
 */
export type LanguageTemplates = {
  [K in EventType]: TemplateFunction<Extract<WorldEvent, { type: K }>, Narrative | NarrativeSequence>;
};

export type LanguageTemplatesResolver = () => LanguageTemplates;
