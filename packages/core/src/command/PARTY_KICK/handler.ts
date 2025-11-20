import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { PartyKickCommand } from './types';
import { partyKickReducer } from './reducer';
import { CommandType } from '~/types/intent';
import { partyKickResolver } from './resolver';

export class PARTY_KICK implements PureHandlerInterface<TransformerContext, PartyKickCommand> {
  type = CommandType.PARTY_KICK;
  dependencies = [];
  reduce = partyKickReducer;
  resolve = partyKickResolver;
}
