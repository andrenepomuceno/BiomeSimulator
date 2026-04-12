/**
 * EntityInspector — shows details of selected entity or tile.
 */
import React, { useState } from 'react';
import useSimStore from '../store/simulationStore';
import { STATE_NAMES, LIFE_STAGE_NAMES, PLANT_TYPE_NAMES, PLANT_STAGE_NAMES, PLANT_SEX_NAMES, PLANT_TYPE_SEX, SPECIES_INFO, SEX_NAMES } from '../utils/terrainColors';
import ANIMAL_SPECIES from '../engine/animalSpecies';
import { getPlantByTypeId } from '../engine/plantSpecies';

function Bar({ label, value, max, color, description }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div className="mb-1">
      <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
        <span className="text-muted">{label}</span>
        <span>{Math.round(value)}/{max}</span>
      </div>
      <div className="entity-bar">
        <div className="entity-bar-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      {description && <div className="text-muted" style={{ fontSize: '0.6rem', marginTop: 1 }}>{description}</div>}
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
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1px 6px', fontSize: '0.65rem' }}>
      {Object.entries(costs).map(([action, cost]) => (
        <div key={action} className="d-flex justify-content-between">
          <span className="text-muted">{ACTION_LABELS[action] || action}</span>
          <span style={{ color: cost < 0 ? '#4ecdc4' : '#ff6b6b' }}>{cost > 0 ? `-${cost}` : `+${Math.abs(cost)}`}</span>
        </div>
      ))}
    </div>
  );
}

const STAGE_LABELS = ['Seed', 'Young Sprout', 'Adult Sprout', 'Adult', 'Fruit'];
const WATER_AFFINITY_LABELS = { low: '🏜️ Low', medium: '💧 Medium', high: '🌊 High' };

function PlantAttributes({ typeId }) {
  const [open, setOpen] = useState(false);
  const sp = getPlantByTypeId(typeId);
  if (!sp) return null;
  return (
    <div className="mt-2">
      <div
        className="d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <h6 className="mb-0" style={{ fontSize: '0.75rem' }}>📋 Plant Attributes</h6>
        <span style={{ fontSize: '0.7rem' }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="mt-1">
          <div className="stat-row"><span className="stat-label">Reproduction</span><span className="stat-value">{sp.reproduction} ({sp.sex})</span></div>
          <div className="stat-row"><span className="stat-label">Water Affinity</span><span className="stat-value">{WATER_AFFINITY_LABELS[sp.waterAffinity] || sp.waterAffinity}</span></div>
          <div className="stat-row"><span className="stat-label">Production Chance</span><span className="stat-value">{(sp.productionChance * 100).toFixed(1)}%/tick</span></div>
          <div className="stat-row"><span className="stat-label">Fruit Spoil Age</span><span className="stat-value">{sp.fruitSpoilAge} ticks</span></div>
          <h6 className="mt-2 mb-1" style={{ fontSize: '0.7rem' }}>🌱 Growth Stages</h6>
          <div style={{ fontSize: '0.65rem' }}>
            {sp.stageAges.map((age, i) => (
              <div key={i} className="d-flex justify-content-between">
                <span className="text-muted">{STAGE_LABELS[i]} → {STAGE_LABELS[i + 1] || 'Dead'}</span>
                <span>{age} ticks</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SpeciesAttributes({ species }) {
  const [open, setOpen] = useState(false);
  const sp = ANIMAL_SPECIES[species];
  if (!sp) return null;
  return (
    <div className="mt-2">
      <div
        className="d-flex justify-content-between align-items-center"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen(o => !o)}
      >
        <h6 className="mb-0" style={{ fontSize: '0.75rem' }}>📋 Species Attributes</h6>
        <span style={{ fontSize: '0.7rem' }}>{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="mt-1">
          <div className="stat-row"><span className="stat-label">Speed</span><span className="stat-value">{sp.speed}</span></div>
          <div className="stat-row"><span className="stat-label">Vision Range</span><span className="stat-value">{sp.vision_range}</span></div>
          <div className="stat-row"><span className="stat-label">Max Energy</span><span className="stat-value">{sp.max_energy}</span></div>
          <div className="stat-row"><span className="stat-label">Max Age</span><span className="stat-value">{sp.max_age}</span></div>
          <div className="stat-row"><span className="stat-label">Mature Age</span><span className="stat-value">{sp.mature_age}</span></div>
          <div className="stat-row"><span className="stat-label">Attack Power</span><span className="stat-value">{sp.attack_power}</span></div>
          <div className="stat-row"><span className="stat-label">Defense</span><span className="stat-value">{sp.defense}</span></div>
          <div className="stat-row"><span className="stat-label">Hunger Rate</span><span className="stat-value">{sp.hunger_rate}/tick</span></div>
          <div className="stat-row"><span className="stat-label">Thirst Rate</span><span className="stat-value">{sp.thirst_rate}/tick</span></div>
          <h6 className="mt-2 mb-1" style={{ fontSize: '0.7rem' }}>⚡ Energy Costs</h6>
          <EnergyCostTable costs={sp.energy_costs} />
        </div>
      )}
    </div>
  );
}

export default function EntityInspector() {
  const { selectedEntity, selectedTile, clearSelection } = useSimStore();

  if (selectedEntity) {
    const e = selectedEntity;
    const info = SPECIES_INFO[e.species] || { emoji: '❓', name: e.species, diet: e.diet || '?' };
    return (
      <div className="sidebar-section entity-info">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">
            {info.emoji} {info.name} #{e.id}
          </h6>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>
        <div className="stat-row">
          <span className="stat-label">Diet</span>
          <span className="stat-value">{info.diet}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Sex</span>
          <span className="stat-value">{SEX_NAMES[e.sex] || e.sex || 'Unknown'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">State</span>
          <span className="stat-value">{STATE_NAMES[e.state] || 'Unknown'}</span>
        </div>
        <div className="text-muted" style={{ fontSize: '0.6rem', marginBottom: 4 }}>Current behavior of this entity</div>
        {e.state !== 9 && (
          <div className="stat-row">
            <span className="stat-label">Life Stage</span>
            <span className="stat-value">{LIFE_STAGE_NAMES[e.lifeStage] || 'Unknown'}</span>
          </div>
        )}
        <div className="stat-row">
          <span className="stat-label">Position</span>
          <span className="stat-value">({e.x}, {e.y})</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Age</span>
          <span className="stat-value">{e.age}</span>
        </div>
        <Bar label="⚡ Energy" value={e.energy} max={ANIMAL_SPECIES[e.species]?.max_energy || 100} color="#4ecdc4" />
        <Bar label="🍖 Hunger" value={e.hunger} max={100} color="#ff6b6b" />
        <Bar label="💧 Thirst" value={e.thirst} max={100} color="#4d96ff" />
        <SpeciesAttributes species={e.species} />
      </div>
    );
  }

  if (selectedTile) {
    const t = selectedTile;
    return (
      <div className="sidebar-section entity-info">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">Tile ({t.x}, {t.y})</h6>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>
        <div className="stat-row">
          <span className="stat-label">Terrain</span>
          <span className="stat-value" style={{ textTransform: 'capitalize' }}>{t.terrain}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Water Distance</span>
          <span className="stat-value">{t.waterProximity} tiles</span>
        </div>
        {t.plant && t.plant.type !== 0 && t.plant.type !== 'none' && (
          <>
            <h6 className="mt-2">🌿 Plant</h6>
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
            <div className="stat-row">
              <span className="stat-label">Age</span>
              <span className="stat-value">{t.plant.age} ticks</span>
            </div>
            {t.plant.stage === 5 && (
              <div className="stat-row">
                <span className="stat-label">Has Fruit</span>
                <span className="stat-value">🍎 Yes</span>
              </div>
            )}
            <PlantAttributes typeId={t.plant.type} />
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
