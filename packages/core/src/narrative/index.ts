import { LanguageTemplates } from '~/types/narrative';
import { en_US } from './locale/en_US';
import { Locale } from '~/types/i18n';

// Export narrative types for external use
export type { Narrative, NarrativeSequence, NarrativeSequenceItem, TemplateFunction } from '~/types/narrative';

export const SUPPORTED_LANGUAGES: Readonly<Locale[]> = Object.freeze(Object.values(Locale));

export const languageRegistry: Record<Locale, LanguageTemplates> = {
  en_US,
};

/**
 * Get narrative templates for a specific language
 * Falls back to English if language not found
 */
export const getTemplatesForLocale = (locale: Locale): LanguageTemplates => {
  const templates = languageRegistry[locale];
  if (!templates) {
    throw new Error(`Templates for language not found: ${locale}`);
  }
  return templates;
};
