import { PureReducer, TransformerContext } from '~/types/handler';
import { CleanupEphemeralEntitiesCommand } from './types';
import { withSystemActorValidation } from '../validation';
import { withCommandType } from '~/command/withCommandType';
import { CommandType } from '~/types/intent';
import { EventType } from '~/types/event';
import { ExpirationReason } from '~/types/entity/group';

const reducerCore: PureReducer<TransformerContext, CleanupEphemeralEntitiesCommand> = (context, command) => {
  const { partyApi, declareEvent } = context;

  // Delegate all business logic to domain expert
  const expiredParties = partyApi.cleanupExpiredParties();

  for (const party of expiredParties) {
    declareEvent({
      type: EventType.PARTY_DID_EXPIRE,
      trace: command.trace || command.id,
      actor: command.actor,
      location: command.location!,
      payload: {
        partyId: party.id,
        reason: ExpirationReason.EXPIRED,
      }
    });
  }

  return context;
};

export const cleanupEphemeralEntitiesReducer: PureReducer<TransformerContext, CleanupEphemeralEntitiesCommand> =
  withCommandType(CommandType.CLEANUP_EPHEMERAL_ENTITIES,
    withSystemActorValidation(
      reducerCore,
    ),
  );
