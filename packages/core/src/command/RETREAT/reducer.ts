import { PureReducer, TransformerContext } from '~/types/handler';
import { RetreatCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';

const DISTANCE = 'distance';
const AP = 'ap';

export const retreatReducer: PureReducer<TransformerContext, RetreatCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
      const { actors, sessions } = context.world;
      const actor = actors[command.actor];
      const session = sessions[command.session!];

      // Get combatant API from existing combat session (no session creation)
      const { getCombatantApi } = createCombatSessionApi(context, actor.location, session.id);
      const combatantApi = getCombatantApi(actor.id);

      switch (command.args.type) {
        case 'distance':
          combatantApi.retreat(DISTANCE, command.args.distance, undefined, command.id);
          break;

        case 'ap':
          combatantApi.retreat(AP, command.args.ap, undefined, command.id);
          break;

        case 'max':
          // TODO: Add 'max' movement support to combatantApi.retreat method
          // This is an architectural violation - the reducer should not compute movement
          // The combat API should handle 'max' movement internally
          combatantApi.retreat(AP, combatantApi.combatant.ap.eff.cur, undefined, command.id);
          break;

        default:
          // TypeScript exhaustiveness check
          const _exhaustive: never = command.args;
          context.declareError('RETREAT: Unknown command type', command.id);
          return context;
      }

      return context;
    }
  )
);
