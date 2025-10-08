import {
  getTemplatesForLanguage,
  Language,
  NarrativeRecipient,
  Perspective,
  TemplateFunction,
  TransformerContext,
  type WorldEvent,
} from '@flux/core';

export type NarrationConfig = {
  language: Language;
  perspective: Perspective;
};

/**
 * Default configuration for tools narrative generation
 */
const DEFAULT_NARRATION_CONFIG: NarrationConfig = {
  language: Language.en_US,
  perspective: Perspective.OBSERVER,
};

export type NarrationAPI = {
  narrateEvent: <TWorldEvent extends WorldEvent>(event: TWorldEvent, recipient: NarrativeRecipient) => ReturnType<TemplateFunction<TWorldEvent>>;
};

/**
 * Composable for narrative generation in tools
 *
 * Provides a tools-specific wrapper around @flux/core narrative templates
 * with enhanced error handling, fallbacks, and observer perspective support.
 */
export function useNarration(
  context: TransformerContext,
  config: NarrationConfig = DEFAULT_NARRATION_CONFIG,
): NarrationAPI {
  const templates = getTemplatesForLanguage(config.language);
  if (!templates) {
    throw new Error(`No templates found for language: ${config.language}`);
  }

  const narrateEvent = <TWorldEvent extends WorldEvent>(event: TWorldEvent, recipient: NarrativeRecipient) => {
    const template = templates[event.type] as TemplateFunction<TWorldEvent>;
    if (!template) {
      throw new Error(`No template found for event type ${event.type} in language ${config.language}`);
    }

    return template(context, event, recipient);
  };

  return {
    narrateEvent,
  };
}
