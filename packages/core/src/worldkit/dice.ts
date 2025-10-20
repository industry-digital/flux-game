import { RollSpecification } from '~/types/dice';

type ParsedRollSpecification = {
  numDice: number;
  dieSize: number;
  flatBonus: number;
}

const INTERNAL_PARSED_ROLL_SPECIFICATION: ParsedRollSpecification = {
  numDice: 0,
  dieSize: 0,
  flatBonus: 0,
};

function parseRollSpecification(
  spec: RollSpecification,
  output: ParsedRollSpecification = INTERNAL_PARSED_ROLL_SPECIFICATION,
): ParsedRollSpecification {
  output.numDice = 0;
  output.dieSize = 0;
  output.flatBonus = 0;

  let state = 0; // 0=numDice, 1=dieSize, 2=flatBonus
  let numDice = 0;
  let dieSize = 0;
  let flatBonus = 0;
  let hasDigits = false;

  for (let i = 0; i < spec.length; i++) {
    const char = spec[i];
    const code = spec.charCodeAt(i);

    if (code >= 48 && code <= 57) { // '0' to '9'
      hasDigits = true;
      const digit = code - 48;

      if (state === 0) {
        numDice = numDice * 10 + digit;
      } else if (state === 1) {
        dieSize = dieSize * 10 + digit;
      } else { // state === 2
        flatBonus = flatBonus * 10 + digit;
      }
    } else if (char === 'd') {
      if (state !== 0 || !hasDigits || numDice === 0) {
        throw new Error(`Invalid roll specification: ${spec}`);
      }
      state = 1;
      hasDigits = false;
    } else if (char === '+') {
      if (state !== 1 || !hasDigits || dieSize === 0) {
        throw new Error(`Invalid roll specification: ${spec}`);
      }
      state = 2;
      hasDigits = false;
    } else {
      throw new Error(`Invalid roll specification: ${spec}`);
    }
  }

  // Final validation
  if (state === 0 || !hasDigits || (state === 1 && dieSize === 0) || (state === 2 && flatBonus === 0)) {
    throw new Error(`Invalid roll specification: ${spec}`);
  }

  output.numDice = numDice;
  output.dieSize = dieSize;
  output.flatBonus = flatBonus;

  return output;
}

export type RollDiceWithRngResult = {
  values: number[];
  sum: number;
  bonus?: number;
};

export function rollDiceWithRng(
  spec: RollSpecification,
  rng: () => number,

  // Consumers may opt into reusing the same output object for performance
  output: RollDiceWithRngResult = { values: [], sum: 0, bonus: undefined },
): RollDiceWithRngResult {
  const { numDice, dieSize, flatBonus } = parseRollSpecification(spec);

  output.values.length = numDice;
  output.sum = 0;
  output.bonus = undefined;

  let sum = 0;
  for (let i = 0; i < numDice; i++) {
    const value = Math.floor(rng() * dieSize) + 1;
    output.values[i] = value;
    sum += value;
  }

  if (flatBonus) {
    sum += flatBonus;
  }

  output.sum = sum;
  output.bonus = flatBonus;

  return output;
}
