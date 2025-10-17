import { PureReducer, TransformerContext } from '~/types/handler';
import { RetreatCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { MovementOptions } from '~/worldkit/combat/action/factory/movement';

const DISTANCE = 'distance';
const AP = 'ap';
const MAX = 'max';

const DEFAULT_MOVEMENT_OPTIONS: MovementOptions = {
  autoDone: true, // Manual commands should auto-advance turns when AP is depleted
};

export const retreatReducer: PureReducer<TransformerContext, RetreatCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
      const { actors, sessions } = context.world;
      const actor = actors[command.actor];
      const session = sessions[command.session!];

      // Get combatant API from existing combat session (no session creation)
      const { getCombatantApi } = createCombatSessionApi(context, actor.location, session.id);
      const { retreat } = getCombatantApi(actor.id);

      switch (command.args.type) {
        case DISTANCE:
          retreat(DISTANCE, command.args.distance, command.id, DEFAULT_MOVEMENT_OPTIONS);
          break;

        case AP:
          retreat(AP, command.args.ap, command.id, DEFAULT_MOVEMENT_OPTIONS);
          break;

        case MAX:
          retreat(MAX, 0, command.id, DEFAULT_MOVEMENT_OPTIONS); // Value ignored for max movement
          break;

        default:
          // TypeScript exhaustiveness check
          context.declareError('RETREAT: Unknown movement type', command.id);
          break;
      }

      return context;
    }
  )
);
