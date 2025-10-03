import { Shell } from '~/types/entity/shell';
import { ShellDiff, ShellMutation, PerformanceChanges, StatChanges, NoChange, DiffValue } from '~/types/workbench';
import { ShellPerformanceProfile } from '~/types/entity/shell';
import { createShellPreview } from '~/worldkit/workbench/preview';
import { calculateShellPerformance, ShellPerformanceDependencies } from '~/worldkit/entity/actor/shell/instrumentation';
import { calculateTotalCost } from '~/worldkit/workbench/cost';
import { SHELL_STAT_NAMES } from '~/worldkit/entity/actor';

const createDiffValue = (currentVal: number, previewVal: number): DiffValue => {
  if (currentVal !== previewVal) {
    return `${currentVal} -> ${previewVal}`;
  }
  return String(currentVal) as NoChange;
};

/**
 * Creates performance changes by comparing two performance profiles
 */
export const createPerformanceDiff = (
  current: ShellPerformanceProfile,
  preview: ShellPerformanceProfile,
  output: Partial<PerformanceChanges> = {},
): PerformanceChanges => {
  return {
    gapClosing10: createDiffValue(current.gapClosing10, preview.gapClosing10),
    gapClosing100: createDiffValue(current.gapClosing100, preview.gapClosing100),
    avgSpeed10: createDiffValue(current.avgSpeed10, preview.avgSpeed10),
    avgSpeed100: createDiffValue(current.avgSpeed100, preview.avgSpeed100),
    peakPowerOutput: createDiffValue(current.peakPowerOutput, preview.peakPowerOutput),
    componentPowerDraw: createDiffValue(current.componentPowerDraw, preview.componentPowerDraw),
    freePower: createDiffValue(current.freePower, preview.freePower),
    weaponDps: createDiffValue(current.weaponDps, preview.weaponDps),
    weaponDamage: createDiffValue(current.weaponDamage, preview.weaponDamage),
    weaponApCost: createDiffValue(current.weaponApCost, preview.weaponApCost),
    totalMassKg: createDiffValue(current.totalMassKg, preview.totalMassKg),
    inertialMassKg: createDiffValue(current.inertialMassKg, preview.inertialMassKg),
    inertiaReduction: createDiffValue(current.inertiaReduction, preview.inertiaReduction),
    powerToWeightRatio: createDiffValue(current.powerToWeightRatio, preview.powerToWeightRatio),
    topSpeed: createDiffValue(current.topSpeed, preview.topSpeed),
    capacitorCapacity: createDiffValue(current.capacitorCapacity, preview.capacitorCapacity),
    maxRechargeRate: createDiffValue(current.maxRechargeRate, preview.maxRechargeRate),
  };
};

/**
 * Creates stat changes by comparing current and preview shell stats
 */
export const createStatDiff = (current: Shell, preview: Shell): StatChanges | undefined => {
  const statChanges: StatChanges = {};
  let hasChanges = false;

  for (const stat of SHELL_STAT_NAMES) {
    const currentValue = current.stats[stat].eff;
    const previewValue = preview.stats[stat].eff;
    if (currentValue !== previewValue) {
      statChanges[stat] = `${currentValue} -> ${previewValue}`;
      hasChanges = true;
    }
  }

  return hasChanges ? statChanges : undefined;
};

/**
 * Creates a complete shell diff comparing current state with pending mutations applied
 */
export const createShellDiff = (
  shell: Shell,
  mutations: ShellMutation[],
  performanceDeps: ShellPerformanceDependencies
): ShellDiff => {
  // 1. Create preview shell with mutations applied
  const previewShell = createShellPreview(shell, mutations);

  // 2. Generate performance changes
  const currentPerf = calculateShellPerformance(shell, performanceDeps);
  const previewPerf = calculateShellPerformance(previewShell, performanceDeps);
  const perfChanges = createPerformanceDiff(currentPerf, previewPerf);

  // 3. Generate stat changes (only include those that actually changed)
  const statChanges = createStatDiff(shell, previewShell);

  // 4. Calculate total cost
  const totalCost = calculateTotalCost(shell, mutations);

  // 5. Create ShellDiff
  return {
    shellId: shell.id,
    cost: totalCost,
    stats: statChanges,
    perf: perfChanges
  };
};
