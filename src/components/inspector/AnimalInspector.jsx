import React from 'react';
import { usePersistedTab } from '../../hooks/usePersistedTab.js';
import ANIMAL_SPECIES from '../../engine/animalSpecies';
import PLANT_SPECIES from '../../engine/plantSpecies';
import { ANIMAL_STATE_TONES, DIET_COLORS, getBadgeToneStyle } from '../../constants/statusColors';
import { LIFE_STAGE_NAMES, PLANT_STAGE_NAMES, SEX_NAMES, SPECIES_INFO, STATE_NAMES } from '../../utils/terrainColors';
import { formatTickTimestamp, ticksToDay } from '../../utils/time';
import {
  ANIMAL_LIFE_STAGE_KEYS,
  Bar,
  CollapsibleSection,
  DIRECTION_LABELS,
  EnergyCostTable,
  formatPercent,
  formatTickDurationLabel,
} from './InspectorShared.jsx';

const ACTION_ICONS = {
  ATTACK: '⚔️', DEFENDED: '🛡️', KILLED: '💥', KILLED_BY: '☠️',
  MATED: '💕', OFFSPRING: '🍼', BORN: '🐣',
  EAT_PLANT: '🌿', EAT_PREY: '🥩', SCAVENGED: '🦴', FLED: '🏃', DIED: '💀',
  FELL_ASLEEP: '💤', WOKE_UP: '☀️', DRANK: '💧', LIFE_STAGE: '⭐',
  ATTACK_MISS: '💨', DODGED: '🌀',
  EAT_ITEM: '🍽️', ATE_EGG: '🥚', PREGNANT: '🤰', LAID: '🥚', LAID_EGGS: '🥚', GAVE_BIRTH: '👶',
  FOUGHT_BACK: '🐾',
};
const ACTION_COLORS = {
  ATTACK: '#ff4444', DEFENDED: '#ffaa33', KILLED: '#ff2222', KILLED_BY: '#cc0000',
  MATED: '#ff66aa', OFFSPRING: '#ff99cc', BORN: '#88dd66',
  EAT_PLANT: '#66cc66', EAT_PREY: '#ff6633', SCAVENGED: '#cc8844', FLED: '#ff8833', DIED: '#888',
  FELL_ASLEEP: '#6688bb', WOKE_UP: '#88ccff', DRANK: '#44aaff', LIFE_STAGE: '#ffdd44',
  ATTACK_MISS: '#ffaa66', DODGED: '#aaccff',
  EAT_ITEM: '#d9b34c', ATE_EGG: '#f1d37a', PREGNANT: '#ff99cc', LAID: '#f1d37a', LAID_EGGS: '#f1d37a', GAVE_BIRTH: '#88dd66',
  FOUGHT_BACK: '#ff9933',
};
const ITEM_TYPE_LABELS = {
  1: 'meat',
  2: 'fruit',
  3: 'seed',
};
const ANIMAL_TABS = [
  { key: 'status', label: 'Status' },
  { key: 'species', label: 'Species' },
  { key: 'diet', label: 'Diet' },
  { key: 'history', label: 'History' },
];

function SpeciesAttributes({ species, lifeStage, clock, gameConfig, speciesConfig }) {
  const speciesDetails = speciesConfig;
  const rawSpecies = ANIMAL_SPECIES[species];
  if (!speciesDetails || !rawSpecies) return null;

  const baseVision = Math.max(1, speciesDetails.vision_range || 1);
  const globalVisionMultiplier = gameConfig?.animal_global_vision_multiplier ?? 1;
  const nightVisionReduction = gameConfig?.night_vision_reduction_factor ?? 0.65;
  const nocturnalDayVisionFactor = gameConfig?.nocturnal_day_vision_factor ?? 0.8;
  const isNight = !!clock?.is_night;
  const scaledBaseVision = Math.max(1, Math.floor(baseVision * globalVisionMultiplier));
  const effectiveVision = Math.max(1, speciesDetails.nocturnal
    ? (isNight ? scaledBaseVision : Math.floor(scaledBaseVision * nocturnalDayVisionFactor))
    : (isNight ? Math.floor(scaledBaseVision * nightVisionReduction) : scaledBaseVision));
  const thresholds = speciesDetails.decision_thresholds || {};
  const recovery = speciesDetails.recovery || {};
  const healthPenalty = speciesDetails.health_penalty || {};
  const metabolism = speciesDetails.metabolic_multipliers || {};
  const stageKey = ANIMAL_LIFE_STAGE_KEYS[lifeStage] || 'ADULT';
  const currentHungerMult = metabolism.hunger?.[stageKey] ?? 1;
  const currentThirstMult = metabolism.thirst?.[stageKey] ?? 1;
  const hungerPenaltyStart = (speciesDetails.max_hunger || 0) * (healthPenalty.threshold_fraction ?? 0.8);
  const thirstPenaltyStart = (speciesDetails.max_thirst || 0) * (healthPenalty.threshold_fraction ?? 0.8);

  return (
    <>
      <div className="inspector-grid">
        <div className="stat-row"><span className="stat-label">🏃 Speed</span><span className="stat-value">{speciesDetails.speed}</span></div>
        <div className="stat-row"><span className="stat-label">👁️ Vision (Base)</span><span className="stat-value">{baseVision}</span></div>
        <div className="stat-row"><span className="stat-label">👁️ Vision (Now)</span><span className="stat-value">{effectiveVision}</span></div>
        <div className="stat-row"><span className="stat-label">⚡ Max Energy</span><span className="stat-value">{speciesDetails.max_energy}</span></div>
        <div className="stat-row"><span className="stat-label">❤️ Max HP</span><span className="stat-value">{speciesDetails.max_hp}</span></div>
        <div className="stat-row"><span className="stat-label">🍖 Max Hunger</span><span className="stat-value">{speciesDetails.max_hunger}</span></div>
        <div className="stat-row"><span className="stat-label">💧 Max Thirst</span><span className="stat-value">{speciesDetails.max_thirst}</span></div>
        <div className="stat-row"><span className="stat-label">⏳ Max Age</span><span className="stat-value">{formatTickDurationLabel(rawSpecies.max_age, clock?.ticks_per_day || 1)}</span></div>
        <div className="stat-row"><span className="stat-label">🌱 Mature Age</span><span className="stat-value">{formatTickDurationLabel(rawSpecies.mature_age, clock?.ticks_per_day || 1)}</span></div>
        <div className="stat-row"><span className="stat-label">⚔️ Attack</span><span className="stat-value">{speciesDetails.attack_power}</span></div>
        <div className="stat-row"><span className="stat-label">🛡️ Defense</span><span className="stat-value">{speciesDetails.defense}</span></div>
        <div className="stat-row"><span className="stat-label">🍖 Hunger Rate</span><span className="stat-value">{speciesDetails.hunger_rate}/tick</span></div>
        <div className="stat-row"><span className="stat-label">💧 Thirst Rate</span><span className="stat-value">{speciesDetails.thirst_rate}/tick</span></div>
        <div className="stat-row"><span className="stat-label">♻️ Reproduction</span><span className="stat-value">{speciesDetails.reproduction}</span></div>
        {rawSpecies.reproduction_type && (
          <div className="stat-row"><span className="stat-label">🤰 Type</span><span className="stat-value" style={{ textTransform: 'capitalize' }}>{rawSpecies.reproduction_type}</span></div>
        )}
        {rawSpecies.gestation_period > 0 && (
          <div className="stat-row"><span className="stat-label">🤰 Gestation</span><span className="stat-value">{formatTickDurationLabel(rawSpecies.gestation_period, clock?.ticks_per_day || 1)}</span></div>
        )}
        {rawSpecies.incubation_period > 0 && (
          <div className="stat-row"><span className="stat-label">🥚 Incubation</span><span className="stat-value">{formatTickDurationLabel(rawSpecies.incubation_period, clock?.ticks_per_day || 1)}</span></div>
        )}
        {rawSpecies.clutch_size && (
          <div className="stat-row"><span className="stat-label">🐣 Clutch Size</span><span className="stat-value">{rawSpecies.clutch_size[0]}–{rawSpecies.clutch_size[1]}</span></div>
        )}
        <div className="stat-row"><span className="stat-label">🌙 Activity</span><span className="stat-value">{speciesDetails.nocturnal ? 'Nocturnal' : 'Diurnal'}</span></div>
        {speciesDetails.can_fly && <div className="stat-row"><span className="stat-label">🕊️ Flight</span><span className="stat-value">Can fly</span></div>}
        <div className="stat-row"><span className="stat-label">🦴 Scavenging</span><span className="stat-value">{speciesDetails.can_scavenge ? 'Enabled' : 'Disabled'}</span></div>
      </div>
      {speciesDetails.life_stage_ages && rawSpecies.life_stage_ages?.length >= 3 && (
        <>
          <h6 className="mt-2 mb-1 inspector-subtitle">🎂 Life Stage Ages</h6>
          <div className="inspector-detail-list">
            <div className="d-flex justify-content-between"><span className="text-muted">Baby → Young</span><span>{formatTickDurationLabel(rawSpecies.life_stage_ages[0], clock?.ticks_per_day || 1)}</span></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Young → Young Adult</span><span>{formatTickDurationLabel(rawSpecies.life_stage_ages[1], clock?.ticks_per_day || 1)}</span></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Young Adult → Adult</span><span>{formatTickDurationLabel(rawSpecies.life_stage_ages[2], clock?.ticks_per_day || 1)}</span></div>
          </div>
        </>
      )}
      <CollapsibleSection title="Decision Thresholds" icon="🧠" defaultOpen={false}>
        <div className="inspector-detail-list">
          <div className="d-flex justify-content-between"><span className="text-muted">Critical Hunger</span><span>{thresholds.critical_hunger}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Critical Thirst</span><span>{thresholds.critical_thirst}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Moderate Hunger</span><span>{thresholds.moderate_hunger}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Moderate Thirst</span><span>{thresholds.moderate_thirst}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Eat Opportunistic</span><span>{thresholds.eat_opportunistic}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Drink Opportunistic</span><span>{thresholds.drink_opportunistic}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Sleep Energy Min</span><span>{thresholds.sleep_energy_min}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Mate Energy Min</span><span>{thresholds.mate_energy_min}</span></div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Recovery" icon="🩹" defaultOpen={false}>
        <div className="inspector-detail-list">
          <div className="d-flex justify-content-between"><span className="text-muted">Idle Energy</span><span>+{recovery.idle_energy}/tick</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Idle HP</span><span>+{recovery.idle_hp}/tick</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Sleep HP</span><span>+{recovery.sleep_hp}/tick</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Sleep Exit Energy</span><span>{recovery.sleep_exit_energy}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Eat Hunger Relief</span><span>-{recovery.eat_hunger}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Eat Energy</span><span>+{recovery.eat_energy}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Eat HP</span><span>+{recovery.eat_hp}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Drink Thirst Relief</span><span>-{recovery.drink_thirst}</span></div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Health Penalty" icon="☠️" defaultOpen={false}>
        <div className="inspector-detail-list">
          <div className="d-flex justify-content-between"><span className="text-muted">Penalty Starts</span><span>{formatPercent(healthPenalty.threshold_fraction ?? 0.8)} of max need</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Hunger HP Loss Starts</span><span>{hungerPenaltyStart.toFixed(0)} / {speciesDetails.max_hunger}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Thirst HP Loss Starts</span><span>{thirstPenaltyStart.toFixed(0)} / {speciesDetails.max_thirst}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Max HP Loss</span><span>{healthPenalty.max_penalty}/tick</span></div>
        </div>
      </CollapsibleSection>
      <CollapsibleSection title="Life Stage Metabolism" icon="📈" defaultOpen={false}>
        <div className="stat-row"><span className="stat-label">Current Stage</span><span className="stat-value">{stageKey}</span></div>
        <div className="stat-row"><span className="stat-label">Hunger Multiplier</span><span className="stat-value">{currentHungerMult.toFixed(2)}x</span></div>
        <div className="stat-row"><span className="stat-label">Thirst Multiplier</span><span className="stat-value">{currentThirstMult.toFixed(2)}x</span></div>
        <div className="inspector-detail-list">
          {ANIMAL_LIFE_STAGE_KEYS.map((stageName) => (
            <div key={stageName} className="d-flex justify-content-between">
              <span className="text-muted">{stageName}</span>
              <span style={{ color: stageName === stageKey ? '#88cc44' : '#ddd' }}>
                H {((metabolism.hunger?.[stageName] ?? 1)).toFixed(2)}x · T {((metabolism.thirst?.[stageName] ?? 1)).toFixed(2)}x
              </span>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </>
  );
}

function DietInfo({ species, speciesConfig }) {
  const speciesDetails = speciesConfig;
  const rawSpecies = ANIMAL_SPECIES[species];
  if (!speciesDetails || !rawSpecies) return null;

  const hasPlants = rawSpecies.edible_plants && rawSpecies.edible_plants.length > 0;
  const hasPrey = rawSpecies.prey_species && rawSpecies.prey_species.length > 0;

  return (
    <>
      {hasPlants && (
        <CollapsibleSection title="Edible Plants" icon="🌿" defaultOpen={true}>
          <div className="inspector-chip-list">
            {rawSpecies.edible_plants.map((plantKey) => {
              const plant = PLANT_SPECIES[plantKey];
              const emoji = plant?.fruitEmoji || plant?.emoji?.adult || '🌱';
              return (
                <span key={plantKey} style={{ background: '#1a2e1a', padding: '2px 7px', borderRadius: 4, border: '1px solid #2a4a2a' }}>
                  {emoji} {plant?.name || plantKey}
                </span>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
      {hasPrey && (
        <CollapsibleSection title="Prey Species" icon="🎯" defaultOpen={true}>
          <div className="inspector-chip-list">
            {rawSpecies.prey_species.map((preyKey) => (
              <span key={preyKey} style={{ background: '#2e1a1a', padding: '2px 7px', borderRadius: 4, border: '1px solid #4a2a2a' }}>
                {SPECIES_INFO[preyKey]?.emoji} {SPECIES_INFO[preyKey]?.name || preyKey}
              </span>
            ))}
          </div>
        </CollapsibleSection>
      )}
      <CollapsibleSection title="Energy Costs" icon="⚡" defaultOpen={true}>
        <EnergyCostTable costs={speciesDetails.energy_costs} />
      </CollapsibleSection>
      {!hasPlants && !hasPrey && (
        <div className="small text-muted mt-2" style={{ fontStyle: 'italic' }}>No diet data available for this species.</div>
      )}
    </>
  );
}

export function AnimalStatusBadge({ state, alive }) {
  if (!alive) {
    return <span className="inspector-badge" style={getBadgeToneStyle('neutral')}>💀 Dead</span>;
  }

  const tone = ANIMAL_STATE_TONES[state] || 'neutral';
  return (
    <span className="inspector-badge" style={getBadgeToneStyle(tone)}>
      {STATE_NAMES[state] || 'Unknown'}
    </span>
  );
}

function formatDirection(direction) {
  if (Number.isInteger(direction) && DIRECTION_LABELS[direction]) {
    return DIRECTION_LABELS[direction];
  }

  if (!Number.isFinite(direction)) return '?';

  // Fallback for unexpected direction payloads: show angle instead of '?'.
  // Values in [-2π, 2π] are treated as radians; others as degrees.
  const angleDeg = Math.abs(direction) <= (Math.PI * 2 + 0.001)
    ? (direction * 180) / Math.PI
    : direction;
  const normalized = ((angleDeg % 360) + 360) % 360;
  return `↻ ${normalized.toFixed(1)}°`;
}

function formatCoord(value) {
  if (!Number.isFinite(value)) return '?';
  return Number.isInteger(value) ? `${value}` : value.toFixed(2);
}

function AnimalStatusChips({ entity, speciesConfig, clock }) {
  const speciesDetails = speciesConfig;
  if (!speciesDetails || !entity) return null;

  const chips = [];
  if (speciesDetails.can_fly) chips.push({ label: '🕊️ Can Fly', tone: 'info' });

  const isNight = !!clock?.is_night;
  if (speciesDetails.nocturnal) {
    chips.push({ label: isNight ? '🌙 Active (Nocturnal)' : '😴 Resting (Nocturnal)', tone: isNight ? 'success' : 'accent' });
  }

  const critHunger = speciesDetails.decision_thresholds?.critical_hunger;
  if (critHunger != null && entity.hunger >= critHunger) {
    chips.push({ label: '🍖 Critical Hunger', tone: 'danger' });
  }

  const critThirst = speciesDetails.decision_thresholds?.critical_thirst;
  if (critThirst != null && entity.thirst >= critThirst) {
    chips.push({ label: '💧 Critical Thirst', tone: 'info' });
  }

  if (entity.alive && entity.lifeStage >= 3) {
    const reasons = [];
    if (entity.mateCooldown > 0) reasons.push(`Cooldown ${entity.mateCooldown}t`);
    const mateEnergyMin = speciesDetails.decision_thresholds?.mate_energy_min ?? 50;
    if (entity.energy < mateEnergyMin) reasons.push(`Low energy (${Math.round(entity.energy)}/${mateEnergyMin})`);
    if (reasons.length === 0) chips.push({ label: '💕 Can Mate', tone: 'success' });
    else chips.push({ label: `💕 Can't Mate: ${reasons.join(', ')}`, tone: 'neutral' });
  }

  if (chips.length === 0) return null;
  return (
    <div className="inspector-chip-row">
      {chips.map((chip, index) => (
        <span key={index} className="inspector-badge inspector-badge-compact" style={getBadgeToneStyle(chip.tone)}>
          {chip.label}
        </span>
      ))}
    </div>
  );
}

function ActionLogEntry({ event, ticksPerDay }) {
  const { tick, action, detail } = event;
  const icon = ACTION_ICONS[action] || '❓';
  const color = ACTION_COLORS[action] || '#aaa';
  const pos = detail && detail.x != null && detail.y != null ? ` at (${detail.x},${detail.y})` : '';
  let text = action;

  if (action === 'ATTACK') text = `Attacked ${detail.target} #${detail.targetId} (${detail.damage} dmg${detail.crit ? ' CRIT' : ''})`;
  else if (action === 'DEFENDED') text = `Hit by ${detail.attacker} #${detail.attackerId} (${detail.damage} dmg${detail.crit ? ' CRIT' : ''})`;
  else if (action === 'KILLED') text = `Killed ${detail.target} #${detail.targetId}`;
  else if (action === 'KILLED_BY') text = `Killed by ${detail.attacker} #${detail.attackerId}`;
  else if (action === 'MATED') text = `Mated with #${detail.partnerId}`;
  else if (action === 'OFFSPRING') text = `Baby #${detail.babyId} born at (${detail.x},${detail.y})`;
  else if (action === 'BORN') text = `Born (parents #${detail.parentA}${detail.parentB != null ? `, #${detail.parentB}` : ''})${pos}`;
  else if (action === 'EAT_PLANT') text = `Ate ${detail.stage} plant (type ${detail.plantType})${pos}`;
  else if (action === 'EAT_PREY') text = `Ate ${detail.prey} #${detail.preyId}`;
  else if (action === 'SCAVENGED') text = `Scavenged ${detail.corpse} #${detail.corpseId}${pos}`;
  else if (action === 'ATE_EGG') text = `Ate ${detail.species} egg #${detail.eggId}${pos}`;
  else if (action === 'EAT_ITEM') text = `Ate ${ITEM_TYPE_LABELS[detail.itemType] || `item:${detail.itemType}`} #${detail.itemId}${pos}`;
  else if (action === 'FLED') text = `Fled from ${detail.from} #${detail.threatId}`;
  else if (action === 'DIED') text = `Died (${detail.cause})`;
  else if (action === 'FELL_ASLEEP') text = detail.cause === 'exhausted' ? `Fell asleep (exhausted, energy ${detail.energy})` : `Fell asleep (energy ${detail.energy})`;
  else if (action === 'WOKE_UP') text = `Woke up (energy ${detail.energy})`;
  else if (action === 'DRANK') text = `Drank water (thirst −${detail.thirstReduced})`;
  else if (action === 'LIFE_STAGE') text = `Grew up: ${LIFE_STAGE_NAMES[detail.from] || detail.from} → ${LIFE_STAGE_NAMES[detail.to] || detail.to}`;
  else if (action === 'ATTACK_MISS') text = `Attack missed ${detail.target} #${detail.targetId}`;
  else if (action === 'DODGED') text = `Dodged attack from ${detail.attacker} #${detail.attackerId}`;
  else if (action === 'PREGNANT') text = `Became pregnant (${detail.litterSize} offspring, ${detail.gestationTicks} ticks)`;
  else if (action === 'LAID') text = `Egg laid by parents #${detail.parentA}${detail.parentB != null ? ` and #${detail.parentB}` : ''}${pos}`;
  else if (action === 'LAID_EGGS') {
    const tiles = Array.isArray(detail.tiles) && detail.tiles.length
      ? ` at ${detail.tiles.map(([tx, ty]) => `(${tx},${ty})`).join(', ')}`
      : (detail.nestX != null && detail.nestY != null ? ` near (${detail.nestX},${detail.nestY})` : '');
    text = `Laid ${detail.count} eggs${tiles}`;
  }
  else if (action === 'GAVE_BIRTH') text = `Gave birth to ${detail.count} offspring${pos}`;
  else if (action === 'FOUGHT_BACK') text = `Fought back against ${detail.attacker} #${detail.attackerId}`;

  const timestamp = formatTickTimestamp(tick, ticksPerDay);
  return (
    <div className="d-flex align-items-start gap-1" style={{ padding: '1px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
      <span style={{ color, flex: 1 }}>{text}</span>
      <span style={{ flexShrink: 0, fontSize: '0.58rem', whiteSpace: 'nowrap', color: '#88aacc' }}>{timestamp}</span>
    </div>
  );
}

export default function AnimalInspector({ entity, clearSelection, onFocusEntity, requestAnimalDetail, setSelectedEntity, clock, gameConfig, speciesConfig, ticksPerDay }) {
  const [animalTab, switchAnimalTab] = usePersistedTab('animal', ['status', 'species', 'diet', 'history'], 'status');
  const info = SPECIES_INFO[entity.species] || { emoji: '❓', name: entity.species, diet: entity.diet || '?' };
  const maxHunger = speciesConfig?.max_hunger || 100;
  const maxThirst = speciesConfig?.max_thirst || 100;
  const maxEnergy = speciesConfig?.max_energy || 100;
  const maxHp = entity._isEggStage && entity.lifeStage === -1 ? (entity._eggMaxHp || speciesConfig?.egg_hp || speciesConfig?.max_hp || 100) : (speciesConfig?.max_hp || 100);
  const maxAge = speciesConfig?.max_age || 1;
  const agePct = Math.min(100, (entity.age / maxAge) * 100);
  const isEggStage = entity.lifeStage === -1;
  const ageDays = ticksToDay(entity.age, ticksPerDay);
  const birthDay = entity._birthTick != null ? ticksToDay(entity._birthTick, ticksPerDay) : null;
  const homeX = entity.homeX;
  const homeY = entity.homeY;
  const homeDist = (homeX != null && homeY != null) ? Math.round(Math.sqrt((entity.x - homeX) ** 2 + (entity.y - homeY) ** 2)) : null;

  const handleSelectAnimal = (animal) => {
    setSelectedEntity(animal);
    requestAnimalDetail?.(animal.id);
  };

  return (
    <div className="sidebar-section entity-info">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">
          {isEggStage ? '🥚' : info.emoji} {info.name} {isEggStage ? 'Egg' : ''} <span style={{ color: '#666', fontWeight: 'normal' }}>#{entity.id}</span>
        </h6>
        <div className="d-flex align-items-center gap-1">
          <button
            className="btn btn-sm btn-outline-info py-0 px-2"
            onClick={() => onFocusEntity?.(entity)}
            disabled={!Number.isFinite(entity.x) || !Number.isFinite(entity.y)}
          >
            Focus
          </button>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>
      </div>

      <div className="mb-2">
        {isEggStage
          ? <span className="inspector-badge" style={getBadgeToneStyle('warning')}>🥚 Incubating</span>
          : <AnimalStatusBadge state={entity.state} alive={entity.alive} />}
      </div>

      {!isEggStage && <AnimalStatusChips entity={entity} speciesConfig={speciesConfig} clock={clock} />}

      <div className="inspector-tabs" role="tablist" aria-label="Inspector sections">
        {ANIMAL_TABS.map((tab) => (
          <button
            key={tab.key}
            className={`inspector-tab${animalTab === tab.key ? ' active' : ''}`}
            onClick={() => switchAnimalTab(tab.key)}
            role="tab"
            aria-selected={animalTab === tab.key}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {animalTab === 'status' && (
        <div className="inspector-tab-panel">
          <CollapsibleSection title="Identity" icon="🪪" defaultOpen={true}>
            <div className="stat-row">
              <span className="stat-label">Diet</span>
              <span className="stat-value" style={{ color: DIET_COLORS[info.diet] || DIET_COLORS.Herbivore }}>{info.diet}</span>
            </div>
            <div className="stat-row"><span className="stat-label">Sex</span><span className="stat-value">{SEX_NAMES[entity.sex] || entity.sex || 'Unknown'}</span></div>
            <div className="stat-row"><span className="stat-label">Life Stage</span><span className="stat-value">{LIFE_STAGE_NAMES[entity.lifeStage] || 'Unknown'}</span></div>
            <div className="stat-row"><span className="stat-label">Age</span><span className="stat-value">{entity.age} ticks ({ageDays} days)</span></div>
            {birthDay != null && <div className="stat-row"><span className="stat-label">Born</span><span className="stat-value">Day {birthDay} (tick {entity._birthTick})</span></div>}
            <div className="stat-row"><span className="stat-label">Position</span><span className="stat-value">({Math.floor(entity.x)}, {Math.floor(entity.y)})</span></div>
          </CollapsibleSection>

          <CollapsibleSection title="Vitals" icon="❤️" defaultOpen={true}>
            <Bar icon="❤️" label="HP" value={entity.hp} max={maxHp} color="#ff4757" />
            {isEggStage && entity._incubationPeriod > 0 && (
              <div className="mt-1">
                <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                  <span className="text-muted">🕐 Incubation</span>
                  <span>{formatTickDurationLabel(entity.age, ticksPerDay)} / {formatTickDurationLabel(entity._incubationPeriod, ticksPerDay)}</span>
                </div>
                <div className="entity-bar">
                  <div className="entity-bar-fill" style={{ width: `${Math.min(100, (entity.age / entity._incubationPeriod) * 100)}%`, background: entity.age >= entity._incubationPeriod ? '#88cc44' : '#ffaa33' }} />
                </div>
              </div>
            )}
            {isEggStage && entity.parentA != null && <div className="stat-row"><span className="stat-label">Parents</span><span className="stat-value">#{entity.parentA}, #{entity.parentB}</span></div>}
            {!isEggStage && <Bar icon="⚡" label="Energy" value={entity.energy} max={maxEnergy} color="#4ecdc4" />}
            {!isEggStage && <Bar icon="🍖" label="Hunger" value={entity.hunger} max={maxHunger} color="#ff6b6b" />}
            {!isEggStage && <Bar icon="💧" label="Thirst" value={entity.thirst} max={maxThirst} color="#4d96ff" />}
            <div className="mt-1">
              <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                <span className="text-muted">⏳ Age</span>
                <span>{entity.age} / {maxAge}</span>
              </div>
              <div className="entity-bar">
                <div className="entity-bar-fill" style={{ width: `${agePct}%`, background: agePct > 80 ? '#ff6b6b' : '#aaa' }} />
              </div>
            </div>
          </CollapsibleSection>

          <CollapsibleSection title="Navigation" icon="🧭" defaultOpen={true}>
            <div className="stat-row"><span className="stat-label">Direction</span><span className="stat-value">{formatDirection(entity.direction)}</span></div>
            {entity.targetX != null && entity.targetY != null && entity.state !== 0 && entity.state !== 5 && (
              <div className="stat-row"><span className="stat-label">Target</span><span className="stat-value" style={{ color: '#888' }}>({formatCoord(entity.targetX)}, {formatCoord(entity.targetY)})</span></div>
            )}
            {entity.pathLength > 0 && <div className="stat-row"><span className="stat-label">Path</span><span className="stat-value">{entity.pathIndex ?? 0}/{entity.pathLength} steps</span></div>}
            {homeX != null && homeY != null && <div className="stat-row"><span className="stat-label">🏠 Home</span><span className="stat-value">({formatCoord(homeX)}, {formatCoord(homeY)}){homeDist != null ? ` — ${homeDist} tiles away` : ''}</span></div>}
            {entity._tileTerrain && <div className="stat-row"><span className="stat-label">🗺️ Terrain</span><span className="stat-value" style={{ textTransform: 'capitalize' }}>{entity._tileTerrain}</span></div>}
            {entity._tileWaterProximity != null && <div className="stat-row"><span className="stat-label">💧 Water Distance</span><span className="stat-value">{entity._tileWaterProximity} tiles</span></div>}
          </CollapsibleSection>

          {(entity.mateCooldown > 0 || entity.attackCooldown > 0 || entity.pregnant || entity.lifeStage === 4) && (
            <CollapsibleSection title="Cooldowns" icon="⏱️" defaultOpen={true}>
              {entity.mateCooldown > 0 && <div className="stat-row"><span className="stat-label">💕 Mate</span><span className="stat-value" style={{ color: '#ff66aa' }}>{formatTickDurationLabel(entity.mateCooldown, ticksPerDay)}</span></div>}
              {entity.attackCooldown > 0 && <div className="stat-row"><span className="stat-label">⚔️ Attack</span><span className="stat-value" style={{ color: '#ff4444' }}>{formatTickDurationLabel(entity.attackCooldown, ticksPerDay)}</span></div>}
              {entity.pregnant && (
                <>
                  <div className="stat-row"><span className="stat-label">🤰 Pregnant</span><span className="stat-value" style={{ color: '#ff99cc' }}>{entity._gestationLitterSize || '?'} offspring</span></div>
                  <Bar icon="🤰" label="Gestation" value={entity.gestationTimer || 0} max={speciesConfig?.gestation_period || entity.gestationTimer || 1} color="#ff99cc" />
                </>
              )}
              {entity.lifeStage === 4 && <div className="stat-row"><span className="stat-label">🫘 Pupa</span><span className="stat-value" style={{ color: '#aa88cc' }}>Metamorphosing</span></div>}
            </CollapsibleSection>
          )}
        </div>
      )}

      {animalTab === 'species' && <div className="inspector-tab-panel"><SpeciesAttributes species={entity.species} lifeStage={entity.lifeStage} clock={clock} gameConfig={gameConfig} speciesConfig={speciesConfig} /></div>}
      {animalTab === 'diet' && <div className="inspector-tab-panel"><DietInfo species={entity.species} speciesConfig={speciesConfig} /></div>}
      {animalTab === 'history' && (
        <div className="inspector-tab-panel">
          {entity.actionHistory && entity.actionHistory.length > 0 ? (
            <div style={{ maxHeight: 500, overflowY: 'auto', fontSize: '0.63rem' }}>
              {[...entity.actionHistory].reverse().map((event, index) => (
                <ActionLogEntry key={index} event={event} ticksPerDay={ticksPerDay} />
              ))}
            </div>
          ) : (
            <div className="small text-muted mt-2" style={{ fontStyle: 'italic' }}>No actions recorded yet.</div>
          )}
        </div>
      )}
    </div>
  );
}
