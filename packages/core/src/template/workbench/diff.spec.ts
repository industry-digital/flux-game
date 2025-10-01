import { renderShellDiff } from './diff';
import { ShellDiff } from '~/types/workbench';
import { ActorStat } from '~/types/entity/actor';
import { createPerformanceChanges } from '~/worldkit/entity/actor/shell/performance';
import { describe, expect, it } from 'vitest';

describe('renderShellDiff', () => {

  const expectStartsWith = (result: string, expected: string) => {
    expect(result.split('\n')[0]).toBe(expected);
  };

  const expectHasEmptyLineAfterStats = (result: string) => {
    const lines = result.split('\n');
    if (lines[0].startsWith('[')) {
      expect(lines[1]).toBe('');
    }
  };

  describe('stat changes and cost', () => {
    it('should render single stat change with cost', () => {
      const diff: ShellDiff = {
        shellId: 'test-shell',
        cost: 25,
        stats: {
          [ActorStat.POW]: '10 -> 12'
        },
        perf: createPerformanceChanges()
      };

      const result = renderShellDiff(diff);
      expectStartsWith(result, '[POW 10 -> 12, Cost: 25]');
      expectHasEmptyLineAfterStats(result);
    });
  });
});
