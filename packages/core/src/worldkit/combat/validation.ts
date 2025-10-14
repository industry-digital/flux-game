import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { SessionStrategy } from '~/types/session';
import { CombatSession } from '~/types/combat';

/**
 * Higher-order function that ensures the command has a valid combat session
 * Validates that:
 * 1. The command contains a session field
 * 2. The session exists in the world projection
 * 3. The session is a combat session
 */
export function withExistingCombatSession<TCommand extends Command>(
  reducer: (context: TransformerContext, command: TCommand, session: CombatSession) => TransformerContext
): PureReducer<TransformerContext, TCommand> {
  return (context: TransformerContext, command: TCommand) => {
    // Check that command has a session field
    if (!command.session) {
      context.declareError(`${command.type}: Expected combat session ID`, command.id);
      return context;
    }

    // Check that the session exists in the world
    const session = context.world.sessions[command.session];
    if (!session) {
      context.declareError(`${command.type}: Session not found: ${command.session}`, command.id);
      return context;
    }

    // Check that it's a combat session
    if (session.strategy !== SessionStrategy.COMBAT) {
      context.declareError(`${command.type}: Expected combat session, got ${session.strategy}`, command.id);
      return context;
    }

    // Pass the validated session to the wrapped reducer
    return reducer(context, command, session as CombatSession);
  };
}

/**
 * Higher-order function that prevents cross-session targeting
 * Ensures actors can only target others in the same combat session
 * Works with the new stateless approach where session context is in the command
 */
export function withPreventCrossSessionTargeting<TCommand extends Command>(
  reducer: PureReducer<TransformerContext, TCommand>,
  targetOptional: boolean = false
): PureReducer<TransformerContext, TCommand> {
  return (context: TransformerContext, command: TCommand) => {
    const target = (command as any).args?.target as ActorURN | undefined;

    // If target is optional and not provided, validation passes
    if (!target && targetOptional) {
      return reducer(context, command);
    }

    // If target is required but not provided, validation fails
    if (!target && !targetOptional) {
      context.declareError(`${command.type}: Target is required`, command.id);
      return context;
    }

    // Get the session from the command
    if (!command.session) {
      context.declareError(`${command.type}: Session required for target validation`, command.id);
      return context;
    }

    const session = context.world.sessions[command.session] as CombatSession;
    if (!session) {
      context.declareError(`${command.type}: Session not found: ${command.session}`, command.id);
      return context;
    }

    // Check if target exists in the same combat session
    const targetCombatant = session.data.combatants.get(target!);
    if (!targetCombatant) {
      context.declareError(`${command.type}: Target not found in combat session`, command.id);
      return context;
    }

    return reducer(context, command);
  };
}

/**
 * Convenience function for commands that require combat session and target validation
 * Composes withRequiredCombatSession and withPreventCrossSessionTargeting
 */
export function withCombatSessionAndTarget<TCommand extends Command>(
  reducer: PureReducer<TransformerContext, TCommand>,
  targetOptional: boolean = false
): PureReducer<TransformerContext, TCommand> {
  return withExistingCombatSession(
    withPreventCrossSessionTargeting(reducer, targetOptional)
  );
}
