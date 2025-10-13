import type { TeamName, OptionalActorName } from '../hooks/useCombatScenario';
import { getNameFromActorId } from '../hooks/useCombatScenario';
import type { ActorURN } from '@flux/core';

interface TeamManagerProps {
  team: TeamName;
  teamActors: ActorURN[];
  availableOptionalActors: OptionalActorName[];
  onAddActor: (name: OptionalActorName) => void;
  onRemoveActor: (name: OptionalActorName) => void;
  isSetupPhase: boolean;
}

/**
 * Team management component for adding/removing optional actors
 */
export function TeamManager({
  team,
  teamActors,
  availableOptionalActors,
  onAddActor,
  onRemoveActor,
  isSetupPhase
}: TeamManagerProps) {
  const teamColor = team === 'ALPHA' ? 'var(--color-info)' : 'var(--color-warning)';
  const teamDisplayName = team === 'ALPHA' ? 'Team Alpha' : 'Team Bravo';

  // Get optional actors that are currently on this team
  const optionalActorsOnTeam = teamActors.filter(actorId => {
    return actorId !== 'flux:actor:alice' && actorId !== 'flux:actor:bob';
  });

  const getOptionalActorName = (actorId: ActorURN): OptionalActorName | null => {
    switch (actorId) {
      case 'flux:actor:charlie': return 'charlie';
      case 'flux:actor:eric': return 'eric';
      case 'flux:actor:dave': return 'dave';
      case 'flux:actor:franz': return 'franz';
      default: return null;
    }
  };

  return (
    <div className="team-manager p-3 rounded-lg" style={{
      backgroundColor: 'var(--color-surface)',
      border: `2px solid ${teamColor}`,
      opacity: isSetupPhase ? 1 : 0.6
    }}>
      {/* Team Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 style={{
          color: teamColor,
          fontFamily: 'var(--font-family-heading)',
          fontSize: 'var(--font-size-base)',
          fontWeight: 'var(--font-weight-semibold)',
          margin: 0
        }}>
          {teamDisplayName}
        </h3>
        <div style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-family)'
        }}>
          {teamActors.length}/3 fighters
        </div>
      </div>

      {/* Current Team Members */}
      <div className="mb-3">
        <div style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-family)',
          marginBottom: '0.5rem'
        }}>
          Current Members:
        </div>
        <div className="flex flex-wrap gap-1">
          {teamActors.map(actorId => (
            <span
              key={actorId}
              className="px-2 py-1 rounded text-xs"
              style={{
                backgroundColor: 'var(--color-background)',
                color: 'var(--color-text)',
                border: '1px solid var(--color-border)',
                fontFamily: 'var(--font-family-mono)',
                fontSize: 'var(--font-size-xs)'
              }}
            >
              {getNameFromActorId(actorId)}
            </span>
          ))}
        </div>
      </div>

      {/* Add/Remove Controls */}
      {isSetupPhase && (
        <div>
          {/* Add Optional Actors */}
          {availableOptionalActors.length > 0 && (
            <div className="mb-2">
              <div style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'var(--font-family)',
                marginBottom: '0.5rem'
              }}>
                Add Fighter:
              </div>
              <div className="flex flex-wrap gap-1">
                {availableOptionalActors.map(name => (
                  <button
                    key={name}
                    onClick={() => onAddActor(name)}
                    className="px-2 py-1 rounded text-xs transition-colors"
                    style={{
                      backgroundColor: 'var(--color-accent)',
                      color: 'var(--color-text-on-primary)',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'var(--font-family)',
                      fontSize: 'var(--font-size-xs)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-accent-hover)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--color-accent)';
                    }}
                  >
                    + {name.charAt(0).toUpperCase() + name.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Remove Optional Actors */}
          {optionalActorsOnTeam.length > 0 && (
            <div>
              <div style={{
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'var(--font-family)',
                marginBottom: '0.5rem'
              }}>
                Remove Fighter:
              </div>
              <div className="flex flex-wrap gap-1">
                {optionalActorsOnTeam.map(actorId => {
                  const name = getOptionalActorName(actorId);
                  if (!name) return null;

                  return (
                    <button
                      key={actorId}
                      onClick={() => onRemoveActor(name)}
                      className="px-2 py-1 rounded text-xs transition-colors"
                      style={{
                        backgroundColor: 'var(--color-error)',
                        color: 'var(--color-text-on-primary)',
                        border: 'none',
                        cursor: 'pointer',
                        fontFamily: 'var(--font-family)',
                        fontSize: 'var(--font-size-xs)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '0.8';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = '1';
                      }}
                    >
                      - {getNameFromActorId(actorId)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Team Full Message */}
          {availableOptionalActors.length === 0 && teamActors.length >= 3 && (
            <div style={{
              color: 'var(--color-text-secondary)',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-family)',
              fontStyle: 'italic'
            }}>
              Team is full (3/3 fighters)
            </div>
          )}
        </div>
      )}

      {/* Setup Phase Disabled Message */}
      {!isSetupPhase && (
        <div style={{
          color: 'var(--color-text-secondary)',
          fontSize: 'var(--font-size-xs)',
          fontFamily: 'var(--font-family)',
          fontStyle: 'italic'
        }}>
          Team composition locked during combat
        </div>
      )}
    </div>
  );
}
