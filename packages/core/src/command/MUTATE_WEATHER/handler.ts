import { PureHandlerInterface, TransformerContext } from '~/types/handler';
import { MutateWeatherCommand, MutateWeatherArgs } from './types';
import { mutateWeatherReducer } from './reducer';
import { Command, CommandType } from '~/types/intent';
import { isCommandOfType } from '~/lib/intent';

export class MUTATE_WEATHER implements PureHandlerInterface<TransformerContext, MutateWeatherCommand> {
  reduce = mutateWeatherReducer;
  dependencies = [];
  handles = (command: Command): command is MutateWeatherCommand => {
    return isCommandOfType<CommandType.MUTATE_WEATHER, MutateWeatherArgs>(command, CommandType.MUTATE_WEATHER);
  };
}
