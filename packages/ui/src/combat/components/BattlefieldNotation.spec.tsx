import { describe, it, expect } from 'vitest';
import {
  renderBattlefieldNotation,
  ColorStrategies
} from './BattlefieldNotation';
import type { NotationActor } from '~/types/combat';

/**
 * Test data factory for creating actors
 */
function createActor(overrides: Partial<NotationActor> = {}): NotationActor {
  return {
    id: 'alice',
    name: 'Alice',
    team: 'alpha',
    position: 100,
    facing: 'right',
    ...overrides,
  };
}

describe('BattlefieldNotation Utilities', () => {

  describe('Facing Indicators', () => {
    it('renders right-facing actors with trailing chevron', () => {
      const actors = [createActor({ name: 'Alice', facing: 'right' })];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('[ A₁> ]');
    });

    it('renders left-facing actors with leading chevron', () => {
      const actors = [createActor({ name: 'Alice', facing: 'left' })];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('[ <A₁ ]');
    });

    it('separates left and right facing actors with boundary space', () => {
      const actors = [
        createActor({ name: 'Alice', id: 'alice', position: 100, facing: 'left' }),
        createActor({ name: 'Bob', id: 'bob', position: 100, facing: 'right' }),
      ];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('[ <A₁ B₁> ]');
    });
  });

  describe('Distance Calculation', () => {
    it('calculates correct distances between positions', () => {
      const actors = [
        createActor({ name: 'Alice', id: 'alice', position: 100 }),
        createActor({ name: 'Bob', id: 'bob', position: 175 }),
        createActor({ name: 'Charlie', id: 'charlie', position: 200 }),
      ];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('[ A₁> ]─<span class="distance-number">75</span>─[ B₁> ]─<span class="distance-number">25</span>─[ C₁> ]');
    });
  });

  describe('Boundary Markers', () => {
    it('renders left boundary marker', () => {
      const actors = [createActor({ name: 'Alice', id: 'alice', position: 0 })];
      const boundaries = [{ position: 0, side: 'left' as const }];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        boundaries,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('▌[ A₁> ]');
    });

    it('renders right boundary marker', () => {
      const actors = [createActor({ name: 'Alice', id: 'alice', position: 300 })];
      const boundaries = [{ position: 300, side: 'right' as const }];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        boundaries,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('[ A₁> ]▌');
    });
  });

  describe('Color Strategies', () => {
      it('applies plain color strategy correctly', () => {
        const actors = [createActor({ name: 'Alice' })];
        const notation = renderBattlefieldNotation({
          combatants: actors,
          colorStrategy: ColorStrategies.PLAIN,
          currentActor: 'alice'
        });

        expect(notation).toBe('[ <span style="font-weight: 900">A₁></span> ]');
    });

    it('applies HTML color strategy correctly', () => {
      const actors = [createActor({ name: 'Alice', team: 'alpha' })];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        colorStrategy: ColorStrategies.HTML,
        subjectTeam: 'alpha'
      });

      expect(notation).toContain('<span class="subject-team">A₁></span>');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty combatants array', () => {
      const notation = renderBattlefieldNotation({
        combatants: [],
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('');
    });

    it('handles single combatant', () => {
      const actors = [createActor({ name: 'Alice', id: 'alice' })];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('[ A₁> ]');
    });

    it('handles actors with single character names', () => {
      const actors = [createActor({ name: 'A', id: 'a' })];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('[ A₁> ]');
    });

    it('handles actors at same position with same facing', () => {
      const actors = [
        createActor({ name: 'Alice', id: 'alice', position: 100, facing: 'right' }),
        createActor({ name: 'Bob', id: 'bob', position: 100, facing: 'right' }),
      ];
      const notation = renderBattlefieldNotation({
        combatants: actors,
        colorStrategy: ColorStrategies.PLAIN
      });

      expect(notation).toBe('[ A₁>B₁> ]');
    });
  });
});
