import { Transformer, TransformerContext } from '~/types/handler';
import { EquipCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { withCombatCost } from '../withCombatCost';
import { WeaponSchemaURN } from '~/types/taxonomy';
import { createWorldEvent } from '~/worldkit/event';
import { ActorDidEquipWeapon, EventType } from '~/types/event';
import { ActionCost } from '~/types/combat';
import { WeaponSchema } from '~/types/schema/weapon';
import { ErrorCode } from '~/types/error';

/**
 * Core EQUIP command logic (without combat costs)
 */
const equipReducerCore: Transformer<EquipCommand> = (context, command) => {
  const { actors } = context.world;
  const actor = actors[command.actor];
  const item = actor.inventory.items[command.args.item];

  if (!item) {
    context.declareError(ErrorCode.INVALID_TARGET, command.id);
    return context;
  }

  if (!item.schema.startsWith('flux:schema:weapon:')) {
    context.declareError(ErrorCode.INVALID_TARGET, command.id);
    return context;
  }

  context.equipmentApi.equip(actor, item.id);

  const didEquipWeaponEvent: ActorDidEquipWeapon = createWorldEvent({
    type: EventType.ACTOR_DID_EQUIP_WEAPON,
    trace: command.id,
    location: command.location!,
    actor: command.actor!,
    payload: {
      itemId: item.id,
      schema: item.schema as WeaponSchemaURN,
    },
  });

  context.declareEvent(didEquipWeaponEvent);

  return context;
};

/**
 * Calculate AP cost for equipping a weapon
 */
const calculateEquipCost = (context: TransformerContext, command: EquipCommand): ActionCost => {
  const actor = context.world.actors[command.actor];
  const item = actor.inventory.items[command.args.item]!;
  const schema = context.schemaManager.getSchema(item.schema as WeaponSchemaURN) as WeaponSchema;
  const setupTimeSeconds = (schema.timers.setup ?? 0 ) / 1_000;
  return { energy: 0, ap: setupTimeSeconds };
};

/**
 * EQUIP command reducer with conditional combat cost support
 * Works both in and out of combat, but only applies AP costs when in combat
 */
export const equipReducer: Transformer<EquipCommand> = withBasicWorldStateValidation(
  (context, command) => {
    // If no session provided, execute without combat costs (out of combat)
    if (!command.session) {
      return equipReducerCore(context, command);
    }

    // If session provided, validate combat context and apply costs
    return withExistingCombatSession(
      withCombatCost(
        equipReducerCore,
        calculateEquipCost
      )
    )(context, command);
  }
);
