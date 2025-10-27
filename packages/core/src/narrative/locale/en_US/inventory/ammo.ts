import { ActorDidGainAmmo, ActorDidLoseAmmo } from '~/types/event';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN, AmmoSchemaURN } from '~/types/taxonomy';
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
export const narrateActorDidGainInventoryAmmo: TemplateFunction<ActorDidGainAmmo, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  const { schema, quantity, source } = event.payload;
  const formattedQuantity = formatQuantity(context, quantity, schema);

  if (recipientId === event.actor) {
    // First person perspective - the actor gaining ammo
    switch (source) {
      case 'unloaded':
        return `You unload ${formattedQuantity}.`;
      case 'found':
        return `You find ${formattedQuantity}.`;
      case 'purchased':
        return `You acquire ${formattedQuantity}.`;
      default:
        return `You gain ${formattedQuantity}.`;
    }
  }

  // Third person perspective - other observers
  switch (source) {
    case 'unloaded':
      return `${actor.name} unloads ${formattedQuantity}.`;
    case 'found':
      return `${actor.name} finds ${formattedQuantity}.`;
    case 'purchased':
      return `${actor.name} acquires ${formattedQuantity}.`;
    default:
      return `${actor.name} gains ${formattedQuantity}.`;
  }
};

/**
 * Renders narrative for ammunition loss events
 */
export const narrateActorDidLoseInventoryAmmo: TemplateFunction<ActorDidLoseAmmo, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  const { schema, quantity } = event.payload;
  const formattedQuantity = formatQuantity(context, quantity, schema);

  if (recipientId === event.actor) {
    // First person perspective - the actor losing ammo
    return `You lose ${formattedQuantity}.`;
  }

  // Third person perspective - other observers
  return `${actor.name} loses ${formattedQuantity}.`;
};
