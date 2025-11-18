import { ActorDidGainAmmo, ActorDidLoseAmmo } from '~/types/event';
import { TemplateFunction } from '~/types/narrative';
import { AmmoSchemaURN } from '~/types/taxonomy';
import { Locale } from '~/types/i18n';
import { TransformerContext } from '~/types/handler';

/**
 * Formats quantity with proper pluralization using schema translations
 * Zero-allocation implementation using direct string concatenation
 */
const formatQuantity = (context: TransformerContext, quantity: number, schemaUrn: AmmoSchemaURN): string => {
  const translation = context.getSchemaTranslation(Locale.en_US, schemaUrn);

  if (quantity === 1) {
    return '1 ' + translation.name.singular;
  }

  return quantity + ' ' + translation.name.plural;
};

/**
 * Renders narrative for ammunition gain events
 */
export const narrateActorDidGainInventoryAmmo: TemplateFunction<ActorDidGainAmmo> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return { self: '', observer: '' };
  }

  const { schema, quantity, source } = event.payload;
  const formattedQuantity = formatQuantity(context, quantity, schema);

  let selfVerb: string;
  let observerVerb: string;

  switch (source) {
    case 'unloaded':
      selfVerb = 'unload';
      observerVerb = 'unloads';
      break;
    case 'found':
      selfVerb = 'find';
      observerVerb = 'finds';
      break;
    case 'purchased':
      selfVerb = 'acquire';
      observerVerb = 'acquires';
      break;
    default:
      selfVerb = 'gain';
      observerVerb = 'gains';
  }

  return {
    self: `You ${selfVerb} ${formattedQuantity}.`,
    observer: `${actor.name} ${observerVerb} ${formattedQuantity}.`
  };
};

/**
 * Renders narrative for ammunition loss events
 */
export const narrateActorDidLoseInventoryAmmo: TemplateFunction<ActorDidLoseAmmo> = (context, event) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return { self: '', observer: '' };
  }

  const { schema, quantity } = event.payload;
  const formattedQuantity = formatQuantity(context, quantity, schema);

  return {
    self: `You lose ${formattedQuantity}.`,
    observer: `${actor.name} loses ${formattedQuantity}.`
  };
};
