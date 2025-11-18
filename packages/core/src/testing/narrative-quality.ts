import { expect } from 'vitest';
import { TemplateFunction, Narrative, NarrativeSequence } from '~/types/narrative';
import { WorldEvent } from '~/types/event';
import { TransformerContext } from '~/types/handler';

/**
 * Higher-order functions for validating narrative quality across all locales.
 * These compose with vitest's describe/it functions to create reusable test validators.
 */

/**
 * Extracts text content from Narrative or NarrativeSequence for validation purposes.
 * For Narrative objects, extracts both self and observer perspectives.
 * For NarrativeSequence, extracts all text from all items.
 */
const extractTextForValidation = (output: Narrative | NarrativeSequence): string => {
  if (Array.isArray(output)) {
    // NarrativeSequence: extract all text from all items
    return output.map(item => `${item.self} ${item.observer}`).join(' ');
  }
  // Narrative: extract both perspectives
  return `${output.self} ${output.observer}`;
};

/**
 * Type for narrative validation decorators
 */
export type NarrativeValidator<T extends WorldEvent> = (
  narrativeFunction: TemplateFunction<T>,
  context: TransformerContext,
  event: T
) => () => void;

/**
 * Higher-order function that validates a narrative doesn't contain object serialization artifacts.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withObjectSerializationValidation = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T>,
  context: TransformerContext,
  event: T
) => () => {
  const output = narrativeFunction(context, event);
  const text = extractTextForValidation(output);
  expect(text, `Narrative should not contain [object Object]`).not.toContain('[object Object]');
};

/**
 * Higher-order function that validates a narrative doesn't contain debugging artifacts.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withDebuggingArtifactValidation = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T>,
  context: TransformerContext,
  event: T
) => () => {
  const output = narrativeFunction(context, event);
  const text = extractTextForValidation(output);
  expect(text, `Narrative should not contain TODO`).not.toContain('TODO');
  expect(text, `Narrative should not contain FIXME`).not.toContain('FIXME');
  expect(text, `Narrative should not contain undefined`).not.toContain('undefined');
  expect(text, `Narrative should not contain null`).not.toContain('null');
};

/**
 * Higher-order function that validates a narrative is not empty.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withNonEmptyValidation = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T>,
  context: TransformerContext,
  event: T
) => () => {
  const output = narrativeFunction(context, event);

  expect(output, `Narrative output should not be empty`).toBeTruthy();

  if (Array.isArray(output)) {
    // NarrativeSequence: validate it has items and at least one has content
    expect(output.length, `Narrative sequence should have items`).toBeGreaterThan(0);
    const hasContent = output.some(item =>
      item.self.trim().length > 0 || item.observer.trim().length > 0
    );
    expect(hasContent, `Narrative sequence should have text content`).toBe(true);
  } else {
    // Narrative: validate both perspectives have content
    expect(output.self.trim().length, `Narrative self perspective should have content`).toBeGreaterThan(0);
    expect(output.observer.trim().length, `Narrative observer perspective should have content`).toBeGreaterThan(0);
  }
};

/**
 * Higher-order function that combines core narrative quality validations.
 * Validates against serialization artifacts and debugging remnants, but does not
 * assume narratives should be non-empty (that's a separate concern).
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withNarrativeQuality = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T>,
  context: TransformerContext,
  event: T
) => () => {
  withObjectSerializationValidation(narrativeFunction, context, event)();
  withDebuggingArtifactValidation(narrativeFunction, context, event)();
};

/**
 * Higher-order function that validates narratives differentiate between self and observer perspectives.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withPerspectiveDifferentiation = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T>,
  context: TransformerContext,
  event: T
) => () => {
  const output = narrativeFunction(context, event);

  // Ensure output is truthy
  expect(output, `Narrative output should be truthy`).toBeTruthy();

  if (Array.isArray(output)) {
    // NarrativeSequence: validate each item has different self and observer
    output.forEach((item, index) => {
      expect(
        item.self,
        `Narrative sequence item ${index} self perspective should have content`
      ).toBeTruthy();
      expect(
        item.observer,
        `Narrative sequence item ${index} observer perspective should have content`
      ).toBeTruthy();
      expect(
        item.self,
        `Narrative sequence item ${index} self and observer should differ`
      ).not.toBe(item.observer);
    });
  } else {
    // Narrative: validate self and observer are different
    expect(output.self, `Narrative self perspective should have content`).toBeTruthy();
    expect(output.observer, `Narrative observer perspective should have content`).toBeTruthy();
    expect(
      output.self,
      `Narrative self and observer perspectives should differ`
    ).not.toBe(output.observer);
  }
};

/**
 * Composes multiple narrative validators into a single test function.
 * Since all validators have the same signature, they can be easily composed.
 */
export const withComposedValidation = <T extends WorldEvent>(
  ...validators: NarrativeValidator<T>[]
) => (
  narrativeFunction: TemplateFunction<T>,
  context: TransformerContext,
  event: T
) => () => {
  validators.forEach(validator => {
    validator(narrativeFunction, context, event)();
  });
};
