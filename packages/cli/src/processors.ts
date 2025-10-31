/**
 * Input Processing Pipeline
 *
 * Defines processors that transform ParsedInput into ReplCommand
 */

import { ParsedInput, ReplCommand, ReplCommandType, type InputProcessor } from './types';
import { ActorURN } from '@flux/core';

// Security validation processor
export const validateSecurity: InputProcessor = (input: ParsedInput, trace: string): ParsedInput | ReplCommand => {
  if (!input.raw) {
    return input;
  }

  // Block potentially dangerous patterns
  const dangerousPatterns = [
    /\.\./,           // Directory traversal
    /[<>|&;`$]/,      // Shell injection characters
    /eval\s*\(/,      // Code evaluation
    /require\s*\(/,   // Module loading
    /import\s+/,      // ES6 imports
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(input.raw)) {
      return {
        type: ReplCommandType.SHOW_HELP,
        command: 'security',
        trace
      };
    }
  }

  return input;
};

// Command recognition processor
export const parseCommand: InputProcessor = (input: ParsedInput, trace: string): ParsedInput | ReplCommand => {
  const command = input.command.toLowerCase();
  const args = input.args;

  switch (command) {
    case 'help':
    case 'h':
      return {
        type: ReplCommandType.SHOW_HELP,
        command: args[0],
        trace
      };

    case 'actor':
    case 'a':
      if (!args[0]) {
        return {
          type: ReplCommandType.SHOW_HELP,
          command: 'actor',
          trace
        };
      }
      return {
        type: ReplCommandType.SWITCH_ACTOR,
        actorId: args[0] as ActorURN,
        trace
      };

    case 'context':
    case 'ctx':
      return { type: ReplCommandType.SHOW_CONTEXT, trace };

    case 'events':
      return { type: ReplCommandType.SHOW_EVENTS, trace };

    case 'errors':
      return { type: ReplCommandType.SHOW_ERRORS, trace };

    case 'handlers':
      return { type: ReplCommandType.SHOW_HANDLERS, trace };

    case 'sessions':
      return { type: ReplCommandType.SHOW_SESSIONS, trace };

    case 'clear':
    case 'cls':
      return { type: ReplCommandType.CLEAR_SCREEN, trace };

    case 'exit':
    case 'quit':
    case 'q':
      return { type: ReplCommandType.EXIT, trace };

    default:
      // Not a CLI command, pass through as game command
      return input;
  }
};

// Fallback processor - converts remaining ParsedInput to game command
export const fallbackToGameCommand: InputProcessor = (input: ParsedInput, trace: string): ReplCommand => {
  return {
    type: ReplCommandType.GAME_COMMAND,
    input: input.tokens.join(' '),
    trace
  };
};

// Pre-configured pipelines for different use cases
export const BASIC_PIPELINE = [
  parseCommand,
  fallbackToGameCommand,
] as const;

export const SECURE_PIPELINE = [
  validateSecurity,
  parseCommand,
  fallbackToGameCommand,
] as const;

// Default pipeline (secure by default)
export const DEFAULT_PIPELINE = SECURE_PIPELINE;
