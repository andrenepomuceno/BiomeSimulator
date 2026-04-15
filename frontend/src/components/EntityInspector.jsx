/**
 * EntityInspector — shows details of selected entity or tile.
 * Animal view uses a tabbed layout: Status | Species | Diet | History.
 */
import React, { useState, useMemo, useEffect } from 'react';
import useSimStore from '../store/simulationStore';
import { TERRAIN_NAMES as TERRAIN_DISPLAY_NAMES, STATE_NAMES, LIFE_STAGE_NAMES, PLANT_TYPE_NAMES, PLANT_STAGE_NAMES, PLANT_SEX_NAMES, PLANT_TYPE_SEX, SPECIES_INFO, SEX_NAMES } from '../utils/terrainColors';
import { LifeStage } from '../engine/entities';
import ANIMAL_SPECIES, { buildAnimalSpeciesConfig } from '../engine/animalSpecies';
import PLANT_SPECIES, { buildFruitSpoilAges, buildStageAges, getPlantByTypeId } from '../engine/plantSpecies';
import { ANIMAL_STATE_TONES, DIET_COLORS, getBadgeToneStyle } from '../constants/statusColors';
import { formatGameDuration, formatTickTimestamp, resolveTicksPerDay, ticksToDay } from '../utils/time';
import { resolveTicksPerGameMinute, ticksToGameMinutes } from '../utils/gameTime.js';

// Direction labels
const DIRECTION_LABELS = { 0: '↓ Down', 1: '← Left', 2: '→ Right', 3: '↑ Up' };

// Build plant→consumers reverse lookup once (which animal species eat which plant typeId at which stages)
const _plantConsumersCache = {};
function getPlantConsumers(plantTypeId, plantStage) {
  const key = `${plantTypeId}:${plantStage}`;
  if (_plantConsumersCache[key]) return _plantConsumersCache[key];
  const consumers = [];
  const plantSp = getPlantByTypeId(plantTypeId);
  if (!plantSp) return consumers;
  const plantKey = plantSp.id; // e.g. "GRASS"
  for (const [speciesId, sp] of Object.entries(ANIMAL_SPECIES)) {
    if (!sp.edible_plants || !sp.edible_plants.includes(plantKey)) continue;
    if (Array.isArray(plantSp.edibleStages) && plantSp.edibleStages.includes(plantStage)) {
      const info = SPECIES_INFO[speciesId];
      if (info) consumers.push({ speciesId, ...info });
    }
  }
  _plantConsumersCache[key] = consumers;
  return consumers;
}

// --- Shared sub-components ---

function Bar({ label, value, max, color, icon }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mb-1">
      <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
        <span className="text-muted">{icon} {label}</span>
        <span>{Math.round(value)} / {max}</span>
      </div>
      <div className="entity-bar">
        <div className="entity-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function EnergyCostTable({ costs }) {
  const ACTION_LABELS = {
    IDLE: '💤 Idle', WALK: '🚶 Walk', RUN: '🏃 Run',
    EAT: '🍽️ Eat', DRINK: '💧 Drink', SLEEP: '😴 Sleep',
    ATTACK: '⚔️ Attack', MATE: '💕 Mate', FLEE: '🏃‍♂️ Flee',
  };
  return (
    <div className="inspector-detail-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '2px 8px' }}>
      {Object.entries(costs).map(([action, cost]) => (
        <div key={action} className="d-flex justify-content-between">
          <span className="text-muted">{ACTION_LABELS[action] || action}</span>
          <span style={{ color: cost < 0 ? '#4ecdc4' : '#ff6b6b' }}>{cost > 0 ? `-${cost}` : `+${Math.abs(cost)}`}</span>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({ title, icon, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="mt-2">
      <div
        className="d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <h6 className="mb-0" style={{ fontSize: '0.75rem' }}>{icon} {title}</h6>
        <span style={{ fontSize: '0.7rem', color: '#777' }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}

const STAGE_LABELS = ['Seed', 'Young Sprout', 'Adult Sprout', 'Adult', 'Fruit'];
const WATER_AFFINITY_LABELS = { none: '🚫 None', low: '🏜️ Low', medium: '💧 Medium', high: '🌊 High' };
const SEASON_LABELS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const ANIMAL_LIFE_STAGE_KEYS = Object.entries(LifeStage)
  .filter(([, value]) => Number.isInteger(value) && value >= 0)
  .sort(([, a], [, b]) => a - b)
  .map(([key]) => key);

function formatPercent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

function resolveSeasonIndex(clock, gameConfig) {
  const seasonLengthDays = gameConfig?.season_length_days ?? 30;
  const day = clock?.day ?? Math.floor((clock?.tick || 0) / resolveTicksPerDay(clock?.ticks_per_day));
  return Math.floor(day / seasonLengthDays) % 4;
}

function formatTickDurationLabel(ticks, ticksPerDay) {
  return `${ticks} ticks (${formatGameDuration(ticksToGameMinutes(ticks, ticksPerDay))})`;
}

// --- Plant Attributes (species config) ---

function PlantAttributes({ typeId, terrain, stage, clock, gameConfig }) {
  const sp = getPlantByTypeId(typeId);
  if (!sp) return null;

  const seasonIndex = resolveSeasonIndex(clock, gameConfig);
  const season = SEASON_LABELS[seasonIndex] || 'Unknown';
  const terrainKey = typeof terrain === 'string' ? terrain.toUpperCase() : terrain;
  const currentTerrainGrowth = sp.terrainGrowth?.[terrainKey];
  const growthMultiplier = gameConfig?.season_growth_multiplier?.[seasonIndex] ?? [1.2, 1.0, 0.8, 0.5][seasonIndex] ?? 1;
  const reproductionMultiplier = gameConfig?.season_reproduction_multiplier?.[seasonIndex] ?? [1.5, 1.0, 0.7, 0.2][seasonIndex] ?? 1;
  const deathMultiplier = gameConfig?.season_death_multiplier?.[seasonIndex] ?? [0.8, 1.0, 1.2, 2.0][seasonIndex] ?? 1;
  const edibleStageLabels = (sp.edibleStages || []).map(stageId => PLANT_STAGE_NAMES[stageId] || `Stage ${stageId}`);
  const isCurrentStageEdible = Array.isArray(sp.edibleStages) ? sp.edibleStages.includes(stage) : false;

  return (
    <CollapsibleSection title="Plant Attributes" icon="📋" defaultOpen={true}>
      <div className="stat-row"><span className="stat-label">Reproduction</span><span className="stat-value">{sp.reproduction} ({sp.sex})</span></div>
      <div className="stat-row"><span className="stat-label">Water Affinity</span><span className="stat-value">{WATER_AFFINITY_LABELS[sp.waterAffinity] || sp.waterAffinity}</span></div>
      <div className="stat-row"><span className="stat-label">Production Chance</span><span className="stat-value">{(sp.productionChance * 100).toFixed(1)}%/tick</span></div>
      <div className="stat-row"><span className="stat-label">Fruit Spoil Age</span><span className="stat-value">{formatGameDuration(sp.fruitSpoilAge)}</span></div>
      <div className="stat-row"><span className="stat-label">Edible Stages</span><span className="stat-value">{edibleStageLabels.length > 0 ? edibleStageLabels.join(', ') : 'None'}</span></div>
      <div className="stat-row"><span className="stat-label">Current Stage</span><span className="stat-value" style={{ color: isCurrentStageEdible ? '#88cc44' : '#999' }}>{isCurrentStageEdible ? 'Edible' : 'Not edible'}</span></div>
      <div className="stat-row"><span className="stat-label">Terrain Growth</span><span className="stat-value" style={{ color: currentTerrainGrowth > 1 ? '#88cc44' : currentTerrainGrowth === 0 ? '#ff6b6b' : '#ddd' }}>{currentTerrainGrowth != null ? `${currentTerrainGrowth.toFixed(2)}x on ${terrainKey}` : `n/a on ${terrainKey || '?'}`}</span></div>
      <div className="stat-row"><span className="stat-label">Season</span><span className="stat-value">{season}</span></div>
      <div className="stat-row"><span className="stat-label">Season Growth</span><span className="stat-value">{growthMultiplier.toFixed(2)}x</span></div>
      <div className="stat-row"><span className="stat-label">Season Reproduction</span><span className="stat-value">{reproductionMultiplier.toFixed(2)}x</span></div>
      <div className="stat-row"><span className="stat-label">Season Death</span><span className="stat-value">{deathMultiplier.toFixed(2)}x</span></div>
      <h6 className="mt-2 mb-1 inspector-subtitle">🌱 Growth Stages</h6>
      <div className="inspector-detail-list">
        {sp.stageAges.map((age, i) => (
          <div key={i} className="d-flex justify-content-between">
            <span className="text-muted">{STAGE_LABELS[i]} → {STAGE_LABELS[i + 1] || 'Dead'}</span>
            <span>{formatGameDuration(age)}</span>
          </div>
        ))}
      </div>
      {sp.terrainGrowth && (
        <CollapsibleSection title="Terrain Multipliers" icon="🗺️" defaultOpen={false}>
          <div className="inspector-detail-list">
            {Object.entries(sp.terrainGrowth).map(([terrainName, multiplier]) => (
              <div key={terrainName} className="d-flex justify-content-between">
                <span className="text-muted">{terrainName}</span>
                <span style={{ color: terrainKey === terrainName ? '#88cc44' : '#ddd' }}>{multiplier.toFixed(2)}x</span>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}
    </CollapsibleSection>
  );
}

// --- Animal Species Attributes (Species tab content) ---

function SpeciesAttributes({ species, lifeStage, clock, gameConfig, speciesConfig }) {
  const sp = speciesConfig;
  const rawSpecies = ANIMAL_SPECIES[species];
  if (!sp || !rawSpecies) return null;

  const baseVision = Math.max(1, sp.vision_range || 1);
  const globalVisionMultiplier = gameConfig?.animal_global_vision_multiplier ?? 1;
  const nightVisionReduction = gameConfig?.night_vision_reduction_factor ?? 0.65;
  const nocturnalDayVisionFactor = gameConfig?.nocturnal_day_vision_factor ?? 0.8;
  const isNight = !!clock?.is_night;
  const scaledBaseVision = Math.max(1, Math.floor(baseVision * globalVisionMultiplier));
  const effectiveVision = Math.max(1, sp.nocturnal
    ? (isNight ? scaledBaseVision : Math.floor(scaledBaseVision * nocturnalDayVisionFactor))
    : (isNight ? Math.floor(scaledBaseVision * nightVisionReduction) : scaledBaseVision));
  const thresholds = sp.decision_thresholds || {};
  const recovery = sp.recovery || {};
  const healthPenalty = sp.health_penalty || {};
  const metabolism = sp.metabolic_multipliers || {};
  const stageKey = ANIMAL_LIFE_STAGE_KEYS[lifeStage] || 'ADULT';
  const currentHungerMult = metabolism.hunger?.[stageKey] ?? 1;
  const currentThirstMult = metabolism.thirst?.[stageKey] ?? 1;
  const hungerPenaltyStart = (sp.max_hunger || 0) * (healthPenalty.threshold_fraction ?? 0.8);
  const thirstPenaltyStart = (sp.max_thirst || 0) * (healthPenalty.threshold_fraction ?? 0.8);

  return (
    <>
      <div className="inspector-grid">
        <div className="stat-row"><span className="stat-label">🏃 Speed</span><span className="stat-value">{sp.speed}</span></div>
        <div className="stat-row"><span className="stat-label">👁️ Vision (Base)</span><span className="stat-value">{baseVision}</span></div>
        <div className="stat-row"><span className="stat-label">👁️ Vision (Now)</span><span className="stat-value">{effectiveVision}</span></div>
        <div className="stat-row"><span className="stat-label">⚡ Max Energy</span><span className="stat-value">{sp.max_energy}</span></div>
        <div className="stat-row"><span className="stat-label">❤️ Max HP</span><span className="stat-value">{sp.max_hp}</span></div>
        <div className="stat-row"><span className="stat-label">🍖 Max Hunger</span><span className="stat-value">{sp.max_hunger}</span></div>
        <div className="stat-row"><span className="stat-label">💧 Max Thirst</span><span className="stat-value">{sp.max_thirst}</span></div>
        <div className="stat-row"><span className="stat-label">⏳ Max Age</span><span className="stat-value">{formatGameDuration(rawSpecies.max_age)}</span></div>
        <div className="stat-row"><span className="stat-label">🌱 Mature Age</span><span className="stat-value">{formatGameDuration(rawSpecies.mature_age)}</span></div>
        <div className="stat-row"><span className="stat-label">⚔️ Attack</span><span className="stat-value">{sp.attack_power}</span></div>
        <div className="stat-row"><span className="stat-label">🛡️ Defense</span><span className="stat-value">{sp.defense}</span></div>
        <div className="stat-row"><span className="stat-label">🍖 Hunger Rate</span><span className="stat-value">{sp.hunger_rate}/tick</span></div>
        <div className="stat-row"><span className="stat-label">💧 Thirst Rate</span><span className="stat-value">{sp.thirst_rate}/tick</span></div>
        <div className="stat-row"><span className="stat-label">♻️ Reproduction</span><span className="stat-value">{sp.reproduction}</span></div>
        {rawSpecies.reproduction_type && (
          <div className="stat-row"><span className="stat-label">🤰 Type</span><span className="stat-value" style={{ textTransform: 'capitalize' }}>{rawSpecies.reproduction_type}</span></div>
        )}
        {rawSpecies.gestation_period > 0 && (
          <div className="stat-row"><span className="stat-label">🤰 Gestation</span><span className="stat-value">{formatGameDuration(rawSpecies.gestation_period)}</span></div>
        )}
        {rawSpecies.incubation_period > 0 && (
          <div className="stat-row"><span className="stat-label">🥚 Incubation</span><span className="stat-value">{formatGameDuration(rawSpecies.incubation_period)}</span></div>
        )}
        {rawSpecies.clutch_size && (
          <div className="stat-row"><span className="stat-label">🐣 Clutch Size</span><span className="stat-value">{rawSpecies.clutch_size[0]}–{rawSpecies.clutch_size[1]}</span></div>
        )}
        <div className="stat-row"><span className="stat-label">🌙 Activity</span><span className="stat-value">{sp.nocturnal ? 'Nocturnal' : 'Diurnal'}</span></div>
        {sp.can_fly && <div className="stat-row"><span className="stat-label">🕊️ Flight</span><span className="stat-value">Can fly</span></div>}
        <div className="stat-row"><span className="stat-label">🦴 Scavenging</span><span className="stat-value">{sp.can_scavenge ? 'Enabled' : 'Disabled'}</span></div>
      </div>
      {sp.life_stage_ages && (
        <>
          <h6 className="mt-2 mb-1 inspector-subtitle">🎂 Life Stage Ages</h6>
          <div className="inspector-detail-list">
            <div className="d-flex justify-content-between"><span className="text-muted">Baby → Young</span><span>{formatGameDuration(rawSpecies.life_stage_ages[0])}</span></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Young → Young Adult</span><span>{formatGameDuration(rawSpecies.life_stage_ages[1])}</span></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Young Adult → Adult</span><span>{formatGameDuration(rawSpecies.life_stage_ages[2])}</span></div>
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
          <div className="d-flex justify-content-between"><span className="text-muted">Hunger HP Loss Starts</span><span>{hungerPenaltyStart.toFixed(0)} / {sp.max_hunger}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Thirst HP Loss Starts</span><span>{thirstPenaltyStart.toFixed(0)} / {sp.max_thirst}</span></div>
          <div className="d-flex justify-content-between"><span className="text-muted">Max HP Loss</span><span>{healthPenalty.max_penalty}/tick</span></div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Life Stage Metabolism" icon="📈" defaultOpen={false}>
        <div className="stat-row"><span className="stat-label">Current Stage</span><span className="stat-value">{stageKey}</span></div>
        <div className="stat-row"><span className="stat-label">Hunger Multiplier</span><span className="stat-value">{currentHungerMult.toFixed(2)}x</span></div>
        <div className="stat-row"><span className="stat-label">Thirst Multiplier</span><span className="stat-value">{currentThirstMult.toFixed(2)}x</span></div>
        <div className="inspector-detail-list">
          {ANIMAL_LIFE_STAGE_KEYS.map(stageName => (
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

// --- Animal Diet Info (Diet tab content) ---

function DietInfo({ species, speciesConfig }) {
  const sp = speciesConfig;
  const rawSpecies = ANIMAL_SPECIES[species];
  if (!sp || !rawSpecies) return null;
  const hasPlants = rawSpecies.edible_plants && rawSpecies.edible_plants.length > 0;
  const hasPrey = rawSpecies.prey_species && rawSpecies.prey_species.length > 0;
  return (
    <>
      {hasPlants && (
        <CollapsibleSection title="Edible Plants" icon="🌿" defaultOpen={true}>
          <div className="inspector-chip-list">
            {rawSpecies.edible_plants.map(k => {
              const plant = PLANT_SPECIES[k];
              const emoji = plant?.fruitEmoji || plant?.emoji?.adult || '🌱';
              return (
                <span key={k} style={{ background: '#1a2e1a', padding: '2px 7px', borderRadius: 4, border: '1px solid #2a4a2a' }}>
                  {emoji} {plant?.name || k}
                </span>
              );
            })}
          </div>
        </CollapsibleSection>
      )}
      {hasPrey && (
        <CollapsibleSection title="Prey Species" icon="🎯" defaultOpen={true}>
          <div className="inspector-chip-list">
            {rawSpecies.prey_species.map(k => (
              <span key={k} style={{ background: '#2e1a1a', padding: '2px 7px', borderRadius: 4, border: '1px solid #4a2a2a' }}>
                {SPECIES_INFO[k]?.emoji} {SPECIES_INFO[k]?.name || k}
              </span>
            ))}
          </div>
        </CollapsibleSection>
      )}
      <CollapsibleSection title="Energy Costs" icon="⚡" defaultOpen={true}>
        <EnergyCostTable costs={sp.energy_costs} />
      </CollapsibleSection>
      {!hasPlants && !hasPrey && (
        <div className="small text-muted mt-2" style={{ fontStyle: 'italic' }}>No diet data available for this species.</div>
      )}
    </>
  );
}

// --- Animal status badge ---

function AnimalStatusBadge({ state, alive }) {
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

// --- Derived animal status chips ---

function AnimalStatusChips({ entity, speciesConfig, clock }) {
  const sp = speciesConfig;
  if (!sp || !entity) return null;
  const chips = [];

  // Can fly
  if (sp.can_fly) chips.push({ label: '🕊️ Can Fly', tone: 'info' });

  // Nocturnal / Diurnal + active period
  const isNight = !!clock?.is_night;
  if (sp.nocturnal) {
    chips.push({ label: isNight ? '🌙 Active (Nocturnal)' : '😴 Resting (Nocturnal)', tone: isNight ? 'success' : 'accent' });
  }

  // Critical hunger
  const critHunger = sp.decision_thresholds?.critical_hunger;
  if (critHunger != null && entity.hunger >= critHunger) {
    chips.push({ label: '🍖 Critical Hunger', tone: 'danger' });
  }

  // Critical thirst
  const critThirst = sp.decision_thresholds?.critical_thirst;
  if (critThirst != null && entity.thirst >= critThirst) {
    chips.push({ label: '💧 Critical Thirst', tone: 'info' });
  }

  // Can mate right now?
  if (entity.alive && entity.lifeStage >= 3) { // ADULT
    const reasons = [];
    if (entity.mateCooldown > 0) reasons.push(`Cooldown ${entity.mateCooldown}t`);
    const mateEnergyMin = sp.decision_thresholds?.mate_energy_min ?? 50;
    if (entity.energy < mateEnergyMin) reasons.push(`Low energy (${Math.round(entity.energy)}/${mateEnergyMin})`);
    if (reasons.length === 0) {
      chips.push({ label: '💕 Can Mate', tone: 'success' });
    } else {
      chips.push({ label: `💕 Can't Mate: ${reasons.join(', ')}`, tone: 'neutral' });
    }
  }

  if (chips.length === 0) return null;
  return (
    <div className="inspector-chip-row">
      {chips.map((c, i) => (
        <span key={i} className="inspector-badge inspector-badge-compact" style={getBadgeToneStyle(c.tone)}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

// --- Action history entries ---

const ACTION_ICONS = {
  ATTACK: '⚔️', DEFENDED: '🛡️', KILLED: '💥', KILLED_BY: '☠️',
  MATED: '💕', OFFSPRING: '🍼', BORN: '🐣',
  EAT_PLANT: '🌿', EAT_PREY: '🥩', SCAVENGED: '🦴', FLED: '🏃', DIED: '💀',
  FELL_ASLEEP: '💤', WOKE_UP: '☀️', DRANK: '💧', LIFE_STAGE: '⭐',
  ATTACK_MISS: '💨', DODGED: '🌀',
};
const ACTION_COLORS = {
  ATTACK: '#ff4444', DEFENDED: '#ffaa33', KILLED: '#ff2222', KILLED_BY: '#cc0000',
  MATED: '#ff66aa', OFFSPRING: '#ff99cc', BORN: '#88dd66',
  EAT_PLANT: '#66cc66', EAT_PREY: '#ff6633', SCAVENGED: '#cc8844', FLED: '#ff8833', DIED: '#888',
  FELL_ASLEEP: '#6688bb', WOKE_UP: '#88ccff', DRANK: '#44aaff', LIFE_STAGE: '#ffdd44',
  ATTACK_MISS: '#ffaa66', DODGED: '#aaccff',
};

function ActionLogEntry({ event, ticksPerDay }) {
  const { tick, action, detail } = event;
  const icon = ACTION_ICONS[action] || '❓';
  const color = ACTION_COLORS[action] || '#aaa';
  let text = action;
  if (action === 'ATTACK')         text = `Attacked ${detail.target} #${detail.targetId} (${detail.damage} dmg${detail.crit ? ' CRIT' : ''})`;
  else if (action === 'DEFENDED')  text = `Hit by ${detail.attacker} #${detail.attackerId} (${detail.damage} dmg${detail.crit ? ' CRIT' : ''})`;
  else if (action === 'KILLED')    text = `Killed ${detail.target} #${detail.targetId}`;
  else if (action === 'KILLED_BY') text = `Killed by ${detail.attacker} #${detail.attackerId}`;
  else if (action === 'MATED')     text = `Mated with #${detail.partnerId}`;
  else if (action === 'OFFSPRING') text = `Baby #${detail.babyId} born at (${detail.x},${detail.y})`;
  else if (action === 'BORN')      text = `Born (parents #${detail.parentA}, #${detail.parentB})`;
  else if (action === 'EAT_PLANT') text = `Ate ${detail.stage} (type ${detail.plantType})`;
  else if (action === 'EAT_PREY')  text = `Ate ${detail.prey} #${detail.preyId}`;
  else if (action === 'SCAVENGED') text = `Scavenged ${detail.corpse} #${detail.corpseId}`;
  else if (action === 'FLED')      text = `Fled from ${detail.from} #${detail.threatId}`;
  else if (action === 'DIED')      text = `Died (${detail.cause})`;
  else if (action === 'FELL_ASLEEP') text = detail.cause === 'exhausted' ? `Fell asleep (exhausted, energy ${detail.energy})` : `Fell asleep (energy ${detail.energy})`;
  else if (action === 'WOKE_UP')   text = `Woke up (energy ${detail.energy})`;
  else if (action === 'DRANK')     text = `Drank water (thirst −${detail.thirstReduced})`;
  else if (action === 'LIFE_STAGE') text = `Grew up: ${LIFE_STAGE_NAMES[detail.from] || detail.from} → ${LIFE_STAGE_NAMES[detail.to] || detail.to}`;
  else if (action === 'ATTACK_MISS') text = `Attack missed ${detail.target} #${detail.targetId}`;
  else if (action === 'DODGED')    text = `Dodged attack from ${detail.attacker} #${detail.attackerId}`;
  const ts = formatTickTimestamp(tick, ticksPerDay);
  return (
    <div className="d-flex align-items-start gap-1" style={{ padding: '1px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
      <span style={{ color, flex: 1 }}>{text}</span>
      <span style={{ flexShrink: 0, fontSize: '0.58rem', whiteSpace: 'nowrap', color: '#88aacc' }}>{ts}</span>
    </div>
  );
}

// --- Plant event log entries ---

const PLANT_EVENT_ICONS = {
  PLANTED: '🌱', BORN: '🌱', GREW: '📈', MATURED: '🌳',
  SPOILED: '🍂', DIED: '💀', EATEN: '🍽️',
};
const PLANT_EVENT_COLORS = {
  PLANTED: '#88cc44', BORN: '#66cc66', GREW: '#aacc44', MATURED: '#44bb88',
  SPOILED: '#cc8844', DIED: '#888', EATEN: '#dd4444',
};

function PlantLogEntry({ event, ticksPerDay }) {
  const { tick, event: ev, detail } = event;
  const icon = PLANT_EVENT_ICONS[ev] || '❓';
  const color = PLANT_EVENT_COLORS[ev] || '#aaa';
  let text = ev;
  if (ev === 'PLANTED')    text = `Planted (stage ${PLANT_STAGE_NAMES[detail.stage] || detail.stage})`;
  else if (ev === 'BORN')  text = `Born from parent at (${detail.parentX},${detail.parentY})`;
  else if (ev === 'GREW')  text = `Grew: ${PLANT_STAGE_NAMES[detail.from] || detail.from} → ${PLANT_STAGE_NAMES[detail.to] || detail.to}`;
  else if (ev === 'MATURED') text = 'Reached adult stage';
  else if (ev === 'SPOILED') text = 'Fruit spoiled → seed';
  else if (ev === 'DIED')    text = `Died (${(detail.cause || 'unknown').replace('_', ' ')})`;
  else if (ev === 'EATEN')   text = `Eaten by ${detail.by}`;
  const ts = formatTickTimestamp(tick, ticksPerDay);
  return (
    <div className="d-flex align-items-start gap-1" style={{ padding: '1px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
      <span style={{ color, flex: 1 }}>{text}</span>
      <span style={{ flexShrink: 0, fontSize: '0.58rem', whiteSpace: 'nowrap', color: '#88aacc' }}>{ts}</span>
    </div>
  );
}

// --- Tile occupant list ---

function TileOccupants({ animals, onSelectAnimal }) {
  if (!animals || animals.length === 0) return null;
  const alive = animals.filter(a => a.alive);
  const corpses = animals.filter(a => !a.alive);
  return (
    <CollapsibleSection title={`Occupants (${animals.length})`} icon="🐾" defaultOpen={true}>
      {alive.map(a => {
        const info = SPECIES_INFO[a.species] || { emoji: '❓', name: a.species };
        const hpPct = Math.max(0, Math.min(100, (a.hp / (a.maxHp || 100)) * 100));
        return (
          <div
            key={a.id}
            className="d-flex align-items-center gap-1 mb-1"
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}
            onClick={() => onSelectAnimal(a)}
          >
            <span style={{ fontSize: '0.8rem' }}>{a.lifeStage === -1 ? '🥚' : info.emoji}</span>
            <span style={{ flex: 1, fontSize: '0.68rem' }}>
              {info.name} <span style={{ color: '#666' }}>#{a.id}</span>
            </span>
            <AnimalStatusBadge state={a.state} alive={a.alive} />
            <div style={{ width: 40 }}>
              <div className="entity-bar" style={{ height: 4 }}>
                <div className="entity-bar-fill" style={{ width: `${hpPct}%`, background: '#ff4757' }} />
              </div>
            </div>
          </div>
        );
      })}
      {corpses.map(a => {
        const info = SPECIES_INFO[a.species] || { emoji: '❓', name: a.species };
        return (
          <div
            key={a.id}
            className="d-flex align-items-center gap-1 mb-1"
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 4, background: 'rgba(255,255,255,0.02)', opacity: 0.6 }}
            onClick={() => onSelectAnimal(a)}
          >
            <span style={{ fontSize: '0.8rem' }}>💀</span>
            <span style={{ flex: 1, fontSize: '0.68rem' }}>
              {info.name} <span style={{ color: '#666' }}>#{a.id}</span>
            </span>
            <AnimalStatusBadge state={a.state} alive={a.alive} />
          </div>
        );
      })}
    </CollapsibleSection>
  );
}

// --- Tile neighborhood 3×3 grid ---

function TileNeighborhood({ neighbors, waterAdjacent, adjacentPlants }) {
  if (!neighbors || neighbors.length < 9) return null;
  return (
    <CollapsibleSection title="Neighborhood" icon="🏘️" defaultOpen={false}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, marginBottom: 4, fontSize: '0.6rem', textAlign: 'center' }}>
        {neighbors.map((tid, i) => {
          const name = tid >= 0 ? (TERRAIN_DISPLAY_NAMES[tid] || '?') : '—';
          const isCenter = i === 4;
          return (
            <div key={i} style={{
              background: isCenter ? 'rgba(136,204,68,0.15)' : 'rgba(255,255,255,0.04)',
              border: isCenter ? '1px solid rgba(136,204,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
              borderRadius: 3,
              padding: '2px 1px',
            }}>
              {name}
            </div>
          );
        })}
      </div>
      <div className="stat-row"><span className="stat-label">🌿 Adjacent Plants</span><span className="stat-value">{adjacentPlants ?? '?'}</span></div>
      <div className="stat-row"><span className="stat-label">💧 Water Adjacent</span><span className="stat-value" style={{ color: waterAdjacent ? '#4d96ff' : '#666' }}>{waterAdjacent ? 'Yes' : 'No'}</span></div>
    </CollapsibleSection>
  );
}

// --- Plant stage progress & water stress ---

function PlantStageProgress({ plant, plantSp, waterProximity, adjacentPlants, clock, gameConfig, stageAges, fruitSpoilAge, ticksPerDay }) {
  if (!plant || !plantSp) return null;
  const stage = plant.stage;
  const age = plant.age;

  const stageIdx = stage - 1;
  const nextThreshold = stageIdx >= 0 && stageIdx < stageAges.length ? stageAges[stageIdx] : null;
  const prevThreshold = stageIdx > 0 ? stageAges[stageIdx - 1] : 0;

  const seasonIndex = resolveSeasonIndex(clock, gameConfig);
  const seasonGrowthMult = gameConfig?.season_growth_multiplier?.[seasonIndex] ?? [1.2, 1.0, 0.8, 0.5][seasonIndex] ?? 1;

  let waterMult = 1.0;
  const waterMods = gameConfig?.plant_water_growth_modifiers;
  const nearThreshold = gameConfig?.plant_spawn_water_thresholds?.near ?? 5;
  const midThreshold = gameConfig?.plant_spawn_water_thresholds?.mid ?? 15;
  const farThreshold = gameConfig?.plant_water_far_threshold ?? 25;
  if (waterProximity != null && waterMods) {
    if (waterProximity <= nearThreshold) waterMult = waterMods.near ?? 1.3;
    else if (plantSp.waterAffinity === 'low') waterMult = waterMods.lowAffinity ?? 1.0;
    else if (waterProximity <= midThreshold) waterMult = waterMods.mid ?? 0.8;
    else if (waterProximity <= farThreshold) {
      waterMult = plantSp.waterAffinity === 'high'
        ? (waterMods.farHighAffinity ?? 0.5)
        : (waterMods.farMediumAffinity ?? 0.7);
    } else {
      waterMult = plantSp.waterAffinity === 'high' ? 0.3 : 0.5;
    }
  }

  const crowdingThreshold = gameConfig?.plant_crowding_neighbor_threshold ?? 5;
  const crowdingPenalty = gameConfig?.plant_crowding_growth_penalty ?? 0.7;
  const isCrowded = adjacentPlants != null && adjacentPlants >= crowdingThreshold;
  const crowdingMult = isCrowded ? crowdingPenalty : 1.0;

  const effectiveAgeMult = waterMult * seasonGrowthMult * crowdingMult;
  const estimatedEffectiveAge = Math.round(age * effectiveAgeMult);

  const waterStressThreshold = gameConfig?.water_stress_threshold ?? 20;
  const waterStressSevereThreshold = gameConfig?.water_stress_severe_threshold ?? 30;
  const isWaterStressed = waterProximity != null && plantSp.waterAffinity !== 'none' && waterProximity > waterStressThreshold;
  const isSevereStress = waterProximity != null && waterProximity > waterStressSevereThreshold;

  const isFruiting = stage === 5;

  return (
    <CollapsibleSection title="Growth Status" icon="📈" defaultOpen={true}>
      {nextThreshold != null && stage >= 1 && stage <= 4 && (
        <div className="mb-1">
          <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
            <span className="text-muted">📊 Stage Progress</span>
            <span>{formatTickDurationLabel(age, ticksPerDay)} / {formatTickDurationLabel(nextThreshold, ticksPerDay)}</span>
          </div>
          <div className="entity-bar">
            <div className="entity-bar-fill" style={{
              width: `${Math.min(100, ((age - prevThreshold) / Math.max(1, nextThreshold - prevThreshold)) * 100)}%`,
              background: '#88cc44',
            }} />
          </div>
        </div>
      )}
      {isFruiting && fruitSpoilAge > 0 && (
        <div className="mb-1">
          <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
            <span className="text-muted">🍂 Spoil Timer</span>
            <span>{formatTickDurationLabel(age, ticksPerDay)} / {formatTickDurationLabel(fruitSpoilAge, ticksPerDay)}</span>
          </div>
          <div className="entity-bar">
            <div className="entity-bar-fill" style={{
              width: `${Math.min(100, (age / fruitSpoilAge) * 100)}%`,
              background: age > fruitSpoilAge * 0.8 ? '#ff6b6b' : '#cc8844',
            }} />
          </div>
        </div>
      )}
      <div className="stat-row"><span className="stat-label">⏱️ Effective Age (est.)</span><span className="stat-value">{estimatedEffectiveAge} ticks</span></div>
      <div className="stat-row"><span className="stat-label">📐 Growth Multiplier</span><span className="stat-value" style={{ color: effectiveAgeMult >= 1 ? '#88cc44' : '#ff8844' }}>{effectiveAgeMult.toFixed(2)}x</span></div>
      <div className="stat-row"><span className="stat-label">💧 Water Mult</span><span className="stat-value">{waterMult.toFixed(2)}x</span></div>
      <div className="stat-row"><span className="stat-label">🌸 Season Mult</span><span className="stat-value">{seasonGrowthMult.toFixed(2)}x</span></div>
      {adjacentPlants != null && (
        <div className="stat-row">
          <span className="stat-label">🌿 Crowding</span>
          <span className="stat-value" style={{ color: isCrowded ? '#ff8844' : '#88cc44' }}>
            {adjacentPlants}/8 neighbors{isCrowded ? ` (${crowdingPenalty}x penalty)` : ''}
          </span>
        </div>
      )}
      {isWaterStressed && (
        <div className="stat-row">
          <span className="stat-label">⚠️ Water Stress</span>
          <span className="stat-value" style={{ color: isSevereStress ? '#ff4444' : '#ff8844' }}>
            {isSevereStress ? 'Severe' : 'Moderate'} (dist: {waterProximity})
          </span>
        </div>
      )}
    </CollapsibleSection>
  );
}

// --- Plant consumers (reverse lookup) ---

function PlantConsumers({ plantTypeId, plantStage }) {
  const consumers = useMemo(() => getPlantConsumers(plantTypeId, plantStage), [plantTypeId, plantStage]);
  if (consumers.length === 0) return null;
  return (
    <CollapsibleSection title={`Consumers (${consumers.length})`} icon="🐾" defaultOpen={false}>
      <div className="inspector-chip-list">
        {consumers.map(c => (
          <span key={c.speciesId} style={{ background: '#1a2e1a', padding: '2px 7px', borderRadius: 4, border: '1px solid #2a4a2a', fontSize: '0.62rem' }}>
            {c.emoji} {c.name}
          </span>
        ))}
      </div>
    </CollapsibleSection>
  );
}

// ===================== MAIN EXPORT =====================

const ANIMAL_TABS = [
  { key: 'status', label: 'Status' },
  { key: 'species', label: 'Species' },
  { key: 'diet', label: 'Diet' },
  { key: 'history', label: 'History' },
];

export default function EntityInspector({ onFocusEntity, requestAnimalDetail }) {
  const { selectedEntity, selectedTile, clearSelection, setSelectedEntity, clock, gameConfig } = useSimStore();
  const ticksPerDay = resolveTicksPerDay(clock.ticks_per_day);
  const ticksPerGameMinute = resolveTicksPerGameMinute(ticksPerDay);
  const effectiveAnimalSpeciesConfig = useMemo(
    () => gameConfig?.animal_species || buildAnimalSpeciesConfig(ticksPerGameMinute),
    [gameConfig?.animal_species, ticksPerGameMinute],
  );
  const effectivePlantStageAges = useMemo(
    () => gameConfig?.plant_stage_ages || buildStageAges(ticksPerGameMinute),
    [gameConfig?.plant_stage_ages, ticksPerGameMinute],
  );
  const effectivePlantFruitSpoilAges = useMemo(
    () => gameConfig?.plant_fruit_spoil_ages || buildFruitSpoilAges(ticksPerGameMinute),
    [gameConfig?.plant_fruit_spoil_ages, ticksPerGameMinute],
  );
  const [animalTab, setAnimalTab] = useState('status');
  const [tileTab, setTileTab] = useState('terrain');
  const [plantTab, setPlantTab] = useState('info');

  // Reset tab when selected entity changes
  const entityId = selectedEntity?.id;
  useEffect(() => { setAnimalTab('status'); }, [entityId]);

  // Reset tile+plant tabs when clicked tile changes
  const tileKey = selectedTile ? `${selectedTile.x}:${selectedTile.y}` : null;
  useEffect(() => {
    if (!selectedTile) return;
    const hasP = selectedTile.plant && selectedTile.plant.type !== 0 && selectedTile.plant.type !== 'none';
    const hasA = selectedTile.animals && selectedTile.animals.length > 0;
    setTileTab(hasP ? 'plant' : hasA ? 'animals' : 'terrain');
    setPlantTab('info');
  }, [tileKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Animal Inspector ---
  if (selectedEntity) {
    const e = selectedEntity;
    const info = SPECIES_INFO[e.species] || { emoji: '❓', name: e.species, diet: e.diet || '?' };
    const sp = effectiveAnimalSpeciesConfig[e.species];
    const maxHunger = sp?.max_hunger || 100;
    const maxThirst = sp?.max_thirst || 100;
    const maxEnergy = sp?.max_energy || 100;
    const maxHp = e._isEggStage && e.lifeStage === -1 ? (e._eggMaxHp || sp?.egg_hp || sp?.max_hp || 100) : (sp?.max_hp || 100);
    const maxAge = sp?.max_age || 1;
    const agePct = Math.min(100, (e.age / maxAge) * 100);
    const isEggStage = e.lifeStage === -1;
    const ageDays = ticksToDay(e.age, ticksPerDay);
    const birthDay = e._birthTick != null ? ticksToDay(e._birthTick, ticksPerDay) : null;

    const homeX = e.homeX;
    const homeY = e.homeY;
    const homeDist = (homeX != null && homeY != null) ? Math.round(Math.sqrt((e.x - homeX) ** 2 + (e.y - homeY) ** 2)) : null;

    const handleSelectAnimal = (animal) => {
      setSelectedEntity(animal);
      if (requestAnimalDetail) requestAnimalDetail(animal.id);
    };

    return (
      <div className="sidebar-section entity-info">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">
            {isEggStage ? '🥚' : info.emoji} {info.name} {isEggStage ? 'Egg' : ''} <span style={{ color: '#666', fontWeight: 'normal' }}>#{e.id}</span>
          </h6>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>

        {/* Status badges */}
        <div className="mb-2">
          {isEggStage
            ? <span className="inspector-badge" style={getBadgeToneStyle('warning')}>🥚 Incubating</span>
            : <AnimalStatusBadge state={e.state} alive={e.alive} />
          }
        </div>

        {/* Derived status chips */}
        {!isEggStage && <AnimalStatusChips entity={e} speciesConfig={sp} clock={clock} />}

        {/* Tab bar */}
        <div className="inspector-tabs" role="tablist" aria-label="Inspector sections">
          {ANIMAL_TABS.map(tab => (
            <button
              key={tab.key}
              className={`inspector-tab${animalTab === tab.key ? ' active' : ''}`}
              onClick={() => setAnimalTab(tab.key)}
              role="tab"
              aria-selected={animalTab === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* === Status tab === */}
        {animalTab === 'status' && (
          <div className="inspector-tab-panel">
            {/* Identity */}
            <CollapsibleSection title="Identity" icon="🪪" defaultOpen={true}>
              <div className="d-flex justify-content-end mb-1">
                <button
                  className="btn btn-sm btn-outline-info py-0 px-2"
                  onClick={() => onFocusEntity?.(e)}
                  disabled={!Number.isFinite(e.x) || !Number.isFinite(e.y)}
                >
                  Focus
                </button>
              </div>
              <div className="stat-row">
                <span className="stat-label">Diet</span>
                <span className="stat-value" style={{ color: DIET_COLORS[info.diet] || DIET_COLORS.Herbivore }}>
                  {info.diet}
                </span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Sex</span>
                <span className="stat-value">{SEX_NAMES[e.sex] || e.sex || 'Unknown'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Life Stage</span>
                <span className="stat-value">{LIFE_STAGE_NAMES[e.lifeStage] || 'Unknown'}</span>
              </div>
              <div className="stat-row">
                <span className="stat-label">Age</span>
                <span className="stat-value">{e.age} ticks ({ageDays} days)</span>
              </div>
              {birthDay != null && (
                <div className="stat-row">
                  <span className="stat-label">Born</span>
                  <span className="stat-value">Day {birthDay} (tick {e._birthTick})</span>
                </div>
              )}
              <div className="stat-row">
                <span className="stat-label">Position</span>
                <span className="stat-value">({Math.floor(e.x)}, {Math.floor(e.y)})</span>
              </div>
            </CollapsibleSection>

            {/* Vital signs */}
            <CollapsibleSection title="Vitals" icon="❤️" defaultOpen={true}>
              <Bar icon="❤️" label="HP" value={e.hp} max={maxHp} color="#ff4757" />
              {isEggStage && e._incubationPeriod > 0 && (
                <div className="mt-1">
                  <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                    <span className="text-muted">🕐 Incubation</span>
                    <span>{formatTickDurationLabel(e.age, ticksPerDay)} / {formatTickDurationLabel(e._incubationPeriod, ticksPerDay)}</span>
                  </div>
                  <div className="entity-bar">
                    <div className="entity-bar-fill" style={{ width: `${Math.min(100, (e.age / e._incubationPeriod) * 100)}%`, background: e.age >= e._incubationPeriod ? '#88cc44' : '#ffaa33' }} />
                  </div>
                </div>
              )}
              {isEggStage && e.parentA != null && (
                <div className="stat-row"><span className="stat-label">Parents</span><span className="stat-value">#{e.parentA}, #{e.parentB}</span></div>
              )}
              {!isEggStage && <Bar icon="⚡" label="Energy" value={e.energy} max={maxEnergy} color="#4ecdc4" />}
              {!isEggStage && <Bar icon="🍖" label="Hunger" value={e.hunger} max={maxHunger} color="#ff6b6b" />}
              {!isEggStage && <Bar icon="💧" label="Thirst" value={e.thirst} max={maxThirst} color="#4d96ff" />}
              <div className="mt-1">
                <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                  <span className="text-muted">⏳ Age</span>
                  <span>{e.age} / {maxAge}</span>
                </div>
                <div className="entity-bar">
                  <div className="entity-bar-fill" style={{ width: `${agePct}%`, background: agePct > 80 ? '#ff6b6b' : '#aaa' }} />
                </div>
              </div>
            </CollapsibleSection>

            {/* Navigation & Context */}
            <CollapsibleSection title="Navigation" icon="🧭" defaultOpen={true}>
              <div className="stat-row">
                <span className="stat-label">Direction</span>
                <span className="stat-value">{DIRECTION_LABELS[e.direction] || '?'}</span>
              </div>
              {e.targetX != null && e.targetY != null && e.state !== 0 && e.state !== 5 && (
                <div className="stat-row">
                  <span className="stat-label">Target</span>
                  <span className="stat-value" style={{ color: '#888' }}>({e.targetX}, {e.targetY})</span>
                </div>
              )}
              {e.pathLength > 0 && (
                <div className="stat-row">
                  <span className="stat-label">Path</span>
                  <span className="stat-value">{e.pathIndex ?? 0}/{e.pathLength} steps</span>
                </div>
              )}
              {homeX != null && homeY != null && (
                <div className="stat-row">
                  <span className="stat-label">🏠 Home</span>
                  <span className="stat-value">({homeX}, {homeY}){homeDist != null ? ` — ${homeDist} tiles away` : ''}</span>
                </div>
              )}
              {e._tileTerrain && (
                <div className="stat-row">
                  <span className="stat-label">🗺️ Terrain</span>
                  <span className="stat-value" style={{ textTransform: 'capitalize' }}>{e._tileTerrain}</span>
                </div>
              )}
              {e._tileWaterProximity != null && (
                <div className="stat-row">
                  <span className="stat-label">💧 Water Distance</span>
                  <span className="stat-value">{e._tileWaterProximity} tiles</span>
                </div>
              )}
            </CollapsibleSection>

            {/* Cooldowns & Reproduction Status */}
            {(e.mateCooldown > 0 || e.attackCooldown > 0 || e.pregnant || e.lifeStage === 4) && (
              <CollapsibleSection title="Cooldowns" icon="⏱️" defaultOpen={true}>
                {e.mateCooldown > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">💕 Mate</span>
                    <span className="stat-value" style={{ color: '#ff66aa' }}>{formatTickDurationLabel(e.mateCooldown, ticksPerDay)}</span>
                  </div>
                )}
                {e.attackCooldown > 0 && (
                  <div className="stat-row">
                    <span className="stat-label">⚔️ Attack</span>
                    <span className="stat-value" style={{ color: '#ff4444' }}>{formatTickDurationLabel(e.attackCooldown, ticksPerDay)}</span>
                  </div>
                )}
                {e.pregnant && (
                  <>
                    <div className="stat-row">
                      <span className="stat-label">🤰 Pregnant</span>
                      <span className="stat-value" style={{ color: '#ff99cc' }}>
                        {e._gestationLitterSize || '?'} offspring
                      </span>
                    </div>
                    <Bar icon="🤰" label="Gestation" value={e.gestationTimer || 0} max={sp?.gestation_period || e.gestationTimer || 1} color="#ff99cc" />
                  </>
                )}
                {e.lifeStage === 4 && (
                  <div className="stat-row">
                    <span className="stat-label">🫘 Pupa</span>
                    <span className="stat-value" style={{ color: '#aa88cc' }}>Metamorphosing</span>
                  </div>
                )}
              </CollapsibleSection>
            )}
          </div>
        )}

        {/* === Species tab === */}
        {animalTab === 'species' && (
          <div className="inspector-tab-panel">
            <SpeciesAttributes species={e.species} lifeStage={e.lifeStage} clock={clock} gameConfig={gameConfig} speciesConfig={sp} />
          </div>
        )}

        {/* === Diet tab === */}
        {animalTab === 'diet' && (
          <div className="inspector-tab-panel">
            <DietInfo species={e.species} speciesConfig={sp} />
          </div>
        )}

        {/* === History tab === */}
        {animalTab === 'history' && (
          <div className="inspector-tab-panel">
            {e.actionHistory && e.actionHistory.length > 0 ? (
              <div style={{ maxHeight: 500, overflowY: 'auto', fontSize: '0.63rem' }}>
                {[...e.actionHistory].reverse().map((ev, i) => (
                  <ActionLogEntry key={i} event={ev} ticksPerDay={ticksPerDay} />
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

  // --- Tile Inspector ---
  if (selectedTile) {
    const t = selectedTile;
    const hasPlant = t.plant && t.plant.type !== 0 && t.plant.type !== 'none';
    const hasAnimals = t.animals && t.animals.length > 0;
    const plantSp = hasPlant ? getPlantByTypeId(t.plant.type) : null;
    const plantEmoji = hasPlant && plantSp && plantSp.emoji
      ? (t.plant.stage === 1 ? plantSp.emoji.seed
        : t.plant.stage === 2 ? plantSp.emoji.youngSprout
        : t.plant.stage === 3 ? plantSp.emoji.adultSprout
        : t.plant.stage === 4 ? plantSp.emoji.adult
        : t.plant.stage === 5 ? plantSp.emoji.fruit
        : '🌿')
      : '🌿';
    const maxPlantAge = hasPlant && plantSp ? (effectivePlantStageAges[t.plant.type]?.[effectivePlantStageAges[t.plant.type].length - 1] || 1) : 1;

    const handleSelectAnimal = (animal) => {
      setSelectedEntity(animal);
      if (requestAnimalDetail) requestAnimalDetail(animal.id);
    };

    // Build top-level tile tabs dynamically
    const tileTabs = [
      { key: 'terrain', label: '🗺️ Terrain' },
      ...(hasPlant ? [{ key: 'plant', label: `${plantEmoji} Plant` }] : []),
      ...(hasAnimals ? [{ key: 'animals', label: `🐾 (${t.animals.length})` }] : []),
    ];

    // Plant sub-tabs
    const plantSubTabs = [
      { key: 'info', label: 'Info' },
      { key: 'growth', label: 'Growth' },
      { key: 'consumers', label: 'Consumers' },
      ...(t.plant?.log?.length > 0 ? [{ key: 'log', label: 'Log' }] : []),
    ];

    return (
      <div className="sidebar-section entity-info">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Tile ({t.x}, {t.y})</h6>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>

        {/* Top-level tab bar — only when more than one section available */}
        {tileTabs.length > 1 && (
          <div
            className="inspector-tabs"
            role="tablist"
            aria-label="Tile sections"
            style={{ gridTemplateColumns: `repeat(${tileTabs.length}, minmax(0, 1fr))` }}
          >
            {tileTabs.map(tab => (
              <button
                key={tab.key}
                className={`inspector-tab${tileTab === tab.key ? ' active' : ''}`}
                onClick={() => setTileTab(tab.key)}
                role="tab"
                aria-selected={tileTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}

        {/* === Terrain tab === */}
        {(tileTab === 'terrain' || tileTabs.length === 1) && (
          <div className="inspector-tab-panel">
            <div className="stat-row mt-1">
              <span className="stat-label">Type</span>
              <span className="stat-value" style={{ textTransform: 'capitalize' }}>{t.terrain}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Water Distance</span>
              <span className="stat-value">{t.waterProximity} tiles</span>
            </div>
            {t.waterAdjacent != null && (
              <div className="stat-row">
                <span className="stat-label">Water Adjacent</span>
                <span className="stat-value" style={{ color: t.waterAdjacent ? '#4d96ff' : '#666' }}>{t.waterAdjacent ? 'Yes' : 'No'}</span>
              </div>
            )}
            <TileNeighborhood neighbors={t.neighbors} waterAdjacent={t.waterAdjacent} adjacentPlants={t.adjacentPlants} />
            {!hasPlant && !hasAnimals && (
              <div className="mt-2 small text-muted" style={{ fontStyle: 'italic' }}>No plants or animals on this tile.</div>
            )}
          </div>
        )}

        {/* === Plant tab (with sub-tabs: Info | Growth | Consumers | Log) === */}
        {tileTab === 'plant' && hasPlant && (
          <div className="inspector-tab-panel">
            {/* Plant sub-tab bar */}
            <div
              className="inspector-tabs"
              role="tablist"
              aria-label="Plant sections"
              style={{ gridTemplateColumns: `repeat(${plantSubTabs.length}, minmax(0, 1fr))`, marginTop: 4 }}
            >
              {plantSubTabs.map(sub => (
                <button
                  key={sub.key}
                  className={`inspector-tab${plantTab === sub.key ? ' active' : ''}`}
                  onClick={() => setPlantTab(sub.key)}
                  role="tab"
                  aria-selected={plantTab === sub.key}
                >
                  {sub.label}
                </button>
              ))}
            </div>

            {/* Info sub-tab */}
            {plantTab === 'info' && (
              <>
                <div className="stat-row mt-1">
                  <span className="stat-label">Species</span>
                  <span className="stat-value">{PLANT_TYPE_NAMES[t.plant.type] || t.plant.type}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Sex</span>
                  <span className="stat-value">{PLANT_SEX_NAMES[PLANT_TYPE_SEX[t.plant.type]] || 'Unknown'}</span>
                </div>
                <div className="stat-row">
                  <span className="stat-label">Stage</span>
                  <span className="stat-value">{PLANT_STAGE_NAMES[t.plant.stage] || t.plant.stage}</span>
                </div>
                <div className="mt-1">
                  <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                    <span className="text-muted">⏳ Age</span>
                    <span>{t.plant.age} ticks</span>
                  </div>
                  <div className="entity-bar">
                    <div className="entity-bar-fill" style={{
                      width: `${Math.min(100, (t.plant.age / maxPlantAge) * 100)}%`,
                      background: t.plant.stage === 6 ? '#666' : '#88cc44',
                    }} />
                  </div>
                </div>
                {t.plant.stage === 5 && (
                  <div className="stat-row"><span className="stat-label">Status</span><span className="stat-value" style={{ color: '#ff8844' }}>🍎 Fruiting</span></div>
                )}
                {t.plant.stage === 6 && (
                  <div className="stat-row"><span className="stat-label">Status</span><span className="stat-value" style={{ color: '#666' }}>💀 Dead</span></div>
                )}
                <PlantAttributes typeId={t.plant.type} terrain={t.terrain} stage={t.plant.stage} clock={clock} gameConfig={gameConfig} />
              </>
            )}

            {/* Growth sub-tab */}
            {plantTab === 'growth' && (
              <PlantStageProgress
                plant={t.plant}
                plantSp={plantSp}
                waterProximity={t.waterProximity}
                adjacentPlants={t.adjacentPlants}
                clock={clock}
                gameConfig={gameConfig}
                stageAges={effectivePlantStageAges[t.plant.type] || []}
                fruitSpoilAge={effectivePlantFruitSpoilAges[t.plant.type] || 0}
                ticksPerDay={ticksPerDay}
              />
            )}

            {/* Consumers sub-tab */}
            {plantTab === 'consumers' && (
              <PlantConsumers plantTypeId={t.plant.type} plantStage={t.plant.stage} />
            )}

            {/* Log sub-tab */}
            {plantTab === 'log' && t.plant.log && t.plant.log.length > 0 && (
              <div className="inspector-log-list mt-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
                {[...t.plant.log].reverse().map((ev, i) => (
                  <PlantLogEntry key={i} event={ev} ticksPerDay={ticksPerDay} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* === Animals tab === */}
        {tileTab === 'animals' && (
          <div className="inspector-tab-panel">
            <TileOccupants animals={t.animals} onSelectAnimal={handleSelectAnimal} />
          </div>
        )}
      </div>
    );
  }

  // --- Empty state ---
  return (
    <div className="sidebar-section entity-info">
      <h6>Inspector</h6>
      <div className="small text-muted">Click on a tile or entity to inspect</div>
    </div>
  );
}
