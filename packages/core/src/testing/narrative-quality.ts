import { expect } from 'vitest';
import { TemplateFunction, TemplateOutput, NarrativeSequence } from '~/types/narrative';
import { WorldEvent } from '~/types/event';
import { ActorURN } from '~/types/taxonomy';
import { TransformerContext } from '~/types/handler';

/**
 * Higher-order functions for validating narrative quality across all locales.
 * These compose with vitest's describe/it functions to create reusable test validators.
 */

/**
 * Extracts text content from either a string or NarrativeSequence for validation purposes
 */
const extractTextForValidation = (output: string | NarrativeSequence): string => {
  if (typeof output === 'string') {
    return output;
  }
  return output.map(item => item.text).join(' ');
};

/**
 * Type for narrative validation decorators
 */
export type NarrativeValidator<T extends WorldEvent, TOutput extends TemplateOutput = string> = (
  narrativeFunction: TemplateFunction<T, ActorURN, TOutput>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => void;

/**
 * Higher-order function that validates a narrative doesn't contain object serialization artifacts.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withObjectSerializationValidation = <T extends WorldEvent, TOutput extends TemplateOutput = string>(
  narrativeFunction: TemplateFunction<T, ActorURN, TOutput>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  const output = narrativeFunction(context, event, perspective);
  const text = extractTextForValidation(output);
  expect(text, `Narrative should not contain [object Object] from ${perspective} perspective`).not.toContain('[object Object]');
};

/**
 * Higher-order function that validates a narrative doesn't contain debugging artifacts.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withDebuggingArtifactValidation = <T extends WorldEvent, TOutput extends TemplateOutput = string>(
  narrativeFunction: TemplateFunction<T, ActorURN, TOutput>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  const output = narrativeFunction(context, event, perspective);
  const text = extractTextForValidation(output);
  expect(text, `Narrative should not contain TODO from ${perspective} perspective`).not.toContain('TODO');
  expect(text, `Narrative should not contain FIXME from ${perspective} perspective`).not.toContain('FIXME');
  expect(text, `Narrative should not contain undefined from ${perspective} perspective`).not.toContain('undefined');
  expect(text, `Narrative should not contain null from ${perspective} perspective`).not.toContain('null');
};

/**
 * Higher-order function that validates a narrative is not empty.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withNonEmptyValidation = <T extends WorldEvent, TOutput extends TemplateOutput = string>(
  narrativeFunction: TemplateFunction<T, ActorURN, TOutput>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  const output = narrativeFunction(context, event, perspective);

  expect(output, `Narrative output should not be empty from ${perspective} perspective`).toBeTruthy();

  if (typeof output === 'string') {
    expect(output.length, `Narrative should have content from ${perspective} perspective`).toBeGreaterThan(0);
  } else {
    expect(output.length, `Narrative sequence should have items from ${perspective} perspective`).toBeGreaterThan(0);
    const hasContent = output.some(item => item.text.trim().length > 0);
    expect(hasContent, `Narrative sequence should have text content from ${perspective} perspective`).toBe(true);
  }
};

/**
 * Higher-order function that combines core narrative quality validations.
 * Validates against serialization artifacts and debugging remnants, but does not
 * assume narratives should be non-empty (that's a separate concern).
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withNarrativeQuality = <T extends WorldEvent, TOutput extends TemplateOutput = string>(
  narrativeFunction: TemplateFunction<T, ActorURN, TOutput>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  withObjectSerializationValidation(narrativeFunction, context, event, perspective)();
  withDebuggingArtifactValidation(narrativeFunction, context, event, perspective)();
};

/**
 * Higher-order function that validates narratives are different across perspectives.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withPerspectiveDifferentiation = <T extends WorldEvent, TOutput extends TemplateOutput = string>(
  narrativeFunction: TemplateFunction<T, ActorURN, TOutput>,
  context: TransformerContext,
  event: T,
  perspectives: ActorURN[]
) => () => {
  const outputs = perspectives.map(perspective => ({
    perspective,
    output: narrativeFunction(context, event, perspective),
    text: extractTextForValidation(narrativeFunction(context, event, perspective))
  }));

  // Ensure all outputs are truthy
  outputs.forEach(({ perspective, output }) => {
    expect(output, `Narrative should be truthy from ${perspective} perspective`).toBeTruthy();
  });

  // Compare extracted text for differences
  for (let i = 0; i < outputs.length; i++) {
    for (let j = i + 1; j < outputs.length; j++) {
      const { perspective: perspectiveA, text: textA } = outputs[i];
      const { perspective: perspectiveB, text: textB } = outputs[j];

      expect(textA, `Narrative from ${perspectiveA} should differ from ${perspectiveB}`).not.toBe(textB);
    }
  }
};

/**
 * Composes multiple narrative validators into a single test function.
 * Since all validators have the same signature, they can be easily composed.
 */
export const withComposedValidation = <T extends WorldEvent, TOutput extends TemplateOutput = string>(
  ...validators: NarrativeValidator<T, TOutput>[]
) => (
  narrativeFunction: TemplateFunction<T, ActorURN, TOutput>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  validators.forEach(validator => {
    validator(narrativeFunction, context, event, perspective)();
  });
};
