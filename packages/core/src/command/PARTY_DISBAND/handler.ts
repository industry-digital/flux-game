import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { PartyDisbandCommand, PartyDisbandCommandArgs } from './types';
import { partyDisbandReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { partyDisbandResolver } from './resolver';

export class PARTY_DISBAND implements PureHandlerInterface<TransformerContext, PartyDisbandCommand> {
  type = CommandType.PARTY_DISBAND;
  dependencies = [];
  reduce = partyDisbandReducer;
  resolve = partyDisbandResolver;
  handles = (command: Command): command is PartyDisbandCommand => {
    return isCommandOfType<CommandType.PARTY_DISBAND, PartyDisbandCommandArgs>(command, CommandType.PARTY_DISBAND);
  };
}
