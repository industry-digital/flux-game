import { describe, it, expect, beforeEach } from 'vitest';
import { createActorSessionApi, isSessionActive } from './session';
import { Actor } from '~/types/entity/actor';
import { Session, SessionStatus, SessionStrategy } from '~/types/session';
import { SessionURN } from '~/types/taxonomy';
import { WorldProjection } from '~/types/handler';

describe('ActorSessionApi', () => {
  let mockSessions: WorldProjection['sessions'];
  let mockActor: Actor;
  let api: ReturnType<typeof createActorSessionApi>;

  beforeEach(() => {
    // Create mock sessions with strategy field
    mockSessions = {
      ['flux:session:combat:test1' as SessionURN]: {
        id: 'flux:session:combat:test1' as SessionURN,
        status: SessionStatus.RUNNING,
        strategy: SessionStrategy.COMBAT,
        data: {},
      } as Session,
      ['flux:session:workbench:test2' as SessionURN]: {
        id: 'flux:session:workbench:test2' as SessionURN,
        status: SessionStatus.PENDING,
        strategy: SessionStrategy.WORKBENCH,
        data: {},
      } as Session,
      ['flux:session:combat:test3' as SessionURN]: {
        id: 'flux:session:combat:test3' as SessionURN,
        status: SessionStatus.PAUSED,
        strategy: SessionStrategy.COMBAT,
        data: {},
      } as Session,
      ['flux:session:workbench:test4' as SessionURN]: {
        id: 'flux:session:workbench:test4' as SessionURN,
        status: SessionStatus.RUNNING,
        strategy: SessionStrategy.WORKBENCH,
        data: {},
      } as Session,
    };

    // Create mock actor with sessions initialized
    mockActor = {
      id: 'flux:actor:test' as any,
      sessions: {},
    } as Actor;

    // Create API instance
    api = createActorSessionApi(mockSessions);
  });

  describe('isSessionActive', () => {
    it('should return true for RUNNING sessions', () => {
      const session = { status: SessionStatus.RUNNING } as Session;
      expect(isSessionActive(session)).toBe(true);
    });

    it('should return false for non-RUNNING sessions', () => {
      expect(isSessionActive({ status: SessionStatus.PENDING } as Session)).toBe(false);
      expect(isSessionActive({ status: SessionStatus.PAUSED } as Session)).toBe(false);
      expect(isSessionActive({ status: SessionStatus.TERMINATED } as Session)).toBe(false);
    });
  });

  describe('getActiveSessions', () => {
    it('should return empty array for actor with no sessions', () => {
      const result = api.getActiveSessions(mockActor);
      expect(result).toEqual([]);
    });

    it('should return sessions that exist in world', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,
        'flux:session:workbench:test2': 1,
      };

      const result = api.getActiveSessions(mockActor);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('flux:session:combat:test1');
      expect(result[1].id).toBe('flux:session:workbench:test2');
    });

    it('should skip sessions that do not exist in world', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,
        'flux:session:nonexistent:test999': 1,
      };

      const result = api.getActiveSessions(mockActor);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('flux:session:combat:test1');
    });

    it('should reuse output array to avoid allocations', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,
      };

      const outputArray: Session[] = [];
      const result1 = api.getActiveSessions(mockActor, outputArray);
      const result2 = api.getActiveSessions(mockActor, outputArray);

      expect(result1).toBe(outputArray);
      expect(result2).toBe(outputArray);
    });
  });

  describe('addToActiveSessions', () => {
    it('should add session to existing sessions', () => {
      mockActor.sessions = { 'flux:session:combat:test1': 1 };
      api.addToActiveSessions(mockActor, 'flux:session:workbench:test2' as SessionURN);

      expect(mockActor.sessions['flux:session:combat:test1']).toBe(1);
      expect(mockActor.sessions['flux:session:workbench:test2']).toBe(1);
    });

    it('should enforce invariant: replace existing session of same strategy', () => {
      mockActor.sessions = { 'flux:session:combat:test1': 1 };

      // Add another combat session - should replace the existing one
      api.addToActiveSessions(mockActor, 'flux:session:combat:test3' as SessionURN);

      expect(mockActor.sessions['flux:session:combat:test1']).toBeUndefined();
      expect(mockActor.sessions['flux:session:combat:test3']).toBe(1);
    });

    it('should allow different session strategies to coexist', () => {
      mockActor.sessions = { 'flux:session:combat:test1': 1 };

      // Add workbench session - should coexist with combat
      api.addToActiveSessions(mockActor, 'flux:session:workbench:test2' as SessionURN);

      expect(mockActor.sessions['flux:session:combat:test1']).toBe(1);
      expect(mockActor.sessions['flux:session:workbench:test2']).toBe(1);
    });

    it('should do nothing if session does not exist in world', () => {
      const originalSessions = { ...mockActor.sessions };

      api.addToActiveSessions(mockActor, 'flux:session:nonexistent:test999' as SessionURN);

      expect(mockActor.sessions).toEqual(originalSessions);
    });
  });

  describe('removeFromActiveSessions', () => {
    it('should remove session from actor sessions', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,
        'flux:session:workbench:test2': 1,
      };

      api.removeFromActiveSessions(mockActor, 'flux:session:combat:test1' as SessionURN);

      expect(mockActor.sessions['flux:session:combat:test1']).toBeUndefined();
      expect(mockActor.sessions['flux:session:workbench:test2']).toBe(1);
    });
  });

  describe('clearActiveSessions', () => {
    it('should remove all sessions from actor', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,
        'flux:session:workbench:test2': 1,
      };

      api.clearActiveSessions(mockActor);

      expect(Object.keys(mockActor.sessions)).toHaveLength(0);
    });
  });

  describe('getActiveSessionByStrategy', () => {
    it('should return session with matching strategy', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,
        'flux:session:workbench:test2': 1,
      };

      const combatSession = api.getActiveSessionByStrategy(mockActor, SessionStrategy.COMBAT);
      expect(combatSession?.id).toBe('flux:session:combat:test1');
      expect(combatSession?.strategy).toBe(SessionStrategy.COMBAT);

      const workbenchSession = api.getActiveSessionByStrategy(mockActor, SessionStrategy.WORKBENCH);
      expect(workbenchSession?.id).toBe('flux:session:workbench:test2');
      expect(workbenchSession?.strategy).toBe(SessionStrategy.WORKBENCH);
    });

    it('should return null for non-existent strategy', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,
      };

      const result = api.getActiveSessionByStrategy(mockActor, 'nonexistent');
      expect(result).toBeNull();
    });

    it('should return null for empty sessions', () => {
      const result = api.getActiveSessionByStrategy(mockActor, SessionStrategy.COMBAT);
      expect(result).toBeNull();
    });

    it('should return session regardless of status', () => {
      mockActor.sessions = {
        'flux:session:combat:test3': 1, // PAUSED
      };

      const result = api.getActiveSessionByStrategy(mockActor, SessionStrategy.COMBAT);
      expect(result?.id).toBe('flux:session:combat:test3');
      expect(result?.status).toBe(SessionStatus.PAUSED);
    });
  });

  describe('getRunningSessionByStrategy', () => {
    it('should return only RUNNING sessions with matching strategy', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,      // RUNNING
        'flux:session:combat:test3': 1,      // PAUSED
        'flux:session:workbench:test4': 1,   // RUNNING
      };

      const runningCombat = api.getRunningSessionByStrategy(mockActor, SessionStrategy.COMBAT);
      expect(runningCombat?.id).toBe('flux:session:combat:test1');
      expect(runningCombat?.status).toBe(SessionStatus.RUNNING);

      const runningWorkbench = api.getRunningSessionByStrategy(mockActor, SessionStrategy.WORKBENCH);
      expect(runningWorkbench?.id).toBe('flux:session:workbench:test4');
      expect(runningWorkbench?.status).toBe(SessionStatus.RUNNING);
    });

    it('should return null for non-running sessions', () => {
      mockActor.sessions = {
        'flux:session:combat:test3': 1,      // PAUSED
        'flux:session:workbench:test2': 1,   // PENDING
      };

      const combatResult = api.getRunningSessionByStrategy(mockActor, SessionStrategy.COMBAT);
      expect(combatResult).toBeNull();

      const workbenchResult = api.getRunningSessionByStrategy(mockActor, SessionStrategy.WORKBENCH);
      expect(workbenchResult).toBeNull();
    });

    it('should return null for non-existent strategy', () => {
      mockActor.sessions = {
        'flux:session:combat:test1': 1,
      };

      const result = api.getRunningSessionByStrategy(mockActor, 'nonexistent');
      expect(result).toBeNull();
    });
  });
});
