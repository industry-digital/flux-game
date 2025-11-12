import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { UnequipCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { withCombatCost } from '../withCombatCost';
import { WeaponSchemaURN } from '~/types/taxonomy';
import { EventType } from '~/types/event';
import { ActionCost } from '~/types/combat';
import { ErrorCode } from '~/types/error';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { parseSessionStrategyFromUrn } from '~/worldkit/session/util';
import { SessionStrategy } from '~/types/entity/session';

/**
 * Core UNEQUIP command logic (without combat costs)
 */
const unequipOutsideOfCombat: Transformer<UnequipCommand> = (context, command) => {
  const { world, failed, equipmentApi, declareEvent } = context;
  const actor = world.actors[command.actor];
  const item = actor.inventory.items[command.args.item];

  if (!item) {
    return failed(command.id, ErrorCode.ITEM_NOT_FOUND);
  }

  if (item.schema.startsWith('flux:schema:weapon:')) {
    // Check if the weapon is actually equipped
    const equippedWeaponId = equipmentApi.getEquippedWeapon(actor);
    if (equippedWeaponId !== item.id) {
      // Forbidden to unequip a weapon that is not equipped
      return failed(command.id, ErrorCode.FORBIDDEN);
    }

    equipmentApi.unequip(actor, item.id);

    declareEvent({
      type: EventType.ACTOR_DID_UNEQUIP_WEAPON,
      trace: command.id,
      location: command.location!,
      actor: command.actor!,
      payload: {
        itemId: item.id,
        schema: item.schema as WeaponSchemaURN,
      },
    });

    return context;
  }

  context.declareError(ErrorCode.INVALID_TARGET, command.id);

  return context;
};

const FREE_ACTION_COST: Readonly<ActionCost> = Object.freeze({ energy: 0, ap: 0 });

/**
 * Calculate AP cost for unequipping a weapon
 */
const calculateUnequipCost = (context: TransformerContext, command: UnequipCommand): ActionCost => {
  return FREE_ACTION_COST;
};

const reducerCore: PureReducer<TransformerContext, UnequipCommand> = (context, command) => {
  const { world } = context;
  const actor = world.actors[command.actor];
  let inCombat: boolean = false;

  if (actor.session) {
    inCombat = parseSessionStrategyFromUrn(actor.session) === SessionStrategy.COMBAT;
  }

  if (!inCombat) {
    return unequipOutsideOfCombat(context, command);
  }

  // If session provided, validate combat context and apply costs
  return withExistingCombatSession(
    withCombatCost(
      unequipOutsideOfCombat,
      calculateUnequipCost
    )
  )(context, command);
};

/**
 * UNEQUIP command reducer with conditional combat cost support
 * Works both in and out of combat, but only applies AP costs when in combat
 */
export const unequipReducer: Transformer<UnequipCommand> =
  withCommandType(CommandType.UNEQUIP,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );
