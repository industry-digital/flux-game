import { Command } from '~/types/intent';
import * as typia from 'typia';

export const validateCommand = typia.createValidate<Command>();
