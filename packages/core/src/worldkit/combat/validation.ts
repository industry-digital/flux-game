import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { ActorURN, SessionURN } from '~/types/taxonomy';
import { SessionStrategy } from '~/types/session';
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
  reducer: PureReducer<TransformerContext, TCommand>
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
    return reducer(context, command);
  };
}

/**
 * Higher-order function that prevents cross-session targeting
 * Ensures actors can only target others in the same combat session
 * Works with the new stateless approach where session ID is in the command
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
    const session = command.session ? context.world.sessions[command.session] as CombatSession : null;

    // If no session or session not found, check if both actors have no combat sessions
    if (!command.session || !session) {
      // Check if the actor has any combat sessions
      const actor = context.world.actors[command.actor];
      const targetActor = context.world.actors[target!];


      if (actor && targetActor) {
        let actorCombatSession = '';
        let targetCombatSession = '';

        // Single pass through all sessions, checking both actors
        for (const sessionId in context.world.sessions) {
          const session = context.world.sessions[sessionId as SessionURN];
          if (session && session.strategy === SessionStrategy.COMBAT) {
            // Check if actor is in this combat session
            if (!actorCombatSession && sessionId in actor.sessions) {
              actorCombatSession = sessionId;
            }
            // Check if target is in this combat session
            if (!targetCombatSession && sessionId in targetActor.sessions) {
              targetCombatSession = sessionId;
            }
            // Early exit if both found
            if (actorCombatSession && targetCombatSession) {
              break;
            }
          }
        }

        // Allow only if BOTH actors have no combat sessions
        if (!actorCombatSession && !targetCombatSession) {
          return reducer(context, command);
        }

        // Block if one actor is in combat and the other isn't
        if (actorCombatSession && !targetCombatSession) {
          context.declareError(`${command.type}: Target is outside your combat session`, command.id);
          return context;
        }

        if (!actorCombatSession && targetCombatSession) {
          context.declareError(`${command.type}: Target is already in combat`, command.id);
          return context;
        }
      }

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
 * Composes withExistingCombatSession and withPreventCrossSessionTargeting
 */
export function withCombatSessionAndTarget<TCommand extends Command>(
  reducer: PureReducer<TransformerContext, TCommand>,
  targetOptional: boolean = false
): PureReducer<TransformerContext, TCommand> {
  return withExistingCombatSession(
    withPreventCrossSessionTargeting(reducer, targetOptional)
  );
}
