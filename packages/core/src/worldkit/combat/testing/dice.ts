import { RollResultWithoutModifiers, RollSpecification } from '~/types/dice';

export const createDiceRollResult = (dice: RollSpecification, values: number[], bonus: number = 0): RollResultWithoutModifiers => {
  const result = values.reduce((acc, value) => acc + value, 0);
  return { dice, values, result, natural: result, bonus };
};
