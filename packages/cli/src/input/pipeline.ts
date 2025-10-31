import { ParsedInput, ReplCommand, ReplCommandType, type InputPipeline } from '../types';

export const parseRawInput = (
  raw: string, // The raw string input from the user
  tokens: string[], // Tokens computed from `raw`
  output: ParsedInput = { raw, tokens: [], command: '', args: [] }
): ParsedInput => {
  output.command = '';
  output.tokens.length = 0;
  output.args.length = 0;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token) {  // ← No trimming needed, caller already did it
      output.tokens[i] = token;
      if (i > 0) {
        output.args[i - 1] = token;
      }
    }
  }

  if (output.tokens.length > 0) {
    output.command = output.tokens[0];
  }

  return output;
};

// ===== ZERO-ALLOCATION POOLS =====

const PREALLOCATED_OUTPUT: ParsedInput = { tokens: [], command: '', args: [], raw: '' };
const WHITESPACE_REGEXP = /\s+/g;

// Token array pool for zero-allocation tokenization
const TOKEN_POOL: string[][] = [];
const MAX_POOL_SIZE = 20; // Prevent unbounded growth

const getTokenArray = (): string[] => {
  return TOKEN_POOL.pop() || [];
};

const releaseTokenArray = (tokens: string[]): void => {
  if (TOKEN_POOL.length < MAX_POOL_SIZE) {
    tokens.length = 0; // Clear without deallocating
    TOKEN_POOL.push(tokens);
  }
  // If pool is full, let GC handle it (rare case)
};

export const tokenizeWithPool = (input: string): string[] => {
  const tokens = getTokenArray();
  const parts = input.split(WHITESPACE_REGEXP);

  // Manually populate to reuse array
  for (let i = 0; i < parts.length; i++) {
    const trimmed = parts[i].trim().toLowerCase();
    if (trimmed) {
      tokens[tokens.length] = trimmed; // Avoid push() overhead
    }
  }

  return tokens;
};

export const runPipeline = (
  input: string,
  tokens: string[] = tokenizeWithPool(input),
  pipeline: InputPipeline,
  trace: string,
): ReplCommand => {
  try {
    let current: ParsedInput | ReplCommand = parseRawInput(input, tokens, PREALLOCATED_OUTPUT);

    // Set raw input for validation
    if (!('type' in current)) {
      current.raw = input;
    }

    // Process through pipeline with optimal for loop
    for (const processor of pipeline) {
      // Early exit if we already have a command
      if ('type' in current) {
        return current;
      }
      const result = processor(current, trace, PREALLOCATED_OUTPUT);
      // Handle processors that return undefined (defensive programming)
      if (result !== undefined) {
        current = result;
      }
    }

    // If we still have ParsedInput at the end, convert to default game command
    if (!('type' in current)) {
      return { type: ReplCommandType.GAME_COMMAND, input: current.command, trace };
    }

    // Ensure all commands have trace
    return { ...current, trace };
  } finally {
    // Return token array to pool (only if we created it)
    if (!tokens) {
      releaseTokenArray(tokens);
    }
  }
};
