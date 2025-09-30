import { ShellDiff } from '~/types/workbench';
import { SHELL_STAT_NAMES } from '~/worldkit/entity/actor/stats';

export const renderShellDiff = (
  diff: ShellDiff,
): string => {
  const lines: string[] = [];
  let statLineParts: string[] = [];

  // Show stat changes if any
  if (diff.stats) {
    for (let i = 0; i < SHELL_STAT_NAMES.length; i++) {
      const stat = SHELL_STAT_NAMES[i];
      const change = diff.stats[stat];
      if (change) {
        statLineParts.push(`${stat.toUpperCase()} ${change}`);
      }
    }

    lines.push(`[${statLineParts.join(', ')}, Cost: ${diff.cost}]`);
  }

  lines.push('');

  // Show key performance changes
  const perfChanges = diff.perf;

  // Physical characteristics
  if (perfChanges.totalMassKg) {
    lines.push(`Mass ${perfChanges.totalMassKg}kg`);
  }

  if (perfChanges.powerToWeightRatio) {
    lines.push(`P/W Ratio ${perfChanges.powerToWeightRatio} W/kg`);
  }

  // Combat effectiveness changes
  if (perfChanges.weaponDps) {
    lines.push(`DPS ${perfChanges.weaponDps}`);
  }

  if (perfChanges.weaponDamage) {
    lines.push(`Damage ${perfChanges.weaponDamage}`);
  }

  // Movement changes
  if (perfChanges.gapClosing10) {
    lines.push(`Gap Closing (10m): ${perfChanges.gapClosing10}s`);
  }

  if (perfChanges.gapClosing100) {
    lines.push(`Gap Closing (100m): ${perfChanges.gapClosing100}s)`);
  }

  // Power changes
  if (perfChanges.freePower) {
    lines.push(`Free Power ${perfChanges.freePower}W`);
  }

  // Energy changes
  if (perfChanges.capacitorCapacity) {
    lines.push(`Capacitor ${perfChanges.capacitorCapacity}J`);
  }

  if (perfChanges.maxRechargeRate) {
    lines.push(`Max Recharge Rate ${perfChanges.maxRechargeRate}W`);
  }

  return lines.join('\n');
};
