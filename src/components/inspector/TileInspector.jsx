import React, { useEffect, useState } from 'react';
import { PLANT_SEX_NAMES, PLANT_STAGE_NAMES, PLANT_TYPE_NAMES, PLANT_TYPE_SEX, SPECIES_INFO, TERRAIN_NAMES as TERRAIN_DISPLAY_NAMES } from '../../utils/terrainColors';
import { AnimalStatusBadge } from './AnimalInspector.jsx';
import { CollapsibleSection } from './InspectorShared.jsx';
import { PlantAttributes, PlantConsumers, PlantLogEntry, PlantStageProgress } from './PlantInspectorPanels.jsx';

const ITEM_TYPE_EMOJIS = { 1: '🥩', 2: '🍑', 3: '🌰' };
const ITEM_TYPE_NAMES_MAP = { 1: 'Meat', 2: 'Fruit', 3: 'Seed' };

function TileItems({ items, onSelectItem }) {
  if (!items || items.length === 0) return null;
  return (
    <CollapsibleSection title={`Ground Items (${items.length})`} icon="📦" defaultOpen={true}>
      {items.map((item) => {
        const emoji = ITEM_TYPE_EMOJIS[item.type] || '📦';
        const name = ITEM_TYPE_NAMES_MAP[item.type] || 'Item';
        const sourceInfo = item.type === 1
          ? (SPECIES_INFO[item.source]?.emoji ? `${SPECIES_INFO[item.source].emoji} ${SPECIES_INFO[item.source].name}` : item.source)
          : (PLANT_TYPE_NAMES[item.source] || null);
        return (
          <div
            key={item.id}
            className="d-flex align-items-center gap-1 mb-1"
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}
            onClick={() => onSelectItem?.(item)}
          >
            <span style={{ fontSize: '0.85rem' }}>{emoji}</span>
            <span style={{ flex: 1, fontSize: '0.68rem' }}>
              {name}
              {sourceInfo && <span style={{ color: '#666' }}> · {sourceInfo}</span>}
            </span>
            <span style={{ fontSize: '0.6rem', color: '#666' }}>#{item.id}</span>
          </div>
        );
      })}
    </CollapsibleSection>
  );
}

function TileOccupants({ animals, onSelectAnimal }) {
  if (!animals || animals.length === 0) return null;

  const alive = animals.filter((animal) => animal.alive);
  const corpses = animals.filter((animal) => !animal.alive);

  return (
    <CollapsibleSection title={`Occupants (${animals.length})`} icon="🐾" defaultOpen={true}>
      {alive.map((animal) => {
        const info = SPECIES_INFO[animal.species] || { emoji: '❓', name: animal.species };
        const hpPct = Math.max(0, Math.min(100, (animal.hp / (animal.maxHp || 100)) * 100));
        return (
          <div
            key={animal.id}
            className="d-flex align-items-center gap-1 mb-1"
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 4, background: 'rgba(255,255,255,0.03)' }}
            onClick={() => onSelectAnimal(animal)}
          >
            <span style={{ fontSize: '0.8rem' }}>{animal.lifeStage === -1 ? '🥚' : info.emoji}</span>
            <span style={{ flex: 1, fontSize: '0.68rem' }}>
              {info.name} <span style={{ color: '#666' }}>#{animal.id}</span>
            </span>
            <AnimalStatusBadge state={animal.state} alive={animal.alive} />
            <div style={{ width: 40 }}>
              <div className="entity-bar" style={{ height: 4 }}>
                <div className="entity-bar-fill" style={{ width: `${hpPct}%`, background: '#ff4757' }} />
              </div>
            </div>
          </div>
        );
      })}
      {corpses.map((animal) => {
        const info = SPECIES_INFO[animal.species] || { emoji: '❓', name: animal.species };
        return (
          <div
            key={animal.id}
            className="d-flex align-items-center gap-1 mb-1"
            style={{ cursor: 'pointer', padding: '2px 4px', borderRadius: 4, background: 'rgba(255,255,255,0.02)', opacity: 0.6 }}
            onClick={() => onSelectAnimal(animal)}
          >
            <span style={{ fontSize: '0.8rem' }}>💀</span>
            <span style={{ flex: 1, fontSize: '0.68rem' }}>
              {info.name} <span style={{ color: '#666' }}>#{animal.id}</span>
            </span>
            <AnimalStatusBadge state={animal.state} alive={animal.alive} />
          </div>
        );
      })}
    </CollapsibleSection>
  );
}

function TileNeighborhood({ neighbors, neighborPlants, waterAdjacent, adjacentPlants }) {
  if (!neighbors || neighbors.length < 9) return null;

  return (
    <CollapsibleSection title="Neighborhood" icon="🏘️" defaultOpen={false}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 2, marginBottom: 4, fontSize: '0.6rem', textAlign: 'center' }}>
        {neighbors.map((terrainId, index) => {
          const name = terrainId >= 0 ? (TERRAIN_DISPLAY_NAMES[terrainId] || '?') : '—';
          const isCenter = index === 4;
          const plant = neighborPlants?.[index];
          const hasPlant = !!(plant && plant.type);
          return (
            <div
              key={index}
              style={{
                background: isCenter ? 'rgba(136,204,68,0.15)' : 'rgba(255,255,255,0.04)',
                border: isCenter ? '1px solid rgba(136,204,68,0.3)' : '1px solid rgba(255,255,255,0.06)',
                borderRadius: 3,
                padding: '2px 1px',
                lineHeight: 1.05,
              }}
            >
              <div>{name}</div>
              <div style={{ fontSize: '0.58rem', color: hasPlant ? '#88cc44' : '#666' }}>
                {hasPlant ? '🌿 Plant' : '·'}
              </div>
            </div>
          );
        })}
      </div>
      <div className="stat-row"><span className="stat-label">🌿 Adjacent Plants</span><span className="stat-value">{adjacentPlants ?? '?'}</span></div>
      <div className="stat-row"><span className="stat-label">💧 Water Adjacent</span><span className="stat-value" style={{ color: waterAdjacent ? '#4d96ff' : '#666' }}>{waterAdjacent ? 'Yes' : 'No'}</span></div>
    </CollapsibleSection>
  );
}

export default function TileInspector({ tile, clearSelection, onFocusEntity, requestAnimalDetail, setSelectedEntity, setSelectedItem, clock, gameConfig, effectivePlantStageAges, effectivePlantFruitSpoilAges, ticksPerDay, getPlantByTypeId }) {
  const [tileTab, setTileTab] = useState('terrain');
  const [plantTab, setPlantTab] = useState('info');
  const hasPlant = tile.plant && tile.plant.type !== 0 && tile.plant.type !== 'none';
  const hasAnimals = tile.animals && tile.animals.length > 0;
  const hasItems = tile.items && tile.items.length > 0;
  const plantSpecies = hasPlant ? getPlantByTypeId(tile.plant.type) : null;
  const plantEmoji = hasPlant && plantSpecies && plantSpecies.emoji
    ? (tile.plant.stage === 1 ? plantSpecies.emoji.seed
      : tile.plant.stage === 2 ? plantSpecies.emoji.youngSprout
      : tile.plant.stage === 3 ? plantSpecies.emoji.adultSprout
      : tile.plant.stage === 4 ? plantSpecies.emoji.adult
      : tile.plant.stage === 5 ? plantSpecies.emoji.fruit
      : tile.plant.stage === 6 ? '💀'
      : '🌿')
    : '🌿';
  const stageAges = hasPlant && plantSpecies ? effectivePlantStageAges[tile.plant.type] : null;
  const maxPlantAge = stageAges?.length ? (stageAges[stageAges.length - 1] || 1) : 1;

  useEffect(() => {
    const hasCurrentPlant = tile.plant && tile.plant.type !== 0 && tile.plant.type !== 'none';
    const hasCurrentAnimals = tile.animals && tile.animals.length > 0;
    setTileTab(hasCurrentPlant ? 'plant' : hasCurrentAnimals ? 'animals' : 'terrain');
    setPlantTab('info');
  }, [tile.x, tile.y]);

  useEffect(() => {
    if (tileTab === 'plant' && !hasPlant) {
      setTileTab(hasAnimals ? 'animals' : hasItems ? 'items' : 'terrain');
      return;
    }
    if (tileTab === 'animals' && !hasAnimals) {
      setTileTab(hasPlant ? 'plant' : hasItems ? 'items' : 'terrain');
    }
    if (tileTab === 'items' && !hasItems) {
      setTileTab(hasPlant ? 'plant' : hasAnimals ? 'animals' : 'terrain');
    }
  }, [tileTab, hasPlant, hasAnimals, hasItems]);

  const handleSelectAnimal = (animal) => {
    setSelectedEntity(animal);
    requestAnimalDetail?.(animal.id);
  };

  const tileTabs = [
    { key: 'terrain', label: '🗺️ Terrain' },
    ...(hasPlant ? [{ key: 'plant', label: `${plantEmoji} Plant` }] : []),
    ...(hasAnimals ? [{ key: 'animals', label: `🐾 (${tile.animals.length})` }] : []),
    ...(hasItems ? [{ key: 'items', label: `📦 (${tile.items.length})` }] : []),
  ];
  const plantSubTabs = [
    { key: 'info', label: 'Info' },
    { key: 'growth', label: 'Growth' },
    { key: 'consumers', label: 'Consumers' },
    ...(tile.plant?.log?.length > 0 ? [{ key: 'log', label: 'Log' }] : []),
  ];

  return (
    <div className="sidebar-section entity-info">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Tile ({tile.x}, {tile.y})</h6>
        <div className="d-flex align-items-center gap-1">
          <button
            className="btn btn-sm btn-outline-info py-0 px-2"
            onClick={() => onFocusEntity?.(tile)}
            disabled={!Number.isFinite(tile.x) || !Number.isFinite(tile.y)}
          >
            Focus
          </button>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>
      </div>

      {tileTabs.length > 1 && (
        <div className="inspector-tabs" role="tablist" aria-label="Tile sections" style={{ gridTemplateColumns: `repeat(${tileTabs.length}, minmax(0, 1fr))` }}>
          {tileTabs.map((tab) => (
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

      {(tileTab === 'terrain' || tileTabs.length === 1) && (
        <div className="inspector-tab-panel">
          <div className="stat-row mt-1"><span className="stat-label">Type</span><span className="stat-value" style={{ textTransform: 'capitalize' }}>{tile.terrain}</span></div>
          <div className="stat-row"><span className="stat-label">Water Distance</span><span className="stat-value">{tile.waterProximity} tiles</span></div>
          {tile.waterAdjacent != null && (
            <div className="stat-row"><span className="stat-label">Water Adjacent</span><span className="stat-value" style={{ color: tile.waterAdjacent ? '#4d96ff' : '#666' }}>{tile.waterAdjacent ? 'Yes' : 'No'}</span></div>
          )}
          <TileNeighborhood
            neighbors={tile.neighbors}
            neighborPlants={tile.neighborPlants}
            waterAdjacent={tile.waterAdjacent}
            adjacentPlants={tile.adjacentPlants}
          />
          {!hasPlant && !hasAnimals && <div className="mt-2 small text-muted" style={{ fontStyle: 'italic' }}>No plants or animals on this tile.</div>}
        </div>
      )}

      {tileTab === 'plant' && hasPlant && (
        <div className="inspector-tab-panel">
          <div className="inspector-tabs" role="tablist" aria-label="Plant sections" style={{ gridTemplateColumns: `repeat(${plantSubTabs.length}, minmax(0, 1fr))`, marginTop: 4 }}>
            {plantSubTabs.map((tab) => (
              <button
                key={tab.key}
                className={`inspector-tab${plantTab === tab.key ? ' active' : ''}`}
                onClick={() => setPlantTab(tab.key)}
                role="tab"
                aria-selected={plantTab === tab.key}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {plantTab === 'info' && (
            <>
              <div className="stat-row mt-1"><span className="stat-label">Species</span><span className="stat-value">{PLANT_TYPE_NAMES[tile.plant.type] || tile.plant.type}</span></div>
              <div className="stat-row"><span className="stat-label">Sex</span><span className="stat-value">{PLANT_SEX_NAMES[PLANT_TYPE_SEX[tile.plant.type]] || 'Unknown'}</span></div>
              <div className="stat-row"><span className="stat-label">Stage</span><span className="stat-value">{PLANT_STAGE_NAMES[tile.plant.stage] || tile.plant.stage}</span></div>
              <div className="mt-1">
                <div className="d-flex justify-content-between" style={{ fontSize: '0.7rem' }}>
                  <span className="text-muted">⏳ Age</span>
                  <span>{tile.plant.age} ticks</span>
                </div>
                <div className="entity-bar">
                  <div className="entity-bar-fill" style={{ width: `${Math.min(100, (tile.plant.age / maxPlantAge) * 100)}%`, background: tile.plant.stage === 6 ? '#666' : '#88cc44' }} />
                </div>
              </div>
              {tile.plant.stage === 5 && <div className="stat-row"><span className="stat-label">Status</span><span className="stat-value" style={{ color: '#ff8844' }}>🍎 Fruiting</span></div>}
              {tile.plant.stage === 6 && <div className="stat-row"><span className="stat-label">Status</span><span className="stat-value" style={{ color: '#666' }}>💀 Dead</span></div>}
              <PlantAttributes typeId={tile.plant.type} terrain={tile.terrain} stage={tile.plant.stage} clock={clock} gameConfig={gameConfig} />
            </>
          )}

          {plantTab === 'growth' && (
            <PlantStageProgress
              plant={tile.plant}
              plantSp={plantSpecies}
              waterProximity={tile.waterProximity}
              adjacentPlants={tile.adjacentPlants}
              clock={clock}
              gameConfig={gameConfig}
              stageAges={effectivePlantStageAges[tile.plant.type] || []}
              fruitSpoilAge={effectivePlantFruitSpoilAges[tile.plant.type] || 0}
              ticksPerDay={ticksPerDay}
            />
          )}

          {plantTab === 'consumers' && <PlantConsumers plantTypeId={tile.plant.type} plantStage={tile.plant.stage} />}

          {plantTab === 'log' && tile.plant.log && tile.plant.log.length > 0 && (
            <div className="inspector-log-list mt-1" style={{ maxHeight: 200, overflowY: 'auto' }}>
              {[...tile.plant.log].reverse().map((event, index) => (
                <PlantLogEntry key={index} event={event} ticksPerDay={ticksPerDay} />
              ))}
            </div>
          )}
        </div>
      )}

      {tileTab === 'animals' && (
        <div className="inspector-tab-panel">
          <TileOccupants animals={tile.animals} onSelectAnimal={handleSelectAnimal} />
        </div>
      )}

      {tileTab === 'items' && (
        <div className="inspector-tab-panel">
          <TileItems items={tile.items} onSelectItem={setSelectedItem} />
        </div>
      )}
    </div>
  );
}
