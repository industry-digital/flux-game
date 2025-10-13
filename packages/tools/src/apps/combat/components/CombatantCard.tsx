import type { Actor, ActorURN } from '@flux/core';
import { getCurrentHp, getMaxHp, getStatValue, isActorAlive, Stat, getHealthPercentage, getCurrentEnergy, getMaxEnergy } from '@flux/core';
import './CombatantCard.css';

export interface CombatantCardProps {
  actor: Actor;
  actorId: ActorURN;
  isActive?: boolean;
  isAiControlled?: boolean;
  onAiToggle?: (actorId: ActorURN, enabled: boolean) => void;
  isAiThinking?: boolean;
}

/**
 * Combatant card component with theming and clean interface
 */
export function CombatantCard({
  actor,
  actorId,
  isActive = false,
  isAiControlled = false,
  onAiToggle,
  isAiThinking = false
}: CombatantCardProps) {
  const alive = isActorAlive(actor);
  const healthPercent = getHealthPercentage(actor);
  const currentHp = getCurrentHp(actor);
  const maxHp = getMaxHp(actor);
  const currentEnergy = getCurrentEnergy(actor);
  const maxEnergy = getMaxEnergy(actor);

  const stats = {
    [Stat.POW]: getStatValue(actor, Stat.POW),
    [Stat.FIN]: getStatValue(actor, Stat.FIN),
    [Stat.RES]: getStatValue(actor, Stat.RES),
    [Stat.PER]: getStatValue(actor, Stat.PER),
    [Stat.INT]: getStatValue(actor, Stat.INT),
    [Stat.MEM]: getStatValue(actor, Stat.MEM)
  };

  // Calculate health color and gradient
  const healthColor = healthPercent > 50 ? 'var(--color-success)' : healthPercent > 25 ? 'var(--color-warning)' : 'var(--color-error)';
  const healthGradient = healthPercent > 50
    ? 'linear-gradient(90deg, var(--color-success), #b8cc6c)'
    : healthPercent > 25
      ? 'linear-gradient(90deg, var(--color-warning), #e4b429)'
      : 'linear-gradient(90deg, var(--color-error), #f87171)';

  return (
    <div
      className="combatant-card"
      data-active={isActive}
      data-alive={alive}
      style={{
        '--health-color': healthColor,
        '--health-gradient': healthGradient
      } as React.CSSProperties}
    >
      {/* Active indicator bar */}
      {isActive && <div className="combatant-card-active-indicator" />}

      {/* Header with name and status */}
      <div className="combatant-header">
        <div className="combatant-info">
          <div className="combatant-name-row">
            <h4 className="combatant-name" data-alive={alive}>
              {actor.name}
            </h4>

            {!alive && <span className="combatant-death-indicator">💀</span>}

            {isAiThinking && (
              <div className="ai-thinking-badge">
                🤔 AI
              </div>
            )}
          </div>

          {isActive && alive && (
            <div className="active-turn-badge">
              <span className="active-turn-dot" />
              Active Turn
            </div>
          )}
        </div>

        {/* AI Control Toggle */}
        {onAiToggle && (
          <div className="ai-control-toggle">
            <label className="ai-control-label">
              <input
                type="checkbox"
                checked={isAiControlled}
                onChange={(e) => onAiToggle(actorId, e.target.checked)}
                className="ai-control-checkbox"
              />
              <span className="ai-control-text">AI Control</span>
            </label>
          </div>
        )}
      </div>

      {/* Health and Energy with enhanced visual indicators */}
      <div className="vitals-section">
        {/* Health Section */}
        <div className="vital-stat">
          <div className="vital-header">
            <div className="vital-label">Health</div>
            <div className="vital-value health-value">{currentHp} / {maxHp}</div>
          </div>

          <div className="vital-bar health-bar">
            <div
              className="vital-bar-fill health-bar-fill"
              style={{ width: `${healthPercent}%` }}
            >
              {healthPercent > 0 && <div className="vital-bar-shine" />}
            </div>
          </div>
        </div>

        {/* Energy Section */}
        <div className="vital-stat">
          <div className="vital-header">
            <div className="vital-label">Energy</div>
            <div className="vital-value energy-value">{currentEnergy} / {maxEnergy} J</div>
          </div>

          <div className="vital-bar energy-bar">
            <div
              className="vital-bar-fill energy-bar-fill"
              style={{ width: `${(currentEnergy / maxEnergy) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Stats Row - Compact horizontal layout */}
      <div className="stats-row">
        {[
          { label: 'POW', value: stats[Stat.POW] },
          { label: 'FIN', value: stats[Stat.FIN] },
          { label: 'RES', value: stats[Stat.RES] },
          { label: 'INT', value: stats[Stat.INT] },
          { label: 'PER', value: stats[Stat.PER] },
          { label: 'MEM', value: stats[Stat.MEM] }
        ].map(({ label, value }) => (
          <div key={label} className="stat-item">
            <div className="stat-label">{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
