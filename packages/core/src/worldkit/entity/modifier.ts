import { PotentiallyImpureOperations } from '~/index';
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
  deps: ModifierComputationDependencies = DEFAULT_MODIFIER_COMPUTATION_OPTIONS,
): number {
  if (typeof modifier.value === 'number') {
    return modifier.value;
  }

  // Dice roll
  if (DICE_ROLL_PATTERN.test(modifier.value)) {
    const [numDice, dieSize] = parseDiceRoll(modifier.value);
    let total = 0;
    for (let i = 0; i < numDice; i++) {
      total += Math.floor(deps.random() * dieSize) + 1;
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

/**
 * Directly mutates the supplied `modifiers` object. It adds the modifier to the object and returns it.
 */
export function addModifier(modifiers: AppliedModifiers, modifierId: string, modifier: Modifier, deps: ModifierComputationDependencies = DEFAULT_MODIFIER_COMPUTATION_OPTIONS): AppliedModifiers {
  if (!modifiers) {
    throw new Error('Modifiers argument is required');
  }
  if (modifiers[modifierId]) {
    throw new Error(`Modifier ${modifierId} already exists`);
  }
  modifiers[modifierId] = modifier;
  return modifiers;
}

export function getModifier(modifiers: AppliedModifiers, modifierId: string): Modifier | undefined {
  return modifiers[modifierId] ?? undefined;
}

export function hasModifier(modifiers: AppliedModifiers, modifierId: string): boolean {
  return getModifier(modifiers, modifierId) !== undefined;
}

export function removeModifier(modifiers: AppliedModifiers, modifierId: string): AppliedModifiers {
  delete modifiers[modifierId];
  return modifiers;
}

export function isActiveModifier(modifier: Modifier, now: number): boolean {
  return modifier.duration === -1 || (modifier.ts + modifier.duration) > now;
}

export type ModifierTransformer = (modifier: Modifier) => Modifier;

export type ModifierInput = Partial<Modifier>;

export type ModifierFactoryDependencies = {
  timestamp: PotentiallyImpureOperations['timestamp'];
};

export const DEFAULT_MODIFIER_FACTORY_DEPS: ModifierFactoryDependencies = {
  timestamp: () => Date.now(),
};

export function createModifier(
  inputOrTransform: ModifierInput | ModifierTransformer,
  deps: ModifierFactoryDependencies = DEFAULT_MODIFIER_FACTORY_DEPS,
): Modifier {
  const defaults: Partial<Modifier> = {
    origin: 'origin:unknown',
    value: 0,
    ts: deps.timestamp(),
    duration: 6_000, // 6 seconds
  };

  if (typeof inputOrTransform === 'function') {
    return inputOrTransform(defaults as Modifier);
  }

  return { ...defaults, ...inputOrTransform } as Modifier;
}
