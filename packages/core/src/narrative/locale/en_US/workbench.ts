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
  ActorDidSwapShell,
  ActorDidAssessShellStatus,
} from '~/types/event';
import { ShellMutationType, StatMutation, StatMutationOperation } from '~/types/workbench';
import { Narrative, NarrativeSequence, TemplateFunction } from '~/types/narrative';
import { Stat } from '~/types/entity/actor';
import { SHELL_STAT_KEYS } from '~/worldkit/entity/actor/shell';
import { calculateShellPerformance, ShellPerformanceDependencies } from '~/worldkit/entity/actor/shell/instrumentation';
import { getSchemaTranslation } from '~/narrative/schema';
import { Locale } from '~/types/i18n';
import { CHECK_MARK } from '~/narrative/glyphs';
import { getStatValue } from '~/worldkit/entity/actor/stats';
import { EMPTY_NARRATIVE } from '~/narrative/constants';

const STAT_DISPLAY_NAMES: Readonly<Record<Stat, string>> = Object.freeze({
  [Stat.POW]: 'POW',
  [Stat.FIN]: 'FIN',
  [Stat.RES]: 'RES',
  [Stat.INT]: 'INT',
  [Stat.PER]: 'PER',
  [Stat.MEM]: 'MEM',
});
const RIGHT_ARROW = ' -> ';
const HELP_PROMPT = '> Enter \`help workbench\` for available commands.';

const WORKBENCH_PROMPTS = `> Enter \`shell commit\` to commit your changes.
> Enter \`shell undo\` to revert modifications.
${HELP_PROMPT}`;

const WORKBENCH_SESSION_DID_START_SEQUENCE: NarrativeSequence = [
  {
    self: 'Connecting to workbench interface...',
    observer: '',
    delay: 0
  },
  {
    self: 'ShellOS v2.7.4-pre-collapse | Build 20847 | Neural Protocol Stack: ACTIVE',
    observer: '',
    delay: 1_000
  },
  {
    self: `Connection established.\n${HELP_PROMPT}`,
    observer: '',
    delay: 1_000
  },
];

export const narrateWorkbenchSessionDidStart: TemplateFunction<WorkbenchSessionDidStart, NarrativeSequence> = (context, event): NarrativeSequence => {
  // Workbench session start is only visible to the actor
  return WORKBENCH_SESSION_DID_START_SEQUENCE;
};

export const narrateWorkbenchSessionDidEnd: TemplateFunction<WorkbenchSessionDidEnd> = (context, event): Narrative => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  return {
    self: 'You finish your work at the workbench.',
    observer: `${actor.name} finishes working at the workbench.`
  };
};

export const narrateActorDidStageShellMutation: TemplateFunction<ActorDidStageShellMutation> = (context, event): Narrative => {
  const actor = context.world.actors[event.actor!];
  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  const mutation = event.payload.mutation as StatMutation;
  if (mutation.type !== ShellMutationType.STAT) {
    return EMPTY_NARRATIVE; // Never supposed to happen
  }

  // Get stat from actor's materialized view (denormalized shell stats)
  const from = getStatValue(actor, mutation.stat);
  const to = mutation.operation === StatMutationOperation.ADD
    ? from + mutation.amount
    : from - mutation.amount;

  const mutationText = `${mutation.stat.toUpperCase()} ${from}${RIGHT_ARROW}${to}`;

  return {
    self: mutationText,
    observer: '' // Staging mutations are only visible to the actor
  };
};

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


/**
 * Higher-order function that composes narrative functions with workbench prompts
 * Zero-allocation implementation using direct string concatenation
 */
const withWorkbenchPrompts = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T>
): TemplateFunction<T> => {
  return (context, event) => {
    const baseNarrative = narrativeFunction(context, event);

    // Add prompts to self perspective only
    return {
      self: baseNarrative.self + '\n\n' + WORKBENCH_PROMPTS,
      observer: baseNarrative.observer
    };
  };
};

const baseNarrateActorDidDiffShellMutations: TemplateFunction<ActorDidDiffShellMutations> = (context, event): Narrative => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  const perf = event.payload.perf;
  const stats = event.payload.stats;

  const hasStats = hasStatChanges(stats);
  const hasPerf = hasPerformanceChanges(perf);

  if (!hasStats && !hasPerf) {
    return {
      self: 'You review your shell design. No changes detected.',
      observer: '' // Shell diff is only visible to the actor
    };
  }

  // Generate comprehensive shell analysis (zero-allocation)
  let result = 'Shell Configuration Analysis:\n';

  // Add stat changes section - always show all shell stats for complete context
  if (hasStats || hasPerf) {
    result += '\nSHELL STATS\n';

    // Show all three core shell stats (POW, FIN, RES)
    for (const stat of SHELL_STAT_KEYS) {
      const statValue = stats?.[stat];
      if (typeof statValue === 'string') {
        // This stat has changes
        result += '  ' + STAT_DISPLAY_NAMES[stat] + ':'.padEnd(18 - STAT_DISPLAY_NAMES[stat].length) +
                 formatDiffValue(statValue, '', 0) + '\n';
      } else {
        // This stat has no changes - show current value (from actor's denormalized stats)
        const currentValue = getStatValue(actor, stat);
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

  return {
    self: result,
    observer: '' // Shell diff is only visible to the actor
  };
};


// Composed function with workbench prompts
export const narrateActorDidDiffShellMutations = withWorkbenchPrompts(
  baseNarrateActorDidDiffShellMutations
);

export const narrateActorDidUndoShellMutations: TemplateFunction<ActorDidUndoShellMutations> = (context, event): Narrative => {
  return {
    self: 'You have discarded your staged shell modifications.',
    observer: '' // Undo is only visible to the actor
  };
};

export const narrateActorDidCommitShellMutations: TemplateFunction<ActorDidCommitShellMutations> = (context, event): Narrative => {
  const { cost, mutations } = event.payload;
  const mutationCount = mutations.length;
  const costText = cost > 0 ? ` for ${cost} credits` : '';

  return {
    self: `You commit ${mutationCount} shell modification${mutationCount !== 1 ? 's' : ''}${costText}.`,
    observer: '' // Commit is only visible to the actor
  };
};

/**
 * Narrative for when an actor mounts a component to their shell
 */
export const narrateActorDidMountComponent: TemplateFunction<ActorDidMountComponent> = (context, event): Narrative => {
  return {
    self: 'You mount a component to your shell.',
    observer: '' // Component mounting is only visible to the actor
  };
};

/**
 * Narrative for when an actor unmounts a component from their shell
 */
export const narrateActorDidUnmountComponent: TemplateFunction<ActorDidUnmountComponent> = (context, event): Narrative => {
  return {
    self: 'You unmount a component from your shell.',
    observer: '' // Component unmounting is only visible to the actor
  };
};


/**
 * Narrative for when an actor lists their available shells
 * Single-pass iteration over shells using for...in (zero-allocation)
 */
export const narrateActorDidListShells: TemplateFunction<ActorDidListShells> = (context, event): Narrative => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  // Check if actor has any shells (zero-allocation check)
  let hasShells = false;
  for (const _ in actor.shells) {
    hasShells = true;
    break;
  }

  if (!hasShells) {
    return {
      self: 'You have no shells available.',
      observer: '' // Shell listing is only visible to the actor
    };
  }

  // Create mass API for shell mass calculations
  const massApi = context.mass;

  // Build accessible shell listing
  let result = '';

  // Single-pass iteration over shells using for...in (zero-allocation)
  let shellCounter = 0;
  for (const shellId in actor.shells) {
    shellCounter++;
    const shell = actor.shells[shellId];
    const isActive = shell.id === actor.currentShell;
    const shellName = shell.name || 'Unnamed Shell';
    // Read stats directly from shell (each shell maintains its own stats)
    const powStat = shell.stats[Stat.POW];
    const finStat = shell.stats[Stat.FIN];
    const resStat = shell.stats[Stat.RES];

    // Calculate shell mass (equipment + base shell mass) and convert to kg
    const shellMassKg = massApi.computeShellMass(shell) / 1000;

    // Add active shell indicator
    const activeIndicator = isActive ? CHECK_MARK + '  ' : '   ';

    // Format as accessible list item: Shell N: "Name" (mass, POW POW, FIN FIN, RES RES)
    result += activeIndicator +
              `Shell ${shellCounter}: "${shellName}" (${shellMassKg.toFixed(1)}kg, ${powStat} POW, ${finStat} FIN, ${resStat} RES)\n`;
  }

  const currentShell = actor.shells![actor.currentShell!];

  result += '\n' + CHECK_MARK + ` ${currentShell.name} is your current shell.`;

  return {
    self: result,
    observer: '' // Shell listing is only visible to the actor
  };
};

/**
 * Narrative for when an actor inspects the status of a specific shell
 */
export const narrateActorDidInspectShellStatus: TemplateFunction<ActorDidInspectShellStatus> = (context, event): Narrative => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  const shellName = event.payload.shell.name || 'shell';

  return {
    self: `You inspect the status of your ${shellName}.`,
    observer: `${actor.name} inspects their shell status.`
  };
};

/**
 * Narrative for when an actor reviews shell statistics
 */
export const narrateActorDidReviewShellStats: TemplateFunction<ActorDidReviewShellStats> = (context, event): Narrative => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  const hasPendingMutations = event.payload.pendingMutations.length > 0;

  const selfText = hasPendingMutations
    ? 'You review your shell statistics and pending modifications.'
    : 'You review your shell statistics.';

  return {
    self: selfText,
    observer: `${actor.name} reviews their shell statistics.`
  };
};

/**
 * Narrative for when an actor lists components on their shell
 */
export const narrateActorDidListShellComponents: TemplateFunction<ActorDidListShellComponents> = (context, event): Narrative => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  const componentCount = Object.keys(event.payload.components).length;

  let selfText: string;
  if (componentCount === 0) {
    selfText = 'Your shell has no mounted components.';
  } else if (componentCount === 1) {
    selfText = 'You examine the component mounted on your shell.';
  } else {
    selfText = `You examine the ${componentCount} components mounted on your shell.`;
  }

  return {
    self: selfText,
    observer: '' // Component listing is only visible to the actor
  };
};

/**
 * Narrative for when an actor examines a specific component
 */
export const narrateActorDidExamineComponent: TemplateFunction<ActorDidExamineComponent> = (context, event): Narrative => {
  return {
    self: 'You examine the component in detail.',
    observer: '' // Component examination is only visible to the actor
  };
};

export const narrateActorDidSwapShell: TemplateFunction<ActorDidSwapShell> = (context, event): Narrative => {
  const actor = context.world.actors[event.actor!];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  const shell = actor.shells![event.payload.toShellId];
  if (!shell) {
    return EMPTY_NARRATIVE;
  }

  return {
    self: `Core consciousness transferred to shell "${shell.name}."`,
    observer: '' // Shell swap is only visible to the actor
  };
};

const PREALLOCATED_SHELL_PERFORMANCE_DEPS: ShellPerformanceDependencies = {} as any;

export const narrateActorDidAssessShellStatus: TemplateFunction<ActorDidAssessShellStatus> = (context, event): Narrative => {
  const { world } = context;
  const actor = world.actors[event.actor!];

  if (!actor) {
    return EMPTY_NARRATIVE;
  }

  const shell = actor.shells?.[event.payload.shellId];
  if (!shell) {
    return EMPTY_NARRATIVE;
  }

  const equippedWeapon = context.equipmentApi.getEquippedWeaponSchema(actor);

  PREALLOCATED_SHELL_PERFORMANCE_DEPS.massApi = context.mass;
  PREALLOCATED_SHELL_PERFORMANCE_DEPS.equipmentApi = context.equipmentApi;

  const performance = calculateShellPerformance(actor, shell, PREALLOCATED_SHELL_PERFORMANCE_DEPS);

  let report = '';

  report += `"${shell.name}"\n\n`;

  report += `STATS\n\n`;
  report += `  POW: ${performance.naturalPowStat}\n`;
  report += `  FIN: ${performance.naturalFinStat}\n`;
  report += `  RES: ${performance.naturalResStat}\n\n`;

  report += `MOBILITY\n\n`;
  report += `  Gap Closing (10m):  ${performance.gapClosing10.toFixed(2)}s\n`;
  report += `  Gap Closing (100m): ${performance.gapClosing100.toFixed(2)}s\n`;
  report += `  Terminal Velocity:  ${performance.topSpeed.toFixed(1)} m/s\n`;
  report += `  Total Mass:         ${performance.totalMassKg.toFixed(1)} kg\n`;
  report += `  Inertia Reduction:  ${performance.inertiaReduction.toFixed(1)}%\n`;
  report += `  Inertial Mass:      ${performance.inertialMassKg.toFixed(1)} kg\n`;
  report += `  Power-to-Weight:    ${performance.powerToWeightRatio.toFixed(2)} W/kg\n\n`;

  report += `POWER OUTPUT\n\n`;
  report += `  Peak Power Output:  ${performance.peakPowerOutput.toFixed(0)}W\n`;
  report += `  Component Draw:     ${performance.componentPowerDraw.toFixed(0)}W\n`;
  report += `  Free Power:         ${performance.freePower.toFixed(0)}W\n`;

  report += `CAPACITOR\n\n`;
  report += `  Capacity:           ${(performance.capacitorCapacity / 1000).toFixed(1)}kJ\n`;
  report += `  Peak Recharge:      ${performance.maxRechargeRate.toFixed(0)}W\n\n`;

  report += `WEAPON\n\n`;
  report += `  Weapon:             ${getSchemaTranslation(Locale.en_US, equippedWeapon.urn).name.singular}\n`;
  report += `  Weapon Damage:      ${performance.weaponDamage.toFixed(1)}\n`;
  report += `  AP Cost/Strike:     ${performance.weaponApCost.toFixed(1)} AP\n`;
  report += `  Damage Per Second:  ${performance.weaponDps.toFixed(1)}\n\n`;

  return {
    self: report,
    observer: '' // Shell assessment is only visible to the actor
  };
};
