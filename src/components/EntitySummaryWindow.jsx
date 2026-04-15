import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import useSimStore from '../store/simulationStore';
import { SPECIES_INFO, STATE_NAMES, PLANT_STAGE_NAMES } from '../utils/terrainColors';
import { getPlantByTypeId } from '../engine/plantSpecies';
import {
  buildEntitySummaryGroups,
  matchesActiveSelection,
} from './entitySummaryGroups';
import { useModalA11y } from '../hooks/useModalA11y.js';

// --- Virtualization constants ---
// Items taller than this threshold get a virtual scroll body instead of full DOM render
const VIRTUAL_THRESHOLD = 80;
// Max plant tiles to build entries for (prevents O(N²) work on huge worlds)
const MAX_PLANT_ENTRIES = 5000;
// Fixed row height: min-height(58) + flex gap(8) = 66px
const ITEM_HEIGHT = 66;
const OVERSCAN = 3;

const TYPE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'animal', label: 'Animals' },
  { id: 'plant', label: 'Plants' },
];

const ENTITY_TYPE_LABELS = {
  animal: 'Animal',
  plant: 'Plant',
};

// --- Sub-components ---

function EntityItem({ entry, active, onInspect }) {
  return (
    <div
      className={`entity-summary-item${active ? ' active' : ''}`}
      onClick={() => onInspect?.(entry)}
      onKeyDown={ev => handleActionKeyDown(ev, () => onInspect?.(entry))}
      role="button"
      tabIndex={0}
    >
      <span className="entity-summary-item-label">{entry.emoji} {entry.speciesLabel}</span>
      <span className="entity-summary-item-id">{entry.idLabel}</span>
      <span className="entity-summary-item-sub">{entry.summary}</span>
    </div>
  );
}

/**
 * VirtualGroupBody — renders only the visible slice of a large entry list.
 * Uses padding-top/bottom spacers so the scroll container has the correct total height
 * without rendering every DOM node.
 */
function VirtualGroupBody({ entries, selectedEntity, selectedTile, onInspect }) {
  const ref = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  // Safe constant: max-height from CSS is min(42vh, 520px). 520px is the upper bound.
  const CONTAINER_H = 520;

  const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - OVERSCAN);
  const end = Math.min(entries.length, Math.ceil((scrollTop + CONTAINER_H) / ITEM_HEIGHT) + OVERSCAN);
  const visible = entries.slice(start, end);
  const topPad = start * ITEM_HEIGHT;
  const botPad = Math.max(0, (entries.length - end) * ITEM_HEIGHT);

  return (
    <div
      ref={ref}
      className="entity-summary-group-body"
      role="list"
      style={{ paddingTop: topPad, paddingBottom: botPad }}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
    >
      {visible.map(entry => (
        <EntityItem
          key={entry.key}
          entry={entry}
          active={matchesActiveSelection(entry, selectedEntity, selectedTile)}
          onInspect={onInspect}
        />
      ))}
    </div>
  );
}

function FlatGroupBody({ entries, selectedEntity, selectedTile, onInspect }) {
  return (
    <div className="entity-summary-group-body" role="list">
      {entries.map(entry => (
        <EntityItem
          key={entry.key}
          entry={entry}
          active={matchesActiveSelection(entry, selectedEntity, selectedTile)}
          onInspect={onInspect}
        />
      ))}
    </div>
  );
}

function handleActionKeyDown(event, action) {
  if (event.key !== 'Enter' && event.key !== ' ') return;
  event.preventDefault();
  action();
}

function buildAnimalEntry(animal) {
  const info = SPECIES_INFO[animal.species] || { emoji: '🐾', name: animal.species || 'Unknown' };
  return {
    key: `A-${animal.id}`,
    entityType: 'animal',
    groupKey: `animal:${animal.species || info.name}`,
    groupLabel: info.name,
    groupEmoji: info.emoji,
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
    groupKey: `plant:${typeId}`,
    groupLabel: speciesLabel,
    groupEmoji: emoji,
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

export default function EntitySummaryWindow({ open, onClose, onInspect }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  // Set of group keys that are manually expanded
  const [openGroups, setOpenGroups] = useState(() => new Set());
  const modalRef = useRef(null);
  const deferredSearch = useDeferredValue(searchTerm.trim().toLowerCase());

  useModalA11y({ open, onClose, containerRef: modalRef });

  const { animals, worldReady, plantSnapshot, mapWidth, mapHeight, selectedEntity, selectedTile } = useSimStore();

  const animalEntries = useMemo(() => {
    if (!open || !Array.isArray(animals) || animals.length === 0) return [];
    return animals.map(buildAnimalEntry);
  }, [open, animals]);

  const { plantEntries, plantTruncated } = useMemo(() => {
    if (!open || mapWidth <= 0 || mapHeight <= 0) return { plantEntries: [], plantTruncated: false };
    const snapshot = plantSnapshot || worldReady;
    if (!snapshot?.plantType || !snapshot?.plantStage) return { plantEntries: [], plantTruncated: false };

    const plantType = snapshot.plantType;
    const plantStage = snapshot.plantStage;
    const count = Math.min(plantType.length, mapWidth * mapHeight);
    const entries = [];

    for (let i = 0; i < count; i++) {
      const typeId = plantType[i];
      if (!typeId) continue;
      if (entries.length >= MAX_PLANT_ENTRIES) {
        return { plantEntries: entries, plantTruncated: true };
      }
      const x = i % mapWidth;
      const y = (i / mapWidth) | 0;
      entries.push(buildPlantEntry(typeId, plantStage[i], x, y));
    }

    return { plantEntries: entries, plantTruncated: false };
  }, [open, worldReady, plantSnapshot, mapWidth, mapHeight]);

  const filteredEntries = useMemo(() => {
    const source = [];
    if (typeFilter === 'all' || typeFilter === 'animal') source.push(...animalEntries);
    if (typeFilter === 'all' || typeFilter === 'plant') source.push(...plantEntries);

    if (!deferredSearch) return source;
    return source.filter(entry => entry.searchable.includes(deferredSearch));
  }, [animalEntries, plantEntries, typeFilter, deferredSearch]);

  const groupedEntries = useMemo(
    () => buildEntitySummaryGroups(filteredEntries, selectedEntity, selectedTile),
    [filteredEntries, selectedEntity, selectedTile]
  );

  // Auto-expand groups that contain the active selection
  const activeGroupKeys = useMemo(() => {
    const keys = new Set();
    for (const g of groupedEntries) {
      if (g.hasActive) keys.add(g.key);
    }
    return keys;
  }, [groupedEntries]);

  useEffect(() => {
    if (activeGroupKeys.size === 0) return;
    setOpenGroups(prev => {
      let changed = false;
      const next = new Set(prev);
      for (const k of activeGroupKeys) {
        if (!next.has(k)) { next.add(k); changed = true; }
      }
      return changed ? next : prev;
    });
  }, [activeGroupKeys]);

  function toggleGroup(key) {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  }

  const hasSearch = deferredSearch.length > 0;
  const totalEntries = animalEntries.length + plantEntries.length;

  if (!open) return null;

  return (
    <div className="entity-summary-overlay" onClick={onClose}>
      <div className="entity-summary-modal" ref={modalRef} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="entity-summary-title" tabIndex={-1}>
        <div className="entity-summary-header">
          <h5 id="entity-summary-title">Entity Summary</h5>
          <button className="btn btn-sm btn-outline-secondary" onClick={onClose}>✕</button>
        </div>

        <div className="entity-summary-controls">
          <input
            className="form-control form-control-sm"
            placeholder="Search by species or ID"
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
              {filteredEntries.length} / {totalEntries} entities · {groupedEntries.length} groups
            </span>
          </div>
          {plantTruncated && (
            <div className="entity-summary-truncation-note">
              ⚠️ Plant list capped at {MAX_PLANT_ENTRIES.toLocaleString()} entries for performance. Use search or the Plants tab in the Stats panel for full counts.
            </div>
          )}
        </div>

        <div className="entity-summary-list" role="list">
          {groupedEntries.map(group => {
            const isOpen = hasSearch || openGroups.has(group.key) || group.hasActive;
            return (
              <div
                key={group.key}
                className={`entity-summary-group${group.hasActive ? ' has-active' : ''}${isOpen ? ' open' : ''}`}
                role="listitem"
              >
                <div
                  className="entity-summary-group-summary"
                  onClick={() => toggleGroup(group.key)}
                  onKeyDown={ev => handleActionKeyDown(ev, () => toggleGroup(group.key))}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isOpen}
                >
                  <span className="entity-summary-group-main">
                    <span className="entity-summary-group-label">{group.emoji} {group.label}</span>
                    <span className="entity-summary-group-meta">
                      {ENTITY_TYPE_LABELS[group.entityType]}
                      {group.hasActive ? ' · selected' : ''}
                    </span>
                  </span>
                  <span className="entity-summary-group-badge">{group.count}</span>
                </div>

                {isOpen && (
                  group.entries.length > VIRTUAL_THRESHOLD
                    ? <VirtualGroupBody entries={group.entries} selectedEntity={selectedEntity} selectedTile={selectedTile} onInspect={onInspect} />
                    : <FlatGroupBody entries={group.entries} selectedEntity={selectedEntity} selectedTile={selectedTile} onInspect={onInspect} />
                )}
              </div>
            );
          })}
          {groupedEntries.length === 0 && (
            <div className="entity-summary-empty">No entities found for this filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
