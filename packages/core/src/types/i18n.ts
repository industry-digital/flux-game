import { SchemaURN } from '~/types/taxonomy';

export enum Locale {
  en_US = 'en_US',
}

export type SchemaTranslation = {
  name: {
    singular: string;
    plural: string;
  };
  description?: string;
};

export type SchemaTranslations = Record<SchemaURN, SchemaTranslation>;
