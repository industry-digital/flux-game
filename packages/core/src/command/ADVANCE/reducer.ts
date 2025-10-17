import { PureReducer, TransformerContext } from '~/types/handler';
import { AdvanceCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { MovementOptions } from '~/worldkit/combat/action/advance';

const DISTANCE = 'distance';
const AP = 'ap';
const MAX = 'max';

const DEFAULT_MOVEMENT_OPTIONS: MovementOptions = {
  autoDone: true,
};

export const advanceReducer: PureReducer<TransformerContext, AdvanceCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
      const { actors, sessions } = context.world;
      const actor = actors[command.actor];
      const session = sessions[command.session!];

      // Get combatant API from existing combat session (no session creation)
      const { getCombatantApi } = createCombatSessionApi(context, actor.location, session.id);
      const combatantApi = getCombatantApi(actor.id);

      switch (command.args.type) {
        case DISTANCE:
          combatantApi.advance(DISTANCE, command.args.distance, command.id, DEFAULT_MOVEMENT_OPTIONS);
          break;

        case AP:
          combatantApi.advance(AP, command.args.ap, command.id, DEFAULT_MOVEMENT_OPTIONS);
          break;

        case MAX:
          combatantApi.advance(MAX, 0, command.id, DEFAULT_MOVEMENT_OPTIONS); // Value ignored for max movement
          break;

        default:
          context.declareError('ADVANCE: Unknown command type', command.id);
          break;
      }

      return context;
    }
  )
);
