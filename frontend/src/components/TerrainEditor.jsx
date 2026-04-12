/**
 * TerrainEditor — terrain palette and brush size for painting.
 */
import React from 'react';
import useSimStore from '../store/simulationStore';
import { TERRAIN_COLORS, TERRAIN_NAMES, WATER, SAND, DIRT, GRASS, ROCK } from '../utils/terrainColors';

const TERRAIN_TYPES = [WATER, SAND, DIRT, GRASS, ROCK];

function rgbaToHex([r, g, b]) {
  return `rgb(${r},${g},${b})`;
}

export default function TerrainEditor() {
  const { tool, paintTerrain, setPaintTerrain, brushSize, setBrushSize, placeEntityType, setPlaceEntityType } = useSimStore();

  if (tool === 'PAINT_TERRAIN') {
    return (
      <div className="sidebar-section">
        <h6>Terrain Brush</h6>
        <div className="terrain-palette mb-2">
          {TERRAIN_TYPES.map(t => (
            <div
              key={t}
              className={`terrain-swatch ${paintTerrain === t ? 'active' : ''}`}
              style={{ background: rgbaToHex(TERRAIN_COLORS[t]) }}
              title={TERRAIN_NAMES[t]}
              onClick={() => setPaintTerrain(t)}
            />
          ))}
        </div>
        <div className="mb-1">
          <label className="form-label small mb-0">Brush: {brushSize}px</label>
          <input type="range" className="form-range form-range-sm" min={1} max={10}
            value={brushSize} onChange={e => setBrushSize(+e.target.value)} />
        </div>
        <div className="small text-muted">Click/drag on map to paint terrain</div>
      </div>
    );
  }

  if (tool === 'PLACE_ENTITY') {
    return (
      <div className="sidebar-section">
        <h6>Place Entity</h6>
        <div className="d-flex flex-wrap gap-1">
          {['HERBIVORE', 'CARNIVORE', 'TREE', 'BUSH', 'GRASS_PLANT'].map(t => (
            <button
              key={t}
              className={`tool-btn ${placeEntityType === t ? 'active' : ''}`}
              onClick={() => setPlaceEntityType(t)}
            >
              {t === 'HERBIVORE' && '🐰 '}
              {t === 'CARNIVORE' && '🐺 '}
              {t === 'TREE' && '🌳 '}
              {t === 'BUSH' && '🌿 '}
              {t === 'GRASS_PLANT' && '🌱 '}
              {t.replace('_', ' ')}
            </button>
          ))}
        </div>
        <div className="small text-muted mt-2">Click on map to place</div>
      </div>
    );
  }

  if (tool === 'ERASE') {
    return (
      <div className="sidebar-section">
        <h6>Erase</h6>
        <div className="small text-muted">Click on an animal to remove it</div>
      </div>
    );
  }

  return null;
}
