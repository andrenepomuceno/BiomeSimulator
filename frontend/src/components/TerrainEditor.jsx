/**
 * TerrainEditor — terrain palette and brush size for painting.
 */
import React from 'react';
import useSimStore from '../store/simulationStore';
import { TERRAIN_COLORS, TERRAIN_NAMES, WATER, SAND, DIRT, GRASS, ROCK, SPECIES_INFO, PLANT_TYPE_NAMES } from '../utils/terrainColors';

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
    const ANIMAL_TYPES = Object.keys(SPECIES_INFO);
    const PLANT_PLACE_TYPES = [
      { key: 'GRASS_PLANT', emoji: '🌱', label: 'Grass' },
      { key: 'STRAWBERRY', emoji: '🍓', label: 'Strawberry' },
      { key: 'BLUEBERRY', emoji: '🫐', label: 'Blueberry' },
      { key: 'APPLE_TREE', emoji: '🍎', label: 'Apple Tree' },
      { key: 'MANGO_TREE', emoji: '🥭', label: 'Mango Tree' },
      { key: 'CARROT', emoji: '🥕', label: 'Carrot' },
    ];
    return (
      <div className="sidebar-section">
        <h6>Place Entity</h6>
        <div className="small text-muted mb-1">Animals</div>
        <div className="d-flex flex-wrap gap-1 mb-2">
          {ANIMAL_TYPES.map(t => (
            <button
              key={t}
              className={`tool-btn ${placeEntityType === t ? 'active' : ''}`}
              onClick={() => setPlaceEntityType(t)}
            >
              {SPECIES_INFO[t].emoji} {SPECIES_INFO[t].name}
            </button>
          ))}
        </div>
        <div className="small text-muted mb-1">Plants</div>
        <div className="d-flex flex-wrap gap-1">
          {PLANT_PLACE_TYPES.map(p => (
            <button
              key={p.key}
              className={`tool-btn ${placeEntityType === p.key ? 'active' : ''}`}
              onClick={() => setPlaceEntityType(p.key)}
            >
              {p.emoji} {p.label}
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
