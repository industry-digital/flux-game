import { PureReducer, TransformerContext } from '~/types/handler';
import { AdvanceCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';
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

      const { isNew, getCombatantApi, addCombatant, startCombat } = createCombatSessionApi(context, actor.location, session.id);

      // Handle combat initiation if targeting and session is new
      if (command.args.target && isNew) {
        const targetActor = actors[command.args.target];
        if (!targetActor) {
          context.declareError('ADVANCE: Target not found', command.id);
          return context;
        }

        addCombatant(actor.id, Team.ALPHA);
        addCombatant(targetActor.id, Team.BRAVO);
        startCombat(command.id);
      }

      // Execute movement
      const combatantApi = getCombatantApi(actor.id);
      const moveBy = command.args.type === DISTANCE ? DISTANCE : AP;
      combatantApi.advance(moveBy, command.args.distance || 1, command.args.target, command.id);

      return context;
    }
  )
);
