import { RollResult, RollSpecification } from '~/types/dice';
import { AppliedModifiers } from '~/types/modifier';

export const createDiceRollResult = (dice: RollSpecification, values: number[], mods?: AppliedModifiers): RollResult => {
  const result = values.reduce((acc, value) => acc + value, 0);
  return { dice, values, result, mods, natural: result };
};
