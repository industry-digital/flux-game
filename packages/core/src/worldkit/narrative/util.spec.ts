import { describe, expect, it } from 'vitest';
import { toPossessive } from '~/worldkit/narrative/util';

describe('toPossessive', () => {
  type TestCase = { input: string; output: string };

  it.each<TestCase>([
    { input: 'Alice', output: "Alice's" },
    { input: 'Cass', output: "Cass'" },

    { input: 'Alexandra', output: "Alexandra's" },
  ])('should return the possessive form of a name', (testCase: TestCase) => {
    expect(toPossessive(testCase.input)).toBe(testCase.output);
  });
});
