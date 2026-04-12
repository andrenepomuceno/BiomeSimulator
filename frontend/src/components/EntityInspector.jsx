/**
 * EntityInspector — shows details of selected entity or tile.
 */
import React from 'react';
import useSimStore from '../store/simulationStore';
import { STATE_NAMES } from '../utils/terrainColors';

function Bar({ label, value, max, color }) {
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
    </div>
  );
}

export default function EntityInspector() {
  const { selectedEntity, selectedTile, clearSelection } = useSimStore();

  if (selectedEntity) {
    const e = selectedEntity;
    return (
      <div className="sidebar-section entity-info">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h6 className="mb-0">
            {e.species === 'HERBIVORE' ? '🐰' : '🐺'} {e.species} #{e.id}
          </h6>
          <button className="btn btn-sm btn-outline-secondary py-0 px-1" onClick={clearSelection}>✕</button>
        </div>
        <div className="stat-row">
          <span className="stat-label">State</span>
          <span className="stat-value">{STATE_NAMES[e.state] || 'Unknown'}</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Position</span>
          <span className="stat-value">({e.x}, {e.y})</span>
        </div>
        <div className="stat-row">
          <span className="stat-label">Age</span>
          <span className="stat-value">{e.age}</span>
        </div>
        <Bar label="Energy" value={e.energy} max={100} color="#4ecdc4" />
        <Bar label="Hunger" value={e.hunger} max={100} color="#ff6b6b" />
        <Bar label="Thirst" value={e.thirst} max={100} color="#4d96ff" />
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
          <span className="stat-value">{t.water_proximity} tiles</span>
        </div>
        {t.plant && t.plant.type !== 'none' && (
          <>
            <h6 className="mt-2">Plant</h6>
            <div className="stat-row">
              <span className="stat-label">Type</span>
              <span className="stat-value" style={{ textTransform: 'capitalize' }}>{t.plant.type}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Stage</span>
              <span className="stat-value" style={{ textTransform: 'capitalize' }}>{t.plant.stage}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Age</span>
              <span className="stat-value">{t.plant.age}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Has Fruit</span>
              <span className="stat-value">{t.plant.fruit ? '🍎 Yes' : 'No'}</span>
            </div>
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
