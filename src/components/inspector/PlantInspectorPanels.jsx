import React, { useMemo } from 'react';
import ANIMAL_SPECIES from '../../engine/animalSpecies';
import { getPlantByTypeId } from '../../engine/plantSpecies';
import { PLANT_STAGE_NAMES, SPECIES_INFO } from '../../utils/terrainColors';
import { formatGameDuration, formatTickTimestamp, resolveTicksPerDay } from '../../utils/time';
import { CollapsibleSection, formatTickDurationLabel } from './InspectorShared.jsx';

const STAGE_LABELS = ['Seed', 'Young Sprout', 'Adult Sprout', 'Adult', 'Fruit'];
const WATER_AFFINITY_LABELS = { none: '🚫 None', low: '🏜️ Low', medium: '💧 Medium', high: '🌊 High' };
const SEASON_LABELS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const PLANT_EVENT_ICONS = {
  PLANTED: '🌱', BORN: '🌱', GREW: '📈', MATURED: '🌳',
  SPOILED: '🍂', DIED: '💀', EATEN: '🍽️',
};
const PLANT_EVENT_COLORS = {
  PLANTED: '#88cc44', BORN: '#66cc66', GREW: '#aacc44', MATURED: '#44bb88',
  SPOILED: '#cc8844', DIED: '#888', EATEN: '#dd4444',
};

const plantConsumersCache = {};

function getPlantConsumers(plantTypeId, plantStage) {
  const key = `${plantTypeId}:${plantStage}`;
  if (plantConsumersCache[key]) return plantConsumersCache[key];

  const consumers = [];
  const plantSpecies = getPlantByTypeId(plantTypeId);
  if (!plantSpecies) return consumers;

  const plantKey = plantSpecies.id;
  for (const [speciesId, species] of Object.entries(ANIMAL_SPECIES)) {
    if (!species.edible_plants || !species.edible_plants.includes(plantKey)) continue;
    if (Array.isArray(plantSpecies.edibleStages) && plantSpecies.edibleStages.includes(plantStage)) {
      const info = SPECIES_INFO[speciesId];
      if (info) consumers.push({ speciesId, ...info });
    }
  }

  plantConsumersCache[key] = consumers;
  return consumers;
}

function resolveSeasonIndex(clock, gameConfig) {
  const seasonLengthDays = gameConfig?.season_length_days ?? 30;
  const day = clock?.day ?? Math.floor((clock?.tick || 0) / resolveTicksPerDay(clock?.ticks_per_day));
  return Math.floor(day / seasonLengthDays) % 4;
}

export function PlantAttributes({ typeId, terrain, stage, clock, gameConfig }) {
  const plantSpecies = getPlantByTypeId(typeId);
  if (!plantSpecies) return null;

  const seasonIndex = resolveSeasonIndex(clock, gameConfig);
  const season = SEASON_LABELS[seasonIndex] || 'Unknown';
  const terrainKey = typeof terrain === 'string' ? terrain.toUpperCase() : terrain;
  const currentTerrainGrowth = plantSpecies.terrainGrowth?.[terrainKey];
  const growthMultiplier = gameConfig?.season_growth_multiplier?.[seasonIndex] ?? [1.2, 1.0, 0.8, 0.5][seasonIndex] ?? 1;
  const reproductionMultiplier = gameConfig?.season_reproduction_multiplier?.[seasonIndex] ?? [1.5, 1.0, 0.7, 0.2][seasonIndex] ?? 1;
  const deathMultiplier = gameConfig?.season_death_multiplier?.[seasonIndex] ?? [0.8, 1.0, 1.2, 2.0][seasonIndex] ?? 1;
  const edibleStageLabels = (plantSpecies.edibleStages || []).map((stageId) => PLANT_STAGE_NAMES[stageId] || `Stage ${stageId}`);
  const isCurrentStageEdible = Array.isArray(plantSpecies.edibleStages) ? plantSpecies.edibleStages.includes(stage) : false;

  return (
    <CollapsibleSection title="Plant Attributes" icon="📋" defaultOpen={true}>
      <div className="stat-row"><span className="stat-label">Reproduction</span><span className="stat-value">{plantSpecies.reproduction} ({plantSpecies.sex})</span></div>
      <div className="stat-row"><span className="stat-label">Water Affinity</span><span className="stat-value">{WATER_AFFINITY_LABELS[plantSpecies.waterAffinity] || plantSpecies.waterAffinity}</span></div>
      <div className="stat-row"><span className="stat-label">Production Chance</span><span className="stat-value">{(plantSpecies.productionChance * 100).toFixed(1)}%/tick</span></div>
      <div className="stat-row"><span className="stat-label">Fruit Spoil Age</span><span className="stat-value">{formatGameDuration(plantSpecies.fruitSpoilAge)}</span></div>
      <div className="stat-row"><span className="stat-label">Edible Stages</span><span className="stat-value">{edibleStageLabels.length > 0 ? edibleStageLabels.join(', ') : 'None'}</span></div>
      <div className="stat-row"><span className="stat-label">Current Stage</span><span className="stat-value" style={{ color: isCurrentStageEdible ? '#88cc44' : '#999' }}>{isCurrentStageEdible ? 'Edible' : 'Not edible'}</span></div>
      <div className="stat-row"><span className="stat-label">Terrain Growth</span><span className="stat-value" style={{ color: currentTerrainGrowth > 1 ? '#88cc44' : currentTerrainGrowth === 0 ? '#ff6b6b' : '#ddd' }}>{currentTerrainGrowth != null ? `${currentTerrainGrowth.toFixed(2)}x on ${terrainKey}` : `n/a on ${terrainKey || '?'}`}</span></div>
      <div className="stat-row"><span className="stat-label">Season</span><span className="stat-value">{season}</span></div>
      <div className="stat-row"><span className="stat-label">Season Growth</span><span className="stat-value">{growthMultiplier.toFixed(2)}x</span></div>
      <div className="stat-row"><span className="stat-label">Season Reproduction</span><span className="stat-value">{reproductionMultiplier.toFixed(2)}x</span></div>
      <div className="stat-row"><span className="stat-label">Season Death</span><span className="stat-value">{deathMultiplier.toFixed(2)}x</span></div>
      <h6 className="mt-2 mb-1 inspector-subtitle">🌱 Growth Stages</h6>
      <div className="inspector-detail-list">
        {plantSpecies.stageAges.map((age, index) => (
          <div key={index} className="d-flex justify-content-between">
            <span className="text-muted">{STAGE_LABELS[index]} → {STAGE_LABELS[index + 1] || 'Dead'}</span>
            <span>{formatGameDuration(age)}</span>
          </div>
        ))}
      </div>
      {plantSpecies.terrainGrowth && (
        <CollapsibleSection title="Terrain Multipliers" icon="🗺️" defaultOpen={false}>
          <div className="inspector-detail-list">
            {Object.entries(plantSpecies.terrainGrowth).map(([terrainName, multiplier]) => (
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

export function PlantLogEntry({ event, ticksPerDay }) {
  const { tick, event: action, detail } = event;
  const icon = PLANT_EVENT_ICONS[action] || '❓';
  const color = PLANT_EVENT_COLORS[action] || '#aaa';
  let text = action;

  if (action === 'PLANTED') text = `Planted (stage ${PLANT_STAGE_NAMES[detail.stage] || detail.stage})`;
  else if (action === 'BORN') text = `Born from parent at (${detail.parentX},${detail.parentY})`;
  else if (action === 'GREW') text = `Grew: ${PLANT_STAGE_NAMES[detail.from] || detail.from} → ${PLANT_STAGE_NAMES[detail.to] || detail.to}`;
  else if (action === 'MATURED') text = 'Reached adult stage';
  else if (action === 'SPOILED') text = 'Fruit spoiled → seed';
  else if (action === 'DIED') text = `Died (${(detail.cause || 'unknown').replace('_', ' ')})`;
  else if (action === 'EATEN') text = `Eaten by ${detail.by}`;

  const timestamp = formatTickTimestamp(tick, ticksPerDay);
  return (
    <div className="d-flex align-items-start gap-1" style={{ padding: '1px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <span style={{ flexShrink: 0, width: 16, textAlign: 'center' }}>{icon}</span>
      <span style={{ color, flex: 1 }}>{text}</span>
      <span style={{ flexShrink: 0, fontSize: '0.58rem', whiteSpace: 'nowrap', color: '#88aacc' }}>{timestamp}</span>
    </div>
  );
}

export function PlantStageProgress({ plant, plantSp, waterProximity, adjacentPlants, clock, gameConfig, stageAges, fruitSpoilAge, ticksPerDay }) {
  if (!plant || !plantSp) return null;

  const stageIndex = plant.stage - 1;
  const nextThreshold = stageIndex >= 0 && stageIndex < stageAges.length ? stageAges[stageIndex] : null;
  const prevThreshold = stageIndex > 0 ? stageAges[stageIndex - 1] : 0;
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
  const estimatedEffectiveAge = Math.round(plant.age * effectiveAgeMult);

  const waterStressThreshold = gameConfig?.water_stress_threshold ?? 20;
  const waterStressSevereThreshold = gameConfig?.water_stress_severe_threshold ?? 30;
  const isWaterStressed = waterProximity != null && plantSp.waterAffinity !== 'none' && waterProximity > waterStressThreshold;
  const isSevereStress = waterProximity != null && waterProximity > waterStressSevereThreshold;
  const isFruiting = plant.stage === 5;

  return (
    <CollapsibleSection title="Growth Status" icon="📈" defaultOpen={true}>
      {nextThreshold != null && plant.stage >= 1 && plant.stage <= 4 && (
        <div className="mb-1">
          <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
            <span className="text-muted">📊 Stage Progress</span>
            <span>{formatTickDurationLabel(plant.age, ticksPerDay)} / {formatTickDurationLabel(nextThreshold, ticksPerDay)}</span>
          </div>
          <div className="entity-bar">
            <div className="entity-bar-fill" style={{
              width: `${Math.min(100, ((plant.age - prevThreshold) / Math.max(1, nextThreshold - prevThreshold)) * 100)}%`,
              background: '#88cc44',
            }} />
          </div>
        </div>
      )}
      {isFruiting && fruitSpoilAge > 0 && (
        <div className="mb-1">
          <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
            <span className="text-muted">🍂 Spoil Timer</span>
            <span>{formatTickDurationLabel(plant.age, ticksPerDay)} / {formatTickDurationLabel(fruitSpoilAge, ticksPerDay)}</span>
          </div>
          <div className="entity-bar">
            <div className="entity-bar-fill" style={{
              width: `${Math.min(100, (plant.age / fruitSpoilAge) * 100)}%`,
              background: plant.age > fruitSpoilAge * 0.8 ? '#ff6b6b' : '#cc8844',
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

export function PlantConsumers({ plantTypeId, plantStage }) {
  const consumers = useMemo(() => getPlantConsumers(plantTypeId, plantStage), [plantTypeId, plantStage]);
  if (consumers.length === 0) return null;

  return (
    <CollapsibleSection title={`Consumers (${consumers.length})`} icon="🐾" defaultOpen={false}>
      <div className="inspector-chip-list">
        {consumers.map((consumer) => (
          <span key={consumer.speciesId} style={{ background: '#1a2e1a', padding: '2px 7px', borderRadius: 4, border: '1px solid #2a4a2a', fontSize: '0.62rem' }}>
            {consumer.emoji} {consumer.name}
          </span>
        ))}
      </div>
    </CollapsibleSection>
  );
}
