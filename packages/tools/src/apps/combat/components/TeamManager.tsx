import type { ActorURN, Team } from '@flux/core';
import './TeamManager.css';

/**
 * Represents an actor that can be on a team
 */
export interface TeamActor {
  id: ActorURN;
  name: string;
  isActive: boolean;
  isDisabled: boolean;
}

interface TeamManagerProps {
  teamName: string | Team;
  teamColor: string;
  actors: TeamActor[];
  onToggleActor: (actorId: ActorURN) => void;
  isSetupPhase: boolean;
}

/**
 * Team management component for configuring team composition
 */
export function TeamManager({
  teamName,
  teamColor,
  actors,
  onToggleActor,
  isSetupPhase
}: TeamManagerProps) {
  const activeActors = actors.filter(actor => actor.isActive);
  const maxTeamSize = 3;

  return (
    <div
      className="team-manager"
      style={{ '--team-color': teamColor } as React.CSSProperties}
      data-setup-phase={isSetupPhase}
    >
      {/* Team Header */}
      <div className="team-manager-header">
        <div className="team-count">
          {activeActors.length}/{maxTeamSize} fighters
        </div>
      </div>

      {/* Actor Pills */}
      <div className="actor-pills">
        {actors.map(actor => (
          <button
            key={actor.id}
            className="actor-pill"
            data-active={actor.isActive}
            data-disabled={actor.isDisabled}
            onClick={() => !actor.isDisabled && onToggleActor(actor.id)}
            disabled={!isSetupPhase || actor.isDisabled}
          >
            {actor.name}
          </button>
        ))}
      </div>

      {/* Status Messages */}
      {!isSetupPhase && (
        <div className="team-status">
          Team composition locked during combat
        </div>
      )}

      {isSetupPhase && activeActors.length >= maxTeamSize && (
        <div className="team-status">
          Team is full ({maxTeamSize}/{maxTeamSize} fighters)
        </div>
      )}
    </div>
  );
}
