import type { Language, NarrativeRecipient } from '@flux/core';

/**
 * Tools-specific narrative configuration
 */
export type NarratorConfig = {
  language: Language;
  defaultRecipient: NarrativeRecipient | 'observer';
  enableErrorLogging: boolean;
}
