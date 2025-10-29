import { bench, describe } from 'vitest';
import { z } from 'zod';

// Test data that mimics our command resolver input
const validInput = {
  prefix: 'shell',
  tokens: ['attribute', 'add', 'pow', '50'],
  actor: 'flux:actor:alice',
  location: 'flux:place:workbench',
};

const invalidInputs = [
  { prefix: 'weapon', tokens: ['attribute', 'add', 'pow', '50'], actor: 'flux:actor:alice', location: 'flux:place:workbench' },
  { prefix: 'shell', tokens: ['attr', 'remove', 'pow', '50'], actor: 'flux:actor:alice', location: 'flux:place:workbench' },
  { prefix: 'shell', tokens: ['attribute', 'add', 'str', '50'], actor: 'flux:actor:alice', location: 'flux:place:workbench' },
  { prefix: 'shell', tokens: ['attribute', 'add', 'pow', 'abc'], actor: 'flux:actor:alice', location: 'flux:place:workbench' },
  { prefix: 'shell', tokens: ['attribute', 'add', 'pow', '150'], actor: 'flux:actor:alice', location: 'flux:place:workbench' },
];

// Hand-rolled validation (mimicking our resolver logic)
const SHELL_PREFIX = 'shell';
const ATTRIBUTE_TOKENS = new Set(['attr', 'attribute']);
const ALLOWED_STAT_TOKENS = new Set(['pow', 'fin', 'res']);
const ADD_VERB = 'add';
const DIGITS = /^\d+$/;
const MAX_STAT_VALUE = 100;

function handRolledValidation(input: any): boolean {
  // Prefix validation
  if (input.prefix !== SHELL_PREFIX) {
    return false;
  }

  // Token count validation
  if (!Array.isArray(input.tokens) || input.tokens.length !== 4) {
    return false;
  }

  const [attributeToken, verbToken, statToken, digitsToken] = input.tokens;

  // Attribute token validation
  if (!ATTRIBUTE_TOKENS.has(attributeToken)) {
    return false;
  }

  // Verb validation
  if (verbToken !== ADD_VERB) {
    return false;
  }

  // Stat token validation
  if (!ALLOWED_STAT_TOKENS.has(statToken)) {
    return false;
  }

  // Numeric validation
  if (!DIGITS.test(digitsToken)) {
    return false;
  }

  const amount = parseInt(digitsToken, 10);
  if (isNaN(amount) || amount < 0 || amount > MAX_STAT_VALUE) {
    return false;
  }

  return true;
}

// Zod schema validation
const zodSchema = z.object({
  prefix: z.literal('shell'),
  tokens: z.tuple([
    z.enum(['attr', 'attribute']),
    z.literal('add'),
    z.enum(['pow', 'fin', 'res']),
    z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).refine(val => val >= 0 && val <= 100)
  ]),
  actor: z.string(),
  location: z.string(),
});

function zodValidation(input: any): boolean {
  const result = zodSchema.safeParse(input);
  return result.success;
}

// More complex object for additional benchmarking
const complexValidInput = {
  prefix: 'shell',
  tokens: ['attribute', 'add', 'pow', '50'],
  actor: 'flux:actor:alice',
  location: 'flux:place:workbench',
  metadata: {
    timestamp: Date.now(),
    sessionId: 'session-123',
    flags: ['urgent', 'validated'],
    nested: {
      level1: {
        level2: {
          value: 42,
          name: 'test'
        }
      }
    }
  }
};

// Hand-rolled validation for complex object
function handRolledComplexValidation(input: any): boolean {
  // Basic validation first
  if (!handRolledValidation(input)) {
    return false;
  }

  // Additional metadata validation
  if (!input.metadata || typeof input.metadata !== 'object') {
    return false;
  }

  if (typeof input.metadata.timestamp !== 'number') {
    return false;
  }

  if (typeof input.metadata.sessionId !== 'string') {
    return false;
  }

  if (!Array.isArray(input.metadata.flags)) {
    return false;
  }

  if (!input.metadata.nested?.level1?.level2) {
    return false;
  }

  if (typeof input.metadata.nested.level1.level2.value !== 'number') {
    return false;
  }

  if (typeof input.metadata.nested.level1.level2.name !== 'string') {
    return false;
  }

  return true;
}

// Zod schema for complex object
const zodComplexSchema = z.object({
  prefix: z.literal('shell'),
  tokens: z.tuple([
    z.enum(['attr', 'attribute']),
    z.literal('add'),
    z.enum(['pow', 'fin', 'res']),
    z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).refine(val => val >= 0 && val <= 100)
  ]),
  actor: z.string(),
  location: z.string(),
  metadata: z.object({
    timestamp: z.number(),
    sessionId: z.string(),
    flags: z.array(z.string()),
    nested: z.object({
      level1: z.object({
        level2: z.object({
          value: z.number(),
          name: z.string()
        })
      })
    })
  })
});

function zodComplexValidation(input: any): boolean {
  const result = zodComplexSchema.safeParse(input);
  return result.success;
}

describe('Validation Performance Benchmark', () => {
  describe('Simple Object Validation', () => {
    bench('Hand-rolled validation (valid input)', () => {
      handRolledValidation(validInput);
    });

    bench('Zod validation (valid input)', () => {
      zodValidation(validInput);
    });

    bench('Hand-rolled validation (mixed valid/invalid)', () => {
      handRolledValidation(validInput);
      for (const invalid of invalidInputs) {
        handRolledValidation(invalid);
      }
    });

    bench('Zod validation (mixed valid/invalid)', () => {
      zodValidation(validInput);
      for (const invalid of invalidInputs) {
        zodValidation(invalid);
      }
    });
  });

  describe('Complex Object Validation', () => {
    bench('Hand-rolled complex validation', () => {
      handRolledComplexValidation(complexValidInput);
    });

    bench('Zod complex validation', () => {
      zodComplexValidation(complexValidInput);
    });
  });

  describe('Batch Processing (1000 validations)', () => {
    bench('Hand-rolled batch validation', () => {
      for (let i = 0; i < 1000; i++) {
        handRolledValidation(validInput);
      }
    });

    bench('Zod batch validation', () => {
      for (let i = 0; i < 1000; i++) {
        zodValidation(validInput);
      }
    });
  });

  describe('Early Exit Performance', () => {
    const earlyFailInput = { prefix: 'weapon', tokens: ['attribute', 'add', 'pow', '50'] };

    bench('Hand-rolled early exit (fails on first check)', () => {
      handRolledValidation(earlyFailInput);
    });

    bench('Zod early exit (fails on first check)', () => {
      zodValidation(earlyFailInput);
    });
  });

  describe('Schema Creation Overhead', () => {
    bench('Hand-rolled (no schema creation)', () => {
      handRolledValidation(validInput);
    });

    bench('Zod with schema recreation', () => {
      const schema = z.object({
        prefix: z.literal('shell'),
        tokens: z.tuple([
          z.enum(['attr', 'attribute']),
          z.literal('add'),
          z.enum(['pow', 'fin', 'res']),
          z.string().regex(/^\d+$/).transform(val => parseInt(val, 10)).refine(val => val >= 0 && val <= 100)
        ]),
        actor: z.string(),
        location: z.string(),
      });
      schema.safeParse(validInput);
    });

    bench('Zod with pre-created schema', () => {
      zodValidation(validInput);
    });
  });
});
