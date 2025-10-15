import { PureReducer, TransformerContext } from '~/types/handler';
import { RangeCommand } from './types';
import { withBasicWorldStateValidation } from '../validation';
import { withExistingCombatSession } from '~/worldkit/combat/validation';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';

export const rangeReducer: PureReducer<TransformerContext, RangeCommand> = withBasicWorldStateValidation(
  withExistingCombatSession(
    (context, command) => {
      const { actors } = context.world;
      const actor = actors[command.actor];

      const { getCombatantApi } = createCombatSessionApi(context, actor.location, command.session!);
      const combatantApi = getCombatantApi(actor.id);

      combatantApi.range(command.args.target, command.id);

      return context;
    }
  )
);
