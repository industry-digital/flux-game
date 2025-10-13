import { useCallback, useEffect, useRef } from 'react';
import { useCombatScenario, ALICE_ID, BOB_ID, type TeamName, type OptionalActorName } from './hooks/useCombatScenario';
import { useCombatActors } from './hooks/useCombatActors';
import { useCombatSession } from './hooks/useCombatSession';
import { useCombatState } from './hooks/useCombatState';
import { useCombatLog } from './hooks/useCombatLog';
import { useAiControl } from './hooks/useAiControl';
import { CombatLog } from './components/CombatLog';
import { CommandInput } from './components/CommandInput';
import { CombatantCard } from './components/CombatantCard';
import { TeamManager } from './components/TeamManager';
import { createTransformerContext, Team, type TransformerContext } from '@flux/core';
import type { ActorURN, PlaceURN, WeaponSchemaURN } from '@flux/core';
import { attempt } from '~/shared/utils/error-handling';
import './CombatTool.css';

// Test place
const TEST_PLACE_ID: PlaceURN = 'flux:place:test-battlefield';
const DEFAULT_WEAPON_SCHEMA_URN: WeaponSchemaURN = 'flux:schema:weapon:longsword';

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

    // Create the shared TransformerContext at the composition root
    // Use ref to maintain stable reference and avoid infinite re-renders
    const contextRef = useRef<TransformerContext | null>(null);
    if (!contextRef.current) {
      contextRef.current = createTransformerContext();
    }
    const context = contextRef.current;

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
          team: 'ALPHA' as TeamName
        },
        [BOB_ID]: {
          stats: { pow: 10, fin: 10, res: 10, int: 10, per: 10, mem: 10 },
          aiControlled: true, // Bob is AI-controlled by default
          weapon: DEFAULT_WEAPON_SCHEMA_URN,
          skills: {
            'flux:skill:evasion': 0,
            'flux:skill:weapon:melee': 0
          },
          team: 'BRAVO' as TeamName
        }
      }
    };

    // Initialize all the refactored hooks with shared context
    const {
      scenarioData,
      addOptionalActor,
      removeOptionalActor,
      getTeamActors,
      getAvailableOptionalActors,
      updateActorStats,
      updateActorSkill,
      updateActorWeapon,
      calculateDerivedStats,
    } = useCombatScenario(defaultScenario);
    const actors = useCombatActors(context, scenarioData, TEST_PLACE_ID);
    const session = useCombatSession(context, TEST_PLACE_ID);

    // Track whether we've already added initial actors to prevent infinite loops
    const initialActorsAddedRef = useRef(false);

    // Sync initial actors with combat session
    useEffect(() => {
      if (session.session && session.isInSetupPhase && actors.isInitialized && !initialActorsAddedRef.current) {
        console.log('✅ Adding actors to combat session...');
        initialActorsAddedRef.current = true;

        // Add all actors from scenario to the combat session
        for (const [actorId, actorData] of Object.entries(scenarioData.actors)) {
          const sessionTeam = actorData.team === 'ALPHA' ? Team.ALPHA : Team.BRAVO;
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
    const combatState = useCombatState(
      context,
      session.session,
      session.currentActorId,
      TEST_PLACE_ID,
      session.sessionId
    );
    const { combatLog, addEvents } = useCombatLog();

    const handleEventsGenerated = useCallback((events: any[]) => {
      addEvents(events);
      actors.syncActorsFromContext();

      // Process new events to update session state (turn advancement, etc.)
      session.processNewEvents();
    }, [addEvents, actors, session]);

    const aiControl = useAiControl(
      context,
      session.session,
      session.currentActorId,
      handleEventsGenerated
    );

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
          isActive={session.currentActorId === actorId}
          isAiControlled={aiControl.aiControlled[actorId] || false}
          onAiToggle={aiControl.setAiControlled}
          isAiThinking={aiControl.aiThinking === actorId}

          // Editing props (only active during setup phase)
          isInSetupPhase={session.isInSetupPhase}
          scenarioStats={actorData.stats}
          scenarioSkills={actorData.skills}
          selectedWeapon={actorData.weapon}
          availableWeapons={actors.availableWeapons}
          derivedStats={calculateDerivedStats(actorId)}
          onStatsChange={updateActorStats}
          onSkillChange={updateActorSkill}
          onWeaponChange={updateActorWeapon}
        />
      );
    }, [
      actors.actors,
      actors.availableWeapons,
      scenarioData.actors,
      session.currentActorId,
      session.isInSetupPhase,
      aiControl.aiControlled,
      aiControl.setAiControlled,
      aiControl.aiThinking,
      calculateDerivedStats,
      updateActorStats,
      updateActorSkill,
      updateActorWeapon,
    ]);

    const handleCommand = useCallback((command: string) => {
      console.log(`🎮 CombatTool: Executing command "${command}"`);

      // Log combat session state before command
      if (session.session) {
        const initiativeOrder = Array.from(session.session.data.initiative.keys());
        const currentActor = session.session.data.rounds.current.turns.current.actor;
        const currentRound = session.session.data.rounds.current.number;
        const currentTurn = session.session.data.rounds.current.turns.current.number;

        console.log(`🎮 Combat session state:`);
        console.log(`  Initiative order: [${initiativeOrder.join(', ')}]`);
        console.log(`  Current actor: ${currentActor}`);
        console.log(`  Round ${currentRound}, Turn ${currentTurn}`);
        console.log(`  Total combatants: ${session.session.data.combatants.size}`);
      }

      const events = combatState.executeCommand(command);
      handleEventsGenerated(events);
    }, [combatState, handleEventsGenerated, session.session]);

    // Create integrated add/remove functions that sync scenario and session
    const handleAddOptionalActor = useCallback((name: OptionalActorName) => {
      addOptionalActor(name, (actorId, team) => {
        // Add to combat session with proper team mapping
        const sessionTeam = team === 'ALPHA' ? Team.ALPHA : Team.BRAVO;
        console.log(`🎯 Adding ${actorId} to combat session as team ${sessionTeam}`);
        session.addCombatant(actorId, sessionTeam);
      });
    }, [addOptionalActor, session]);

    const handleRemoveOptionalActor = useCallback((name: OptionalActorName) => {
      removeOptionalActor(name, (actorId) => {
        // Remove from combat session
        console.log(`🗑️ Removing ${actorId} from combat session`);
        session.removeCombatant(actorId);
      });
    }, [removeOptionalActor, session]);

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
              <h2 className="team-title">Team Alpha</h2>
              <div className="team-count">{getTeamActors('ALPHA').length} fighters</div>

              {/* Team Management for Alpha - Only show during setup phase */}
              {session.isInSetupPhase && (
                <div className="team-management">
                  <TeamManager
                    team="ALPHA"
                    teamActors={getTeamActors('ALPHA')}
                    availableOptionalActors={getAvailableOptionalActors('ALPHA')}
                    onAddActor={handleAddOptionalActor}
                    onRemoveActor={handleRemoveOptionalActor}
                    isSetupPhase={session.isInSetupPhase}
                  />
                </div>
              )}
            </div>

            {/* Team Alpha Combatants */}
            <div>
              {getTeamActors('ALPHA').map(renderCombatantCard)}
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
                      onClick={session.startCombat}
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
                  {/* Combat log with terminal styling */}
                  <div className="combat-log-container">
                    <div className="combat-log-header">
                      <h3 className="combat-log-title">Combat Log</h3>
                    </div>
                    <CombatLog entries={combatLog} />
                  </div>

                  {/* Command input with enhanced styling */}
                  <div className="command-input-container">
                    <CommandInput
                      onCommand={handleCommand}
                      placeholder="Enter command (e.g., 'attack bob', 'move closer', 'defend')"
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
              <h2 className="team-title">Team Bravo</h2>
              <div className="team-count">{getTeamActors('BRAVO').length} fighters</div>

              {/* Team Management for Bravo - Only show during setup phase */}
              {session.isInSetupPhase && (
                <div className="team-management">
                  <TeamManager
                    team="BRAVO"
                    teamActors={getTeamActors('BRAVO')}
                    availableOptionalActors={getAvailableOptionalActors('BRAVO')}
                    onAddActor={handleAddOptionalActor}
                    onRemoveActor={handleRemoveOptionalActor}
                    isSetupPhase={session.isInSetupPhase}
                  />
                </div>
              )}
            </div>

            {/* Team Bravo Combatants */}
            <div>
              {getTeamActors('BRAVO').map(renderCombatantCard)}
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
