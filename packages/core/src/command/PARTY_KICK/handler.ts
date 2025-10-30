import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { PartyKickCommand, PartyKickCommandArgs } from './types';
import { partyKickReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { partyKickResolver } from './resolver';

export class PARTY_KICK implements PureHandlerInterface<TransformerContext, PartyKickCommand> {
  type = CommandType.PARTY_KICK;
  dependencies = [];
  reduce = partyKickReducer;
  resolve = partyKickResolver;
  handles = (command: Command): command is PartyKickCommand => {
    return isCommandOfType<CommandType.PARTY_KICK, PartyKickCommandArgs>(command, CommandType.PARTY_KICK);
  };
}
