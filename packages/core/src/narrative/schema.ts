import { SchemaURN } from '~/types/taxonomy';
import { SchemaTranslation, SchemaTranslations, Locale } from '~/types/i18n';
import { en_US_schemaTranslations } from '~/narrative/locale/en_US/schema';

const MISSING_TRANSLATION: Readonly<SchemaTranslation> = Object.freeze({
  name: {
    singular: 'MISSING_SCHEMA_TRANSLATION',
    plural: 'MISSING_SCHEMA_TRANSLATION',
  },
  description: 'MISSING_SCHEMA_TRANSLATION',
});

const NOOP_WARN = (...args: any[]) => () => {};

const SCHEMA_TEMPLATES_BY_LOCALE: Record<Locale, SchemaTranslations> = {
  [Locale.en_US]: en_US_schemaTranslations,
};

const getSchemaTemplatesForLocale = (locale: Locale): SchemaTranslations => {
  return SCHEMA_TEMPLATES_BY_LOCALE[locale];
};

export const getSchemaTranslation = (
  locale: Locale,
  schemaUrn: SchemaURN,
  warn: (...args: any[]) => void = NOOP_WARN,
): SchemaTranslation => {
  const schemaTranslations = getSchemaTemplatesForLocale(locale);
  return resolveSchemaTranslation(schemaUrn, schemaTranslations, warn);
};

const resolveSchemaTranslation = (
  schemaUrn: SchemaURN,
  schemaTranslations: SchemaTranslations,
  warn: (...args: any[]) => void = NOOP_WARN,
): SchemaTranslation => {
  const translation = schemaTranslations[schemaUrn];
  if (!translation) {
    warn(`No translation found for schema URN: ${schemaUrn}`);
    return MISSING_TRANSLATION;
  }
  return translation;
};
