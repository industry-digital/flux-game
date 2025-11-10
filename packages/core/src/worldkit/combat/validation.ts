import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { SessionStrategy } from '~/types/entity/session';
import { CombatSession } from '~/types/combat';
import { ErrorCode } from '~/types/error';

/**
 * Higher-order function that ensures the command has a valid combat session
 * Validates that:
 * 1. The command contains a session field
 * 2. The session exists in the world projection
 * 3. The session is a combat session
 * 4. The actor is actually in the combat session
 */
export function withExistingCombatSession<TCommand extends Command>(
  reducer: (context: TransformerContext, command: TCommand, session: CombatSession) => TransformerContext
): PureReducer<TransformerContext, TCommand> {
  return (context: TransformerContext, command: TCommand) => {
    // Check that command has a session field
    if (!command.session) {
      context.declareError(ErrorCode.INVALID_SESSION, command.id);
      return context;
    }

    // Check that the session exists in the world
    const session = context.world.sessions[command.session];
    if (!session) {
      context.declareError(ErrorCode.INVALID_SESSION, command.id);
      return context;
    }

    // Check that it's a combat session
    if (session.strategy !== SessionStrategy.COMBAT) {
      context.declareError(ErrorCode.INVALID_SESSION, command.id);
      return context;
    }

    const combatSession = session as CombatSession;

    // Check that the actor is actually in this combat session
    const actorCombatant = combatSession.data.combatants.get(command.actor);
    if (!actorCombatant) {
      context.declareError(ErrorCode.FORBIDDEN, command.id);
      return context;
    }

    // All validations passed, call the wrapped reducer
    return reducer(context, command, combatSession);
  };
}

/**
 * Higher-order function that prevents cross-session targeting
 * Ensures actors can only target others in the same combat session
 * Works with the new stateless approach where session ID is in the command
 */
export function withPreventCrossSessionTargeting<TCommand extends Command>(
  reducer: (context: TransformerContext, command: TCommand, session: CombatSession) => TransformerContext,
  targetOptional: boolean = false
): (context: TransformerContext, command: TCommand, session: CombatSession) => TransformerContext {
  return (context: TransformerContext, command: TCommand, session: CombatSession) => {
    const target = (command as any).args?.target as ActorURN | undefined;

    // If target is optional and not provided, validation passes
    if (!target && targetOptional) {
      return reducer(context, command, session);
    }

    // If target is required but not provided, validation fails
    if (!target && !targetOptional) {
      context.declareError(`${command.type}: Target is required`, command.id);
      return context;
    }

    // Check if target exists in the same combat session
    const targetCombatant = session.data.combatants.get(target!);
    if (!targetCombatant) {
      context.declareError(`${command.type}: Target not found in combat session`, command.id);
      return context;
    }

    return reducer(context, command, session);
  };
}
