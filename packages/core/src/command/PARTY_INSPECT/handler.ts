import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { PartyInspectCommand, PartyInspectCommandArgs } from './types';
import { partyInspectReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';
import { partyInspectResolver } from './resolver';

export class PARTY_INSPECT implements PureHandlerInterface<TransformerContext, PartyInspectCommand> {
  dependencies = [];
  reduce = partyInspectReducer;
  resolve = partyInspectResolver;
  handles = (command: Command): command is PartyInspectCommand => {
    return isCommandOfType<CommandType.PARTY_INSPECT, PartyInspectCommandArgs>(command, CommandType.PARTY_INSPECT);
  };
}
