/**
 * EntityInspector — shows details of selected entity or tile.
 */
import React, { useState } from 'react';
import useSimStore from '../store/simulationStore';
import { STATE_NAMES, LIFE_STAGE_NAMES, PLANT_TYPE_NAMES, PLANT_STAGE_NAMES, PLANT_SEX_NAMES, PLANT_TYPE_SEX, SPECIES_INFO, SEX_NAMES } from '../utils/terrainColors';
import ANIMAL_SPECIES, { buildAnimalSpeciesConfig } from '../engine/animalSpecies';
import PLANT_SPECIES, { getPlantByTypeId } from '../engine/plantSpecies';
import { DIET_COLORS } from '../constants/statusColors';
import { formatTickTimestamp, resolveTicksPerDay } from '../utils/time';

const ANIMAL_SPECIES_CONFIG = buildAnimalSpeciesConfig();

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
const WATER_AFFINITY_LABELS = { low: '🏜️ Low', medium: '💧 Medium', high: '🌊 High' };
const SEASON_LABELS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const ANIMAL_LIFE_STAGE_KEYS = ['BABY', 'YOUNG', 'YOUNG_ADULT', 'ADULT', 'PUPA'];

function formatPercent(value, digits = 0) {
  return `${(value * 100).toFixed(digits)}%`;
}

function resolveSeasonIndex(clock, gameConfig) {
  const seasonLengthDays = gameConfig?.season_length_days ?? 30;
  const day = clock?.day ?? Math.floor((clock?.tick || 0) / resolveTicksPerDay(clock?.ticks_per_day));
  return Math.floor(day / seasonLengthDays) % 4;
}

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
      <div className="stat-row"><span className="stat-label">Fruit Spoil Age</span><span className="stat-value">{sp.fruitSpoilAge} ticks</span></div>
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
            <span>{age} ticks</span>
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

function SpeciesAttributes({ species, lifeStage, clock, gameConfig }) {
  const sp = ANIMAL_SPECIES_CONFIG[species];
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
    <CollapsibleSection title="Species Attributes" icon="📋" defaultOpen={true}>
      <div className="inspector-grid">
        <div className="stat-row"><span className="stat-label">🏃 Speed</span><span className="stat-value">{sp.speed}</span></div>
        <div className="stat-row"><span className="stat-label">👁️ Vision (Base)</span><span className="stat-value">{baseVision}</span></div>
        <div className="stat-row"><span className="stat-label">👁️ Vision (Now)</span><span className="stat-value">{effectiveVision}</span></div>
        <div className="stat-row"><span className="stat-label">⚡ Max Energy</span><span className="stat-value">{sp.max_energy}</span></div>
        <div className="stat-row"><span className="stat-label">❤️ Max HP</span><span className="stat-value">{sp.max_hp}</span></div>
        <div className="stat-row"><span className="stat-label">🍖 Max Hunger</span><span className="stat-value">{sp.max_hunger}</span></div>
        <div className="stat-row"><span className="stat-label">💧 Max Thirst</span><span className="stat-value">{sp.max_thirst}</span></div>
        <div className="stat-row"><span className="stat-label">⏳ Max Age</span><span className="stat-value">{sp.max_age}</span></div>
        <div className="stat-row"><span className="stat-label">🌱 Mature Age</span><span className="stat-value">{sp.mature_age}</span></div>
        <div className="stat-row"><span className="stat-label">⚔️ Attack</span><span className="stat-value">{sp.attack_power}</span></div>
        <div className="stat-row"><span className="stat-label">🛡️ Defense</span><span className="stat-value">{sp.defense}</span></div>
        <div className="stat-row"><span className="stat-label">🍖 Hunger Rate</span><span className="stat-value">{sp.hunger_rate}/tick</span></div>
        <div className="stat-row"><span className="stat-label">💧 Thirst Rate</span><span className="stat-value">{sp.thirst_rate}/tick</span></div>
        <div className="stat-row"><span className="stat-label">♻️ Reproduction</span><span className="stat-value">{sp.reproduction}</span></div>
        {rawSpecies.reproduction_type && (
          <div className="stat-row"><span className="stat-label">🤰 Type</span><span className="stat-value" style={{ textTransform: 'capitalize' }}>{rawSpecies.reproduction_type}</span></div>
        )}
        {rawSpecies.gestation_period > 0 && (
          <div className="stat-row"><span className="stat-label">🤰 Gestation</span><span className="stat-value">{rawSpecies.gestation_period} ticks</span></div>
        )}
        {rawSpecies.incubation_period > 0 && (
          <div className="stat-row"><span className="stat-label">🥚 Incubation</span><span className="stat-value">{rawSpecies.incubation_period} ticks</span></div>
        )}
        {rawSpecies.clutch_size && (
          <div className="stat-row"><span className="stat-label">🐣 Clutch Size</span><span className="stat-value">{rawSpecies.clutch_size[0]}–{rawSpecies.clutch_size[1]}</span></div>
        )}
        <div className="stat-row"><span className="stat-label">🌙 Activity</span><span className="stat-value">{sp.nocturnal ? 'Nocturnal' : 'Diurnal'}</span></div>
        <div className="stat-row"><span className="stat-label">🦴 Scavenging</span><span className="stat-value">{sp.can_scavenge ? 'Enabled' : 'Disabled'}</span></div>
      </div>
      {sp.life_stage_ages && (
        <>
          <h6 className="mt-2 mb-1 inspector-subtitle">🎂 Life Stage Ages</h6>
          <div className="inspector-detail-list">
            <div className="d-flex justify-content-between"><span className="text-muted">Baby → Young</span><span>{sp.life_stage_ages[0]} ticks</span></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Young → Young Adult</span><span>{sp.life_stage_ages[1]} ticks</span></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Young Adult → Adult</span><span>{sp.life_stage_ages[2]} ticks</span></div>
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

      {/* Diet — Edible Plants */}
      {rawSpecies.edible_plants && rawSpecies.edible_plants.length > 0 && (
        <CollapsibleSection title="Edible Plants" icon="🌿" defaultOpen={false}>
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

      {/* Diet — Prey Species */}
      {rawSpecies.prey_species && rawSpecies.prey_species.length > 0 && (
        <CollapsibleSection title="Prey Species" icon="🎯" defaultOpen={false}>
          <div className="inspector-chip-list">
            {rawSpecies.prey_species.map(k => (
              <span key={k} style={{ background: '#2e1a1a', padding: '2px 7px', borderRadius: 4, border: '1px solid #4a2a2a' }}>
                {SPECIES_INFO[k]?.emoji} {SPECIES_INFO[k]?.name || k}
              </span>
            ))}
          </div>
        </CollapsibleSection>
      )}

      <CollapsibleSection title="Energy Costs" icon="⚡" defaultOpen={false}>
        <EnergyCostTable costs={sp.energy_costs} />
      </CollapsibleSection>
    </CollapsibleSection>
  );
}

function AnimalStatusBadge({ state, alive }) {
  if (!alive) return <span className="inspector-badge badge-dead">💀 Dead</span>;
  const stateColors = {
    0: '#777',    // Idle
    1: '#53a8b6', // Walking
    2: '#ffaa33', // Running
    3: '#66cc66', // Eating
    4: '#4d96ff', // Drinking
    5: '#aa88cc', // Sleeping
    6: '#ff4444', // Attacking
    7: '#ff8833', // Fleeing
    8: '#ff66aa', // Mating
  };
  return (
    <span className="inspector-badge" style={{ background: stateColors[state] || '#555' }}>
      {STATE_NAMES[state] || 'Unknown'}
    </span>
  );
}

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

export default function EntityInspector({ onFocusEntity }) {
  const { selectedEntity, selectedTile, clearSelection, clock, gameConfig } = useSimStore();
  const ticksPerDay = resolveTicksPerDay(clock.ticks_per_day);

  if (selectedEntity) {
    const e = selectedEntity;

    // Egg inspection panel
    if (e.isEgg) {
      const info = SPECIES_INFO[e.species] || { emoji: '❓', name: e.species };
      const hatchPct = Math.min(100, (e.age / (e.incubationPeriod || 1)) * 100);
      return (
        <div className="sidebar-section entity-info">
          <div className="d-flex justify-content-between align-items-center mb-2">
            <h6 className="mb-0">
              🥚 {info.name} Egg <span style={{ color: '#666', fontWeight: 'normal' }}>#{e.id}</span>
            </h6>
            <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
          </div>
          <CollapsibleSection title="Egg Info" icon="🥚" defaultOpen={true}>
            <div className="stat-row"><span className="stat-label">Species</span><span className="stat-value">{info.emoji} {info.name}</span></div>
            <div className="stat-row"><span className="stat-label">Position</span><span className="stat-value">({Math.floor(e.x)}, {Math.floor(e.y)})</span></div>
            <div className="stat-row"><span className="stat-label">Hatch Count</span><span className="stat-value">{e.hatchCount}</span></div>
            {e.parentA != null && (
              <div className="stat-row"><span className="stat-label">Parents</span><span className="stat-value">#{e.parentA}, #{e.parentB}</span></div>
            )}
            <Bar icon="❤️" label="HP" value={e.hp} max={e.maxHp} color="#ff4757" />
            <div className="mt-1">
              <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                <span className="text-muted">🕐 Incubation</span>
                <span>{e.age} / {e.incubationPeriod} ticks</span>
              </div>
              <div className="entity-bar">
                <div className="entity-bar-fill" style={{ width: `${hatchPct}%`, background: hatchPct >= 100 ? '#88cc44' : '#ffaa33' }} />
              </div>
            </div>
          </CollapsibleSection>
        </div>
      );
    }

    const info = SPECIES_INFO[e.species] || { emoji: '❓', name: e.species, diet: e.diet || '?' };
    const sp = ANIMAL_SPECIES_CONFIG[e.species];
    const maxHunger = sp?.max_hunger || 100;
    const maxThirst = sp?.max_thirst || 100;
    const maxEnergy = sp?.max_energy || 100;
    const maxHp = sp?.max_hp || 100;
    const maxAge = sp?.max_age || 1;
    const agePct = Math.min(100, (e.age / maxAge) * 100);

    return (
      <div className="sidebar-section entity-info">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">
            {info.emoji} {info.name} <span style={{ color: '#666', fontWeight: 'normal' }}>#{e.id}</span>
          </h6>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>

        {/* Status badge */}
        <div className="mb-2">
          <AnimalStatusBadge state={e.state} alive={e.alive} />
        </div>

        {/* Identity */}
        <CollapsibleSection title="Identity" icon="🪪" defaultOpen={true}>
          <div className="d-flex justify-content-end mb-1">
            <button
              className="btn btn-sm btn-outline-info py-0 px-2"
              onClick={() => onFocusEntity?.(e)}
              disabled={!Number.isFinite(e.x) || !Number.isFinite(e.y)}
            >
              Olhar para
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
            <span className="stat-label">Position</span>
            <span className="stat-value">({Math.floor(e.x)}, {Math.floor(e.y)})</span>
          </div>
          {e.targetX != null && e.targetY != null && e.state !== 0 && e.state !== 5 && (
            <div className="stat-row">
              <span className="stat-label">Target</span>
              <span className="stat-value" style={{ color: '#888' }}>({e.targetX}, {e.targetY})</span>
            </div>
          )}
        </CollapsibleSection>

        {/* Vital signs */}
        <CollapsibleSection title="Vitals" icon="❤️" defaultOpen={true}>
          <Bar icon="❤️" label="HP" value={e.hp} max={maxHp} color="#ff4757" />
          <Bar icon="⚡" label="Energy" value={e.energy} max={maxEnergy} color="#4ecdc4" />
          <Bar icon="🍖" label="Hunger" value={e.hunger} max={maxHunger} color="#ff6b6b" />
          <Bar icon="💧" label="Thirst" value={e.thirst} max={maxThirst} color="#4d96ff" />
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

        {/* Cooldowns & Reproduction Status */}
        {(e.mateCooldown > 0 || e.attackCooldown > 0 || e.pregnant || e.lifeStage === 4) && (
          <CollapsibleSection title="Cooldowns" icon="⏱️" defaultOpen={true}>
            {e.mateCooldown > 0 && (
              <div className="stat-row">
                <span className="stat-label">💕 Mate</span>
                <span className="stat-value" style={{ color: '#ff66aa' }}>{e.mateCooldown} ticks</span>
              </div>
            )}
            {e.attackCooldown > 0 && (
              <div className="stat-row">
                <span className="stat-label">⚔️ Attack</span>
                <span className="stat-value" style={{ color: '#ff4444' }}>{e.attackCooldown} ticks</span>
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

        {/* Species attributes */}
        <SpeciesAttributes species={e.species} lifeStage={e.lifeStage} clock={clock} gameConfig={gameConfig} />

        {/* Action History */}
        {e.actionHistory && e.actionHistory.length > 0 && (
          <CollapsibleSection title="Action History" icon="📜" defaultOpen={false}>
            <div style={{ maxHeight: 200, overflowY: 'auto', fontSize: '0.63rem' }}>
              {[...e.actionHistory].reverse().map((ev, i) => (
                <ActionLogEntry key={i} event={ev} ticksPerDay={ticksPerDay} />
              ))}
            </div>
          </CollapsibleSection>
        )}
      </div>
    );
  }

  if (selectedTile) {
    const t = selectedTile;
    const hasPlant = t.plant && t.plant.type !== 0 && t.plant.type !== 'none';
    const plantSp = hasPlant ? getPlantByTypeId(t.plant.type) : null;
    const plantEmoji = hasPlant && plantSp && plantSp.emoji
      ? (t.plant.stage === 1 ? plantSp.emoji.seed
        : t.plant.stage === 2 ? plantSp.emoji.youngSprout
        : t.plant.stage === 3 ? plantSp.emoji.adultSprout
        : t.plant.stage === 4 ? plantSp.emoji.adult
        : t.plant.stage === 5 ? plantSp.emoji.fruit
        : '🌿')
      : '🌿';
    const maxPlantAge = hasPlant && plantSp ? plantSp.stageAges[plantSp.stageAges.length - 1] : 1;

    return (
      <div className="sidebar-section entity-info">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Tile ({t.x}, {t.y})</h6>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>

        <CollapsibleSection title="Terrain" icon="🗺️" defaultOpen={true}>
          <div className="stat-row">
            <span className="stat-label">Type</span>
            <span className="stat-value" style={{ textTransform: 'capitalize' }}>{t.terrain}</span>
          </div>
          <div className="stat-row">
            <span className="stat-label">Water Distance</span>
            <span className="stat-value">{t.waterProximity} tiles</span>
          </div>
        </CollapsibleSection>

        {hasPlant && (
          <>
            <CollapsibleSection title={`${plantEmoji} ${PLANT_TYPE_NAMES[t.plant.type] || 'Plant'}`} icon="" defaultOpen={true}>
              <div className="stat-row">
                <span className="stat-label">Type</span>
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
                <div className="stat-row">
                  <span className="stat-label">Status</span>
                  <span className="stat-value" style={{ color: '#ff8844' }}>🍎 Fruiting</span>
                </div>
              )}
              {t.plant.stage === 6 && (
                <div className="stat-row">
                  <span className="stat-label">Status</span>
                  <span className="stat-value" style={{ color: '#666' }}>💀 Dead</span>
                </div>
              )}
            </CollapsibleSection>
            <PlantAttributes typeId={t.plant.type} terrain={t.terrain} stage={t.plant.stage} clock={clock} gameConfig={gameConfig} />
            {t.plant.log && t.plant.log.length > 0 && (
              <CollapsibleSection title="Event Log" icon="📜" defaultOpen={false}>
                <div className="inspector-log-list" style={{ maxHeight: 200, overflowY: 'auto' }}>
                  {[...t.plant.log].reverse().map((ev, i) => (
                    <PlantLogEntry key={i} event={ev} ticksPerDay={ticksPerDay} />
                  ))}
                </div>
              </CollapsibleSection>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="sidebar-section entity-info">
      <h6>Inspector</h6>
      <div className="small text-muted">Click on a tile or entity to inspect</div>
    </div>
  );
}
