import { RollSpecification } from '~/types/dice';
import { PotentiallyImpureOperations } from '~/types/handler';

export type RollDiceOptions = PotentiallyImpureOperations;

export const ROLL_SPECIFICATION_PATTERN = /(\d+)d(\d+)/;
export type ParsedRollSpecification = {
  numDice: number;
  dieSize: number;
}

export function parseRollSpecification(spec: RollSpecification): ParsedRollSpecification {
  const match = spec.match(ROLL_SPECIFICATION_PATTERN);
  if (!match) {
    throw new Error(`Invalid roll specification: ${spec}`);
  }
  return { numDice: Number(match[1]), dieSize: Number(match[2]) };
}

export type RollDiceWithRngResult = {
  values: number[];
  sum: number;
}

export function rollDiceWithRng(
  spec: RollSpecification,
  rng: () => number,
): RollDiceWithRngResult {
  const { numDice, dieSize } = parseRollSpecification(spec);
  const values: number[] = Array(numDice);
  let sum = 0;
  for (let i = 0; i < numDice; i++) {
    const value = Math.floor(rng() * dieSize) + 1;
    values[i] = value;
    sum += value;
  }
  return { values, sum };
}
