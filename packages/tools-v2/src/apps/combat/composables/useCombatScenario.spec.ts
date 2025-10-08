import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createComposableTestSuite } from '~/testing';
import { useCombatScenario } from './useCombatScenario';
import { Team } from '@flux/core';
import type { ActorSetupData } from '../types';

describe('useCombatScenario', () => {
  const { setup, teardown, runWithContext } = createComposableTestSuite();

  beforeEach(setup);
  afterEach(teardown);

  describe('initialization', () => {
    it('should initialize with empty setup actors', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();
        expect(scenario.actorConfig.value).toEqual([]);
      });
    });

    it('should provide battlefield configuration', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();
        const battlefield = scenario.getBattlefieldConfig();
        expect(battlefield.length).toBe(300);
        expect(battlefield.margin).toBe(100);
        expect(battlefield.cover).toEqual([]);
      });
    });
  });

  describe('saveSetup', () => {
    it('should save setup actors to localStorage', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();
        const testActors: ActorSetupData[] = [
          {
            id: 'actor:alice',
            name: 'Alice',
            team: Team.ALPHA,
            isAI: false,
            weaponUrn: 'flux:schema:weapon:longsword',
            canRemove: false
          } as any,
          {
            id: 'actor:bob',
            name: 'Bob',
            team: Team.BRAVO,
            isAI: true,
            weaponUrn: 'flux:schema:weapon:bow',
            canRemove: false
          } as any
        ];

        scenario.saveSetup(testActors);
        expect(scenario.actorConfig.value).toEqual(testActors);
      });
    });
  });

  describe('clearSetup', () => {
    it('should clear setup actors', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();

        // First add some actors
        const testActors: ActorSetupData[] = [
          {
            id: 'actor:alice',
            name: 'Alice',
            team: Team.ALPHA,
            isAI: false,
            weaponUrn: 'flux:schema:weapon:longsword',
            canRemove: false
          } as any
        ];

        scenario.saveSetup(testActors);
        expect(scenario.actorConfig.value).toHaveLength(1);

        // Then clear them
        scenario.clearSetup();
        expect(scenario.actorConfig.value).toEqual([]);
      });
    });
  });

  describe('battlefield configuration', () => {
    it('should return consistent battlefield config', () => {
      runWithContext(() => {
        const scenario = useCombatScenario();
        const battlefield1 = scenario.getBattlefieldConfig();
        const battlefield2 = scenario.getBattlefieldConfig();

        expect(battlefield1).toEqual(battlefield2);
        expect(battlefield1.length).toBe(300);
        expect(battlefield1.margin).toBe(100);
        expect(battlefield1.cover).toEqual([]);
      });
    });
  });
});
