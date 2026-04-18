import React from 'react';
import { MAP_PRESETS } from './gameMenuConstants.js';

export default function GameMenuMapTab({ params, setParams, setParam }) {
  return (
    <div className="gm-stack">
      <div className="gm-panel">
        <h6>Map Presets</h6>
        <div className="gm-chip-list">
          {MAP_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className="gm-chip-button"
              onClick={() => setParams((current) => ({ ...current, ...preset.values }))}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="gm-panel gm-field-grid">
        <div className="gm-field">
          <label>Map Size</label>
          <div className="gm-field-value">{params.map_width} x {params.map_height}</div>
          <input
            type="range"
            min={100}
            max={2000}
            step={100}
            value={params.map_width}
            onChange={(event) => {
              const value = +event.target.value;
              setParams((current) => ({ ...current, map_width: value, map_height: value }));
            }}
          />
        </div>

        <div className="gm-field">
          <label>Sea Level</label>
          <div className="gm-field-value">{params.sea_level.toFixed(2)}</div>
          <input type="range" min={0.1} max={0.7} step={0.02} value={params.sea_level} onChange={(event) => setParam('sea_level', +event.target.value)} />
        </div>

        <div className="gm-field">
          <label>Island Count</label>
          <div className="gm-field-value">{params.island_count}</div>
          <input type="range" min={1} max={20} value={params.island_count} onChange={(event) => setParam('island_count', +event.target.value)} />
        </div>

        <div className="gm-field">
          <label>Island Size</label>
          <div className="gm-field-value">{params.island_size_factor.toFixed(2)}</div>
          <input type="range" min={0.1} max={0.8} step={0.05} value={params.island_size_factor} onChange={(event) => setParam('island_size_factor', +event.target.value)} />
        </div>

        <div className="gm-field">
          <label>Min Land Ratio</label>
          <div className="gm-field-value">{(params.min_land_ratio ?? 0).toFixed(2)}</div>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={params.min_land_ratio ?? 0}
            onChange={(event) => setParam('min_land_ratio', +event.target.value)}
          />
        </div>
      </div>

      <div className="gm-panel">
        <div className="gm-field" style={{ marginBottom: 0 }}>
          <label>Seed</label>
          <input
            type="number"
            className="form-control form-control-sm"
            placeholder="Leave empty for a random seed"
            value={params.seed}
            onChange={(event) => setParam('seed', event.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
