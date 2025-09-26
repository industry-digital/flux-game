import { Modifier, AppliedModifiers } from '~/types/modifier';

const DICE_ROLL_PATTERN = /(\d+)d(\d+)/;

export function parseDiceRoll(value: string): [number, number] {
  const [, numDice, dieSize] = value.match(DICE_ROLL_PATTERN)!.map(Number);
  return [numDice, dieSize];
}

export type ModifierComputationDependencies = {
  random: () => number;
};

export const DEFAULT_MODIFIER_COMPUTATION_OPTIONS: ModifierComputationDependencies = {
  random: () => Math.random(),
};

export function computeModifier(
  modifier: Modifier,
  {
    random = () => Math.random(),
  }: ModifierComputationDependencies = DEFAULT_MODIFIER_COMPUTATION_OPTIONS,
): number {
  if (typeof modifier.value === 'number') {
    return modifier.value;
  }

  // Dice roll
  if (DICE_ROLL_PATTERN.test(modifier.value)) {
    const [numDice, dieSize] = parseDiceRoll(modifier.value);
    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(random() * dieSize) + 1;
    }
    return total;
  }

  throw new Error(`Invalid modifier value: ${modifier.value}`);
}

export function computeSumOfModifiers(modifiers: AppliedModifiers, deps: ModifierComputationDependencies = DEFAULT_MODIFIER_COMPUTATION_OPTIONS): number {
  let total = 0;
  for (const key in modifiers) {
    const mod = modifiers[key];
    total += computeModifier(mod, deps);
  }
  return total;
}
