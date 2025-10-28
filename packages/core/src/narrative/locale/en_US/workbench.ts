import {
  WorkbenchSessionDidStart,
  WorkbenchSessionDidEnd,
  ActorDidStageShellMutation,
  ActorDidDiffShellMutations,
  ActorDidUndoShellMutations,
  ActorDidCommitShellMutations,
  ActorDidMountComponent,
  ActorDidUnmountComponent,
  ActorDidListShells,
  ActorDidInspectShellStatus,
  ActorDidReviewShellStats,
  ActorDidListShellComponents,
  ActorDidExamineComponent,
  WorldEvent,
} from '~/types/event';
import { ShellMutationType } from '~/types/workbench';
import { TemplateFunction } from '~/types/narrative';
import { ActorURN } from '~/types/taxonomy';
import { Stat } from '~/types/entity/actor';
import { SHELL_STAT_NAMES, getNaturalStatValue } from '~/worldkit/entity/actor/stats';
import { getPossessivePronoun } from '~/narrative/locale/en_US/grammar/pronouns';

export const narrateWorkbenchSessionDidStart: TemplateFunction<WorkbenchSessionDidStart, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You begin working at the shell workbench.';
  }

  return `${actor.name} begins working at a shell workbench.`;
};

export const narrateWorkbenchSessionDidEnd: TemplateFunction<WorkbenchSessionDidEnd, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You finish your work at the workbench.';
  }

  return `${actor.name} finishes working at the workbench.`;
};

export const narrateActorDidStageShellMutation: TemplateFunction<ActorDidStageShellMutation, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { mutation } = event.payload;

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    switch (mutation.type) {
      case ShellMutationType.STAT:
        return `You stage a stat modification to the shell design.`;
      case ShellMutationType.COMPONENT:
        return `You stage a component change to the shell design.`;
      default:
        return `You stage a change to the shell design.`;
    }
  }

  return `${actor.name} makes adjustments to ${getPossessivePronoun(actor.gender)} shell.`;
};

const RIGHT_ARROW = ' -> ';

/**
 * Helper function to format a DiffValue for display (zero-allocation)
 */
const formatDiffValue = (value: string, unit: string = '', precision: number = 1): string => {
  const arrowIndex = value.indexOf(RIGHT_ARROW);
  if (arrowIndex === -1) {
    // No change case
    const num = parseFloat(value);
    return num.toFixed(precision) + unit;
  }

  // Change case - parse before and after values without split()
  const beforeStr = value.substring(0, arrowIndex);
  const afterStr = value.substring(arrowIndex + 4); // Skip ' -> '

  const beforeNum = parseFloat(beforeStr);
  const afterNum = parseFloat(afterStr);
  const change = afterNum - beforeNum;

  const beforeFormatted = beforeNum.toFixed(precision);
  const afterFormatted = afterNum.toFixed(precision);
  const changeFormatted = change.toFixed(precision);
  const changeSign = change > 0 ? '+' : '';

  return beforeFormatted + RIGHT_ARROW + afterFormatted + unit + ' (' + changeSign + changeFormatted + unit + ')';
};

/**
 * Helper function to format percentage values (zero-allocation)
 */
const formatPercentage = (value: string): string => {
  const arrowIndex = value.indexOf(RIGHT_ARROW);
  if (arrowIndex === -1) {
    // No change case
    const num = parseFloat(value) * 100;
    return num.toFixed(1) + '%';
  }

  // Change case
  const beforeStr = value.substring(0, arrowIndex);
  const afterStr = value.substring(arrowIndex + 4);

  const beforeNum = parseFloat(beforeStr) * 100;
  const afterNum = parseFloat(afterStr) * 100;
  const change = afterNum - beforeNum;

  const beforeFormatted = beforeNum.toFixed(1);
  const afterFormatted = afterNum.toFixed(1);
  const changeFormatted = change.toFixed(1);
  const changeSign = change > 0 ? '+' : '';

  return beforeFormatted + RIGHT_ARROW + afterFormatted + '% (' + changeSign + changeFormatted + '%)';
};

/**
 * Helper function to check if any performance values have changed (zero-allocation)
 */
const hasPerformanceChanges = (perf: any): boolean => {
  for (const key in perf) {
    const value = perf[key];
    if (typeof value === 'string' && value.indexOf(RIGHT_ARROW) !== -1) {
      return true;
    }
  }
  return false;
};

/**
 * Helper function to check if any stat values have changed (zero-allocation)
 */
const hasStatChanges = (stats: any): boolean => {
  if (!stats) return false;
  for (const key in stats) {
    const value = stats[key];
    if (typeof value === 'string' && value.indexOf(RIGHT_ARROW) !== -1) {
      return true;
    }
  }
  return false;
};

const STAT_DISPLAY_NAMES: Readonly<Record<Stat, string>> = Object.freeze({
  [Stat.POW]: 'POW',
  [Stat.FIN]: 'FIN',
  [Stat.RES]: 'RES',
  [Stat.INT]: 'INT',
  [Stat.PER]: 'PER',
  [Stat.MEM]: 'MEM',
});

/**
 * Higher-order function that composes narrative functions with workbench prompts
 * Zero-allocation implementation using direct string concatenation
 */
const withWorkbenchPrompts = <T extends WorldEvent, R extends ActorURN>(
  narrativeFunction: TemplateFunction<T, R>
): TemplateFunction<T, R> => {
  return (context, event, recipientId) => {
    const baseNarrative = narrativeFunction(context, event, recipientId);

    // Only add prompts for the actor themselves
    if (recipientId === event.actor) {
      // Zero-allocation concatenation: direct string concatenation
      return baseNarrative + '\n\n' + WORKBENCH_PROMPTS;
    }

    return baseNarrative;
  };
};

const baseNarrateActorDidDiffShellMutations: TemplateFunction<ActorDidDiffShellMutations, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  const perf = event.payload.perf;
  const stats = event.payload.stats;

  if (recipientId === event.actor) {
    const hasStats = hasStatChanges(stats);
    const hasPerf = hasPerformanceChanges(perf);

    if (!hasStats && !hasPerf) {
      return 'You review your shell design. No changes detected.';
    }

    // Generate comprehensive shell analysis (zero-allocation)
    let result = 'Shell Configuration Analysis:\n';

    // Add stat changes section - always show all shell stats for complete context
    if (hasStats || hasPerf) {
      result += '\nSHELL STATS\n';

      // Show all three core shell stats (POW, FIN, RES)
      for (const stat of SHELL_STAT_NAMES) {
        const statValue = stats?.[stat];
        if (typeof statValue === 'string') {
          // This stat has changes
          result += '  ' + STAT_DISPLAY_NAMES[stat] + ':'.padEnd(18 - STAT_DISPLAY_NAMES[stat].length) +
                   formatDiffValue(statValue, '', 0) + '\n';
        } else {
          // This stat has no changes - show current value
          const currentValue = getNaturalStatValue(actor, stat);
          result += '  ' + STAT_DISPLAY_NAMES[stat] + ':'.padEnd(18 - STAT_DISPLAY_NAMES[stat].length) +
                   currentValue.toFixed(0) + '\n';
        }
      }
    }

    // Add performance changes section if present
    if (hasPerf) {
      result += '\nMOBILITY\n' +
        '  Gap Closing (10m):     ' + formatDiffValue(perf.gapClosing10, 's') + '\n' +
        '  Gap Closing (100m):    ' + formatDiffValue(perf.gapClosing100, 's') + '\n' +
        '  Avg Speed (10m):       ' + formatDiffValue(perf.avgSpeed10, 'm/s') + '\n' +
        '  Avg Speed (100m):      ' + formatDiffValue(perf.avgSpeed100, 'm/s') + '\n' +
        '  Top Speed:             ' + formatDiffValue(perf.topSpeed, 'm/s') + '\n' +
        '\n' +
        'POWER\n' +
        '  Peak Power Output:     ' + formatDiffValue(perf.peakPowerOutput, 'W', 0) + '\n' +
        '  Component Power Draw:  ' + formatDiffValue(perf.componentPowerDraw, 'W', 0) + '\n' +
        '  Free Power:            ' + formatDiffValue(perf.freePower, 'W', 0) + '\n' +
        '  Power-to-Weight:       ' + formatDiffValue(perf.powerToWeightRatio, 'W/kg') + '\n' +
        '\n' +
        'WEAPON SYSTEM\n' +
        '  Weapon Damage:         ' + formatDiffValue(perf.weaponDamage, ' dmg', 0) + '\n' +
        '  Weapon DPS:            ' + formatDiffValue(perf.weaponDps, ' dps') + '\n' +
        '  Weapon AP Cost:        ' + formatDiffValue(perf.weaponApCost, ' AP', 0) + '\n' +
        '\n' +
        'MASS\n' +
        '  Total Mass:            ' + formatDiffValue(perf.totalMassKg, 'kg') + '\n' +
        '  Inertial Mass:         ' + formatDiffValue(perf.inertialMassKg, 'kg') + '\n' +
        '  Inertia Reduction:     ' + formatPercentage(perf.inertiaReduction) + '\n' +
        '\n' +
        'ENERGY\n' +
        '  Capacitor Capacity:    ' + formatDiffValue(perf.capacitorCapacity, 'J', 0) + '\n' +
        '  Max Recharge Rate:     ' + formatDiffValue(perf.maxRechargeRate, 'W', 0) + '\n';
    }

    return result;
  }

  return `${actor.name} reviews their shell modifications.`;
};

const WORKBENCH_PROMPTS = `> Enter \`shell commit\` to commit your changes.
> Enter \`shell undo\` to revert modifications.
> Enter \`help workbench\` for available commands.`;

// Composed function with workbench prompts
export const narrateActorDidDiffShellMutations = withWorkbenchPrompts(
  baseNarrateActorDidDiffShellMutations
);

export const narrateActorDidUndoShellMutations: TemplateFunction<ActorDidUndoShellMutations, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You have reversed your staged shell modifications.';
  }

  return `${actor.name} reverses ${getPossessivePronoun(actor.gender)} recent shell modifications.`;
};

export const narrateActorDidCommitShellMutations: TemplateFunction<ActorDidCommitShellMutations, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];
  const { cost, mutations } = event.payload;

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    const mutationCount = mutations.length;
    const costText = cost > 0 ? ` for ${cost} credits` : '';
    return `You commit ${mutationCount} shell modification${mutationCount !== 1 ? 's' : ''}${costText}.`;
  }

  return `${actor.name} commits their shell modifications.`;
};

/**
 * Narrative for when an actor mounts a component to their shell
 */
export const narrateActorDidMountComponent: TemplateFunction<ActorDidMountComponent, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You mount a component to your shell.';
  }

  return `${actor.name} mounts a component to their shell.`;
};

/**
 * Narrative for when an actor unmounts a component from their shell
 */
export const narrateActorDidUnmountComponent: TemplateFunction<ActorDidUnmountComponent, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You unmount a component from your shell.';
  }

  return `${actor.name} unmounts a component from their shell.`;
};

const ACTIVE_SHELL_INDICATOR = '✓';

/**
 * Narrative for when an actor lists their available shells
 * Single-pass iteration over shells using for...in (zero-allocation)
 */
export const narrateActorDidListShells: TemplateFunction<ActorDidListShells, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  // Only show to the shell owner
  if (recipientId !== event.actor) {
    return '';
  }

  // Check if actor has any shells (zero-allocation check)
  let hasShells = false;
  for (const shellId in actor.shells) {
    hasShells = true;
    break;
  }

  if (!hasShells) {
    return 'You have no shells available.';
  }

  // Create mass API for shell mass calculations
  const massApi = context.mass;

  // Build table header
  let result = 'SHELL INVENTORY\n\n';
  result += '  ID NAME                 POW FIN RES  MASS\n';
  result += '  -- -------------------- --- --- --- ------\n';

  // Single-pass iteration over shells using for...in (zero-allocation)
  let shellCounter = 0;
  for (const shellId in actor.shells) {
    shellCounter++;
    const shell = actor.shells[shellId];
    const isActive = shell.id === actor.currentShell;
    const shellName = shell.name || 'Unnamed Shell';
    const powStat = shell.stats[Stat.POW]?.nat || 0;
    const finStat = shell.stats[Stat.FIN]?.nat || 0;
    const resStat = shell.stats[Stat.RES]?.nat || 0;

    // Calculate shell mass (equipment + base shell mass) and convert to kg
    const shellMassKg = massApi.computeShellMass(shell) / 1000;

    // Format shell ID as simple counter (right-aligned in 2-char column)
    const displayShellId = shellCounter.toString().padStart(2);

    // Format shell name (truncate if needed)
    const displayName = shellName.length > 20 ? shellName.substring(0, 17) + '...' : shellName;

    // Format individual stats (right-aligned in 3-char columns, max 999)
    const powDisplay = powStat.toFixed(0).padStart(3);
    const finDisplay = finStat.toFixed(0).padStart(3);
    const resDisplay = resStat.toFixed(0).padStart(3);

    // Format mass (right-aligned in 6-char column, max 999.9kg)
    const massDisplay = `${shellMassKg.toFixed(1)}kg`.padStart(6);

    // Add active shell indicator
    const activeIndicator = isActive ? ACTIVE_SHELL_INDICATOR + ' ' : '  ';

    result += activeIndicator +
              displayShellId + ' ' +
              displayName.padEnd(20) + ' ' +
              powDisplay + ' ' +
              finDisplay + ' ' +
              resDisplay + ' ' +
              massDisplay + '\n';
  }

  result += '\n' + ACTIVE_SHELL_INDICATOR + ' Currently active shell';

  return result;
};

/**
 * Narrative for when an actor inspects the status of a specific shell
 */
export const narrateActorDidInspectShellStatus: TemplateFunction<ActorDidInspectShellStatus, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  const shellName = event.payload.shell.name || 'shell';

  if (recipientId === event.actor) {
    return `You inspect the status of your ${shellName}.`;
  }

  return `${actor.name} inspects their shell status.`;
};

/**
 * Narrative for when an actor reviews shell statistics
 */
export const narrateActorDidReviewShellStats: TemplateFunction<ActorDidReviewShellStats, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  const hasPendingMutations = event.payload.pendingMutations.length > 0;

  if (recipientId === event.actor) {
    if (hasPendingMutations) {
      return 'You review your shell statistics and pending modifications.';
    }
    return 'You review your shell statistics.';
  }

  return `${actor.name} reviews their shell statistics.`;
};

/**
 * Narrative for when an actor lists components on their shell
 */
export const narrateActorDidListShellComponents: TemplateFunction<ActorDidListShellComponents, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  const componentCount = Object.keys(event.payload.components).length;

  if (recipientId === event.actor) {
    if (componentCount === 0) {
      return 'Your shell has no mounted components.';
    }
    if (componentCount === 1) {
      return 'You examine the component mounted on your shell.';
    }
    return `You examine the ${componentCount} components mounted on your shell.`;
  }

  return `${actor.name} examines their shell components.`;
};

/**
 * Narrative for when an actor examines a specific component
 */
export const narrateActorDidExamineComponent: TemplateFunction<ActorDidExamineComponent, ActorURN> = (context, event, recipientId) => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return '';
  }

  if (recipientId === event.actor) {
    return 'You examine the component in detail.';
  }

  return `${actor.name} examines a component.`;
};

// Note: ActorDidExamineShell is handled in actor.ts as it's an actor examination event
