import { LanguageTemplates } from '~/types/narrative';
import { en_US } from './i18n/en_US';

export enum Language {
  'en_US' = 'en_US',
}

export const SUPPORTED_LANGUAGES: Readonly<Language[]> = Object.freeze(Object.values(Language));

export const languageRegistry: Record<Language, LanguageTemplates> = {
  en_US,
};

/**
 * Get narrative templates for a specific language
 * Falls back to English if language not found
 */
export const getTemplatesForLanguage = (language: Language): LanguageTemplates => {
  const templates = languageRegistry[language];
  if (!templates) {
    throw new Error(`Templates for language not found: ${language}`);
  }
  return templates;
};
