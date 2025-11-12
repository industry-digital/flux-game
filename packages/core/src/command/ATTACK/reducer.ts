import { PureReducer, TransformerContext } from '~/types/handler';
import { AttackCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { Team } from '~/types/combat';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession, withPreventCrossSessionTargeting } from '~/worldkit/combat/validation';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types';

const reducerCore: PureReducer<TransformerContext, AttackCommand> = (context, command, session) => {
  const { world } = context;
  const actor = world.actors[command.actor];
  const targetActor = world.actors[command.args.target];

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
};

export const attackReducer: PureReducer<TransformerContext, AttackCommand> =
  withCommandType(CommandType.ATTACK, withBasicWorldStateValidation(
    withExistingCombatSession(
      withPreventCrossSessionTargeting(
        reducerCore,
        true,
      ),
    ),
  ),
);
