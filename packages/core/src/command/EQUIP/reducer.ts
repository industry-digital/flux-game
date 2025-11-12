import { PureReducer, Transformer, TransformerContext } from '~/types/handler';
import { EquipCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { withCombatCost } from '../withCombatCost';
import { WeaponSchemaURN } from '~/types/taxonomy';
import { EventType } from '~/types/event';
import { ActionCost } from '~/types/combat';
import { WeaponSchema } from '~/types/schema/weapon';
import { ErrorCode } from '~/types/error';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { parseSessionStrategyFromUrn } from '~/worldkit/session/util';
import { SessionStrategy } from '~/types/entity/session';

/**
 * Core EQUIP command logic (without combat costs)
 */
const equipOutsideOfCombat: Transformer<EquipCommand> = (context, command) => {
  const { world, failed, declareEvent, equipmentApi } = context;
  const actor = world.actors[command.actor];
  const item = actor.inventory.items[command.args.item];

  if (!item) {
    return failed(command.id, ErrorCode.ITEM_NOT_FOUND);
  }

  if (!item.schema.startsWith('flux:schema:weapon:')) {
    return failed(command.id, ErrorCode.INVALID_TARGET);
  }

  equipmentApi.equip(actor, item.id);

  declareEvent({
    type: EventType.ACTOR_DID_EQUIP_WEAPON,
    trace: command.id,
    location: command.location!,
    actor: command.actor!,
    payload: {
      itemId: item.id,
      schema: item.schema as WeaponSchemaURN,
    },
  });

  return context;
};

/**
 * Calculate AP cost for equipping a weapon
 */
const calculateEquipCost = (context: TransformerContext, command: EquipCommand): ActionCost => {
  const { world, schemaManager } = context;
  const actor = world.actors[command.actor];
  const item = actor.inventory.items[command.args.item]!;
  const schema = schemaManager.getSchema(item.schema as WeaponSchemaURN) as WeaponSchema;
  const setupTimeSeconds = (schema.timers.setup ?? 0 ) / 1_000;
  return { energy: 0, ap: setupTimeSeconds };
};

const reducerCore: PureReducer<TransformerContext, EquipCommand> = (context, command) => {
  const actor = context.world.actors[command.actor];

  let inCombat: boolean = false;

  if (actor.session) {
    inCombat = parseSessionStrategyFromUrn(actor.session) === SessionStrategy.COMBAT;
  }

  if (!inCombat) {
    return equipOutsideOfCombat(context, command);
  }

  // If session provided, validate combat context and apply costs
  return withExistingCombatSession(
    withCombatCost(
      equipOutsideOfCombat,
      calculateEquipCost
    )
  )(context, command);
};

/**
 * EQUIP command reducer with conditional combat cost support
 * Works both in and out of combat, but only applies AP costs when in combat
 */
export const equipReducer: Transformer<EquipCommand> =
  withCommandType(CommandType.EQUIP,
    withBasicWorldStateValidation(
      reducerCore,
    ),
  );
