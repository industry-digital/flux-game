import { PureReducer, TransformerContext } from '~/types/handler';
import { AdvanceCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';

const DISTANCE = 'distance';
const AP = 'ap';
const MAX = 'max';

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
          combatantApi.advance(DISTANCE, command.args.distance, undefined, command.id);
          break;

        case AP:
          combatantApi.advance(AP, command.args.ap, undefined, command.id);
          break;

        case MAX:
          combatantApi.advance(MAX, 0, undefined, command.id); // Value ignored for max movement
          break;

        default:
          context.declareError('ADVANCE: Unknown command type', command.id);
          break;
      }

      return context;
    }
  )
);
