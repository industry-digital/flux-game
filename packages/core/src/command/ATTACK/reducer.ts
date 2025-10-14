import { PureReducer, TransformerContext } from '~/types/handler';
import { AttackCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team, CombatSession } from '~/types/combat';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession, withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';

export const attackReducer: PureReducer<TransformerContext, AttackCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    withPreventCrossSessionTargeting(
      (context, command) => {
        const { actors } = context.world;
        const actor = actors[command.actor];
        const targetActor = actors[command.args.target];

        // Get the session from the command (already validated by withExistingCombatSession)
        const session = context.world.sessions[command.session!] as CombatSession;

        // Get combat session API for the existing session
        const { getCombatantApi, addCombatant, startCombat } = createCombatSessionApi(context, actor.location, session.id);

        // Check if this is a new combat session that needs setup
        if (session.data.combatants.size === 0) {
          // Add both actors to combat - attacker vs target
          addCombatant(actor.id, Team.ALPHA);
          addCombatant(targetActor.id, Team.BRAVO);
          startCombat(command.id);
        }

        const combatantApi = getCombatantApi(actor.id);

        // Use the combatant API's attack method which includes turn advancement
        combatantApi.attack(command.args.target, command.id);

        return context;
      },
      true, //--> Target is optional
    )
  )
);
