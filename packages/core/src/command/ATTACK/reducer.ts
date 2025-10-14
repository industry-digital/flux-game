import { PureReducer, TransformerContext } from '~/types/handler';
import { AttackCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';

export const attackReducer: PureReducer<TransformerContext, AttackCommand> = withBasicWorldStateValidation(
  withPreventCrossSessionTargeting(
    (context, command) => {
      const { actors } = context.world;
      const actor = actors[command.actor];
      const targetActor = actors[command.args.target];

      // Create or get combat session
      const { isNew, getCombatantApi, addCombatant, startCombat } = createCombatSessionApi(context, actor.location, command.session);

      if (isNew) {
        // Add both actors to combat - attacker vs target
        addCombatant(actor.id, Team.ALPHA);
        addCombatant(targetActor.id, Team.BRAVO);
        startCombat(command.id);
      }

      const combatantApi = getCombatantApi(actor.id);

      // Use the combatant API's attack method which includes turn advancement
      combatantApi.attack(command.args.target, command.id);

      return context;
    }
  )
);
