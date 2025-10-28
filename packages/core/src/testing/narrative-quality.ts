import { expect } from 'vitest';
import { TemplateFunction } from '~/types/narrative';
import { WorldEvent } from '~/types/event';
import { ActorURN } from '~/types/taxonomy';
import { TransformerContext } from '~/types/handler';

/**
 * Higher-order functions for validating narrative quality across all locales.
 * These compose with vitest's describe/it functions to create reusable test validators.
 */

/**
 * Type for narrative validation decorators
 */
export type NarrativeValidator<T extends WorldEvent> = (
  narrativeFunction: TemplateFunction<T, ActorURN, string>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => void;

/**
 * Higher-order function that validates a narrative doesn't contain object serialization artifacts.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withObjectSerializationValidation = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T, ActorURN, string>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  const narrative = narrativeFunction(context, event, perspective);
  expect(narrative, `Narrative should not contain [object Object] from ${perspective} perspective`).not.toContain('[object Object]');
};

/**
 * Higher-order function that validates a narrative doesn't contain debugging artifacts.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withDebuggingArtifactValidation = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T, ActorURN, string>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  const narrative = narrativeFunction(context, event, perspective);
  expect(narrative, `Narrative should not contain TODO from ${perspective} perspective`).not.toContain('TODO');
  expect(narrative, `Narrative should not contain FIXME from ${perspective} perspective`).not.toContain('FIXME');
  expect(narrative, `Narrative should not contain undefined from ${perspective} perspective`).not.toContain('undefined');
  expect(narrative, `Narrative should not contain null from ${perspective} perspective`).not.toContain('null');
};

/**
 * Higher-order function that validates a narrative is not empty.
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withNonEmptyValidation = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T, ActorURN, string>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  const narrative = narrativeFunction(context, event, perspective);
  expect(narrative, `Narrative should not be empty from ${perspective} perspective`).toBeTruthy();
  expect(narrative.length, `Narrative should have content from ${perspective} perspective`).toBeGreaterThan(0);
};

/**
 * Higher-order function that combines core narrative quality validations.
 * Validates against serialization artifacts and debugging remnants, but does not
 * assume narratives should be non-empty (that's a separate concern).
 * Returns a test function that can be used with vitest's `it()`.
 */
export const withNarrativeQuality = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T, ActorURN, string>,
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
export const withPerspectiveDifferentiation = <T extends WorldEvent>(
  narrativeFunction: TemplateFunction<T, ActorURN, string>,
  context: TransformerContext,
  event: T,
  perspectives: ActorURN[]
) => () => {
  const narratives = perspectives.map(perspective => ({
    perspective,
    narrative: narrativeFunction(context, event, perspective)
  }));

  // Ensure all narratives are truthy
  narratives.forEach(({ perspective, narrative }) => {
    expect(narrative, `Narrative should be truthy from ${perspective} perspective`).toBeTruthy();
  });

  // Ensure narratives are different from each other
  for (let i = 0; i < narratives.length; i++) {
    for (let j = i + 1; j < narratives.length; j++) {
      const { perspective: perspectiveA, narrative: narrativeA } = narratives[i];
      const { perspective: perspectiveB, narrative: narrativeB } = narratives[j];

      expect(narrativeA, `Narrative from ${perspectiveA} should differ from ${perspectiveB}`).not.toBe(narrativeB);
    }
  }
};

/**
 * Composes multiple narrative validators into a single test function.
 * Since all validators have the same signature, they can be easily composed.
 */
export const withComposedValidation = <T extends WorldEvent>(
  ...validators: NarrativeValidator<T>[]
) => (
  narrativeFunction: TemplateFunction<T, ActorURN, string>,
  context: TransformerContext,
  event: T,
  perspective: ActorURN
) => () => {
  validators.forEach(validator => {
    validator(narrativeFunction, context, event, perspective)();
  });
};
