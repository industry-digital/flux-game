/**
 * Combat Intent Natural Language Parser
 *
 * Converts natural language combat commands into validated CombatAction objects.
 * Implements strict input sanitization to prevent unvalidated user inputs from
 * propagating to CombatAction payloads.
 */

import { Actor } from '~/types/entity/actor';
import { CombatAction, CombatSession, FullyQualifiedActionCost } from '~/types/combat';
import { CommandType } from '~/types/intent';
import { ActorURN } from '~/types/taxonomy';
import { calculateMovementCosts } from '~/worldkit/combat/cost';
import { ALL_REMAINING_AP } from '~/worldkit/combat/ap';
import { ActorEquipmentApi } from '~/worldkit/entity/actor/equipment';
import { calculateWeaponApCost } from '~/worldkit/combat/damage';
import { roundApCostUp } from '~/worldkit/combat/tactical-rounding';

/**
 * Context required for parsing combat intents
 */
export interface CombatIntentContext {
  currentActor: Actor;
  availableTargets: Actor[];
  session: CombatSession;
  computeActorMass: (actor: Actor) => number;
  getEquippedWeaponSchema: ActorEquipmentApi['getEquippedWeaponSchema'];
}


/**
 * Result of parsing a combat intent
 */
export type CombatIntentResult =
  | { success: true; actions: CombatAction[] }
  | { success: false; error: string };

/**
 * Validated target resolution result
 */
interface ResolvedTarget {
  actorId: ActorURN;
  name: string;
}

/**
 * Validated movement parameters
 */
interface ValidatedMovement {
  type: 'distance' | 'ap';
  value: number;
  target?: ActorURN;
}

/**
 * Supported combat verbs and their normalized forms
 */
type CombatVerb =
  | 'attack'
  | 'defend'
  | 'strike'
  | 'target'
  | 'advance'
  | 'retreat';


/**
 * Generate a regex pattern for a verb with abbreviations and synonyms
 *
 * @param baseWord - The canonical spelling of the verb
 * @param options - Configuration for pattern generation
 * @returns RegExp that matches the word, its 3-letter abbreviation, and synonyms
 */
function createVerbPattern(
  baseWord: string,
  options: {
    /** Additional synonyms to include */
    synonyms?: string[];
  } = {}
): RegExp {
  const { synonyms = [] } = options;

  const alternatives: string[] = [];

  // 1. Exact word match
  alternatives.push(baseWord);

  // 2. First three letters as abbreviation (e.g., "att" for "attack")
  if (baseWord.length >= 3) {
    const abbreviation = baseWord.substring(0, 3);
    alternatives.push(abbreviation);
  }

  // 3. Add custom synonyms
  synonyms.forEach(synonym => {
    alternatives.push(synonym);
  });

  return new RegExp(`^(?:${alternatives.join('|')})$`, 'i');
}

const VERB_PATTERNS: Record<CombatVerb, RegExp> = {
  attack: createVerbPattern('attack', { synonyms: ['atk'] }), // 'att' auto-generated from first 3 letters
  defend: createVerbPattern('defend', { synonyms: ['block', 'guard'] }), // 'def' auto-generated
  strike: createVerbPattern('strike', { synonyms: ['hit', 'swing'] }), // 'str' auto-generated
  target: createVerbPattern('target', { synonyms: [] }), // 'tar' auto-generated
  advance: createVerbPattern('advance', { synonyms: ['move', 'forward'] }), // 'adv' auto-generated
  retreat: createVerbPattern('retreat', { synonyms: ['back', 'backward', 'flee'] }), // 'ret' auto-generated
};

/**
 * Parse and normalize combat verb with synonym support
 *
 * @param rawVerb - Raw verb token from user input
 * @returns Normalized combat verb or error
 */
function parseVerb(rawVerb: string): { success: true; verb: CombatVerb } | { success: false; error: string } {
  if (!rawVerb || rawVerb.trim().length === 0) {
    return { success: false, error: 'Empty command verb' };
  }

  const normalizedVerb = rawVerb.toLowerCase().trim();

  // Test against each verb pattern
  for (const [verb, pattern] of Object.entries(VERB_PATTERNS) as [CombatVerb, RegExp][]) {
    if (pattern.test(normalizedVerb)) {
      return { success: true, verb };
    }
  }

  return { success: false, error: `Unknown command: ${normalizedVerb}` };
}

/**
 * Parse and validate natural language combat commands into CombatAction objects.
 *
 * Security: All user inputs are validated and sanitized before inclusion in CombatAction payloads.
 * No raw user input strings are propagated to the action arguments.
 *
 * @param input - Raw natural language command string
 * @param context - Combat context with current actor and available targets
 * @returns Validated CombatAction array or error message
 */
export function evaluateCombatIntent(
  input: string,
  context: CombatIntentContext
): CombatIntentResult {
  // Input sanitization: trim whitespace but preserve case for arguments
  const sanitizedInput = input.trim();

  if (!sanitizedInput) {
    return { success: false, error: 'Empty command' };
  }

  // Tokenize input - split on whitespace and filter empty tokens
  const tokens = sanitizedInput.split(/\s+/).filter(token => token.length > 0);

  if (tokens.length === 0) {
    return { success: false, error: 'Invalid command format' };
  }

  // Only normalize the verb for parsing, preserve case in arguments
  const verbResult = parseVerb(tokens[0]);
  if (!verbResult.success) {
    return verbResult;
  }

  const verb = verbResult.verb;
  const args = tokens.slice(1); // Keep original case for arguments

  try {
    switch (verb) {
      case 'attack':
        return parseAttackCommand(args, context);

      case 'defend':
        return parseDefendCommand(args, context);

      case 'strike':
        return parseStrikeCommand(args, context);

      case 'target':
        return parseTargetCommand(args, context);

      case 'advance':
        return parseAdvanceCommand(args, context);

      case 'retreat':
        return parseRetreatCommand(args, context);

      default:
        return { success: false, error: `Unknown command: ${verb}` };
    }
  } catch (error) {
    return { success: false, error: 'Invalid command format' };
  }
}

/**
 * Parse AI-assisted attack command
 * Patterns: "attack", "attack fred"
 */
function parseAttackCommand(
  args: string[],
  context: CombatIntentContext
): CombatIntentResult {
  let targetId: ActorURN | undefined;

  // Handle optional target parameter
  if (args.length > 0) {
    const targetResult = resolveTarget(args[0], context.availableTargets);
    if (!targetResult.success) {
      return targetResult;
    }
    targetId = targetResult.target.actorId;
  }

  const action: CombatAction = {
    actorId: context.currentActor.id,
    command: CommandType.ATTACK,
    args: targetId ? { target: targetId } : {},
    cost: { ap: 0, energy: 0 } //--> attack doesn't cost anything; it's just a high-level facade that calls `strike` internally
  };

  return { success: true, actions: [action] };
}

/**
 * Parse AI-assisted defend command
 * Patterns: "defend"
 */
function parseDefendCommand(
  args: string[],
  context: CombatIntentContext
): CombatIntentResult {
  if (args.length > 0) {
    return { success: false, error: 'Defend command takes no arguments' };
  }

  // Get current combatant to determine remaining AP
  const combatant = context.session.data.combatants.get(context.currentActor.id);
  if (!combatant) {
    throw new Error(`Combatant not found: ${context.currentActor.id}`);
  }

  // Defend uses all remaining AP (should already be in 0.1 increments)
  const remainingAp = combatant.ap.eff.cur;

  const action: CombatAction = {
    actorId: context.currentActor.id,
    command: CommandType.DEFEND,
    args: {},
    cost: { ap: remainingAp, energy: 0 }
  };

  return { success: true, actions: [action] };
}

/**
 * Parse primitive strike command (no AI assistance)
 * Patterns: "strike", "strike fred"
 */
function parseStrikeCommand(
  args: string[],
  context: CombatIntentContext
): CombatIntentResult {
  let targetId: ActorURN | undefined;

  // Handle optional target parameter
  if (args.length > 0) {
    const targetResult = resolveTarget(args[0], context.availableTargets);
    if (!targetResult.success) {
      return targetResult;
    }
    targetId = targetResult.target.actorId;
  }

  // Get equipped weapon to calculate proper AP cost
  const weapon = context.getEquippedWeaponSchema(context.currentActor);
  let weaponMassKg = 1.0; // Default fallback for unarmed combat

  if (weapon?.baseMass && weapon.baseMass > 0) {
    // Convert from grams to kilograms
    weaponMassKg = weapon.baseMass / 1000;
  }

  // Calculate tactical AP cost using weapon mass and finesse
  const preciseApCost = calculateWeaponApCost(weaponMassKg, context.currentActor.stats.fin.eff);
  const tacticalApCost = roundApCostUp(preciseApCost);

  // Note: STRIKE is not in CommandType enum yet, using ATTACK for now
  // TODO: Add STRIKE to CommandType enum for primitive actions
  const action: CombatAction = {
    actorId: context.currentActor.id,
    command: CommandType.ATTACK, // Will be STRIKE when added to enum
    args: targetId ? { target: targetId, primitive: true } : { primitive: true },
    cost: { ap: tacticalApCost, energy: 0 } // Strikes don't cost energy in current system
  };

  return { success: true, actions: [action] };
}

/**
 * Parse target selection command
 * Patterns: "target fred"
 */
function parseTargetCommand(
  args: string[],
  context: CombatIntentContext
): CombatIntentResult {
  if (args.length !== 1) {
    return { success: false, error: 'Target command requires exactly one target name' };
  }

  const targetResult = resolveTarget(args[0], context.availableTargets);
  if (!targetResult.success) {
    return targetResult;
  }

  const action: CombatAction = {
    actorId: context.currentActor.id,
    command: CommandType.TARGET,
    args: { target: targetResult.target.actorId },
    cost: { ap: 0, energy: 0 }
  };

  return { success: true, actions: [action] };
}

/**
 * Parse advance/movement command
 * Patterns:
 * - "advance" (use all remaining AP)
 * - "advance distance 15"
 * - "advance ap 2.0"
 * - "advance distance 20 toward bob"
 * - "advance ap 2.0 toward charlie"
 * - "advance 15" (shorthand for distance)
 */
function parseAdvanceCommand(
  args: string[],
  context: CombatIntentContext
): CombatIntentResult {
  const movementResult = parseMovementArgs(args, context.availableTargets);
  if (!movementResult.success) {
    return movementResult;
  }

  const movement = movementResult.movement;
  const actionArgs: any = {
    type: movement.type,
    [movement.type]: movement.value
  };

  if (movement.target) {
    actionArgs.target = movement.target;
  }

  const combatant = context.session.data.combatants.get(context.currentActor.id);
  if (!combatant) {
    throw new Error(`Combatant not found: ${context.currentActor.id}`);
  }

  // Handle special case of "use all remaining AP"
  let costs: FullyQualifiedActionCost;
  if (movement.value === ALL_REMAINING_AP) {
    costs = { ap: combatant.ap.eff.cur, energy: 0 }; // Use all remaining AP, no energy calculation for this case
  } else {
    costs = calculateMovementCosts(context.currentActor, movement.type, movement.value, context.computeActorMass);
  }

  const action: CombatAction = {
    actorId: context.currentActor.id,
    command: CommandType.ADVANCE,
    args: actionArgs,
    cost: costs
  };

  return { success: true, actions: [action] };
}

/**
 * Parse retreat command
 * Patterns:
 * - "retreat" (use all remaining AP)
 * - "retreat distance 10"
 * - "retreat ap 1.5"
 * - "retreat distance 10 from charlie"
 * - "retreat ap 1.5 from charlie"
 * - "retreat 10" (shorthand for distance)
 */
function parseRetreatCommand(
  args: string[],
  context: CombatIntentContext
): CombatIntentResult {
  const movementResult = parseMovementArgs(args, context.availableTargets, true);
  if (!movementResult.success) {
    return movementResult;
  }

  const movement = movementResult.movement;
  const actionArgs: any = {
    type: movement.type,
    [movement.type]: movement.value,
    direction: -1 // Retreat moves backward
  };

  if (movement.target) {
    actionArgs.target = movement.target;
  }

  const combatant = context.session.data.combatants.get(context.currentActor.id);
  if (!combatant) {
    throw new Error(`Combatant not found: ${context.currentActor.id}`);
  }

  // Handle special case of "use all remaining AP"
  let costs: FullyQualifiedActionCost;
  if (movement.value === ALL_REMAINING_AP) {
    costs = { ap: combatant.ap.eff.cur, energy: 0 }; // Use all remaining AP, no energy calculation for this case
  } else {
    costs = calculateMovementCosts(context.currentActor, movement.type, movement.value, context.computeActorMass);
  }

  const action: CombatAction = {
    actorId: context.currentActor.id,
    command: CommandType.RETREAT,
    args: actionArgs,
    cost: costs
  };

  return { success: true, actions: [action] };
}


/**
 * Parse movement arguments with validation
 * Handles both distance and AP modes with optional targeting
 */
function parseMovementArgs(
  args: string[],
  availableTargets: Actor[],
  isRetreat: boolean = false
): { success: true; movement: ValidatedMovement } | { success: false; error: string } {
  // Handle no arguments case - use all remaining AP
  if (args.length === 0) {
    return {
      success: true,
      movement: { type: 'ap', value: ALL_REMAINING_AP }
    };
  }

  let type: 'distance' | 'ap';
  let value: number;
  let target: ActorURN | undefined;

  // Parse movement type and value
  if (args[0] === 'distance' && args.length >= 2) {
    type = 'distance';
    const parsedValue = parseFloat(args[1]);
    if (!isValidNumber(parsedValue) || parsedValue <= 0) {
      return { success: false, error: 'Invalid distance value' };
    }
    value = parsedValue;

    // Check for target specification
    const remainingArgs = args.slice(2);
    if (remainingArgs.length >= 2) {
      const targetKeyword = remainingArgs[0];
      const targetName = remainingArgs[1];

      if ((isRetreat && targetKeyword === 'from') || (!isRetreat && (targetKeyword === 'toward' || targetKeyword === 'to'))) {
        const targetResult = resolveTarget(targetName, availableTargets);
        if (!targetResult.success) {
          return targetResult;
        }
        target = targetResult.target.actorId;
      }
    }
  } else if (args[0] === 'ap' && args.length >= 2) {
    type = 'ap';
    const parsedValue = parseFloat(args[1]);
    if (!isValidNumber(parsedValue) || parsedValue <= 0) {
      return { success: false, error: 'Invalid AP value' };
    }
    value = parsedValue;

    // Check for target specification
    const remainingArgs = args.slice(2);
    if (remainingArgs.length >= 2) {
      const targetKeyword = remainingArgs[0];
      const targetName = remainingArgs[1];

      if ((isRetreat && targetKeyword === 'from') || (!isRetreat && (targetKeyword === 'toward' || targetKeyword === 'to'))) {
        const targetResult = resolveTarget(targetName, availableTargets);
        if (!targetResult.success) {
          return targetResult;
        }
        target = targetResult.target.actorId;
      }
    }
  } else {
    // Try parsing as shorthand distance (e.g., "advance 15")
    const parsedValue = parseFloat(args[0]);
    if (!isValidNumber(parsedValue) || parsedValue <= 0) {
      return { success: false, error: 'Invalid movement format. Use "distance X" or "ap X"' };
    }
    type = 'distance';
    value = parsedValue;

    // Check for target specification in remaining args
    if (args.length >= 3) {
      const targetKeyword = args[1];
      const targetName = args[2];

      if ((isRetreat && targetKeyword === 'from') || (!isRetreat && (targetKeyword === 'toward' || targetKeyword === 'to'))) {
        const targetResult = resolveTarget(targetName, availableTargets);
        if (!targetResult.success) {
          return targetResult;
        }
        target = targetResult.target.actorId;
      }
    }
  }

  // Validate bounds
  if (type === 'distance' && value > 300) {
    return { success: false, error: 'Distance cannot exceed battlefield length (300m)' };
  }

  if (type === 'ap' && value > 10) {
    return { success: false, error: 'AP value cannot exceed reasonable bounds (10 AP)' };
  }

  return {
    success: true,
    movement: { type, value, target }
  };
}

/**
 * Resolve target name to ActorURN with fuzzy matching
 * Security: Only returns validated ActorURN from available targets
 */
function resolveTarget(
  targetName: string,
  availableTargets: Actor[]
): { success: true; target: ResolvedTarget } | { success: false; error: string } {
  if (!targetName || targetName.trim().length === 0) {
    return { success: false, error: 'Target name cannot be empty' };
  }

  const originalName = targetName.trim(); // Preserve original case for error messages
  const normalizedName = originalName.toLowerCase();

  // First try exact match
  for (const target of availableTargets) {
    if (target.name.toLowerCase() === normalizedName) {
      return {
        success: true,
        target: { actorId: target.id, name: target.name }
      };
    }
  }

  // Then try prefix match
  const prefixMatches = availableTargets.filter(target =>
    target.name.toLowerCase().startsWith(normalizedName)
  );

  if (prefixMatches.length === 1) {
    return {
      success: true,
      target: { actorId: prefixMatches[0].id, name: prefixMatches[0].name }
    };
  }

  if (prefixMatches.length > 1) {
    const names = prefixMatches.map(t => t.name).join(', ');
    return { success: false, error: `Ambiguous target "${originalName}". Could be: ${names}` };
  }

  // Finally try substring match
  const substringMatches = availableTargets.filter(target =>
    target.name.toLowerCase().includes(normalizedName)
  );

  if (substringMatches.length === 1) {
    return {
      success: true,
      target: { actorId: substringMatches[0].id, name: substringMatches[0].name }
    };
  }

  if (substringMatches.length > 1) {
    const names = substringMatches.map(t => t.name).join(', ');
    return { success: false, error: `Ambiguous target "${originalName}". Could be: ${names}` };
  }

  return { success: false, error: `Target "${originalName}" not found` };
}

/**
 * Validate that a value is a finite number
 */
function isValidNumber(value: number): boolean {
  return typeof value === 'number' && isFinite(value) && !isNaN(value);
}
