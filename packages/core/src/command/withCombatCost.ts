/**
 * withCombatCost - Higher-Order Transformer
 *
 * Makes general commands combat-aware by adding AP cost deduction when executed during combat.
 * Assumes composition with withExistingCombatSession() for combat context validation.
 */

import { Command } from '~/types/intent';
import { Transformer, TransformerContext } from '~/types/handler';
import { ActionCost } from '~/types/combat';
import { createCombatSessionApi } from '~/worldkit/combat/session/session';
import { roundApCostUp } from '~/worldkit/combat/tactical-rounding';
import { ErrorCode } from '~/types/error';
import { getCurrentAp } from '~/worldkit/combat/ap';

/**
 * Cost calculation function type
 */
export type CostCalculator<TCommand extends Command> = (
  context: TransformerContext,
  command: TCommand
) => ActionCost;

/**
 * Higher-order transformer that adds combat costs to general commands.
 *
 * When a command is executed during combat (indicated by command.session):
 * 1. Creates CombatSessionApi using actor location and session ID
 * 2. Gets CombatantApi for the command's actor
 * 3. Calculates cost using the provided cost function
 * 4. Validates the combatant has sufficient AP and energy
 * 5. Deducts costs through CombatantApi.deductCost()
 * 6. Executes the original command transformer
 * 7. Enhances declared events with cost information via direct mutation
 *
 * @param reducer - The original command transformer
 * @param calculateCost - Function to calculate the cost for this command
 * @returns Enhanced transformer that handles combat costs through proper API layers
 */
export function withCombatCost<TCommand extends Command>(
  reducer: Transformer<TCommand>,
  calculateCost: CostCalculator<TCommand>
): Transformer<TCommand> {
  return (context: TransformerContext, command: TCommand): TransformerContext => {
    // Get actor for location information (validated by withBasicWorldStateValidation)
    const actor = context.world.actors[command.actor];

    // Create session API using actor location and session ID
    const sessionApi = createCombatSessionApi(context, actor.location, command.session!);
    const combatantApi = sessionApi.getCombatantApi(command.actor);

    // Calculate cost
    const cost = calculateCost(context, command);
    const apCost = roundApCostUp(cost.ap ?? 0);
    const energyCost = cost.energy ?? 0;

    // Validate affordability
    if (apCost > getCurrentAp(combatantApi.combatant)) {
      context.declareError(ErrorCode.PRECONDITION_FAILED, command.id);
      return context;
    }

    // TODO: Add energy affordability check when energy costs are used
    // if (energyCost > getCurrentEnergy(actor)) { ... }

    // Deduct costs through proper API
    if (apCost > 0 || energyCost > 0) {
      combatantApi.deductCost(apCost, energyCost);
    }

    // Execute original command transformer
    const result = reducer(context, command);

    // Enhance events declared by this command with cost information via direct mutation
    const commandEvents = context.getDeclaredEventsByCommand(command.id);

    for (const event of commandEvents) {
      // Add cost to event payload via direct mutation
      if (event.payload && typeof event.payload === 'object') {
        (event.payload as any).cost = cost;
      }
    }

    return result;
  };
}
