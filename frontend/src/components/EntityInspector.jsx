/**
 * EntityInspector — shows details of selected entity or tile.
 */
import React, { useState } from 'react';
import useSimStore from '../store/simulationStore';
import { STATE_NAMES, LIFE_STAGE_NAMES, PLANT_TYPE_NAMES, PLANT_STAGE_NAMES, PLANT_SEX_NAMES, PLANT_TYPE_SEX, SPECIES_INFO, SEX_NAMES } from '../utils/terrainColors';
import ANIMAL_SPECIES from '../engine/animalSpecies';
import { getPlantByTypeId } from '../engine/plantSpecies';

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

function PlantAttributes({ typeId }) {
  const sp = getPlantByTypeId(typeId);
  if (!sp) return null;
  return (
    <CollapsibleSection title="Plant Attributes" icon="📋" defaultOpen={true}>
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
    </CollapsibleSection>
  );
}

function SpeciesAttributes({ species }) {
  const sp = ANIMAL_SPECIES[species];
  if (!sp) return null;

  const preyInfo = sp.diet === 'CARNIVORE'
    ? Object.keys(ANIMAL_SPECIES).filter(k => ANIMAL_SPECIES[k].diet === 'HERBIVORE')
    : sp.diet === 'OMNIVORE'
      ? Object.keys(ANIMAL_SPECIES).filter(k => ANIMAL_SPECIES[k].diet === 'HERBIVORE')
      : null;

  return (
    <CollapsibleSection title="Species Attributes" icon="📋" defaultOpen={true}>
      <div className="inspector-grid">
        <div className="stat-row"><span className="stat-label">🏃 Speed</span><span className="stat-value">{sp.speed}</span></div>
        <div className="stat-row"><span className="stat-label">👁️ Vision</span><span className="stat-value">{sp.vision_range}</span></div>
        <div className="stat-row"><span className="stat-label">⚡ Max Energy</span><span className="stat-value">{sp.max_energy}</span></div>
        <div className="stat-row"><span className="stat-label">⏳ Max Age</span><span className="stat-value">{sp.max_age}</span></div>
        <div className="stat-row"><span className="stat-label">🌱 Mature Age</span><span className="stat-value">{sp.mature_age}</span></div>
        <div className="stat-row"><span className="stat-label">⚔️ Attack</span><span className="stat-value">{sp.attack_power}</span></div>
        <div className="stat-row"><span className="stat-label">🛡️ Defense</span><span className="stat-value">{sp.defense}</span></div>
        <div className="stat-row"><span className="stat-label">🍖 Hunger Rate</span><span className="stat-value">{sp.hunger_rate}/tick</span></div>
        <div className="stat-row"><span className="stat-label">💧 Thirst Rate</span><span className="stat-value">{sp.thirst_rate}/tick</span></div>
        <div className="stat-row"><span className="stat-label">♻️ Reproduction</span><span className="stat-value">{sp.reproduction}</span></div>
      </div>
      {sp.life_stage_ages && (
        <>
          <h6 className="mt-2 mb-1" style={{ fontSize: '0.7rem' }}>🎂 Life Stage Ages</h6>
          <div style={{ fontSize: '0.65rem' }}>
            <div className="d-flex justify-content-between"><span className="text-muted">Baby → Young</span><span>{sp.life_stage_ages[0]} ticks</span></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Young → Young Adult</span><span>{sp.life_stage_ages[1]} ticks</span></div>
            <div className="d-flex justify-content-between"><span className="text-muted">Young Adult → Adult</span><span>{sp.life_stage_ages[2]} ticks</span></div>
          </div>
        </>
      )}
      {preyInfo && preyInfo.length > 0 && (
        <>
          <h6 className="mt-2 mb-1" style={{ fontSize: '0.7rem' }}>🎯 Prey</h6>
          <div style={{ fontSize: '0.65rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {preyInfo.map(k => (
              <span key={k} style={{ background: '#1a1a3e', padding: '1px 6px', borderRadius: 4 }}>
                {SPECIES_INFO[k]?.emoji} {SPECIES_INFO[k]?.name}
              </span>
            ))}
          </div>
        </>
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

export default function EntityInspector() {
  const { selectedEntity, selectedTile, clearSelection } = useSimStore();

  if (selectedEntity) {
    const e = selectedEntity;
    const info = SPECIES_INFO[e.species] || { emoji: '❓', name: e.species, diet: e.diet || '?' };
    const sp = ANIMAL_SPECIES[e.species];
    const maxHunger = sp?.max_hunger || 100;
    const maxThirst = sp?.max_thirst || 100;
    const maxEnergy = sp?.max_energy || 100;
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
          <div className="stat-row">
            <span className="stat-label">Diet</span>
            <span className="stat-value" style={{ color: info.diet === 'Carnivore' ? '#dd4444' : info.diet === 'Omnivore' ? '#cc8844' : '#66cc66' }}>
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
            <span className="stat-value">({e.x}, {e.y})</span>
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

        {/* Cooldowns */}
        {(e.mateCooldown > 0 || e.attackCooldown > 0) && (
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
          </CollapsibleSection>
        )}

        {/* Species attributes */}
        <SpeciesAttributes species={e.species} />
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
