import { PureReducer, TransformerContext } from '~/types/handler';
import { AdvanceCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';

export const advanceReducer: PureReducer<TransformerContext, AdvanceCommand> = withBasicWorldStateValidation(
  withPreventCrossSessionTargeting(
    (context, command) => {
      const { actors } = context.world;
      const actor = actors[command.actor];
      const targetActor = actors[command.args.target!];

      // Create or get combat session
      const { isNew, getCombatantApi, addCombatant, startCombat } = createCombatSessionApi(context, actor.location, command.session);

      if (isNew) {
        if (!targetActor) {
          context.declareError('ADVANCE: Target not found', command.id);
          return context;
        }

        // Add both actors to combat - advancer vs target
        addCombatant(actor.id, Team.ALPHA);
        addCombatant(targetActor.id, Team.BRAVO);
        startCombat(command.id);
      }

      const combatantApi = getCombatantApi(actor.id);
      const moveBy = command.args.type === 'distance' ? 'distance' : 'ap';
      combatantApi.advance(moveBy, command.args.distance || 1, command.args.target, command.id);

      return context;
    }
  )
);
