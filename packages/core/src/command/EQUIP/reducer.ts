import { PureReducer, TransformerContext } from '~/types/handler';
import { EquipCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { WeaponItemURN, WeaponSchemaURN } from '~/types/taxonomy';
import { createWorldEvent } from '~/worldkit/event';
import { ActorDidEquipWeapon, EventType } from '~/types/event';

export const equipReducer: PureReducer<TransformerContext, EquipCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
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

      if (!item.schema.startsWith('flux:schema:weapon:')) {
        context.declareError(
          `Item ${command.args.item} is not a weapon`,
          command.id
        );
        return context;
      }

      context.equipmentApi.equipWeapon(actor, item.id as WeaponItemURN);

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
    }
  )
);
