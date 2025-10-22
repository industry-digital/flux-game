import { Transformer, TransformerContext } from '~/types/handler';
import { UnequipCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { withCombatCost } from '../withCombatCost';
import { WeaponSchemaURN } from '~/types/taxonomy';
import { createWorldEvent } from '~/worldkit/event';
import { ActorDidUnequipWeapon, EventType } from '~/types/event';
import { ActionCost } from '~/types/combat';

const ITEM_NOT_EQUIPPED_ERROR = `\`UNEQUIP\`: Item is not equipped`;

/**
 * Core UNEQUIP command logic (without combat costs)
 */
const unequipReducerCore: Transformer<UnequipCommand> = (context, command) => {
  const { actors } = context.world;
  const actor = actors[command.actor];
  const item = actor.inventory.items[command.args.item];

  if (!item) {
    context.declareError(
      `Item ${command.args.item} not found in actor ${actor.id}'s inventory`,
      command.id
    );
    return context;
  }

  if (item.schema.startsWith('flux:schema:weapon:')) {
    // Check if the weapon is actually equipped
    const equippedWeaponId = context.equipmentApi.getEquippedWeapon(actor);
    if (equippedWeaponId !== item.id) {
      context.declareError(ITEM_NOT_EQUIPPED_ERROR, command.id);
      return context;
    }

    context.equipmentApi.unequipWeapon(actor, item.id);

    const unequipEvent: ActorDidUnequipWeapon = createWorldEvent({
      type: EventType.ACTOR_DID_UNEQUIP_WEAPON,
      trace: command.id,
      location: command.location!,
      actor: command.actor!,
      payload: {
        itemId: item.id,
        schema: item.schema as WeaponSchemaURN,
      },
    });

    context.declareEvent(unequipEvent);

    return context;
  }

  context.declareError(ITEM_NOT_EQUIPPED_ERROR, command.id);

  return context;
};

const FREE_ACTION_COST: Readonly<ActionCost> = Object.freeze({ energy: 0, ap: 0 });

/**
 * Calculate AP cost for equipping a weapon
 */
const calculateUnequipCost = (context: TransformerContext, command: UnequipCommand): ActionCost => {
  return FREE_ACTION_COST;
};

export const unequipReducer: Transformer<UnequipCommand> = withBasicWorldStateValidation(
  (context, command) => {
    // If no session provided, execute without combat costs (out of combat)
    if (!command.session) {
      return unequipReducerCore(context, command);
    }

    // If session provided, validate combat context and apply costs
    return withExistingCombatSession(
      withCombatCost(
        unequipReducerCore,
        calculateUnequipCost
      )
    )(context, command);
  }
);
