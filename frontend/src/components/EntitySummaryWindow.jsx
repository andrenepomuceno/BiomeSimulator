import React, { useDeferredValue, useMemo, useState } from 'react';
import useSimStore from '../store/simulationStore';
import { SPECIES_INFO, STATE_NAMES, PLANT_STAGE_NAMES } from '../utils/terrainColors';
import { getPlantByTypeId } from '../engine/plantSpecies';

const TYPE_FILTERS = [
  { id: 'all', label: 'Todos' },
  { id: 'animal', label: 'Animais' },
  { id: 'plant', label: 'Plantas' },
];

function buildAnimalEntry(animal) {
  const info = SPECIES_INFO[animal.species] || { emoji: '🐾', name: animal.species || 'Unknown' };
  return {
    key: `A-${animal.id}`,
    entityType: 'animal',
    idLabel: `#${animal.id}`,
    speciesLabel: info.name,
    emoji: info.emoji,
    x: animal.x,
    y: animal.y,
    summary: `${STATE_NAMES[animal.state] || 'Unknown'} · HP ${Math.round(animal.hp)}`,
    searchable: `${info.name} ${animal.species || ''} ${animal.id}`.toLowerCase(),
    raw: animal,
  };
}

function buildPlantEntry(typeId, stage, x, y) {
  const plant = getPlantByTypeId(typeId);
  const speciesLabel = plant?.name || `Plant ${typeId}`;
  const stageLabel = PLANT_STAGE_NAMES[stage] || `Stage ${stage}`;
  const emoji = plant?.emoji?.adult || plant?.emoji?.youngSprout || '🌿';
  return {
    key: `P-${x}-${y}`,
    entityType: 'plant',
    idLabel: `P(${x},${y})`,
    speciesLabel,
    emoji,
    x,
    y,
    summary: `${stageLabel} · Tile (${x}, ${y})`,
    searchable: `${speciesLabel} p ${x} ${y} ${typeId}`.toLowerCase(),
    raw: { type: typeId, stage },
  };
}

function matchesActiveSelection(entry, selectedEntity, selectedTile) {
  if (entry.entityType === 'animal') {
    return selectedEntity?.id === entry.raw.id;
  }
  if (!selectedTile || !selectedTile.plant || selectedTile.plant.type === 0) return false;
  return selectedTile.x === entry.x && selectedTile.y === entry.y;
}

export default function EntitySummaryWindow({ open, onClose, onInspect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());

  const { animals, worldReady, plantSnapshot, mapWidth, mapHeight, selectedEntity, selectedTile } = useSimStore();

  const animalEntries = useMemo(() => {
    if (!open || !Array.isArray(animals) || animals.length === 0) return [];
    return animals.map(buildAnimalEntry);
  }, [open, animals]);

  const plantEntries = useMemo(() => {
    if (!open || mapWidth <= 0 || mapHeight <= 0) return [];
    const snapshot = plantSnapshot || worldReady;
    if (!snapshot?.plantType || !snapshot?.plantStage) return [];

    const plantType = snapshot.plantType;
    const plantStage = snapshot.plantStage;
    const count = Math.min(plantType.length, mapWidth * mapHeight);
    const entries = [];

    for (let i = 0; i < count; i++) {
      const typeId = plantType[i];
      if (!typeId) continue;
      const x = i % mapWidth;
      const y = (i / mapWidth) | 0;
      entries.push(buildPlantEntry(typeId, plantStage[i], x, y));
    }

    return entries;
  }, [open, worldReady, plantSnapshot, mapWidth, mapHeight]);

  const filteredEntries = useMemo(() => {
    const source = [];
    if (typeFilter === 'all' || typeFilter === 'animal') source.push(...animalEntries);
    if (typeFilter === 'all' || typeFilter === 'plant') source.push(...plantEntries);

    if (!deferredSearch) return source;
    return source.filter(entry => entry.searchable.includes(deferredSearch));
  }, [animalEntries, plantEntries, typeFilter, deferredSearch]);

  if (!open) return null;

  return (
    <div className="entity-summary-overlay" onClick={onClose}>
      <div className="entity-summary-modal" onClick={e => e.stopPropagation()}>
        <div className="entity-summary-header">
          <h5>Resumo de Entidades</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕</button>
        </div>

        <div className="entity-summary-controls">
          <input
            className="form-control form-control-sm"
            placeholder="Buscar por especie ou ID"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
          <div className="entity-summary-filter-row">
            {TYPE_FILTERS.map(filter => (
              <button
                key={filter.id}
                className={`entity-filter-btn ${typeFilter === filter.id ? 'active' : ''}`}
                onClick={() => setTypeFilter(filter.id)}
              >
                {filter.label}
              </button>
            ))}
            <span className="entity-summary-counter">
              {filteredEntries.length} / {animalEntries.length + plantEntries.length}
            </span>
          </div>
        </div>

        <div className="entity-summary-list" role="list">
          {filteredEntries.map(entry => {
            const active = matchesActiveSelection(entry, selectedEntity, selectedTile);
            return (
              <button
                key={entry.key}
                className={`entity-summary-item ${active ? 'active' : ''}`}
                onClick={() => onInspect?.(entry)}
              >
                <div className="entity-summary-item-top">
                  <span>{entry.emoji} {entry.speciesLabel}</span>
                  <span className="entity-summary-item-id">{entry.idLabel}</span>
                </div>
                <div className="entity-summary-item-sub">{entry.summary}</div>
              </button>
            );
          })}
          {filteredEntries.length === 0 && (
            <div className="entity-summary-empty">Nenhuma entidade encontrada para esse filtro.</div>
          )}
        </div>
      </div>
    </div>
  );
}
