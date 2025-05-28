import { CommandType, Transformer } from '@flux';
import { CreatePlaceCommandArgs } from '~/command/CREATE_PLACE';

/**
 * Reducer for CREATE_PLACE command
 */
export const CreatePlaceCommandReducer: Transformer<
  CommandType.CREATE_PLACE,
  CreatePlaceCommandArgs
> = (context, command) => {
  return context;
};
