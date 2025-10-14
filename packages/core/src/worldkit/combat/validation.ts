import { PureReducer, TransformerContext } from '~/types/handler';
import { Command } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { createActorSessionApi } from '~/worldkit/entity/actor/session';
import { SessionStrategy } from '~/types/session';
import { CombatSession } from '~/types/combat';

/**
 * Get the actor's current combat session, if any
 */
function getActorCombatSession(context: TransformerContext, actorId: ActorURN): CombatSession | null {
  const actor = context.world.actors[actorId];
  if (!actor) return null;

  const actorSessionApi = createActorSessionApi(context.world.sessions);
  return actorSessionApi.getRunningSessionByStrategy(actor, SessionStrategy.COMBAT) as CombatSession;
}

/**
 * Higher-order function that ensures the actor has an active combat session
 */
export function withRequiredCombatSession<TCommand extends Command>(
  reducer: PureReducer<TransformerContext, TCommand>
): PureReducer<TransformerContext, TCommand> {
  return (context: TransformerContext, command: TCommand) => {
    const session = getActorCombatSession(context, command.actor as ActorURN);
    if (!session) {
      context.declareError(`${command.type}: Combat session required`, command.id);
      return context;
    }

    return reducer(context, command);
  };
}

/**
 * Higher-order function that prevents cross-session targeting
 * Ensures actors can only target others in the same combat session or no session
 * This is the universal targeting validation that handles all cases
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

    const actorSession = getActorCombatSession(context, command.actor as ActorURN);
    const targetSession = getActorCombatSession(context, target!);

    // Both must be in the same session (including both being null/no session)
    if (actorSession?.id !== targetSession?.id) {
      if (actorSession && targetSession) {
        context.declareError(`${command.type}: Cannot target actors in different combat sessions`, command.id);
      } else if (!actorSession && targetSession) {
        context.declareError(`${command.type}: Cannot target actors already in combat`, command.id);
      } else if (actorSession && !targetSession) {
        context.declareError(`${command.type}: Cannot target actors outside your combat session`, command.id);
      }
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
  return withRequiredCombatSession(
    withPreventCrossSessionTargeting(reducer, targetOptional)
  );
}
