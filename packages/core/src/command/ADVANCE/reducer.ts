import { PureReducer, TransformerContext } from '~/types/handler';
import { AdvanceCommand } from './types';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { withBasicWorldStateValidation } from '~/command/validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { apToDistance } from '~/worldkit/physics/movement';
import { getStatValue } from '~/worldkit/entity/actor/stats';
import { Stat } from '~/types/entity/actor';

const DISTANCE = 'distance';
const AP = 'ap';

export const advanceReducer: PureReducer<TransformerContext, AdvanceCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
      const { actors, sessions } = context.world;
      const actor = actors[command.actor];
      const session = sessions[command.session!];

      const { isNew, getCombatantApi, addCombatant, startCombat } = createCombatSessionApi(context, actor.location, session.id);

      // Execute movement
      const combatantApi = getCombatantApi(actor.id);
      const moveBy = command.args.type === DISTANCE ? DISTANCE : AP;

      // Handle max advance when distance is undefined
      let moveValue: number;
      if (command.args.distance !== undefined) {
        moveValue = command.args.distance;
      } else {
        // Calculate maximum possible movement
        if (moveBy === AP) {
          // Use all available AP
          const combatant = session.data.combatants.get(actor.id);
          if (!combatant) {
            context.declareError('ADVANCE: Actor not in combat', command.id);
            return context;
          }
          moveValue = combatant.ap.eff.cur;
        } else {
          // Calculate max distance from available AP
          const combatant = session.data.combatants.get(actor.id);
          if (!combatant) {
            context.declareError('ADVANCE: Actor not in combat', command.id);
            return context;
          }

          // Use apToDistance to convert available AP to max distance
          const power = getStatValue(actor, Stat.POW);
          const finesse = getStatValue(actor, Stat.FIN);
          const actorMassGrams = context.mass.computeActorMass(actor);
          const actorMassKg = actorMassGrams / 1000;

          moveValue = apToDistance(power, finesse, combatant.ap.eff.cur, actorMassKg);
        }
      }

      combatantApi.advance(moveBy, moveValue, undefined, command.id);

      return context;
    }
  )
);
