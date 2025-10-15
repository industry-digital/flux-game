import { PureReducer, TransformerContext } from '~/types/handler';
import { AdvanceCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';

const DISTANCE = 'distance';
const AP = 'ap';

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
        case 'distance':
          combatantApi.advance(DISTANCE, command.args.distance, undefined, command.id);
          break;

        case 'ap':
          combatantApi.advance(AP, command.args.ap, undefined, command.id);
          break;

        case 'max':
          // TODO: Add 'max' movement support to combatantApi.advance method
          // This is an architectural violation - the reducer should not compute movement
          // The combat API should handle 'max' movement internally
          combatantApi.advance(AP, combatantApi.combatant.ap.eff.cur, undefined, command.id);
          break;

        default:
          // TypeScript exhaustiveness check
          const _exhaustive: never = command.args;
          context.declareError('ADVANCE: Unknown command type', command.id);
          return context;
      }

      return context;
    }
  )
);
