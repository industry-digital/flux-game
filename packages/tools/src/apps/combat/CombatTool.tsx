import { useCallback, useEffect, useRef, useMemo } from 'react';
import {
  useCombatScenario,
  ALICE_ID,
  BOB_ID,
  getNameFromActorId,
  type OptionalActorName,
  type ActorStatsInput,
  DAVE_ID,
  ERIC_ID,
  CHARLIE_ID,
  FRANZ_ID,
} from './hooks/useCombatScenario';
import { Team, Stat, type WeaponSchemaURN, Gender } from '@flux/core';
import { useCombatActors } from './hooks/useCombatActors';
import { useCombatSession } from './hooks/useCombatSession';
import { useCombatState } from './hooks/useCombatState';
import { useCombatLog } from './hooks/useCombatLog';
import { useAiControl } from './hooks/useAiControl';
import { CombatTerminal } from './components/CombatTerminal';
import { CombatantCard } from './components/CombatantCard';
import { TeamManager, type TeamActor } from './components/TeamManager';
import { BattlefieldVisualization } from '@flux/ui';
import { type TransformerContext } from '@flux/core';
import type { ActorURN, SkillSchemaURN } from '@flux/core';
import { attempt } from '~/shared/utils/error-handling';
import './CombatTool.css';
import { useTransformerContext } from '~/apps/combat/hooks/useTransformerContext';
import { DEFAULT_WEAPON_SCHEMA_URN, TEST_PLACE_ID } from '~/apps/combat/constants';

export interface CombatToolProps {
  // Props will be defined as we migrate from legacy
}

export interface CombatToolDependencies {
  // Dependencies can be injected for testing
}

export const DEFAULT_COMBAT_TOOL_DEPS: CombatToolDependencies = {
  // Default dependencies
};

export function createCombatTool(_deps: CombatToolDependencies = DEFAULT_COMBAT_TOOL_DEPS) {
  return function CombatTool({}: CombatToolProps) {
    const context: TransformerContext = useTransformerContext();

    // Default scenario data
    const defaultScenario = {
      actors: {
        [ALICE_ID]: {
          stats: { pow: 10, fin: 10, res: 10, int: 10, per: 10, mem: 10 },
          aiControlled: false,
          weapon: DEFAULT_WEAPON_SCHEMA_URN,
          skills: {
            'flux:skill:evasion': 0,
            'flux:skill:weapon:melee': 0
          },
          team: Team.ALPHA,
          gender: Gender.FEMALE
        },
        [BOB_ID]: {
          stats: { pow: 10, fin: 10, res: 10, int: 10, per: 10, mem: 10 },
          aiControlled: true, // Bob is AI-controlled by default
          weapon: DEFAULT_WEAPON_SCHEMA_URN,
          skills: {
            'flux:skill:evasion': 0,
            'flux:skill:weapon:melee': 0
          },
          team: Team.BRAVO,
          gender: Gender.MALE
        }
      }
    };

    // Initialize all the refactored hooks with shared context
    const {
      scenarioData,
      addOptionalActor,
      removeOptionalActor,
      getTeamActors,
      updateActorStats,
      updateActorSkill,
      updateActorWeapon,
      updateActorAiControl,
      calculateDerivedStats,
    } = useCombatScenario(defaultScenario);
    const actors = useCombatActors(context, scenarioData, TEST_PLACE_ID);
    const session = useCombatSession(context, TEST_PLACE_ID);

    // Track whether we've already added initial actors to prevent infinite loops
    const initialActorsAddedRef = useRef(false);

    // Sync initial actors with combat session
    useEffect(() => {
      if (session.session && session.isInSetupPhase && actors.isInitialized && !initialActorsAddedRef.current) {
        initialActorsAddedRef.current = true;
        // Add all actors from scenario to the combat session
        for (const [actorId, actorData] of Object.entries(scenarioData.actors)) {
          const sessionTeam = actorData.team === Team.ALPHA ? Team.ALPHA : Team.BRAVO;
          const result = attempt(() => {
            session.addCombatant(actorId as ActorURN, sessionTeam);
          });

          if (!result.success) {
            // Actor might already be in session, ignore duplicate errors
            if (!result.error.message.includes('already exists')) {
              console.warn(`Failed to add ${actorId} to session:`, result.error.message);
            }
          }
        }
      }
    }, [session.session, session.isInSetupPhase, actors.isInitialized, scenarioData.actors]);
    const { executeIntent, executeCommand, lastEventId } = useCombatState(
      context,
      session.session,
      session.currentActorId,
      TEST_PLACE_ID
    );
    const { combatLog, addEvents } = useCombatLog();

    const handleEventsGenerated = useCallback((events: any[]) => {
      // Debug logging for AI events
      addEvents(events);
      actors.syncActorsFromContext();

      // Process new events to update session state (turn advancement, etc.)
      session.processNewEvents();
    }, [addEvents, actors, session]);

    // Extract AI control state from scenario data (single source of truth)
    const aiControlledState = useMemo(() => {
      const result: Record<ActorURN, boolean> = {};
      for (const [actorId, actorData] of Object.entries(scenarioData.actors)) {
        result[actorId as ActorURN] = actorData.aiControlled;
      }
      return result;
    }, [scenarioData.actors]);

    const aiControl = useAiControl(
      context,
      session.session,
      session.currentActorId,
      aiControlledState,
      handleEventsGenerated,
      executeCommand
    );

    // Bridge function to handle stats updates with proper type conversion and dual updates
    const handleStatsChange = useCallback((actorId: ActorURN, stats: Partial<ActorStatsInput>) => {
      // Convert ActorStatsInput format to Stat enum format
      const statUpdates: Partial<Record<Stat, number>> = {};
      if (stats.pow !== undefined) statUpdates[Stat.POW] = stats.pow;
      if (stats.fin !== undefined) statUpdates[Stat.FIN] = stats.fin;
      if (stats.res !== undefined) statUpdates[Stat.RES] = stats.res;
      if (stats.int !== undefined) statUpdates[Stat.INT] = stats.int;
      if (stats.per !== undefined) statUpdates[Stat.PER] = stats.per;
      if (stats.mem !== undefined) statUpdates[Stat.MEM] = stats.mem;

      // Update both scenario data (for persistence) and actor data (for immediate effect)
      updateActorStats(actorId, stats); // Update scenario data
      actors.updateActorStats(actorId, statUpdates); // Update actor data with mutations
    }, [updateActorStats, actors.updateActorStats]);

    // Bridge function to handle skill updates with dual updates
    const handleSkillChange = useCallback((actorId: ActorURN, skillUrn: SkillSchemaURN, rank: number) => {
      if (!context) return;

      const actor = context.world.actors[actorId];
      if (!actor) {
        console.warn(`Cannot update skill: actor ${actorId} not found`);
        return;
      }

      // Update both scenario data (for persistence) and actor data (for immediate effect)
      updateActorSkill(actorId, skillUrn, rank); // Update scenario data
      context.skillApi.setActorSkillRank(actor, skillUrn, rank); // Update actor data with mutations
      actors.syncActorsFromContext(); // Force re-render
    }, [updateActorSkill, context, actors.syncActorsFromContext]);

    // Bridge function to handle weapon updates with dual updates
    const handleWeaponChange = useCallback((actorId: ActorURN, weaponUrn: WeaponSchemaURN) => {
      // Update both scenario data (for persistence) and actor data (for immediate effect)
      updateActorWeapon(actorId, weaponUrn); // Update scenario data
      actors.updateActorWeapon(actorId, weaponUrn); // Update actor data with mutations
    }, [updateActorWeapon, actors.updateActorWeapon]);

    // Helper function to render enhanced CombatantCard with all necessary props
    const renderCombatantCard = useCallback((actorId: ActorURN) => {
      const actor = actors.actors[actorId];
      if (!actor) return null;

      const actorData = scenarioData.actors[actorId];
      if (!actorData) return null;

      return (
        <CombatantCard
          key={actorId}
          actor={actor}
          actorId={actorId}
          computeCombatMass={context.mass.computeCombatMass}
          isActive={session.currentActorId === actorId}
          isAiControlled={actorData.aiControlled}
          onAiToggle={updateActorAiControl}
          isAiThinking={aiControl.aiThinking === actorId}

          // Editing props (only active during setup phase)
          isInSetupPhase={session.isInSetupPhase}
          scenarioStats={actorData.stats}
          scenarioSkills={actorData.skills}
          selectedWeapon={actorData.weapon}
          availableWeapons={actors.availableWeapons}
          derivedStats={calculateDerivedStats(actorId)}
          onStatsChange={handleStatsChange}
          onSkillChange={handleSkillChange}
          onWeaponChange={handleWeaponChange}
        />
      );
    }, [
      actors.actors,
      actors.availableWeapons,
      handleStatsChange,
      handleSkillChange,
      handleWeaponChange,
      scenarioData.actors,
      session.currentActorId,
      session.isInSetupPhase,
      aiControl.aiThinking,
      calculateDerivedStats,
      updateActorAiControl,
      context.mass.computeCombatMass,
    ]);

    const handleCommand = useCallback((command: string) => {
      // Log combat session state before command
      const events = executeIntent(command);
      handleEventsGenerated(events);
    }, [executeIntent, handleEventsGenerated]);

    // Create integrated add/remove functions that sync scenario and session
    const handleAddOptionalActor = useCallback((name: OptionalActorName) => {
      addOptionalActor(name, (actorId, team) => {
        // Add to combat session with proper team mapping
        const sessionTeam = team === Team.ALPHA ? Team.ALPHA : Team.BRAVO;
        session.addCombatant(actorId, sessionTeam);
      });
    }, [addOptionalActor, session]);

    const handleRemoveOptionalActor = useCallback((name: OptionalActorName) => {
      removeOptionalActor(name, (actorId) => {
        // Remove from combat session
        session.removeCombatant(actorId);
      });
    }, [removeOptionalActor, session]);

    // Helper function to create TeamActor array for the new TeamManager interface
    const createTeamActors = useCallback((team: Team): TeamActor[] => {
      const allPossibleActors: ActorURN[] = team === Team.ALPHA
        ? [ALICE_ID, 'flux:actor:charlie' as ActorURN, 'flux:actor:eric' as ActorURN]
        : [BOB_ID, 'flux:actor:dave' as ActorURN, 'flux:actor:franz' as ActorURN];

      return allPossibleActors.map(actorId => ({
        id: actorId,
        name: getNameFromActorId(actorId),
        isActive: actorId in scenarioData.actors,
        isDisabled: actorId === ALICE_ID || actorId === BOB_ID // Alice and Bob cannot be toggled
      }));
    }, [scenarioData.actors]);

    // Handler for the new TeamManager interface
    const handleToggleActor = useCallback((actorId: ActorURN) => {
      const isCurrentlyActive = actorId in scenarioData.actors;

      if (isCurrentlyActive) {
        // Remove actor (find the name from the actorId)
        const name = getOptionalActorNameFromId(actorId);
        if (name) {
          handleRemoveOptionalActor(name);
        }
      } else {
        // Add actor (find the name from the actorId)
        const name = getOptionalActorNameFromId(actorId);
        if (name) {
          handleAddOptionalActor(name);
        }
      }
    }, [scenarioData.actors, handleAddOptionalActor, handleRemoveOptionalActor]);

    // Helper to convert ActorURN to OptionalActorName
    const getOptionalActorNameFromId = (actorId: ActorURN): OptionalActorName | null => {
      switch (actorId) {
        case CHARLIE_ID: return 'charlie';
        case ERIC_ID: return 'eric';
        case DAVE_ID: return 'dave';
        case FRANZ_ID: return 'franz';
        default: return null;
      }
    };

    if (!actors.isInitialized) {
      return (
        <div className="combat-tool">
          <div className="setup-display">
            <div className="setup-content">
              <div className="setup-icon">⚔️</div>
              <p className="setup-description">Initializing combat tool...</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="combat-tool">
        {/* Header */}
        <div className="combat-tool-header">
          <h1 className="combat-tool-title">Combat Tool</h1>
          <div className="combat-tool-status">
            {session.isInSetupPhase ? (
              'Setup Phase - Configure actors before combat'
            ) : session.isPaused ? (
              <span className="terminal-status-paused">⏸️ PAUSED</span>
            ) : (
              `Active Combat - ${session.currentActorId ? actors.actors[session.currentActorId]?.name || 'Unknown' : 'No Actor'}`
            )}
          </div>
        </div>

        {/* Main content - Three column layout: Team Alpha | Terminal | Team Bravo */}
        <div className="combat-layout">
          {/* Left Column - Team Alpha */}
          <div className="team-column team-alpha">
            {/* Team Alpha Header */}
            <div
              className="team-header"
              style={{ '--team-color': 'var(--color-info)' } as React.CSSProperties}
            >
              <h2 className="team-title">Team A</h2>
              <div className="team-count">{getTeamActors(Team.ALPHA).length} fighters</div>

              {/* Team Management for Alpha - Only show during setup phase */}
              {session.isInSetupPhase && (
                <div className="team-management">
                  <TeamManager
                    teamName="Team Alpha"
                    teamColor="var(--color-info)"
                    actors={createTeamActors(Team.ALPHA)}
                    onToggleActor={handleToggleActor}
                    isSetupPhase={session.isInSetupPhase}
                  />
                </div>
              )}
            </div>

            {/* Team Alpha Combatants */}
            <div>
              {getTeamActors(Team.ALPHA).map(renderCombatantCard)}
            </div>
          </div>

          {/* Center Column - Terminal Interface */}
          <div className="terminal">
            <div className="terminal-interface">
              {/* Header with Start Combat Button */}
              <div className="terminal-header">
                <h1 className="terminal-title">Combat Terminal</h1>

                <div className="terminal-controls">
                  {session.isInSetupPhase && (
                    <button
                      onClick={() => {
                        const events = session.startCombat();
                        handleEventsGenerated(events);
                      }}
                      className="start-combat-button"
                    >
                      ⚔️ Start Combat
                    </button>
                  )}

                  <div className="terminal-status">
                    {session.isInSetupPhase ? (
                      'Setup Phase - Configure teams'
                    ) : session.isPaused ? (
                      <span className="terminal-status-paused">⏸️ PAUSED</span>
                    ) : (
                      `Active: ${session.currentActorId ? actors.actors[session.currentActorId]?.name || 'Unknown' : 'No Actor'}`
                    )}
                  </div>
                </div>
              </div>
              {session.isInSetupPhase ? (
                <div className="setup-display">
                  <div className="setup-content">
                    <div className="setup-icon">⚔️</div>
                    <h3 className="setup-title">Combat Setup</h3>
                    <p className="setup-description">
                      Configure your teams and adjust actor settings. When ready, click "Start Combat" to begin the battle.
                    </p>

                    <div className="setup-tips">
                      <div className="setup-tips-title">Quick Tips</div>
                      <ul className="setup-tips-list">
                        <li>• Add optional fighters to teams</li>
                        <li>• Toggle AI control for automated play</li>
                        <li>• Adjust stats and equipment as needed</li>
                      </ul>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="combat-interface">
                  {/* Battlefield Visualization Display */}
                  <div className="battlefield-display">
                    {session.session?.data ? (
                      <>
                        <BattlefieldVisualization
                          key={lastEventId || 'initial'}
                          battlefield={session.session.data.battlefield}
                          combatants={session.session.data.combatants}
                          actors={actors.actors}
                          currentActor={session.currentActorId || undefined}
                          subjectTeam={Team.ALPHA}
                          className="combat-battlefield-visualization"
                        />
                      </>
                    ) : (
                      <div className="battlefield-loading">
                        Initializing battlefield...
                      </div>
                    )}
                  </div>

                  {/* Enhanced Combat Terminal with integrated input */}
                  <div
                    className="combat-terminal-container"
                    style={{
                      height: '500px', // Fixed height to contain the terminal
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <CombatTerminal
                      context={context}
                      events={combatLog}
                      onCommand={handleCommand}
                      currentActor={session.currentActorId || undefined}
                      maxEntries={1000}
                      isSetupPhase={session.isInSetupPhase}
                      showWelcomeMessage={combatLog.length === 0}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Team Bravo */}
          <div className="team-column team-bravo">
            {/* Team Bravo Header */}
            <div
              className="team-header"
              style={{ '--team-color': 'var(--color-warning)' } as React.CSSProperties}
            >
              <h2 className="team-title">Team B</h2>
              <div className="team-count">{getTeamActors(Team.BRAVO).length} fighters</div>

              {/* Team Management for Bravo - Only show during setup phase */}
              {session.isInSetupPhase && (
                <div className="team-management">
                  <TeamManager
                    teamName="Team Bravo"
                    teamColor="var(--color-warning)"
                    actors={createTeamActors(Team.BRAVO)}
                    onToggleActor={handleToggleActor}
                    isSetupPhase={session.isInSetupPhase}
                  />
                </div>
              )}
            </div>

            {/* Team Bravo Combatants */}
            <div>
              {getTeamActors(Team.BRAVO).map(renderCombatantCard)}
            </div>

            {/* Combat Status Panel - moved to bottom of right column */}
            <div className="status-panel">
              <h3 className="status-title">Status</h3>

              <div className="status-items">
                {/* Phase Indicator */}
                <div>
                  <div
                    className="status-indicator"
                    style={{
                      '--indicator-color': session.isInSetupPhase ? 'var(--color-warning)' : 'var(--color-success)'
                    } as React.CSSProperties}
                  >
                    <div className={`status-indicator-dot ${!session.isInSetupPhase ? 'status-indicator-pulse' : ''}`} />
                    {session.isInSetupPhase ? 'Setup' : session.isPaused ? 'Paused' : 'Combat'}
                  </div>
                </div>

                {/* Active Actor */}
                {!session.isInSetupPhase && session.currentActorId && (
                  <div>
                    <div className="active-turn-label">Active Turn:</div>
                    <div className="active-turn-name">
                      {actors.actors[session.currentActorId]?.name || 'Unknown'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
}

// Export the configured component
export const CombatTool = createCombatTool(DEFAULT_COMBAT_TOOL_DEPS);
