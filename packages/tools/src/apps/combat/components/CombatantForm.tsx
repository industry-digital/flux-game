import { useState, useCallback } from 'react';
import type { ActorURN, WeaponSchemaURN, SkillURN, WeaponSchema } from '@flux/core';
import type { ActorStatsInput, DerivedStats } from '../hooks/useCombatScenario';
import './CombatantForm.css';

export interface CombatantFormProps {
  actorId: ActorURN;
  actorName: string;
  stats: ActorStatsInput;
  skills: Record<SkillURN, number>;
  selectedWeapon: WeaponSchemaURN;
  availableWeapons: Map<WeaponSchemaURN, WeaponSchema>;
  derivedStats: DerivedStats;
  onStatsChange: (actorId: ActorURN, stats: Partial<ActorStatsInput>) => void;
  onSkillChange: (actorId: ActorURN, skillUrn: SkillURN, rank: number) => void;
  onWeaponChange: (actorId: ActorURN, weaponUrn: WeaponSchemaURN) => void;
  isExpanded?: boolean;
}

/**
 * Form component for editing actor/combatant properties during setup phase
 */
export function CombatantForm({
  actorId,
  actorName,
  stats,
  skills,
  selectedWeapon,
  availableWeapons,
  derivedStats,
  onStatsChange,
  onSkillChange,
  onWeaponChange,
  isExpanded = false,
}: CombatantFormProps) {
  const [localStats, setLocalStats] = useState<ActorStatsInput>(stats);

  // Handle stat changes with real-time updates
  const handleStatChange = useCallback((stat: keyof ActorStatsInput, value: number) => {
    const newStats = { ...localStats, [stat]: value };
    setLocalStats(newStats);
    onStatsChange(actorId, { [stat]: value });
  }, [actorId, localStats, onStatsChange]);

  // Handle skill rank changes
  const handleSkillChange = useCallback((skillUrn: SkillURN, rank: number) => {
    onSkillChange(actorId, skillUrn, rank);
  }, [actorId, onSkillChange]);

  // Handle weapon selection
  const handleWeaponChange = useCallback((weaponUrn: WeaponSchemaURN) => {
    onWeaponChange(actorId, weaponUrn);
  }, [actorId, onWeaponChange]);

  if (!isExpanded) {
    return null;
  }

  return (
    <div className="combatant-form">
      <div className="form-header">
        <h4 className="form-title">Customize {actorName}</h4>
      </div>

      {/* Stats Section */}
      <div className="form-section">
        <h5 className="section-title">Stats</h5>
        <div className="stats-grid">
          {[
            { key: 'pow' as const, label: 'Power (POW)', description: 'Physical strength and damage' },
            { key: 'fin' as const, label: 'Finesse (FIN)', description: 'Dexterity and action points' },
            { key: 'res' as const, label: 'Resilience (RES)', description: 'Health and endurance' },
            { key: 'int' as const, label: 'Intelligence (INT)', description: 'Reasoning and tactics' },
            { key: 'per' as const, label: 'Perception (PER)', description: 'Awareness and initiative' },
            { key: 'mem' as const, label: 'Memory (MEM)', description: 'Learning and skill retention' },
          ].map(({ key, label, description }) => (
            <div key={key} className="stat-input-group">
              <label className="stat-label">
                <span className="stat-name">{label}</span>
                <span className="stat-description">{description}</span>
              </label>
              <div className="stat-input-container">
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={localStats[key] || 10}
                  onChange={(e) => handleStatChange(key, parseInt(e.target.value))}
                  className="stat-slider"
                />
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={localStats[key] || 10}
                  onChange={(e) => handleStatChange(key, parseInt(e.target.value) || 10)}
                  className="stat-number-input"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Derived Stats Preview */}
      <div className="form-section">
        <h5 className="section-title">Derived Stats</h5>
        <div className="derived-stats">
          <div className="derived-stat">
            <span className="derived-label">Health Points:</span>
            <span className="derived-value">{derivedStats.hp} HP</span>
          </div>
          <div className="derived-stat">
            <span className="derived-label">Action Points:</span>
            <span className="derived-value">{derivedStats.ap} AP</span>
          </div>
        </div>
      </div>

      {/* Skills Section */}
      <div className="form-section">
        <h5 className="section-title">Combat Skills</h5>
        <div className="skills-grid">
          {Object.entries(skills).map(([skillUrn, currentRank]) => (
            <div key={skillUrn} className="skill-input-group">
              <label className="skill-label">
                <span className="skill-name">{getSkillDisplayName(skillUrn as SkillURN)}</span>
              </label>
              <div className="skill-input-container">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={currentRank}
                  onChange={(e) => handleSkillChange(skillUrn as SkillURN, parseInt(e.target.value))}
                  className="skill-slider"
                />
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={currentRank}
                  onChange={(e) => handleSkillChange(skillUrn as SkillURN, parseInt(e.target.value) || 0)}
                  className="skill-number-input"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Weapon Section */}
      <div className="form-section">
        <h5 className="section-title">Weapon</h5>
        <div className="weapon-selection">
          <select
            value={selectedWeapon}
            onChange={(e) => handleWeaponChange(e.target.value as WeaponSchemaURN)}
            className="weapon-select"
          >
            {[...availableWeapons].map(([weaponUrn, weaponSchema]) => (
              <option key={weaponUrn} value={weaponUrn}>
                {weaponSchema.name || weaponUrn}
              </option>
            ))}
          </select>

          {/* Weapon Stats Preview */}
          {availableWeapons.has(selectedWeapon) && (
            <div className="weapon-preview">
              <div className="weapon-stat">
                <span className="weapon-label">Selected:</span>
                <span className="weapon-value">{availableWeapons.get(selectedWeapon)?.name || selectedWeapon}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Convert skill URN to display name
 */
function getSkillDisplayName(skillUrn: SkillURN): string {
  const skillName = skillUrn.split(':').pop() || skillUrn;
  return skillName
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
